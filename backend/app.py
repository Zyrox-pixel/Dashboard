from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import time
import asyncio
import aiohttp
from datetime import datetime, timedelta
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
CACHE_DURATION = 300  # 5 minutes en secondes

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Structure de cache améliorée
cache = {
    'services': {'data': None, 'timestamp': 0},
    'hosts': {'data': None, 'timestamp': 0},
    'process_groups': {'data': None, 'timestamp': 0},
    'problems': {'data': None, 'timestamp': 0},
    'summary': {'data': None, 'timestamp': 0},
    'management_zones': {'data': None, 'timestamp': 0}
}

# Cache pour les données détaillées des entités
entity_cache = {}

# Fonction pour construire les sélecteurs d'entités avec filtrage par MZ
def build_entity_selector(entity_type, mz_name):
    """
    Construit un sélecteur d'entité avec filtrage par type et management zone
    """
    return f"type({entity_type}),mzName(\"{mz_name}\")"

# Fonction pour obtenir la liste des MZs Vital for Group
def get_vital_for_group_mzs():
    # Récupérer la liste depuis la variable d'environnement
    vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not vfg_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in vfg_mz_string.split(',')]

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

# Décorateur pour la mise en cache amélioré
def cached(cache_key):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Vérifier si la clé existe dans le cache
            if cache_key not in cache:
                cache[cache_key] = {'data': None, 'timestamp': 0}
                
            # Vérifier si les données sont en cache et valides
            current_time = time.time()
            if cache[cache_key]['data'] is not None and current_time - cache[cache_key]['timestamp'] < CACHE_DURATION:
                return jsonify(cache[cache_key]['data'])
            
            # Si non, exécuter la fonction et mettre en cache
            result = f(*args, **kwargs)
            cache[cache_key]['data'] = result
            cache[cache_key]['timestamp'] = current_time
            return jsonify(result)
        return decorated_function
    return decorator

# Fonction pour effectuer des appels API directs à Dynatrace de façon async
async def async_query_api(session, endpoint, params=None):
    url = f"{DT_ENV_URL}/api/v2/{endpoint}"
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json'
    }
    
    async with session.get(url, headers=headers, params=params, ssl=False) as response:
        response.raise_for_status()
        return await response.json()

# Version synchrone pour la compatibilité avec le code existant
def query_api(endpoint, params=None):
    import requests
    url = f"{DT_ENV_URL}/api/v2/{endpoint}"
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json'
    }
    response = requests.get(url, headers=headers, params=params, verify=False)
    response.raise_for_status()
    return response.json()

# Version optimisée pour l'extraction de technologie avec mise en cache
async def async_extract_technology(session, entity):
    # Vérifier si déjà en cache
    entity_id = entity['id']
    if entity_id in entity_cache and 'technology' in entity_cache[entity_id]:
        return entity_cache[entity_id]['technology']

    try:
        entity_details = await async_query_api(session, f"entities/{entity_id}")
        
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
                    if tag.get('key') in ('Technology', 'technology'):
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
        
        result = {
            'name': ", ".join(tech_info) if tech_info else "Non spécifié",
            'icon': tech_icon
        }
        
        # Mettre en cache le résultat
        if entity_id not in entity_cache:
            entity_cache[entity_id] = {}
        entity_cache[entity_id]['technology'] = result
        
        return result
    except Exception as e:
        print(f"Erreur lors de l'extraction de la technologie pour {entity.get('displayName', 'Unknown')}: {e}")
        return {
            'name': "Non spécifié",
            'icon': 'question'
        }

# Fonction pour récupérer l'historique des métriques de façon asynchrone
async def async_get_metric_history(session, entity_id, metric_selector, from_time, to_time, resolution="1h"):
    try:
        data = await async_query_api(
            session,
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

# Nouvel endpoint pour obtenir les Management Zones de Vital for Group
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

# Nouvelle version optimisée pour récupérer les services
@app.route('/api/services', methods=['GET'])
@cached('services')
def get_services():
    # Utiliser le point d'entrée asyncio pour exécuter des tâches asynchrones
    return asyncio.run(async_get_services())

async def async_get_services():
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
        
        async with aiohttp.ClientSession() as session:
            # Récupérer les données de services
            services_data = await async_query_api(
                session,
                "entities", 
                {"entitySelector": entity_selector, "fields": "+properties,+fromRelationships"}
            )
            
            if not services_data.get('entities'):
                return []
            
            # Préparer les tâches pour tous les services
            service_tasks = []
            entities = services_data.get('entities', [])
            
            # Limiter à 20 services maximum pour éviter la surcharge et réduire le temps de réponse
            entities = entities[:20]
            
            for service in entities:
                service_id = service.get('entityId')
                
                # Créer des tâches pour récupérer les métriques en parallèle
                tasks = [
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:service.response.time",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({service_id})"
                        }
                    ),
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:service.errors.total.rate",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({service_id})"
                        }
                    ),
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:service.requestCount.total",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({service_id})"
                        }
                    ),
                    async_extract_technology(session, service),
                    async_get_metric_history(session, service_id, "builtin:service.response.time", from_time, to_time),
                    async_get_metric_history(session, service_id, "builtin:service.errors.total.rate", from_time, to_time),
                    async_get_metric_history(session, service_id, "builtin:service.requestCount.total", from_time, to_time)
                ]
                
                service_tasks.append((service, tasks))
            
            # Traiter les résultats
            service_metrics = []
            
            for service, tasks in service_tasks:
                service_id = service.get('entityId')
                
                # Attendre que toutes les tâches pour ce service soient terminées
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                response_time_data, error_rate_data, requests_data, tech_info, response_time_history, error_rate_history, request_count_history = results
                
                # Extraire les valeurs
                response_time = None
                error_rate = None
                requests_count = None
                
                # Traiter les données de temps de réponse
                if not isinstance(response_time_data, Exception) and response_time_data.get('result', []) and response_time_data['result'][0].get('data', []):
                    values = response_time_data['result'][0]['data'][0].get('values', [])
                    if values:
                        response_time = int(values[0])
                
                # Traiter les données de taux d'erreur
                if not isinstance(error_rate_data, Exception) and error_rate_data.get('result', []) and error_rate_data['result'][0].get('data', []):
                    values = error_rate_data['result'][0]['data'][0].get('values', [])
                    if values:
                        error_rate = round(values[0], 1)
                
                # Traiter les données de nombre de requêtes
                if not isinstance(requests_data, Exception) and requests_data.get('result', []) and requests_data['result'][0].get('data', []):
                    values = requests_data['result'][0]['data'][0].get('values', [])
                    if values:
                        requests_count = int(values[0])
                
                # Vérification du type de service et activité
                service_status = "Actif"
                
                # Récupérer l'URL Dynatrace de l'entité
                dt_url = f"{DT_ENV_URL}/#entity/{service_id}"
                
                # Si tech_info est une exception, utiliser des valeurs par défaut
                if isinstance(tech_info, Exception):
                    tech_info = {
                        'name': "Non spécifié",
                        'icon': 'question'
                    }
                
                # Si les historiques sont des exceptions, utiliser des listes vides
                if isinstance(response_time_history, Exception):
                    response_time_history = []
                if isinstance(error_rate_history, Exception):
                    error_rate_history = []
                if isinstance(request_count_history, Exception):
                    request_count_history = []
                
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
        print(f"Error in async_get_services: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

# Nouvelle version optimisée pour récupérer les hôtes
@app.route('/api/hosts', methods=['GET'])
@cached('hosts')
def get_hosts():
    # Utiliser le point d'entrée asyncio pour exécuter des tâches asynchrones
    return asyncio.run(async_get_hosts())

async def async_get_hosts():
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
        
        async with aiohttp.ClientSession() as session:
            # Récupérer les données d'hôtes
            hosts_data = await async_query_api(
                session,
                "entities", 
                {"entitySelector": entity_selector, "fields": "+properties,+fromRelationships"}
            )
            
            if not hosts_data.get('entities'):
                return []
            
            # Préparer les tâches pour tous les hôtes
            host_tasks = []
            entities = hosts_data.get('entities', [])
            
            # Limiter à 20 hôtes maximum pour éviter la surcharge et réduire le temps de réponse
            entities = entities[:20] 
            
            for host in entities:
                host_id = host.get('entityId')
                
                # Créer des tâches pour récupérer les métriques en parallèle
                tasks = [
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:host.cpu.usage",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({host_id})"
                        }
                    ),
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:host.mem.usage",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({host_id})"
                        }
                    ),
                    async_get_metric_history(session, host_id, "builtin:host.cpu.usage", from_time, to_time),
                    async_get_metric_history(session, host_id, "builtin:host.mem.usage", from_time, to_time)
                ]
                
                host_tasks.append((host, tasks))
            
            # Traiter les résultats
            host_metrics = []
            
            for host, tasks in host_tasks:
                host_id = host.get('entityId')
                
                # Attendre que toutes les tâches pour cet hôte soient terminées
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                cpu_data, ram_data, cpu_history, ram_history = results
                
                # Extraire les valeurs
                cpu_usage = None
                ram_usage = None
                
                # Traiter les données CPU
                if not isinstance(cpu_data, Exception) and cpu_data.get('result', []) and cpu_data['result'][0].get('data', []):
                    values = cpu_data['result'][0]['data'][0].get('values', [])
                    if values:
                        cpu_usage = int(values[0])
                
                # Traiter les données RAM
                if not isinstance(ram_data, Exception) and ram_data.get('result', []) and ram_data['result'][0].get('data', []):
                    values = ram_data['result'][0]['data'][0].get('values', [])
                    if values:
                        ram_usage = int(values[0])
                
                # Si les historiques sont des exceptions, utiliser des listes vides
                if isinstance(cpu_history, Exception):
                    cpu_history = []
                if isinstance(ram_history, Exception):
                    ram_history = []
                
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
        print(f"Error in async_get_hosts: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

# Nouvelle version optimisée pour récupérer les process groups
@app.route('/api/processes', methods=['GET'])
@cached('process_groups')
def get_processes():
    # Utiliser le point d'entrée asyncio pour exécuter des tâches asynchrones
    return asyncio.run(async_get_processes())

async def async_get_processes():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("PROCESS_GROUP", current_mz)
        
        async with aiohttp.ClientSession() as session:
            # Récupérer les données des process groups
            process_groups_data = await async_query_api(
                session,
                "entities", 
                {"entitySelector": entity_selector, "fields": "+properties,+fromRelationships"}
            )
            
            if not process_groups_data.get('entities'):
                return []
            
            entities = process_groups_data.get('entities', [])
            # Limiter à 20 process groups maximum
            entities = entities[:20]
            
            # Créer des tâches pour récupérer les technologies en parallèle
            tasks = []
            for pg in entities:
                tasks.append(async_extract_technology(session, pg))
            
            # Exécuter toutes les tâches en parallèle
            tech_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Traiter les résultats
            process_metrics = []
            
            for i, pg in enumerate(entities):
                pg_id = pg.get('entityId')
                
                # Vérifier si la technologie a été récupérée avec succès
                if isinstance(tech_results[i], Exception):
                    tech_info = {
                        'name': "Non spécifié",
                        'icon': 'question'
                    }
                else:
                    tech_info = tech_results[i]
                
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
        print(f"Error in async_get_processes: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

# Nouvelle version optimisée pour récupérer les problèmes
@app.route('/api/problems', methods=['GET'])
@cached('problems')
def get_problems():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return jsonify({'error': 'Aucune Management Zone définie'})
        
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
            # On va filtrer manuellement les problèmes liés à notre Management Zone
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
        
        return jsonify(active_problems)
    except Exception as e:
        print(f"Erreur lors de la récupération des problèmes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Version optimisée pour récupérer le résumé
@app.route('/api/summary', methods=['GET'])
@cached('summary')
def get_summary():
    # Utiliser le point d'entrée asyncio pour exécuter des tâches asynchrones
    return asyncio.run(async_get_summary())

async def async_get_summary():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        async with aiohttp.ClientSession() as session:
            # Exécuter toutes les requêtes en parallèle
            services_task = async_query_api(session, "entities", {
                "entitySelector": build_entity_selector("SERVICE", current_mz),
                "fields": "+properties,+fromRelationships"
            })
            
            hosts_task = async_query_api(session, "entities", {
                "entitySelector": build_entity_selector("HOST", current_mz),
                "fields": "+properties,+fromRelationships"
            })
            
            problems_task = async_query_api(session, "problems", {
                "from": "-24h",
                "status": "OPEN"
            })
            
            # Attendre que toutes les tâches soient terminées
            services_data, hosts_data, problems_data = await asyncio.gather(
                services_task, hosts_task, problems_task
            )
            
            # Filtrer les problèmes pour la MZ actuelle
            filtered_problems = []
            for problem in problems_data.get('problems', []):
                # Vérifier si le problème est lié à notre Management Zone
                is_in_mz = False
                
                # Rechercher dans les management zones directement attachées au problème
                if 'managementZones' in problem:
                    for mz in problem.get('managementZones', []):
                        if mz.get('name') == current_mz:
                            is_in_mz = True
                            break
                
                # Si le problème est dans notre MZ, l'ajouter à notre liste
                if is_in_mz:
                    filtered_problems.append(problem)
            
            # Calculer les métriques résumées
            services_count = len(services_data.get('entities', []))
            hosts_count = len(hosts_data.get('entities', []))
            problems_count = len(filtered_problems)
            
            # Calculer l'utilisation moyenne du CPU et le nombre d'hôtes critiques
            # Limiter le nombre d'hôtes traités pour améliorer les performances
            processed_hosts = hosts_data.get('entities', [])[:10]  # Traiter au max 10 hôtes
            
            # Créer des tâches pour récupérer l'utilisation CPU pour tous les hôtes en parallèle
            cpu_tasks = []
            for host in processed_hosts:
                host_id = host.get('entityId')
                cpu_tasks.append(async_query_api(
                    session,
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:host.cpu.usage",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({host_id})"
                    }
                ))
            
            # Exécuter toutes les tâches CPU en parallèle
            cpu_results = await asyncio.gather(*cpu_tasks, return_exceptions=True)
            
            # Traiter les résultats CPU
            total_cpu = 0
            critical_hosts = 0
            valid_cpu_count = 0
            
            for result in cpu_results:
                if not isinstance(result, Exception) and result.get('result', []) and result['result'][0].get('data', []):
                    values = result['result'][0]['data'][0].get('values', [])
                    if values:
                        cpu_usage = int(values[0])
                        if cpu_usage > 80:
                            critical_hosts += 1
                        total_cpu += cpu_usage
                        valid_cpu_count += 1
            
            avg_cpu = round(total_cpu / valid_cpu_count) if valid_cpu_count > 0 else 0
            
            # Calculer le nombre total de requêtes et le taux d'erreur moyen
            # Limiter le nombre de services traités pour améliorer les performances
            processed_services = services_data.get('entities', [])[:10]  # Traiter au max 10 services
            
            # Créer des tâches pour récupérer les requêtes et taux d'erreur pour tous les services en parallèle
            service_metric_tasks = []
            for service in processed_services:
                service_id = service.get('entityId')
                
                service_metric_tasks.append((
                    service_id,
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:service.requestCount.total",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({service_id})"
                        }
                    ),
                    async_query_api(
                        session,
                        endpoint="metrics/query",
                        params={
                            "metricSelector": "builtin:service.errors.total.rate",
                            "from": from_time,
                            "to": to_time,
                            "entitySelector": f"entityId({service_id})"
                        }
                    )
                ))
            
            # Traiter les résultats des métriques de service
            total_requests = 0
            total_errors = 0
            services_with_errors = 0
            
            for service_id, request_task, error_task in service_metric_tasks:
                # Attendre que les tâches soient terminées
                requests_data, error_rate_data = await asyncio.gather(request_task, error_task, return_exceptions=True)
                
                # Traiter les données de requêtes
                if not isinstance(requests_data, Exception) and requests_data.get('result', []) and requests_data['result'][0].get('data', []):
                    values = requests_data['result'][0]['data'][0].get('values', [])
                    if values:
                        requests_count = int(values[0])
                        total_requests += requests_count
                
                # Traiter les données de taux d'erreur
                if not isinstance(error_rate_data, Exception) and error_rate_data.get('result', []) and error_rate_data['result'][0].get('data', []):
                    values = error_rate_data['result'][0]['data'][0].get('values', [])
                    if values:
                        error_rate = round(values[0], 1)
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
        print(f"Error in async_get_summary: {e}")
        import traceback
        traceback.print_exc()
        return {'error': str(e)}

@app.route('/api/management-zones', methods=['GET'])
@cached('management_zones')
def get_management_zones():
    try:
        import requests
        
        # Essayons l'ancienne API v1
        url = f"{DT_ENV_URL}/api/config/v1/managementZones"
        headers = {
            'Authorization': f'Api-Token {API_TOKEN}',
            'Accept': 'application/json'
        }
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        mz_data = response.json()
        
        management_zones = []
        
        # Pour l'API v1 config
        for mz in mz_data.get('values', []):
            management_zones.append({
                'id': mz.get('id'),
                'name': mz.get('name'),
                'dt_url': f"{DT_ENV_URL}/#settings/managementzones;id={mz.get('id')}"
            })
        
        return management_zones
    except Exception as e:
        print(f"Error fetching management zones: {str(e)}")
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
        'version': '1.1.0'
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