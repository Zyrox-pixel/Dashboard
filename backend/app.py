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
import logging
import threading
from optimization import OptimizedAPIClient, time_execution

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Désactiver les avertissements SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Charger les variables d'environnement
load_dotenv()

# Récupérer les variables d'environnement
DT_ENV_URL = os.environ.get('DT_ENV_URL')
API_TOKEN = os.environ.get('API_TOKEN')
# Durée du cache général
CACHE_DURATION = int(os.environ.get('CACHE_DURATION', 300))
# Durée du cache pour les problèmes (plus courte)
PROBLEMS_CACHE_DURATION = int(os.environ.get('PROBLEMS_CACHE_DURATION', 60))
MAX_WORKERS = int(os.environ.get('MAX_WORKERS', 20))
MAX_CONNECTIONS = int(os.environ.get('MAX_CONNECTIONS', 50))

# Créer l'application Flask
app = Flask(__name__)
CORS(app)  # Activer CORS pour toutes les routes

# Initialiser le client API optimisé
api_client = OptimizedAPIClient(
    env_url=DT_ENV_URL,
    api_token=API_TOKEN,
    verify_ssl=os.environ.get('VERIFY_SSL', 'False').lower() in ('true', '1', 't'),
    max_workers=MAX_WORKERS,
    max_connections=MAX_CONNECTIONS,
    cache_duration=CACHE_DURATION
)

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

# Nouvel endpoint pour obtenir les Management Zones de Vital for Group
@app.route('/api/vital-for-entreprise-mzs', methods=['GET'])
def get_vital_for_entreprise_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        vfe_mz_string = os.environ.get('VFE_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"VFE_MZ_LIST from .env: {vfe_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not vfe_mz_string:
            logger.warning("VFE_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        vfe_mzs = [mz.strip() for mz in vfe_mz_string.split(',')]
        logger.info(f"Parsed VFE MZs: {vfe_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': vfe_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Vital for Entreprise: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500
        
@app.route('/api/vital-for-group-mzs', methods=['GET'])
def get_vital_for_group_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"VFG_MZ_LIST from .env: {vfg_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not vfg_mz_string:
            logger.warning("VFG_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        vfg_mzs = [mz.strip() for mz in vfg_mz_string.split(',')]
        logger.info(f"Parsed MZs: {vfg_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': vfg_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Vital for Group: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

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
            except Exception as e:
                logger.error(f"Erreur lors de la lecture du fichier de config MZ: {e}")
    
    # Si pas dans le fichier, utiliser la variable d'environnement
    return os.environ.get('MZ_NAME', '')

# Décorateur pour la mise en cache (version optimisée)
def cached(cache_key_prefix):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Initialiser le résultat
            result = None
            
            try:
                # Récupérer la clé de cache complète
                cache_key = f"{cache_key_prefix}:{get_current_mz()}"
                
                # Vérifier si les données sont en cache
                cached_data = api_client.get_cached(cache_key)
                if cached_data is not None:
                    return jsonify(cached_data)
                
                # Si non, exécuter la fonction et mettre en cache
                result = f(*args, **kwargs)
                api_client.set_cache(cache_key, result)
            except Exception as e:
                logger.error(f"Erreur dans le décorateur cached: {e}")
                # Récupérer le résultat malgré tout
                if result is None:
                    result = f(*args, **kwargs)
            
            return jsonify(result)
        return decorated_function
    return decorator

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
        
        # Réinitialiser tous les caches de type entités
        api_client.clear_cache('services:')
        api_client.clear_cache('hosts:')
        api_client.clear_cache('process_groups:')
        api_client.clear_cache('problems:')
        api_client.clear_cache('summary:')
        
        return jsonify({
            'success': True, 
            'message': f'Management Zone définie sur: {mz_name}',
            'management_zone': mz_name
        })
    except Exception as e:
        logger.error(f"Erreur lors de la définition de la MZ: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/problems', methods=['GET'])
# Retiré le décorateur de cache pour les problèmes pour garantir des données en temps réel
@time_execution
def get_problems():
    try:
        # Récupérer les paramètres de requête
        status = request.args.get('status', 'OPEN')  # Par défaut "OPEN"
        time_from = request.args.get('from', '-30d')  # Par défaut "-30d" pour inclure les problèmes plus anciens
        # Nous n'avons plus besoin de ce paramètre, car nous voulons toujours filtrer par les management zones spécifiées
        # disable_mz_filter = request.args.get('disable_mz_filter', 'false').lower() == 'true'
        dashboard_type = request.args.get('type', '')  # Pour identifier VFG ou VFE
        
        # Débogage approfondi - à activer temporairement
        debug_mode = request.args.get('debug', 'false').lower() == 'true'
        
        # Paramètre pour activer le cache (désactivé par défaut pour les problèmes OPEN)
        use_cache = request.args.get('cache', 'false').lower() == 'true'
        if status == 'OPEN':
            use_cache = False  # Forcer les problèmes actifs à être toujours à jour
        
        # Créer une clé de cache unique qui inclut tous les paramètres
        specific_cache_key = f"problems:{get_current_mz()}:{time_from}:{status}:{dashboard_type}"
        
        # Si le mode debug est activé, vider le cache pour cette requête
        if debug_mode:
            api_client.cache.pop(specific_cache_key, None)
            logger.info(f"Mode debug activé, cache vidé pour la clé: {specific_cache_key}")
        elif not use_cache:
            # Vider systématiquement le cache pour les problèmes ouverts
            api_client.cache.pop(specific_cache_key, None)
            logger.info(f"Cache des problèmes désactivé pour les problèmes {status}, récupération en temps réel")
        else:
            # Si nous avons déjà cette requête en cache, retourner les données
            cached_data = api_client.get_cached(specific_cache_key)
            if cached_data is not None:
                return cached_data
            
        # Déterminer le statut à utiliser (NULL si ALL)
        use_status = None if status == 'ALL' else status
        
        # Log pour debug
        logger.info(f"Requête problèmes: status={status}, time_from={time_from}, dashboard_type={dashboard_type}, debug={debug_mode}")
        
        # Si un type de dashboard est spécifié (vfg ou vfe)
        if dashboard_type in ['vfg', 'vfe']:
            # Récupérer la liste des MZ correspondantes
            mz_list_var = 'VFG_MZ_LIST' if dashboard_type == 'vfg' else 'VFE_MZ_LIST'
            mz_string = os.environ.get(mz_list_var, '')
            
            if not mz_string:
                logger.warning(f"{mz_list_var} est vide ou non définie dans .env")
                return []
                
            mz_list = [mz.strip() for mz in mz_string.split(',')]
            logger.info(f"Liste des MZs {dashboard_type}: {mz_list}")
            
            # Récupérer les problèmes pour chaque MZ et les combiner
            all_problems = []
            
            for mz_name in mz_list:
                try:
                    logger.info(f"Récupération des problèmes pour MZ: {mz_name} avec timeframe={time_from}, status={use_status}")
                    # Utiliser la méthode éprouvée qui fonctionnait avant
                    # Toujours utiliser le filtrage par MZ, en passant strictement le nom de la zone
                    mz_problems = api_client.get_problems_filtered(mz_name, time_from, use_status)
                    logger.info(f"MZ {mz_name}: {len(mz_problems)} problèmes trouvés")
                    
                    # Ajouter le champ 'resolved' pour les requêtes ALL
                    for problem in mz_problems:
                        if status == 'ALL' and 'resolved' not in problem:
                            problem['resolved'] = problem.get('status') != 'OPEN'
                    
                    all_problems.extend(mz_problems)
                except Exception as mz_error:
                    logger.error(f"Erreur lors de la récupération des problèmes pour MZ {mz_name}: {mz_error}")
            
            # Dédupliquer les problèmes (un même problème peut affecter plusieurs MZs)
            unique_problems = []
            problem_ids = set()
            for problem in all_problems:
                if problem['id'] not in problem_ids:
                    problem_ids.add(problem['id'])
                    unique_problems.append(problem)
            
            logger.info(f"Récupéré {len(unique_problems)} problèmes uniques pour {dashboard_type.upper()} (timeframe: {time_from}, status: {status})")
            
            # En mode debug, afficher les problèmes pour investigation
            if debug_mode:
                for i, prob in enumerate(unique_problems):
                    logger.info(f"Problème {i+1}: {prob['id']} - {prob['title']} - Status: {prob['status']} - Resolved: {prob.get('resolved', False)}")
            
            # Mettre en cache le résultat avec la clé spécifique
            api_client.set_cache(specific_cache_key, unique_problems)
            return unique_problems
            
        else:
            # Comportement pour une MZ spécifique
            current_mz = get_current_mz()
            if not current_mz:
                return {'error': 'Aucune Management Zone définie'}
            
            # Utiliser la méthode optimisée pour récupérer les problèmes filtrés
            # Si on désactive le filtrage par MZ, on passe None pour mz_name
            effective_mz = None if disable_mz_filter else current_mz
            problems = api_client.get_problems_filtered(effective_mz, time_from, use_status)
            
            # En mode debug, afficher les problèmes pour investigation
            if debug_mode:
                for i, prob in enumerate(problems):
                    logger.info(f"Problème {i+1}: {prob['id']} - {prob['title']} - Status: {prob['status']} - Resolved: {prob.get('resolved', False)}")
            
            # Mettre en cache le résultat avec la clé spécifique
            api_client.set_cache(specific_cache_key, problems)
            
            logger.info(f"MZ {current_mz}: {len(problems)} problèmes récupérés (timeframe: {time_from}, status: {status})")
            return problems
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des problèmes: {e}")
        return {'error': str(e)}


@app.route('/api/current-management-zone', methods=['GET'])
def get_current_management_zone():
    try:
        current_mz = get_current_mz()
        return jsonify({
            'management_zone': current_mz
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de la MZ actuelle: {e}")
        return jsonify({'error': str(e)}), 500

# Routes API optimisées
@app.route('/api/summary', methods=['GET'])
@cached('summary')
@time_execution
def get_summary():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la méthode optimisée pour récupérer le résumé
        return api_client.get_summary_parallelized(current_mz, from_time, to_time)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du résumé: {e}")
        return {'error': str(e)}

@app.route('/api/hosts', methods=['GET'])
@cached('hosts')
@time_execution
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
        
        # Récupérer les entités hôtes
        hosts_data = api_client.query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        # Extraire les IDs des hôtes
        host_ids = [host.get('entityId') for host in hosts_data.get('entities', [])]
        
        # Si aucun hôte n'est trouvé, retourner une liste vide
        if not host_ids:
            return []
        
        # Récupérer les métriques pour tous les hôtes en parallèle
        return api_client.get_hosts_metrics_parallel(host_ids, from_time, to_time)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des hôtes: {e}")
        return {'error': str(e)}

@app.route('/api/services', methods=['GET'])
@cached('services')
@time_execution
def get_services():
    try:
        now = datetime.now()
        from_time = int((now - timedelta(minutes=30)).timestamp() * 1000)  # Récupération des 30 dernières minutes
        to_time = int(now.timestamp() * 1000)
        
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("SERVICE", current_mz)
        
        # Récupérer les entités services
        services_data = api_client.query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        # Extraire les IDs des services
        service_ids = [service.get('entityId') for service in services_data.get('entities', [])]
        
        # Si aucun service n'est trouvé, retourner une liste vide
        if not service_ids:
            return []
        
        # Récupérer les métriques pour tous les services en parallèle
        return api_client.get_service_metrics_parallel(service_ids, from_time, to_time)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des services: {e}")
        return {'error': str(e)}

@app.route('/api/processes', methods=['GET'])
@cached('process_groups')
@time_execution
def get_processes():
    try:
        # Récupérer la Management Zone actuelle
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("PROCESS_GROUP", current_mz)
        
        # Récupérer les groupes de processus
        process_groups_data = api_client.query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships"
        })
        
        process_metrics = []
        
        # Requêtes en lot pour les technologies
        process_ids = []
        for pg in process_groups_data.get('entities', []):
            process_ids.append(pg.get('entityId'))
        
        # Traiter les processus en lot si disponibles
        if process_ids:
            # Récupérer les détails de technologie en parallèle
            tech_queries = [(f"entities/{pg_id}", None) for pg_id in process_ids]
            tech_results = api_client.batch_query(tech_queries)
            
            for i, pg in enumerate(process_groups_data.get('entities', [])):
                pg_id = pg.get('entityId')
                
                # Récupération avancée de la technologie
                tech_info = api_client.extract_technology(pg_id)
                
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
        logger.error(f"Erreur lors de la récupération des processus: {e}")
        return {'error': str(e)}


@app.route('/api/management-zones', methods=['GET'])
@cached('management_zones')
@time_execution
def get_management_zones():
    try:
        logger.info("Récupération des management zones...")
        
        # MODIFICATION : D'abord essayer de récupérer les MZ VFG
        vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
        if vfg_mz_string:
            mzs_from_env = [mz.strip() for mz in vfg_mz_string.split(',')]
            logger.info(f"Utilisation des MZ depuis le fichier .env: {mzs_from_env}")
            
            # Créer les objets de management zone directement
            management_zones = []
            for i, mz_name in enumerate(mzs_from_env):
                management_zones.append({
                    'id': f"env-{i}",
                    'name': mz_name,
                    'dt_url': f"{DT_ENV_URL}/#settings/managementzones"
                })
            
            logger.info(f"Trouvé {len(management_zones)} management zones depuis le fichier .env")
            return management_zones
        
        # Sinon, essayer l'API Dynatrace
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
        
        logger.info(f"Trouvé {len(management_zones)} management zones")
        return management_zones
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des management zones: {e}")
        
        # MODIFICATION : En cas d'erreur, toujours essayer d'utiliser les MZ du fichier .env
        try:
            vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
            if vfg_mz_string:
                mzs_from_env = [mz.strip() for mz in vfg_mz_string.split(',')]
                logger.info(f"Fallback: Utilisation des MZ depuis .env: {mzs_from_env}")
                
                management_zones = []
                for i, mz_name in enumerate(mzs_from_env):
                    management_zones.append({
                        'id': f"env-{i}",
                        'name': mz_name,
                        'dt_url': "#"
                    })
                
                return management_zones
        except Exception as fallback_error:
            logger.error(f"Erreur lors du fallback sur .env: {fallback_error}")
        
        return {'error': str(e)}

@app.route('/api/status', methods=['GET'])
def get_status():
    # Vérifier les statuts de cache
    cache_statuses = {}
    cache_expiry = {}
    
    for cache_key in ['services', 'hosts', 'process_groups', 'problems', 'summary']:
        cached_data = api_client.get_cached(f"{cache_key}:{get_current_mz()}")
        if cached_data is not None:
            cache_statuses[cache_key] = 'fresh'
            # Calculer le temps restant jusqu'à l'expiration
            cache_item = api_client.cache.get(f"{cache_key}:{get_current_mz()}")
            if cache_item:
                cache_expiry[cache_key] = int(cache_item['timestamp'] + CACHE_DURATION - time.time())
            else:
                cache_expiry[cache_key] = 0
        else:
            cache_statuses[cache_key] = 'stale'
            cache_expiry[cache_key] = 0
    
    return jsonify({
        'status': 'online',
        'cache_status': cache_statuses,
        'cache_expiry': cache_expiry,
        'server_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'version': '1.1.0',
        'optimized': True
    })

@app.route('/api/refresh/<cache_type>', methods=['POST'])
def refresh_cache(cache_type):
    if cache_type not in ['services', 'hosts', 'process_groups', 'problems', 'summary', 'all', 'purge']:
        return jsonify({'error': f'Type de cache {cache_type} non trouvé'}), 404
    
    # Si 'purge', vider complètement le cache, y compris les clés personnalisées
    if cache_type == 'purge':
        api_client.cache.clear()
        return jsonify({'success': True, 'message': 'Cache complètement purgé'})
    
    # Si 'all', effacer tous les caches standard
    if cache_type == 'all':
        api_client.clear_cache()
        return jsonify({'success': True, 'message': 'Tous les caches ont été effacés'})
    
    # Sinon, effacer uniquement le cache spécifié
    api_client.clear_cache(f"{cache_type}:")
    return jsonify({'success': True, 'message': f'Cache {cache_type} effacé avec succès'})

@app.route('/api/performance', methods=['GET'])
def get_performance():
    """Endpoint pour obtenir des statistiques de performance"""
    # Collecter les statistiques de cache
    cache_stats = {
        'size': len(api_client.cache),
        'hit_rate': 0,  # Cela nécessiterait un suivi plus détaillé des hits/misses
        'items': []
    }
    
    # Ajouter des informations sur les éléments du cache
    for key, item in api_client.cache.items():
        age = time.time() - item['timestamp']
        expiry = CACHE_DURATION - age
        if expiry > 0:
            cache_stats['items'].append({
                'key': key,
                'age': round(age, 2),
                'expiry': round(expiry, 2),
                'size': len(str(item['data']))
            })
    
    # Trier les éléments par âge
    cache_stats['items'] = sorted(cache_stats['items'], key=lambda x: x['age'])
    
    # Limiter à 10 éléments pour éviter des réponses trop volumineuses
    cache_stats['items'] = cache_stats['items'][:10]
    
    return jsonify({
        'cache': cache_stats,
        'server_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'uptime': 0,  # Nécessiterait de stocker l'heure de démarrage
        'api_client_version': '1.0',
        'optimized': True
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')