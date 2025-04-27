from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import time
from datetime import datetime, timedelta
import requests
import urllib3
from functools import wraps
from dotenv import load_dotenv

# Désactiver les avertissements SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Charger les variables d'environnement
load_dotenv()

# Récupérer les variables d'environnement
DT_ENV_URL = os.environ.get('DT_ENV_URL')
API_TOKEN = os.environ.get('API_TOKEN')
VERIFY_SSL = os.environ.get('VERIFY_SSL', 'False').lower() in ('true', '1', 't')
CACHE_DURATION = 600  # 10 minutes en secondes, augmenté pour améliorer les performances

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Fonction pour construire les sélecteurs d'entités avec filtrage par MZ
def build_entity_selector(entity_type, mz_name):
    """
    Construit un sélecteur d'entité avec filtrage par type et management zone
    """
    return f"type({entity_type}),mzName(\"{mz_name}\")"

# Fonction pour obtenir la liste des MZs Vital for Group (depuis .env)
def get_vital_for_group_mzs():
    # Récupérer la liste depuis la variable d'environnement
    vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not vfg_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in vfg_mz_string.split(',')]

# Endpoint pour obtenir les Management Zones de Vital for Group
@app.route('/api/vital-for-group-mzs', methods=['GET'])
def get_vital_for_group_mzs_endpoint():
    try:
        vfg_mzs = get_vital_for_group_mzs()
        
        # Format de réponse simple
        return jsonify({
            'mzs': vfg_mzs
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Structure de cache simple
cache = {
    'services': {'data': None, 'timestamp': 0},
    'hosts': {'data': None, 'timestamp': 0},
    'process_groups': {'data': None, 'timestamp': 0},
    'problems': {'data': None, 'timestamp': 0},
    'summary': {'data': None, 'timestamp': 0},
    'management_zones': {'data': None, 'timestamp': 0}
}

# Fonction pour récupérer la Management Zone actuelle
def get_current_mz():
    # Récupérer la MZ depuis le fichier
    config_file = 'mz_config.json'
    if os.path.exists(config_file):
        with open(config_file, 'r') as f:
            try:
                config = json.load(f)
                current_mz = config.get('current_mz')
                if current_mz:
                    return current_mz
            except:
                pass
    
    # Si pas dans le fichier, utiliser la variable d'environnement
    return os.environ.get('MZ_NAME', '')

# Décorateur pour la mise en cache
def cached(cache_key):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Vérifier si la clé existe dans le cache
            if cache_key not in cache:
                cache[cache_key] = {'data': None, 'timestamp': 0}
                
            # Vérifier si les données sont en cache et valides
            if cache[cache_key]['data'] is not None and time.time() - cache[cache_key]['timestamp'] < CACHE_DURATION:
                return cache[cache_key]['data']
            
            # Si non, exécuter la fonction et mettre en cache
            result = f(*args, **kwargs)
            cache[cache_key]['data'] = result
            cache[cache_key]['timestamp'] = time.time()
            return result
        return decorated_function
    return decorator


# Fonction pour effectuer des appels API directs à Dynatrace
def query_api(endpoint, params=None):
    url = f"{DT_ENV_URL}/api/v2/{endpoint}"
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json'
    }
    response = requests.get(url, headers=headers, params=params, verify=VERIFY_SSL)
    response.raise_for_status()
    return response.json()

# Fonction pour récupérer des métriques en batch pour plusieurs entités
def get_batch_metrics(entity_ids, metric_selector, from_time, to_time, resolution="1h"):
    """
    Récupère les métriques pour plusieurs entités en une seule requête API
    """
    if not entity_ids:
        return {}
    
    # Construire le sélecteur d'entités pour toutes les entités
    entity_selector = "entityId(" + "),entityId(".join(entity_ids) + ")"
    
    try:
        data = query_api(
            endpoint="metrics/query",
            params={
                "metricSelector": metric_selector,
                "from": from_time,
                "to": to_time,
                "resolution": resolution,
                "entitySelector": entity_selector
            }
        )
        
        # Organiser les résultats par entité
        results = {}
        
        if data.get('result', []):
            for result in data.get('result', []):
                for data_point in result.get('data', []):
                    entity_id = data_point.get('dimensions', [])[0] if data_point.get('dimensions') else None
                    if entity_id:
                        values = data_point.get('values', [])
                        timestamps = data_point.get('timestamps', [])
                        
                        if values and timestamps:
                            # Stocker la valeur actuelle
                            if values[0] is not None:
                                results[entity_id] = {
                                    'current': values[0],
                                    'history': [
                                        {'timestamp': timestamps[i], 'value': values[i]} 
                                        for i in range(len(values)) if values[i] is not None
                                    ]
                                }
        
        return results
    except Exception as e:
        print(f"Erreur lors de la récupération des métriques en batch pour {metric_selector}: {e}")
        return {}

# Fonction pour extraire la technologie d'une entité
def extract_technology(entity):
    try:
        entity_details = query_api(f"entities/{entity['id']}")
        
        # Récupération des technologies selon le type d'entité
        tech_info = []
        tech_icon = "code"  # Icône par défaut
        
        # Pour les services
        if 'softwareTechnologies' in entity_details.get('properties', {}):
            techs = entity_details['properties']['softwareTechnologies']
            for tech in techs:
                if 'type' in tech:
                    tech_info.append(tech['type'])
        
        # Pour les process groups
        elif 'softwareTechnologies' in entity_details.get('fromRelationships', {}):
            techs = entity_details['fromRelationships']['softwareTechnologies']
            for tech in techs:
                if 'type' in tech:
                    tech_info.append(tech['type'])
        
        # Approche alternative, chercher des indices dans les tags ou le nom
        if not tech_info:
            # Chercher dans les tags
            if 'tags' in entity_details:
                for tag in entity_details['tags']:
                    if tag.get('key') == 'Technology' or tag.get('key') == 'technology':
                        tech_info.append(tag.get('value'))
        
        # Si rien n'est trouvé, chercher des mots-clés dans le nom
        if not tech_info:
            name = entity.get('displayName', '').lower()
            tech_keywords = {
                'java': ('java', 'coffee'),
                'python': ('python', 'snake'),
                'node.js': ('nodejs', 'node'),
                'nodejs': ('nodejs', 'node'),
                'php': ('php', 'elephant'),
                '.net': ('dotnet', 'windows'),
                'ruby': ('ruby', 'gem'),
                'go': ('go', 'gopher'),
                'postgresql': ('database', 'database'),
                'mysql': ('database', 'database'),
                'mongodb': ('database', 'database'),
                'oracle': ('database', 'database')
            }
            
            for tech, (keyword, icon) in tech_keywords.items():
                if tech in name:
                    tech_info.append(tech.upper())
                    tech_icon = icon
                    break
        
        # Déterminer l'icône à utiliser
        if tech_info:
            tech_name = tech_info[0].lower()
            if 'java' in tech_name:
                tech_icon = 'coffee'
            elif 'python' in tech_name:
                tech_icon = 'snake'
            elif 'node' in tech_name:
                tech_icon = 'node'
            elif 'php' in tech_name:
                tech_icon = 'elephant'
            elif 'dot' in tech_name or '.net' in tech_name:
                tech_icon = 'windows'
            elif 'ruby' in tech_name:
                tech_icon = 'gem'
            elif 'go' in tech_name:
                tech_icon = 'gopher'
            elif any(db in tech_name for db in ['sql', 'postgres', 'oracle', 'mongo', 'db']):
                tech_icon = 'database'
        
        return {
            'name': ", ".join(tech_info) if tech_info else "Non spécifié",
            'icon': tech_icon
        }
    except Exception as e:
        print(f"Erreur lors de l'extraction de la technologie pour {entity.get('displayName', 'Unknown')}: {e}")
        return {
            'name': "Non spécifié",
            'icon': 'question'
        }

# Fonction optimisée pour extraire les technologies par lots
def extract_technologies_batch(entities, chunk_size=10):
    """
    Extrait les technologies pour plusieurs entités en utilisant des requêtes en lot
    """
    tech_info_map = {}
    
    for i in range(0, len(entities), chunk_size):
        batch = entities[i:i+chunk_size]
        entity_ids = [entity.get('entityId') for entity in batch]
        
        # Construire le sélecteur d'entités pour toutes les entités du lot
        entity_selector = "entityId(" + "),entityId(".join(entity_ids) + ")"
        
        try:
            # Récupérer les détails pour toutes ces entités en une seule requête
            entities_details = query_api("entities", {
                "entitySelector": entity_selector,
                "fields": "+properties.softwareTechnologies,+fromRelationships.softwareTechnologies,+tags",
                "pageSize": chunk_size
            })
            
            # Traiter chaque entité dans la réponse
            for entity_detail in entities_details.get('entities', []):
                entity_id = entity_detail.get('entityId')
                
                # Récupération des technologies selon le type d'entité
                tech_info = []
                tech_icon = "code"  # Icône par défaut
                
                # Pour les services
                if 'softwareTechnologies' in entity_detail.get('properties', {}):
                    techs = entity_detail['properties']['softwareTechnologies']
                    for tech in techs:
                        if 'type' in tech:
                            tech_info.append(tech['type'])
                
                # Pour les process groups
                elif 'softwareTechnologies' in entity_detail.get('fromRelationships', {}):
                    techs = entity_detail['fromRelationships']['softwareTechnologies']
                    for tech in techs:
                        if 'type' in tech:
                            tech_info.append(tech['type'])
                
                # Approche alternative, chercher des indices dans les tags
                if not tech_info:
                    # Chercher dans les tags
                    if 'tags' in entity_detail:
                        for tag in entity_detail['tags']:
                            if tag.get('key') == 'Technology' or tag.get('key') == 'technology':
                                tech_info.append(tag.get('value'))
                
                # Si rien n'est trouvé, chercher des mots-clés dans le nom
                if not tech_info:
                    name = next((e.get('displayName', '').lower() for e in batch if e.get('entityId') == entity_id), '')
                    tech_keywords = {
                        'java': ('java', 'coffee'),
                        'python': ('python', 'snake'),
                        'node.js': ('nodejs', 'node'),
                        'nodejs': ('nodejs', 'node'),
                        'php': ('php', 'elephant'),
                        '.net': ('dotnet', 'windows'),
                        'ruby': ('ruby', 'gem'),
                        'go': ('go', 'gopher'),
                        'postgresql': ('database', 'database'),
                        'mysql': ('database', 'database'),
                        'mongodb': ('database', 'database'),
                        'oracle': ('database', 'database')
                    }
                    
                    for tech, (keyword, icon) in tech_keywords.items():
                        if tech in name:
                            tech_info.append(tech.upper())
                            tech_icon = icon
                            break
                
                # Déterminer l'icône à utiliser
                if tech_info:
                    tech_name = tech_info[0].lower()
                    if 'java' in tech_name:
                        tech_icon = 'coffee'
                    elif 'python' in tech_name:
                        tech_icon = 'snake'
                    elif 'node' in tech_name:
                        tech_icon = 'node'
                    elif 'php' in tech_name:
                        tech_icon = 'elephant'
                    elif 'dot' in tech_name or '.net' in tech_name:
                        tech_icon = 'windows'
                    elif 'ruby' in tech_name:
                        tech_icon = 'gem'
                    elif 'go' in tech_name:
                        tech_icon = 'gopher'
                    elif any(db in tech_name for db in ['sql', 'postgres', 'oracle', 'mongo', 'db']):
                        tech_icon = 'database'
                
                # Stocker les résultats
                tech_info_map[entity_id] = {
                    'name': ", ".join(tech_info) if tech_info else "Non spécifié",
                    'icon': tech_icon
                }
        
        except Exception as e:
            print(f"Erreur lors de l'extraction par lots des technologies: {e}")
            # En cas d'erreur, définir les valeurs par défaut pour toutes les entités manquantes
            for entity in batch:
                entity_id = entity.get('entityId')
                if entity_id not in tech_info_map:
                    tech_info_map[entity_id] = {
                        'name': "Non spécifié",
                        'icon': 'question'
                    }
    
    return tech_info_map

# Fonction pour récupérer l'historique des métriques
def get_metric_history(entity_id, metric_selector, from_time, to_time, resolution="1h"):
    try:
        data = query_api(
            endpoint="metrics/query",
            params={
                "metricSelector": metric_selector,
                "from": from_time,
                "to": to_time,
                "resolution": resolution,
                "entitySelector": f"entityId({entity_id})"
            }
        )
        
        if data.get('result', []) and data['result'][0].get('data', []):
            values = data['result'][0]['data'][0].get('values', [])
            timestamps = data['result'][0]['data'][0].get('timestamps', [])
            
            # Créer un tableau de points pour les graphiques
            history = []
            if values and timestamps:
                for i in range(len(values)):
                    if values[i] is not None:
                        history.append({
                            'timestamp': timestamps[i],
                            'value': values[i]
                        })
            return history
        return []
    except Exception as e:
        print(f"Erreur lors de la récupération de l'historique pour {metric_selector}: {e}")
        return []

# Routes API pour gestion des Management Zones
@app.route('/api/set-management-zone', methods=['POST'])
def set_management_zone():
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'error': 'Le nom de la Management Zone est requis'}), 400
        
        mz_name = data['name']
        
        # Stockage de la Management Zone dans un fichier
        config_file = 'mz_config.json'
        config = {'current_mz': mz_name}
        
        with open(config_file, 'w') as f:
            json.dump(config, f)
        
        # Réinitialiser tous les caches pour forcer le rechargement avec la nouvelle MZ
        for cache_key in cache:
            cache[cache_key]['timestamp'] = 0
        
        return jsonify({
            'success': True, 
            'message': f'Management Zone définie sur: {mz_name}',
            'management_zone': mz_name
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/current-management-zone', methods=['GET'])
def get_current_management_zone():
    try:
        current_mz = get_current_mz()
        return jsonify({
            'management_zone': current_mz
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Routes API optimisées
@app.route('/api/summary', methods=['GET'])
@cached('summary')
def get_summary():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Récupérer les données de base en utilisant les sélecteurs d'entités
        services_data = query_api("entities", {
            "entitySelector": build_entity_selector("SERVICE", current_mz),
            "fields": "+properties,+fromRelationships"
        })
        
        hosts_data = query_api("entities", {
            "entitySelector": build_entity_selector("HOST", current_mz),
            "fields": "+properties,+fromRelationships"
        })
        
        problems_data = query_api(
            endpoint="problems",
            params={
                "from": "-24h",
                "status": "OPEN"
            }
        )
        
        # Calculer les métriques résumées
        services_count = len(services_data.get('entities', []))
        hosts_count = len(hosts_data.get('entities', []))
        
        # Filtrer les problèmes pour notre MZ
        mz_problems = []
        for problem in problems_data.get('problems', []):
            # Vérifier si le problème est lié à notre Management Zone
            is_in_mz = False
            
            # Rechercher dans les management zones directement attachées au problème
            if 'managementZones' in problem:
                for mz in problem.get('managementZones', []):
                    if mz.get('name') == current_mz:
                        is_in_mz = True
                        break
            
            # Rechercher aussi dans les entités affectées
            if not is_in_mz:
                for entity in problem.get('affectedEntities', []):
                    # Vérifier les management zones de chaque entité affectée
                    for mz in entity.get('managementZones', []):
                        if mz.get('name') == current_mz:
                            is_in_mz = True
                            break
                    if is_in_mz:
                        break
            
            if is_in_mz:
                mz_problems.append(problem)
        
        problems_count = len(mz_problems)
        
        # Extraire les IDs d'entités pour les requêtes en batch
        host_ids = [host.get('entityId') for host in hosts_data.get('entities', [])]
        service_ids = [service.get('entityId') for service in services_data.get('entities', [])]
        
        # Récupérer les métriques CPU en une seule requête
        cpu_metrics = get_batch_metrics(host_ids, "builtin:host.cpu.usage", from_time, to_time)
        
        # Récupérer les métriques de taux d'erreur en une seule requête
        error_metrics = get_batch_metrics(service_ids, "builtin:service.errors.total.rate", from_time, to_time)
        
        # Récupérer les métriques de nombre de requêtes en une seule requête
        request_metrics = get_batch_metrics(service_ids, "builtin:service.requestCount.total", from_time, to_time)
        
        # Calculer l'utilisation moyenne du CPU et le nombre d'hôtes critiques
        total_cpu = 0
        critical_hosts = 0
        
        for host_id in host_ids:
            cpu_data = cpu_metrics.get(host_id, {})
            if 'current' in cpu_data and cpu_data['current'] is not None:
                cpu_usage = int(cpu_data['current'])
                if cpu_usage > 80:
                    critical_hosts += 1
                total_cpu += cpu_usage
        
        avg_cpu = round(total_cpu / hosts_count) if hosts_count > 0 else 0
        
        # Calculer le nombre total de requêtes et le taux d'erreur moyen
        total_requests = 0
        total_errors = 0
        services_with_errors = 0
        
        for service_id in service_ids:
            # Comptage des requêtes
            request_data = request_metrics.get(service_id, {})
            if 'current' in request_data and request_data['current'] is not None:
                requests_count = int(request_data['current'])
                total_requests += requests_count
            
            # Taux d'erreur
            error_data = error_metrics.get(service_id, {})
            if 'current' in error_data and error_data['current'] is not None:
                error_rate = round(error_data['current'], 1)
                if error_rate > 0:
                    total_errors += error_rate
                    services_with_errors += 1
        
        avg_error_rate = round(total_errors / services_with_errors, 1) if services_with_errors > 0 else 0
        
        return {
            'hosts': {
                'count': hosts_count,
                'avg_cpu': avg_cpu,
                'critical_count': critical_hosts
            },
            'services': {
                'count': services_count,
                'with_errors': services_with_errors,
                'avg_error_rate': avg_error_rate
            },
            'requests': {
                'total': total_requests,
                'hourly_avg': round(total_requests / 24) if total_requests > 0 else 0
            },
            'problems': {
                'count': problems_count
            },
            'timestamp': int(time.time() * 1000)
        }
    except Exception as e:
        print(f"Erreur dans get_summary: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/hosts', methods=['GET'])
@cached('hosts')
def get_hosts():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("HOST", current_mz)
        
        # Récupérer tous les hôtes d'un coup
        hosts_data = query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        # Extraire les IDs d'entités
        host_ids = [host.get('entityId') for host in hosts_data.get('entities', [])]
        
        # Récupérer toutes les métriques CPU en une seule requête
        cpu_metrics = get_batch_metrics(host_ids, "builtin:host.cpu.usage", from_time, to_time)
        
        # Récupérer toutes les métriques RAM en une seule requête
        ram_metrics = get_batch_metrics(host_ids, "builtin:host.mem.usage", from_time, to_time)
        
        host_metrics = []
        
        for host in hosts_data.get('entities', []):
            host_id = host.get('entityId')
            
            # Obtenir les métriques CPU pour cet hôte
            cpu_data = cpu_metrics.get(host_id, {})
            cpu_usage = int(cpu_data.get('current', 0)) if cpu_data.get('current') is not None else None
            cpu_history = cpu_data.get('history', [])
            
            # Obtenir les métriques RAM pour cet hôte
            ram_data = ram_metrics.get(host_id, {})
            ram_usage = int(ram_data.get('current', 0)) if ram_data.get('current') is not None else None
            ram_history = ram_data.get('history', [])
            
            # Récupérer l'URL Dynatrace de l'entité
            dt_url = f"{DT_ENV_URL}/#entity/{host_id}"
            
            host_metrics.append({
                'id': host_id,
                'name': host.get('displayName'),
                'cpu': cpu_usage,
                'ram': ram_usage,
                'cpu_history': cpu_history,
                'ram_history': ram_history,
                'dt_url': dt_url
            })
        
        return host_metrics
    except Exception as e:
        print(f"Erreur dans get_hosts: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/services', methods=['GET'])
@cached('services')
def get_services():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("SERVICE", current_mz)
        
        # Récupérer tous les services d'un coup
        services_data = query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        # Extraire les IDs d'entités
        service_ids = [service.get('entityId') for service in services_data.get('entities', [])]
        
        # Récupérer toutes les métriques de temps de réponse en une seule requête
        response_time_metrics = get_batch_metrics(service_ids, "builtin:service.response.time", from_time, to_time)
        
        # Récupérer toutes les métriques de taux d'erreur en une seule requête
        error_rate_metrics = get_batch_metrics(service_ids, "builtin:service.errors.total.rate", from_time, to_time)
        
        # Récupérer toutes les métriques de nombre de requêtes en une seule requête
        request_count_metrics = get_batch_metrics(service_ids, "builtin:service.requestCount.total", from_time, to_time)
        
        # Récupérer les technologies des services en batch
        tech_infos = extract_technologies_batch(services_data.get('entities', []))
        
        service_metrics = []
        
        for service in services_data.get('entities', []):
            service_id = service.get('entityId')
            
            # Vérification du type de service et activité
            service_status = "Actif"  # Par défaut
            
            # Obtenir les métriques de temps de réponse pour ce service
            response_time_data = response_time_metrics.get(service_id, {})
            response_time = int(response_time_data.get('current', 0)) if response_time_data.get('current') is not None else None
            response_time_history = response_time_data.get('history', [])
            
            # Obtenir les métriques de taux d'erreur pour ce service
            error_rate_data = error_rate_metrics.get(service_id, {})
            error_rate = round(error_rate_data.get('current', 0), 1) if error_rate_data.get('current') is not None else None
            error_rate_history = error_rate_data.get('history', [])
            
            # Obtenir les métriques de nombre de requêtes pour ce service
            request_count_data = request_count_metrics.get(service_id, {})
            requests_count = int(request_count_data.get('current', 0)) if request_count_data.get('current') is not None else None
            request_count_history = request_count_data.get('history', [])
            
            # Récupération de la technologie
            tech_info = tech_infos.get(service_id, {'name': 'Non spécifié', 'icon': 'code'})
            
            # Récupérer l'URL Dynatrace de l'entité
            dt_url = f"{DT_ENV_URL}/#entity/{service_id}"
            
            service_metrics.append({
                'id': service_id,
                'name': service.get('displayName'),
                'response_time': response_time,
                'error_rate': error_rate,
                'requests': requests_count,
                'technology': tech_info['name'],
                'tech_icon': tech_info['icon'],
                'status': service_status,
                'response_time_history': response_time_history,
                'error_rate_history': error_rate_history,
                'request_count_history': request_count_history,
                'dt_url': dt_url
            })
        
        return service_metrics
    except Exception as e:
        print(f"Erreur dans get_services: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/processes', methods=['GET'])
@cached('process_groups')
def get_processes():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("PROCESS_GROUP", current_mz)
        
        process_groups_data = query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        # Récupérer les technologies des process groups en batch
        tech_infos = extract_technologies_batch(process_groups_data.get('entities', []))
        
        process_metrics = []
        
        for pg in process_groups_data.get('entities', []):
            pg_id = pg.get('entityId')
            
            # Récupération de la technologie
            tech_info = tech_infos.get(pg_id, {'name': 'Non spécifié', 'icon': 'code'})
            
            # Récupérer l'URL Dynatrace de l'entité
            dt_url = f"{DT_ENV_URL}/#entity/{pg_id}"
            
            process_metrics.append({
                'id': pg_id,
                'name': pg.get('displayName'),
                'technology': tech_info['name'],
                'tech_icon': tech_info['icon'],
                'dt_url': dt_url
            })
        
        return process_metrics
    except Exception as e:
        print(f"Erreur dans get_processes: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/problems', methods=['GET'])
@cached('problems')
def get_problems():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Récupérer tous les problèmes ouverts sans filtrer par MZ via l'API
        problems_data = query_api(
            endpoint="problems",
            params={
                "from": "-24h",
                "status": "OPEN"
                # Nous retirons le filtre managementZone pour éviter les problèmes de filtrage incorrect
            }
        )
        
        active_problems = []
        if 'problems' in problems_data:
            total_problems = len(problems_data['problems'])
            print(f"Nombre total de problèmes récupérés: {total_problems}")
            
            # On va filtrer manuellement les problèmes liés à notre Management Zone
            mz_problems = 0
            for problem in problems_data['problems']:
                # Vérifier si le problème est lié à notre Management Zone
                is_in_mz = False
                
                # Rechercher dans les management zones directement attachées au problème
                if 'managementZones' in problem:
                    for mz in problem.get('managementZones', []):
                        if mz.get('name') == current_mz:
                            is_in_mz = True
                            break
                
                # Rechercher aussi dans les entités affectées
                if not is_in_mz:
                    for entity in problem.get('affectedEntities', []):
                        # Vérifier les management zones de chaque entité affectée
                        for mz in entity.get('managementZones', []):
                            if mz.get('name') == current_mz:
                                is_in_mz = True
                                break
                        if is_in_mz:
                            break
                
                # Si le problème est dans notre MZ, l'ajouter à notre liste
                if is_in_mz:
                    mz_problems += 1
                    active_problems.append({
                        'id': problem.get('problemId', 'Unknown'),
                        'title': problem.get('title', 'Problème inconnu'),
                        'impact': problem.get('impactLevel', 'UNKNOWN'),
                        'status': problem.get('status', 'OPEN'),
                        'affected_entities': len(problem.get('affectedEntities', [])),
                        'start_time': datetime.fromtimestamp(problem.get('startTime', 0)/1000).strftime('%Y-%m-%d %H:%M'),
                        'dt_url': f"{DT_ENV_URL}/#problems/problemdetails;pid={problem.get('problemId', 'Unknown')}",
                        'zone': current_mz
                    })
            
            print(f"Problèmes filtrés appartenant à {current_mz}: {mz_problems}/{total_problems}")
        
        return active_problems
    except Exception as e:
        print(f"Erreur lors de la récupération des problèmes: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

# Route séparée pour obtenir TOUTES les Management Zones (fonctionnalité future)
@app.route('/api/management-zones', methods=['GET'])
@cached('management_zones')
def get_management_zones():
    try:
        print("Tentative de récupération de toutes les Management Zones...")
        
        # En cas d'erreur avec l'API, renvoyer un message clair plutôt que de bloquer
        try:
            url = f"{DT_ENV_URL}/api/config/v1/managementZones"
            headers = {
                'Authorization': f'Api-Token {API_TOKEN}',
                'Accept': 'application/json'
            }
            response = requests.get(url, headers=headers, verify=VERIFY_SSL, timeout=5)
            
            # Si réussite
            if response.status_code == 200:
                mz_data = response.json()
                
                management_zones = []
                
                # Pour l'API v1 config
                for mz in mz_data.get('values', []):
                    management_zones.append({
                        'id': mz.get('id'),
                        'name': mz.get('name'),
                        'dt_url': f"{DT_ENV_URL}/#settings/managementzones;id={mz.get('id')}"
                    })
                
                print(f"Trouvé {len(management_zones)} Management Zones")
                return management_zones
            else:
                # En cas d'erreur d'accès, retourner un message explicite
                print(f"Impossible d'accéder à l'API des Management Zones: Code {response.status_code}")
                return {
                    'error': 'Accès API restreint',
                    'message': 'Le token API actuel ne permet pas d\'accéder à la liste complète des Management Zones',
                    'status_code': response.status_code
                }
                
        except requests.exceptions.RequestException as e:
            print(f"Erreur lors de l'accès à l'API des Management Zones: {str(e)}")
            return {
                'error': 'Erreur de connexion',
                'message': f'Impossible de se connecter à l\'API Dynatrace: {str(e)}',
                'note': 'Cette fonctionnalité nécessite des droits API supplémentaires.'
            }
            
    except Exception as e:
        print(f"Erreur générale dans get_management_zones: {str(e)}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'online',
        'cache_status': {
            'services': 'fresh' if time.time() - cache['services']['timestamp'] < CACHE_DURATION else 'stale',
            'hosts': 'fresh' if time.time() - cache['hosts']['timestamp'] < CACHE_DURATION else 'stale',
            'process_groups': 'fresh' if time.time() - cache['process_groups']['timestamp'] < CACHE_DURATION else 'stale',
            'problems': 'fresh' if time.time() - cache['problems']['timestamp'] < CACHE_DURATION else 'stale',
            'summary': 'fresh' if time.time() - cache['summary']['timestamp'] < CACHE_DURATION else 'stale'
        },
        'cache_expiry': {
            'services': int(cache['services']['timestamp'] + CACHE_DURATION - time.time()),
            'hosts': int(cache['hosts']['timestamp'] + CACHE_DURATION - time.time()),
            'process_groups': int(cache['process_groups']['timestamp'] + CACHE_DURATION - time.time()),
            'problems': int(cache['problems']['timestamp'] + CACHE_DURATION - time.time()),
            'summary': int(cache['summary']['timestamp'] + CACHE_DURATION - time.time())
        },
        'server_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'version': '1.0.0'
    })

@app.route('/api/refresh/<cache_type>', methods=['POST'])
def refresh_cache(cache_type):
    if cache_type not in cache:
        return jsonify({'error': f'Cache type {cache_type} not found'}), 404
    
    # Réinitialiser le timestamp pour forcer une actualisation à la prochaine requête
    cache[cache_type]['timestamp'] = 0
    return jsonify({'success': True, 'message': f'Cache {cache_type} will be refreshed on next request'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')