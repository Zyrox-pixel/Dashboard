from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import json
import time
from datetime import datetime, timedelta
import requests
import urllib3
from functools import wraps

# Désactiver les avertissements SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Configuration (à déplacer dans un fichier .env pour la production)
DT_ENV_URL = os.environ.get('DT_ENV_URL')
API_TOKEN = os.environ.get('API_TOKEN')  
CACHE_DURATION = 300  # 5 minutes en secondes

# Structure de cache simple
cache = {
    'services': {'data': None, 'timestamp': 0},
    'hosts': {'data': None, 'timestamp': 0},
    'process_groups': {'data': None, 'timestamp': 0},
    'problems': {'data': None, 'timestamp': 0},
    'summary': {'data': None, 'timestamp': 0},
    'management_zones': {'data': None, 'timestamp': 0}  # Ajoutez cette ligne
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
                return jsonify(cache[cache_key]['data'])
            
            # Si non, exécuter la fonction et mettre en cache
            result = f(*args, **kwargs)
            cache[cache_key]['data'] = result
            cache[cache_key]['timestamp'] = time.time()
            return jsonify(result)
        return decorated_function
    return decorator


# Fonction pour effectuer des appels API directs à Dynatrace
def query_api(endpoint, params=None):
    url = f"{DT_ENV_URL}/api/v2/{endpoint}"
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json'
    }
    response = requests.get(url, headers=headers, params=params, verify=False)
    response.raise_for_status()
    return response.json()

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

# Routes API
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
        
        # Récupérer les données de base
        services_data = query_api("entities", {
            "entitySelector": f"type(SERVICE),mzName(\"{current_mz}\")",
            "fields": "+properties,+fromRelationships"
        })
        
        hosts_data = query_api("entities", {
            "entitySelector": f"type(HOST),mzName(\"{current_mz}\")",
            "fields": "+properties,+fromRelationships"
        })
        
        problems_data = query_api(
            endpoint="problems",
            params={
                "from": "-24h",
                "status": "OPEN",
                "managementZone": current_mz
            }
        )
        
        # Calculer les métriques résumées
        services_count = len(services_data.get('entities', []))
        hosts_count = len(hosts_data.get('entities', []))
        problems_count = len(problems_data.get('problems', []))
        
        # Calculer l'utilisation moyenne du CPU et le nombre d'hôtes critiques
        total_cpu = 0
        critical_hosts = 0
        
        for host in hosts_data.get('entities', []):
            host_id = host.get('entityId')
            try:
                cpu_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:host.cpu.usage",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({host_id})"
                    }
                )
                if cpu_data.get('result', []) and cpu_data['result'][0].get('data', []):
                    values = cpu_data['result'][0]['data'][0].get('values', [])
                    if values:
                        cpu_usage = int(values[0])
                        if cpu_usage > 80:
                            critical_hosts += 1
                        total_cpu += cpu_usage
            except Exception as e:
                print(f"Erreur pour CPU sur l'hôte {host_id}: {e}")
        
        avg_cpu = round(total_cpu / hosts_count) if hosts_count > 0 else 0
        
        # Calculer le nombre total de requêtes et le taux d'erreur moyen
        total_requests = 0
        total_errors = 0
        services_with_errors = 0
        
        for service in services_data.get('entities', []):
            service_id = service.get('entityId')
            
            try:
                requests_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:service.requestCount.total",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    }
                )
                if requests_data.get('result', []) and requests_data['result'][0].get('data', []):
                    values = requests_data['result'][0]['data'][0].get('values', [])
                    if values:
                        requests_count = int(values[0])
                        total_requests += requests_count
            except Exception as e:
                print(f"Erreur pour les requêtes sur le service {service_id}: {e}")
            
            try:
                error_rate_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:service.errors.total.rate",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    }
                )
                if error_rate_data.get('result', []) and error_rate_data['result'][0].get('data', []):
                    values = error_rate_data['result'][0]['data'][0].get('values', [])
                    if values:
                        error_rate = round(values[0], 1)
                        if error_rate > 0:
                            total_errors += error_rate
                            services_with_errors += 1
            except Exception as e:
                print(f"Erreur pour le taux d'erreur sur le service {service_id}: {e}")
        
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
        
        hosts_data = query_api("entities", {
            "entitySelector": f"type(HOST),mzName(\"{current_mz}\")",
            "fields": "+properties,+fromRelationships"
        })
        
        host_metrics = []
        
        for host in hosts_data.get('entities', []):
            host_id = host.get('entityId')
            print(f"Traitement de l'hôte: {host.get('displayName')}")
            
            cpu_usage = None
            ram_usage = None
            cpu_history = []
            ram_history = []
            
            try:
                cpu_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:host.cpu.usage",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({host_id})"
                    }
                )
                if cpu_data.get('result', []) and cpu_data['result'][0].get('data', []):
                    values = cpu_data['result'][0]['data'][0].get('values', [])
                    if values:
                        cpu_usage = int(values[0])
                
                # Récupérer l'historique CPU pour les graphiques
                cpu_history = get_metric_history(host_id, "builtin:host.cpu.usage", from_time, to_time)
            except Exception as e:
                print(f"  Erreur pour CPU: {e}")
            
            try:
                ram_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:host.mem.usage",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({host_id})"
                    }
                )
                if ram_data.get('result', []) and ram_data['result'][0].get('data', []):
                    values = ram_data['result'][0]['data'][0].get('values', [])
                    if values:
                        ram_usage = int(values[0])
                
                # Récupérer l'historique RAM pour les graphiques
                ram_history = get_metric_history(host_id, "builtin:host.mem.usage", from_time, to_time)
            except Exception as e:
                print(f"  Erreur pour RAM: {e}")
            
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
        
        services_data = query_api("entities", {
            "entitySelector": f"type(SERVICE),mzName(\"{current_mz}\")",
            "fields": "+properties,+fromRelationships"
        })
        
        service_metrics = []
        
        for service in services_data.get('entities', []):
            service_id = service.get('entityId')
            print(f"Traitement du service: {service.get('displayName')}")
            
            # Vérification du type de service et activité
            service_details = query_api(f"entities/{service_id}")
            service_type = service_details.get('type', '')
            service_status = "Actif"
            
            # Vérifie si le service est inactif (aucune donnée récente)
            if 'monitoring' in service_details.get('properties', {}) and 'monitoringState' in service_details['properties']['monitoring']:
                if service_details['properties']['monitoring']['monitoringState'] != "ACTIVE":
                    service_status = "Inactif"
                    print(f"  Service {service.get('displayName')} est inactif")
            
            # Récupération des métriques
            response_time = None
            error_rate = None
            requests_count = None
            response_time_history = []
            error_rate_history = []
            request_count_history = []
            
            try:
                response_time_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:service.response.time",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    }
                )
                
                if response_time_data.get('result', []) and response_time_data['result'][0].get('data', []):
                    values = response_time_data['result'][0]['data'][0].get('values', [])
                    if values:
                        response_time = int(values[0])
                    else:
                        print(f"  Pas de valeurs pour le temps de réponse (service inactif?)")
                else:
                    print(f"  Pas de résultats pour le temps de réponse (mauvaise métrique?)")
                    
                # Récupérer l'historique du temps de réponse pour les graphiques
                response_time_history = get_metric_history(service_id, "builtin:service.response.time", from_time, to_time)
            except Exception as e:
                print(f"  Erreur pour le temps de réponse: {e}")
            
            try:
                error_rate_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:service.errors.total.rate",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    }
                )
                if error_rate_data.get('result', []) and error_rate_data['result'][0].get('data', []):
                    values = error_rate_data['result'][0]['data'][0].get('values', [])
                    if values:
                        error_rate = round(values[0], 1)
                
                # Récupérer l'historique du taux d'erreur
                error_rate_history = get_metric_history(service_id, "builtin:service.errors.total.rate", from_time, to_time)
            except Exception as e:
                print(f"  Erreur pour le taux d'erreur: {e}")
            
            try:
                requests_data = query_api(
                    endpoint="metrics/query",
                    params={
                        "metricSelector": "builtin:service.requestCount.total",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    }
                )
                if requests_data.get('result', []) and requests_data['result'][0].get('data', []):
                    values = requests_data['result'][0]['data'][0].get('values', [])
                    if values:
                        requests_count = int(values[0])
                
                # Récupérer l'historique du nombre de requêtes
                request_count_history = get_metric_history(service_id, "builtin:service.requestCount.total", from_time, to_time)
            except Exception as e:
                print(f"  Erreur pour le nombre de requêtes: {e}")
            
            # Récupération avancée de la technologie
            tech_info = extract_technology(service)
            
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
        return {'error': str(e)}

@app.route('/api/processes', methods=['GET'])
@cached('process_groups')
def get_processes():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        process_groups_data = query_api("entities", {
            "entitySelector": f"type(PROCESS_GROUP),mzName(\"{current_mz}\")",
            "fields": "+properties,+fromRelationships"
        })
        
        process_metrics = []
        
        for pg in process_groups_data.get('entities', []):
            pg_id = pg.get('entityId')
            
            # Récupération avancée de la technologie
            tech_info = extract_technology(pg)
            
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
        return {'error': str(e)}

@app.route('/api/problems', methods=['GET'])
@cached('problems')
def get_problems():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        problems_data = query_api(
            endpoint="problems",
            params={
                "from": "-24h",
                "status": "OPEN",
                "managementZone": current_mz
            }
        )
        
        active_problems = []
        if 'problems' in problems_data:
            for problem in problems_data['problems']:
                active_problems.append({
                    'id': problem.get('problemId', 'Unknown'),
                    'title': problem.get('title', 'Problème inconnu'),
                    'impact': problem.get('impactLevel', 'UNKNOWN'),
                    'status': problem.get('status', 'OPEN'),
                    'affected_entities': len(problem.get('affectedEntities', [])),
                    'start_time': datetime.fromtimestamp(problem.get('startTime', 0)/1000).strftime('%Y-%m-%d %H:%M'),
                    'dt_url': f"{DT_ENV_URL}/#problems/problemdetails;pid={problem.get('problemId', 'Unknown')}"
                })
        
        return active_problems
    except Exception as e:
        return {'error': str(e)}

@app.route('/api/management-zones', methods=['GET'])
@cached('management_zones')
def get_management_zones():
    try:
        print("Fetching management zones...")
        
        # Version de l'API v2 actuelle
        # mz_data = query_api("managementZones")
        
        # Essayons l'ancienne API v1
        url = f"{DT_ENV_URL}/api/config/v1/managementZones"
        headers = {
            'Authorization': f'Api-Token {API_TOKEN}',
            'Accept': 'application/json'
        }
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        mz_data = response.json()
        
        print("API Response:", json.dumps(mz_data, indent=2))
        
        management_zones = []
        
        # Pour l'API v1 config
        for mz in mz_data.get('values', []):
            management_zones.append({
                'id': mz.get('id'),
                'name': mz.get('name'),
                'dt_url': f"{DT_ENV_URL}/#settings/managementzones;id={mz.get('id')}"
            })
        
        print(f"Found {len(management_zones)} management zones")
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