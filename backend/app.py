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
import traceback

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

# Fonction pour obtenir la liste des MZs Vital for Production
def get_vital_for_production_mzs():
    # Récupérer la liste depuis la variable d'environnement
    vfp_mz_string = os.environ.get('VFP_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not vfp_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in vfp_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs Vital for Analytics
def get_vital_for_analytics_mzs():
    # Récupérer la liste depuis la variable d'environnement
    vfa_mz_string = os.environ.get('VFA_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not vfa_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in vfa_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs Detection & CTL
def get_detection_ctl_mzs():
    # Récupérer la liste depuis la variable d'environnement
    detection_ctl_mz_string = os.environ.get('DETECTION_CTL_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not detection_ctl_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in detection_ctl_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs Security & Encryption
def get_security_encryption_mzs():
    # Récupérer la liste depuis la variable d'environnement
    security_encryption_mz_string = os.environ.get('SECURITY_ENCRYPTION_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not security_encryption_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in security_encryption_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs FCE Security
def get_fce_security_mzs():
    # Récupérer la liste depuis la variable d'environnement
    fce_security_mz_string = os.environ.get('FCE_SECURITY_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not fce_security_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in fce_security_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs Network Filtering
def get_network_filtering_mzs():
    # Récupérer la liste depuis la variable d'environnement
    network_filtering_mz_string = os.environ.get('NETWORK_FILTERING_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not network_filtering_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in network_filtering_mz_string.split(',')]

# Fonction pour obtenir la liste des MZs Identity
def get_identity_mzs():
    # Récupérer la liste depuis la variable d'environnement
    identity_mz_string = os.environ.get('IDENTITY_MZ_LIST', '')
    
    # Si la variable n'est pas définie, retourner une liste vide
    if not identity_mz_string:
        return []
    
    # Diviser la chaîne en liste de MZs
    return [mz.strip() for mz in identity_mz_string.split(',')]

# Endpoint pour obtenir les Management Zones de Vital for Entreprise
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

@app.route('/api/detection-ctl-mzs', methods=['GET'])
def get_detection_ctl_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        detection_ctl_mz_string = os.environ.get('DETECTION_CTL_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"DETECTION_CTL_MZ_LIST from .env: {detection_ctl_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not detection_ctl_mz_string:
            logger.warning("DETECTION_CTL_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        detection_ctl_mzs = [mz.strip() for mz in detection_ctl_mz_string.split(',')]
        logger.info(f"Parsed Detection & CTL MZs: {detection_ctl_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': detection_ctl_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Detection & CTL: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/security-encryption-mzs', methods=['GET'])
def get_security_encryption_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        security_encryption_mz_string = os.environ.get('SECURITY_ENCRYPTION_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"SECURITY_ENCRYPTION_MZ_LIST from .env: {security_encryption_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not security_encryption_mz_string:
            logger.warning("SECURITY_ENCRYPTION_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        security_encryption_mzs = [mz.strip() for mz in security_encryption_mz_string.split(',')]
        logger.info(f"Parsed Security & Encryption MZs: {security_encryption_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': security_encryption_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Security & Encryption: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/vital-for-production-mzs', methods=['GET'])
def get_vital_for_production_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        vfp_mz_string = os.environ.get('VFP_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"VFP_MZ_LIST from .env: {vfp_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not vfp_mz_string:
            logger.warning("VFP_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        vfp_mzs = [mz.strip() for mz in vfp_mz_string.split(',')]
        logger.info(f"Parsed Vital for Production MZs: {vfp_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': vfp_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Vital for Production: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/vital-for-analytics-mzs', methods=['GET'])
def get_vital_for_analytics_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        vfa_mz_string = os.environ.get('VFA_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"VFA_MZ_LIST from .env: {vfa_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not vfa_mz_string:
            logger.warning("VFA_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        vfa_mzs = [mz.strip() for mz in vfa_mz_string.split(',')]
        logger.info(f"Parsed Vital for Analytics MZs: {vfa_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': vfa_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Vital for Analytics: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/fce-security-mzs', methods=['GET'])
def get_fce_security_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        fce_security_mz_string = os.environ.get('FCE_SECURITY_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"FCE_SECURITY_MZ_LIST from .env: {fce_security_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not fce_security_mz_string:
            logger.warning("FCE_SECURITY_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        fce_security_mzs = [mz.strip() for mz in fce_security_mz_string.split(',')]
        logger.info(f"Parsed FCE Security MZs: {fce_security_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': fce_security_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs FCE Security: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/network-filtering-mzs', methods=['GET'])
def get_network_filtering_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        network_filtering_mz_string = os.environ.get('NETWORK_FILTERING_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"NETWORK_FILTERING_MZ_LIST from .env: {network_filtering_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not network_filtering_mz_string:
            logger.warning("NETWORK_FILTERING_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        network_filtering_mzs = [mz.strip() for mz in network_filtering_mz_string.split(',')]
        logger.info(f"Parsed Network Filtering MZs: {network_filtering_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': network_filtering_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Network Filtering: {e}")
        # Retourner une réponse même en cas d'erreur
        return jsonify({
            'mzs': [],
            'source': 'env_file',
            'error': str(e)
        }), 500

@app.route('/api/identity-mzs', methods=['GET'])
def get_identity_mzs_endpoint():
    try:
        # Récupérer directement la liste depuis la variable d'environnement
        identity_mz_string = os.environ.get('IDENTITY_MZ_LIST', '')
        
        # Logging pour debug
        logger.info(f"IDENTITY_MZ_LIST from .env: {identity_mz_string}")
        
        # Si la variable n'est pas définie, retourner une liste vide
        if not identity_mz_string:
            logger.warning("IDENTITY_MZ_LIST is empty or not defined in .env file")
            return jsonify({'mzs': [], 'source': 'env_file'})
        
        # Diviser la chaîne en liste de MZs
        identity_mzs = [mz.strip() for mz in identity_mz_string.split(',')]
        logger.info(f"Parsed Identity MZs: {identity_mzs}")
        
        # Format de réponse simple
        return jsonify({
            'mzs': identity_mzs,
            'source': 'env_file'  # Indique que les données viennent du fichier .env
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des MZs Identity: {e}")
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

@app.route('/api/problems-72h', methods=['GET'])
@time_execution
def get_problems_72h():
    """
    Endpoint dédié pour récupérer tous les problèmes pour une période spécifiée (72h par défaut).
    Basé sur l'approche du script Python qui fonctionne correctement,
    avec gestion de la pagination et filtrage précis.
    """
    try:
        # Récupérer les paramètres de requête
        dashboard_type = request.args.get('type', '')  # Pour identifier VFG ou VFE
        zone_filter = request.args.get('zone', '')  # Pour filtrer par une zone spécifique
        timeframe = request.args.get('timeframe', 'now-72h')  # Période (72h par défaut)
        debug_mode = request.args.get('debug', 'false').lower() == 'true'

        # Créer une clé de cache unique pour cette requête qui inclut la période
        specific_cache_key = f"problems-72h:{dashboard_type}:{zone_filter}:{timeframe}"

        # En mode debug, toujours vider le cache
        if debug_mode:
            if specific_cache_key in api_client.cache:
                api_client.cache.pop(specific_cache_key, None)
        # Sinon, vérifier le cache
        else:
            cached_data = api_client.get_cached(specific_cache_key)
            if cached_data is not None:
                return jsonify(cached_data)
        
        # MODIFICATION IMPORTANTE: Utilisation du script test qui fonctionne
        # Utiliser la fonction de test_problems_api.py qui fonctionne, adaptée pour notre endpoint
        try:
            from test_problems_api import test_get_problems
            logger.info("TENTATIVE ALTERNATIVE: Utilisation directe de la fonction test_get_problems qui fonctionne")
            
            # Si c'est un type de dashboard spécifique, récupérer les problèmes pour toutes les zones
            if dashboard_type in ['vfg', 'vfe', 'vfp', 'vfa', 'detection', 'security']:
                # Si un filtre de zone est fourni, l'utiliser au lieu de toutes les zones
                if zone_filter:
                    problems = test_get_problems(management_zone_name=zone_filter, time_from=timeframe, status="OPEN,CLOSED")
                    
                    # Formater chaque problème pour ajouter les informations d'entité impactée
                    formatted_problems = []
                    for problem in problems:
                        formatted_problem = api_client._format_problem(problem, zone_filter)
                        formatted_problems.append(formatted_problem)
                    
                    # Mettre en cache le résultat
                    api_client.set_cache(specific_cache_key, formatted_problems)
                    return jsonify(formatted_problems)
                
                # Récupérer la liste des MZs pour ce dashboard type
                if dashboard_type == 'vfg':
                    mz_list_var = 'VFG_MZ_LIST'
                elif dashboard_type == 'vfe':
                    mz_list_var = 'VFE_MZ_LIST'
                elif dashboard_type == 'vfp':
                    mz_list_var = 'VFP_MZ_LIST'
                elif dashboard_type == 'vfa':
                    mz_list_var = 'VFA_MZ_LIST'
                elif dashboard_type == 'detection':
                    mz_list_var = 'DETECTION_CTL_MZ_LIST'
                elif dashboard_type == 'security':
                    mz_list_var = 'SECURITY_ENCRYPTION_MZ_LIST'
                else:
                    mz_list_var = 'VFG_MZ_LIST'  # Fallback au cas où
                    
                mz_string = os.environ.get(mz_list_var, '')
                
                if not mz_string:
                    logger.warning(f"{mz_list_var} est vide ou non définie dans .env")
                    return jsonify([])
                    
                mz_list = [mz.strip() for mz in mz_string.split(',')]
                logger.info(f"Liste des MZs {dashboard_type} pour problèmes 72h: {mz_list}")
                
                # Log de vérification pour VFG_MZ_LIST
                if dashboard_type == 'vfg':
                    logger.info(f"Vérification VFG_MZ_LIST: {os.environ.get('VFG_MZ_LIST')}")
                
                # Récupérer tous les problèmes pour chaque MZ et les combiner
                all_problems = []
                
                for mz_name in mz_list:
                    try:
                        mz_problems = test_get_problems(management_zone_name=mz_name, time_from=timeframe, status="OPEN,CLOSED")
                        all_problems.extend(mz_problems)
                    except Exception as mz_error:
                        logger.error(f"Erreur lors de la récupération des problèmes 72h pour MZ {mz_name}: {mz_error}")
                
                # Dédupliquer les problèmes
                unique_problems = []
                problem_ids = set()
                
                # Vérifier la structure des problèmes et la clé d'identification
                logger.info(f"Déduplication: examen de {len(all_problems)} problèmes")
                
                # Vérifier la structure du premier problème si disponible
                if all_problems and len(all_problems) > 0:
                    logger.info(f"Structure du premier problème:")
                    problem_keys = list(all_problems[0].keys())
                    logger.info(f"Clés disponibles: {problem_keys}")
                    
                    # Déterminer la bonne clé d'ID (problemId ou id)
                    id_key = 'problemId' if 'problemId' in problem_keys else 'id'
                    logger.info(f"Utilisation de la clé '{id_key}' pour l'identification des problèmes")
                    
                    # Vérification des managementZones pour s'assurer que tous les problèmes sont bien associés à une MZ de la liste
                    filtered_problems = []
                    for problem in all_problems:
                        # Vérifier si le problème appartient à une des management zones de notre liste
                        is_in_mz_list = False
                        
                        # Récupérer les management zones du problème
                        problem_mzs = []
                        if 'managementZones' in problem:
                            problem_mzs = [mz.get('name', '') for mz in problem.get('managementZones', [])]
                        
                        # Vérifier si une des MZ du problème correspond EXACTEMENT à une MZ de notre liste
                        # Et stocker la MZ correspondante pour l'affichage
                        matching_mz = None
                        for mz_name in mz_list:
                            # Journaliser les MZs pour débogage
                            logger.info(f"Comparaison: problème {problem.get(id_key)} a MZs={problem_mzs}, comparé avec {mz_name}")
                            # Vérification stricte d'égalité complète, pas de correspondance partielle
                            if any(problem_mz == mz_name for problem_mz in problem_mzs):
                                is_in_mz_list = True
                                matching_mz = mz_name  # Stocker la MZ correspondante
                                logger.info(f"MATCH EXACT: Problème {problem.get(id_key)} appartient à la MZ {mz_name}")
                                break
                        
                        # Stocker la MZ correspondante dans le problème pour l'utiliser plus tard
                        if is_in_mz_list and matching_mz:
                            problem['matching_mz'] = matching_mz
                        
                        if is_in_mz_list:
                            filtered_problems.append(problem)
                        else:
                            logger.info(f"Problème {problem.get(id_key)} ignoré car n'appartient pas aux MZs {mz_list}")
                    
                    logger.info(f"Après filtrage par liste de MZ: {len(filtered_problems)}/{len(all_problems)} problèmes conservés")
                    
                    # Utilisez la bonne clé pour la déduplication des problèmes filtrés
                    for problem in filtered_problems:
                        problem_id = problem.get(id_key)
                        if problem_id and problem_id not in problem_ids:
                            problem_ids.add(problem_id)
                            unique_problems.append(problem)
                            logger.info(f"Problème ajouté: {problem_id}")
                else:
                    logger.warning("Aucun problème à dédupliquer")
                
                logger.info(f"Déduplication terminée: {len(unique_problems)} problèmes uniques sur {len(all_problems)} au total")
                
                logger.info(f"Récupéré {len(unique_problems)} problèmes uniques sur 72h pour {dashboard_type.upper()} avec test_get_problems")
                
                # Formater chaque problème pour ajouter les informations d'entité impactée
                formatted_problems = []
                for problem in unique_problems:
                    formatted_problem = api_client._format_problem(problem, zone_filter)
                    formatted_problems.append(formatted_problem)
                
                # Mettre en cache le résultat
                api_client.set_cache(specific_cache_key, formatted_problems)
                return jsonify(formatted_problems)
            
            # En cas de dashboard type non reconnu, essayer la méthode normale
            logger.info("Retour à l'implémentation standard")
            
        except ImportError:
            logger.warning("Module test_problems_api non trouvé, utilisation de l'implémentation standard")
        except Exception as test_error:
            logger.error(f"Erreur lors de l'utilisation de test_get_problems: {test_error}")
            logger.error(traceback.format_exc())
        
        # SI MÉTHODE ALTERNATIVE ÉCHOUE, ON REVIENT À L'IMPLÉMENTATION STANDARD
        logger.info("Utilisation de l'implémentation standard")
        
        # Si un type de dashboard est spécifié
        if dashboard_type in ['vfg', 'vfe', 'detection', 'security']:
            # Si un filtre de zone est fourni, l'utiliser au lieu de toutes les zones
            if zone_filter:
                logger.info(f"Filtrage par zone spécifique: {zone_filter} pour dashboard {dashboard_type}")
                try:
                    # Utiliser le moteur spécifique qui gère la pagination
                    logger.info(f"Appel get_all_problems_with_pagination pour zone: {zone_filter}")
                    problems = get_all_problems_with_pagination(zone_filter, timeframe, "OPEN,CLOSED")
                    logger.info(f"Zone {zone_filter}: {len(problems)} problèmes trouvés sur 72h")
                    
                    # Afficher un exemple de problème s'il y en a
                    if problems:
                        logger.info(f"Exemple de premier problème: {json.dumps(problems[0])[:200]}...")
                    else:
                        logger.info("Aucun problème trouvé pour cette zone")
                    
                    # Mettre en cache le résultat
                    api_client.set_cache(specific_cache_key, problems)
                    return jsonify(problems)
                except Exception as zone_error:
                    logger.error(f"Erreur lors de la récupération des problèmes pour zone {zone_filter}: {zone_error}")
                    logger.error(traceback.format_exc())
                    return jsonify([])
            
            # Récupérer la liste des MZs pour ce dashboard type
            if dashboard_type == 'vfg':
                mz_list_var = 'VFG_MZ_LIST'
            elif dashboard_type == 'vfe':
                mz_list_var = 'VFE_MZ_LIST'
            elif dashboard_type == 'detection':
                mz_list_var = 'DETECTION_CTL_MZ_LIST'
            elif dashboard_type == 'security':
                mz_list_var = 'SECURITY_ENCRYPTION_MZ_LIST'
            else:
                mz_list_var = 'VFG_MZ_LIST'  # Fallback au cas où
                
            mz_string = os.environ.get(mz_list_var, '')
            
            logger.info(f"Valeur de {mz_list_var}: '{mz_string}'")
            
            if not mz_string:
                logger.warning(f"{mz_list_var} est vide ou non définie dans .env")
                return jsonify([])
                
            mz_list = [mz.strip() for mz in mz_string.split(',')]
            logger.info(f"Liste des MZs {dashboard_type} pour problèmes 72h: {mz_list}")
            
            # Récupérer les problèmes pour chaque MZ et les combiner
            all_problems = []
            
            for mz_name in mz_list:
                try:
                    logger.info(f"Récupération des problèmes 72h pour MZ: {mz_name}")
                    # Utiliser la nouvelle fonction qui gère la pagination
                    mz_problems = get_all_problems_with_pagination(mz_name, timeframe, "OPEN,CLOSED")
                    logger.info(f"MZ {mz_name}: {len(mz_problems)} problèmes trouvés sur 72h")
                    
                    # Afficher un exemple de problème s'il y en a
                    if mz_problems:
                        logger.info(f"Exemple pour MZ {mz_name}: {json.dumps(mz_problems[0])[:200]}...")
                    
                    all_problems.extend(mz_problems)
                except Exception as mz_error:
                    logger.error(f"Erreur lors de la récupération des problèmes 72h pour MZ {mz_name}: {mz_error}")
                    logger.error(traceback.format_exc())
            
            # Dédupliquer les problèmes (un même problème peut affecter plusieurs MZs)
            unique_problems = []
            problem_ids = set()
            invalid_problems = []
            
            logger.info(f"Déduplication de {len(all_problems)} problèmes au total")
            
            # D'abord filtrer les problèmes qui appartiennent aux MZ de notre liste
            filtered_problems = []
            for i, problem in enumerate(all_problems):
                try:
                    # Vérifier si l'objet a le bon format
                    if not isinstance(problem, dict):
                        logger.warning(f"Problème à l'index {i} n'est pas un dictionnaire: {type(problem)}")
                        invalid_problems.append(problem)
                        continue
                    
                    # Vérifier si l'objet a un ID
                    if 'id' not in problem:
                        logger.warning(f"Problème à l'index {i} n'a pas d'ID: {json.dumps(problem)[:200]}...")
                        invalid_problems.append(problem)
                        continue
                    
                    # Vérifier si le problème appartient à une des management zones de notre liste
                    is_in_mz_list = False
                    
                    # Récupérer les management zones du problème
                    problem_mzs = []
                    if 'managementZones' in problem:
                        problem_mzs = [mz.get('name', '') for mz in problem.get('managementZones', [])]
                    
                    # Vérifier si une des MZ du problème correspond EXACTEMENT à une MZ de notre liste
                    # Et stocker la MZ correspondante pour l'affichage
                    matching_mz = None
                    for mz_name in mz_list:
                        # Journaliser les MZs pour débogage
                        logger.info(f"Comparaison: problème {problem.get('id')} a MZs={problem_mzs}, comparé avec {mz_name}")
                        # Vérification stricte d'égalité complète, pas de correspondance partielle
                        if any(problem_mz == mz_name for problem_mz in problem_mzs):
                            is_in_mz_list = True
                            matching_mz = mz_name  # Stocker la MZ correspondante
                            logger.info(f"MATCH EXACT: Problème {problem.get('id')} appartient à la MZ {mz_name}")
                            break
                    
                    # Stocker la MZ correspondante dans le problème pour l'utiliser plus tard
                    if is_in_mz_list and matching_mz:
                        problem['matching_mz'] = matching_mz
                    
                    if is_in_mz_list:
                        filtered_problems.append(problem)
                    else:
                        logger.info(f"Problème {problem.get('id')} ignoré car n'appartient pas aux MZs {mz_list}")
                        
                except Exception as e:
                    logger.error(f"Erreur lors du traitement du problème à l'index {i}: {e}")
                    logger.error(traceback.format_exc())
                    invalid_problems.append(problem)
            
            logger.info(f"Après filtrage par liste de MZ: {len(filtered_problems)}/{len(all_problems)} problèmes conservés")
            
            # Ensuite dédupliquer les problèmes filtrés
            for problem in filtered_problems:   
                # Vérifier si l'ID est unique
                if problem['id'] not in problem_ids:
                    problem_ids.add(problem['id'])
                    unique_problems.append(problem)
            
            logger.info(f"Récupéré {len(unique_problems)} problèmes uniques sur 72h pour {dashboard_type.upper()}")
            logger.info(f"Problèmes invalides ignorés: {len(invalid_problems)}")
            
            # En mode debug, afficher les problèmes pour investigation
            if debug_mode and unique_problems:
                logger.info(f"Exemples de problèmes trouvés:")
                for i, prob in enumerate(unique_problems[:5]):  # Limiter à 5 pour éviter de saturer les logs
                    try:
                        logger.info(f"Problème 72h #{i+1}: {prob.get('id', 'SANS_ID')} - {prob.get('title', 'Sans titre')} - Status: {prob.get('status', 'Inconnu')}")
                    except Exception as e:
                        logger.error(f"Erreur lors de l'affichage du problème {i}: {e}")
            
            # Formater chaque problème pour ajouter les informations d'entité impactée
            formatted_problems = []
            for problem in unique_problems:
                formatted_problem = api_client._format_problem(problem, zone_filter)
                formatted_problems.append(formatted_problem)
            
            # Mettre en cache le résultat
            api_client.set_cache(specific_cache_key, formatted_problems)
            
            logger.info(f"Fin du traitement - {len(formatted_problems)} problèmes formatés et retournés")
            return jsonify(formatted_problems)
            
        else:
            # Pour une MZ spécifique ou sans filtrage
            if zone_filter:
                logger.info(f"Filtrage par zone spécifique: {zone_filter} pour problèmes 72h")
                effective_mz = zone_filter
            else:
                # Utiliser la MZ courante ou aucune MZ si filtrage désactivé
                current_mz = get_current_mz()
                effective_mz = current_mz
                
            # Utiliser la nouvelle fonction qui gère la pagination
            problems = get_all_problems_with_pagination(effective_mz, timeframe, "OPEN,CLOSED")
            
            # En mode debug, afficher les problèmes pour investigation
            if debug_mode:
                for i, prob in enumerate(problems):
                    logger.info(f"Problème 72h #{i+1}: {prob['id']} - {prob['title']} - Status: {prob['status']}")
            
            # Formater chaque problème pour ajouter les informations d'entité impactée
            formatted_problems = []
            for problem in problems:
                formatted_problem = api_client._format_problem(problem, effective_mz)
                formatted_problems.append(formatted_problem)
            
            # Mettre en cache le résultat
            api_client.set_cache(specific_cache_key, formatted_problems)
            
            logger.info(f"MZ {effective_mz}: {len(formatted_problems)} problèmes récupérés et formatés sur 72h")
            return jsonify(formatted_problems)
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des problèmes 72h: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)})

@app.route('/api/problems', methods=['GET'])
# Retiré le décorateur de cache pour les problèmes pour garantir des données en temps réel
@time_execution
def get_problems():
    try:
        # Récupérer les paramètres de requête
        status = request.args.get('status', 'OPEN')  # Par défaut "OPEN"
        time_from = request.args.get('from', '-30d')  # Par défaut "-30d" pour l'historique standard
        # Utiliser une période plus longue pour les problèmes actifs
        if status == 'OPEN' and 'from' not in request.args:
            time_from = '-60d'  # Augmenté à 60 jours pour voir les problèmes actifs plus anciens
        dashboard_type = request.args.get('type', '')  # Pour identifier VFG ou VFE
        zone_filter = request.args.get('zone', '')  # Pour filtrer par une zone spécifique
        
        # Désactiver le filtrage par MZ n'est plus nécessaire, car on filtre toujours par MZ
        disable_mz_filter = request.args.get('disable_mz_filter', 'false').lower() == 'true'
        
        # Débogage approfondi - à activer temporairement
        debug_mode = request.args.get('debug', 'false').lower() == 'true'
        
        # Paramètre pour activer le cache (désactivé par défaut pour les problèmes OPEN)
        use_cache = request.args.get('cache', 'false').lower() == 'true'
        if status == 'OPEN':
            use_cache = False  # Forcer les problèmes actifs à être toujours à jour
        
        # Créer une clé de cache unique qui inclut tous les paramètres
        specific_cache_key = f"problems:{get_current_mz()}:{time_from}:{status}:{dashboard_type}:{zone_filter}"
        
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
        
        # Ajouter des détails sur l'état de l'environnement pour le débogage
        logger.info(f"Variables d'environnement: DT_ENV_URL={DT_ENV_URL}, API_TOKEN={'présent' if API_TOKEN else 'manquant'}")
        
        # Si un type de dashboard est spécifié
        if dashboard_type in ['vfg', 'vfe', 'vfp', 'vfa', 'detection', 'security']:
            # Si un filtre de zone est fourni, l'utiliser à la place de la liste complète
            if zone_filter:
                logger.info(f"Filtrage par zone spécifique: {zone_filter} pour dashboard {dashboard_type}")
                try:
                    # Récupérer les problèmes pour la zone spécifique
                    problems = api_client.get_problems_filtered(zone_filter, time_from, use_status)
                    logger.info(f"Zone {zone_filter}: {len(problems)} problèmes trouvés")
                    
                    # Ajouter le champ 'resolved' pour les requêtes ALL
                    for problem in problems:
                        if status == 'ALL' and 'resolved' not in problem:
                            problem['resolved'] = problem.get('status') != 'OPEN'
                    
                    # Mettre en cache le résultat avec la clé spécifique
                    api_client.set_cache(specific_cache_key, problems)
                    return problems
                    
                except Exception as zone_error:
                    logger.error(f"Erreur lors de la récupération des problèmes pour zone {zone_filter}: {zone_error}")
                    return []
            
            # Comportement normal pour tous les problèmes du dashboard
            if dashboard_type == 'vfg':
                mz_list_var = 'VFG_MZ_LIST'
            elif dashboard_type == 'vfe':
                mz_list_var = 'VFE_MZ_LIST'
            elif dashboard_type == 'vfp':
                mz_list_var = 'VFP_MZ_LIST'
            elif dashboard_type == 'vfa':
                mz_list_var = 'VFA_MZ_LIST'
            elif dashboard_type == 'detection':
                mz_list_var = 'DETECTION_CTL_MZ_LIST'
            elif dashboard_type == 'security':
                mz_list_var = 'SECURITY_ENCRYPTION_MZ_LIST'
            else:
                mz_list_var = 'VFG_MZ_LIST'  # Fallback au cas où
                
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
            
            # Si un filtre de zone est fourni, l'utiliser à la place de la MZ courante
            if zone_filter:
                logger.info(f"Filtrage par zone spécifique: {zone_filter}")
                effective_mz = zone_filter
            # Sinon si le filtrage MZ est désactivé
            elif disable_mz_filter:
                effective_mz = None
            # Sinon, utiliser la MZ courante
            else:
                effective_mz = current_mz
                
            # Récupérer les problèmes avec la MZ effective
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

# Fonction pour récupérer tous les hôtes avec pagination
def get_all_hosts_with_pagination(management_zone_name):
    """
    Récupère tous les hôtes avec pagination complète pour dépasser la limite de 400 éléments.
    
    Args:
        management_zone_name (str): Nom de la Management Zone pour filtrer les hôtes.
        
    Returns:
        list: Liste des entités hôtes récupérées.
    """
    logger.info(f"Récupération complète des hôtes avec pagination pour la MZ: {management_zone_name}")
    
    # Utiliser la fonction build_entity_selector
    entity_selector = build_entity_selector("HOST", management_zone_name)
    
    all_hosts = []
    page_num = 1
    
    # Paramètres initiaux pour la première requête
    current_params = {
        "entitySelector": entity_selector,
        "fields": "+properties,+fromRelationships",
        "pageSize": 1000  # Taille de page maximale pour réduire le nombre d'appels
    }
    
    while True:
        if 'nextPageKey' in current_params:
            logger.info(f"Récupération de la page {page_num} des hôtes avec nextPageKey: {current_params['nextPageKey'][:20]}...")
        else:
            logger.info(f"Récupération de la page {page_num} des hôtes avec les paramètres initiaux")
        
        try:
            # Utiliser la méthode query_api existante (qui utilise déjà le cache et gère les erreurs)
            if 'nextPageKey' in current_params:
                # Pour les pages suivantes, utiliser l'API avec nextPageKey
                # Dans ce cas, il faut convertir le nextPageKey en paramètres de requête directement
                hosts_data = api_client.query_api("entities", current_params)
            else:
                # Pour la première page, utiliser les paramètres normaux
                hosts_data = api_client.query_api("entities", current_params)
            
            # Extraire les hôtes de cette page
            hosts_on_page = hosts_data.get('entities', [])
            all_hosts.extend(hosts_on_page)
            
            logger.info(f"Page {page_num}: {len(hosts_on_page)} hôtes récupérés. Total jusqu'à présent: {len(all_hosts)}.")
            
            # Vérifier s'il y a une page suivante
            next_page_key = hosts_data.get("nextPageKey")
            if next_page_key:
                # Pour les pages suivantes, seuls nextPageKey et pageSize sont nécessaires
                current_params = {'nextPageKey': next_page_key}
                page_num += 1
                # Petite pause pour ne pas surcharger l'API
                time.sleep(0.2)
            else:
                # Plus de pages à récupérer
                break
                
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des hôtes (page {page_num}): {e}")
            break
    
    logger.info(f"Récupération terminée. Nombre total d'hôtes: {len(all_hosts)}")
    return all_hosts

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
        
        # Récupérer tous les hôtes avec pagination complète
        logger.info(f"Récupération complète des hôtes pour {current_mz} avec pagination")
        all_hosts = get_all_hosts_with_pagination(current_mz)
        
        # Extraire les IDs des hôtes
        host_ids = [host.get('entityId') for host in all_hosts]
        
        # Si aucun hôte n'est trouvé, retourner une liste vide
        if not host_ids:
            logger.warning(f"Aucun hôte trouvé pour la management zone {current_mz}")
            return []
        
        logger.info(f"Récupération des métriques pour {len(host_ids)} hôtes en parallèle")
        
        # Récupérer les métriques pour tous les hôtes en parallèle
        return api_client.get_hosts_metrics_parallel(host_ids, from_time, to_time)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des hôtes: {e}")
        return {'error': str(e)}

@app.route('/api/services', methods=['GET'])
@cached('services')  # Le décorateur @cached utilise déjà le cache standard
@time_execution
def get_services():
    try:
        # Vérifier si nous avons un cache persistant pour cette management zone
        current_mz = get_current_mz()
        if not current_mz:
            return {'error': 'Aucune Management Zone définie'}
        
        # Clé de cache persistant spécifique à cette MZ
        persistent_cache_key = f"persistent_services:{current_mz}"
        
        # Vérifier si nous avons des données en cache persistant et si le cache n'est pas explicitement désactivé
        refresh_cache = request.args.get('refresh', 'false').lower() == 'true'
        if not refresh_cache:
            cached_services = api_client.get_cached(persistent_cache_key)
            if cached_services is not None:
                logger.info(f"Utilisation du cache persistant pour les services de {current_mz}")
                return cached_services
        
        # Continuer avec le traitement normal si pas de cache ou refresh demandé
        now = datetime.now()
        from_time = int((now - timedelta(minutes=30)).timestamp() * 1000)  # Récupération des 30 dernières minutes
        to_time = int(now.timestamp() * 1000)
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("SERVICE", current_mz)
        
        # Récupérer les entités services avec une taille de page augmentée
        logger.info(f"Récupération des services pour {current_mz} avec une taille de page de 1000")
        services_data = api_client.query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships",
            "pageSize": 1000  # Augmenter la taille de la page pour récupérer jusqu'à 1000 services
        })
        
        # Extraire les IDs des services
        service_ids = [service.get('entityId') for service in services_data.get('entities', [])]
        
        # Si aucun service n'est trouvé, retourner une liste vide
        if not service_ids:
            return []
        
        # Récupérer les métriques pour tous les services en parallèle
        services_result = api_client.get_service_metrics_parallel(service_ids, from_time, to_time)
        
        # Stocker le résultat dans un cache persistant avec une durée plus longue (4 heures)
        api_client.set_persistent_cache(persistent_cache_key, services_result, duration=14400)  # 4 heures en secondes
        
        return services_result
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
            
        # Clé de cache persistant spécifique à cette MZ
        persistent_cache_key = f"persistent_processes:{current_mz}"
        
        # Vérifier si nous avons des données en cache persistant et si le cache n'est pas explicitement désactivé
        refresh_cache = request.args.get('refresh', 'false').lower() == 'true'
        if not refresh_cache:
            cached_processes = api_client.get_cached(persistent_cache_key)
            if cached_processes is not None:
                logger.info(f"Utilisation du cache persistant pour les process groups de {current_mz}")
                return cached_processes
        
        # Utiliser la fonction build_entity_selector
        entity_selector = build_entity_selector("PROCESS_GROUP", current_mz)
        
        # Récupérer les groupes de processus sans limite (augmenter pageSize)
        logger.info(f"Récupération des process groups pour {current_mz} avec une taille de page de 1000")
        process_groups_data = api_client.query_api("entities", {
            "entitySelector": entity_selector,
            "fields": "+properties,+fromRelationships",
            "pageSize": 1000  # Augmenter la taille de la page pour récupérer jusqu'à 1000 process groups
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
                dt_url = f"{DT_ENV_URL}/ui/entity/{pg_id}"
                
                process_metrics.append({
                    'id': pg_id,
                    'name': pg.get('displayName'),
                    'technology': tech_info['name'],
                    'tech_icon': tech_info['icon'],
                    'dt_url': dt_url
                })
        
        # Stocker le résultat dans un cache persistant avec une durée plus longue (4 heures)
        api_client.set_persistent_cache(persistent_cache_key, process_metrics, duration=14400)  # 4 heures en secondes
        
        return process_metrics
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des processus: {e}")
        return {'error': str(e)}


@app.route('/api/management-zones/counts', methods=['GET'])
@time_execution
def get_management_zone_counts():
    try:
        # Récupérer la zone spécifiée dans les paramètres de requête
        zone_name = request.args.get('zone')
        if not zone_name:
            return jsonify({'error': 'Le paramètre "zone" est requis'}), 400
            
        logger.info(f"Récupération des comptages pour la management zone: {zone_name}")
        
        # Fonction pour récupérer le nombre d'entités par type
        def get_entity_count(entity_type, mz_name):
            # Paramètres importants pour les retries
            max_retries = 3
            retry_delay = 2  # secondes
            
            for attempt in range(max_retries):
                try:
                    # Construire l'URL API
                    api_url = f"{DT_ENV_URL}/api/v2/entities"
                    headers = {
                        'Authorization': f'Api-Token {API_TOKEN}',
                        'Accept': 'application/json'
                    }
                    
                    # Paramètres pour ne récupérer que le comptage
                    # On définit une taille de page à 1 car on a seulement besoin du comptage total
                    # Mais on s'assure que les résultats ne sont pas limités avec pageSize=0 qui retourne tous les résultats
                    params = {
                        'entitySelector': f'type({entity_type}),mzName("{mz_name}")',
                        'pageSize': 1,
                        'totalCount': 'true'
                    }
                    
                    logger.info(f"Requête API (tentative {attempt+1}/{max_retries}): {api_url} avec sélecteur: {params['entitySelector']}")
                    
                    # Effectuer la requête HTTP avec un timeout plus long
                    # Augmenter le timeout proportionnellement au nombre de tentatives
                    timeout = 30 * (attempt + 1)
                    response = requests.get(api_url, headers=headers, params=params, verify=False, timeout=timeout)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Retourner le nombre total
                    count = data.get('totalCount', 0)
                    logger.info(f"Comptage pour {entity_type} dans {mz_name}: {count}")
                    
                    # Mise en cache du résultat pour réduire la charge sur l'API
                    key = f"count:{entity_type}:{mz_name}"
                    api_client.set_cache(key, count)
                    
                    return count
                    
                except requests.exceptions.Timeout:
                    logger.warning(f"Timeout lors du comptage des {entity_type} pour {mz_name} (tentative {attempt+1}/{max_retries})")
                    if attempt < max_retries - 1:
                        logger.info(f"Attente de {retry_delay} secondes avant la prochaine tentative...")
                        time.sleep(retry_delay)
                    else:
                        # Dernière tentative, vérifier si nous avons une valeur en cache
                        key = f"count:{entity_type}:{mz_name}"
                        cached = api_client.get_cached(key)
                        if cached is not None:
                            logger.info(f"Utilisation de la valeur en cache pour {entity_type} dans {mz_name}: {cached}")
                            return cached
                        logger.error(f"Échec de toutes les tentatives pour {entity_type}")
                        return 0
                        
                except Exception as e:
                    logger.error(f"Erreur lors du comptage des {entity_type} pour {mz_name}: {e}")
                    if attempt < max_retries - 1:
                        logger.info(f"Attente de {retry_delay} secondes avant la prochaine tentative...")
                        time.sleep(retry_delay)
                    else:
                        # Dernière tentative, vérifier si nous avons une valeur en cache
                        key = f"count:{entity_type}:{mz_name}"
                        cached = api_client.get_cached(key)
                        if cached is not None:
                            logger.info(f"Utilisation de la valeur en cache pour {entity_type} dans {mz_name}: {cached}")
                            return cached
                        return 0
            
            # Nous ne devrions jamais arriver ici, mais au cas où
            return 0
        
        # Récupérer les comptages en parallèle avec threads
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # Soumettre les tâches
            host_future = executor.submit(get_entity_count, "HOST", zone_name)
            service_future = executor.submit(get_entity_count, "SERVICE", zone_name)
            process_future = executor.submit(get_entity_count, "PROCESS_GROUP", zone_name)
            
            # Récupérer les résultats
            hosts_count = host_future.result()
            services_count = service_future.result()
            processes_count = process_future.result()
        
        logger.info(f"Comptages pour {zone_name}: hosts={hosts_count}, services={services_count}, processes={processes_count}")
        
        # Retourner les comptages
        return jsonify({
            'counts': {
                'hosts': hosts_count,
                'services': services_count,
                'processes': processes_count
            },
            'zone': zone_name
        })
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des comptages de MZ: {e}")
        return jsonify({'error': str(e)}), 500


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
                    'dt_url': f"{DT_ENV_URL}/ui/settings/managementzones"
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
                'dt_url': f"{DT_ENV_URL}/ui/settings/managementzones;id={mz.get('id')}"
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

# Fonction pour obtenir tous les problèmes avec pagination
def get_all_problems_with_pagination(management_zone_name=None, time_from="now-72h", status="OPEN,CLOSED"):
    """
    Récupère tous les problèmes avec pagination complète, en suivant l'approche du script Python qui fonctionne.
    
    Args:
        management_zone_name (str, optional): Nom de la Management Zone pour filtrer les problèmes.
        time_from (str, optional): Point de départ temporel (ex: "now-72h"). 
        status (str, optional): Statut des problèmes à récupérer ("OPEN", "CLOSED", ou "OPEN,CLOSED").
        
    Returns:
        list: Liste des problèmes récupérés.
    """
    # Construction des headers pour l'API Dynatrace
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json; charset=utf-8'
    }
    
    api_url = DT_ENV_URL.rstrip('/')
    problems_url = f"{api_url}/api/v2/problems"
    
    all_problems = []
    
    # Échapper les guillemets doubles dans le nom de la MZ pour le sélecteur
    problem_selector = ""
    if management_zone_name:
        escaped_mz_name = management_zone_name.replace('"', '\\"')
        problem_selector = f'managementZones("{escaped_mz_name}")'
        logger.info(f"Requête de problèmes avec sélecteur MZ: '{problem_selector}'")
    
    # Paramètres initiaux pour la première requête
    current_params = {
        'from': time_from,
        'status': status,
        'pageSize': 500  # Demander le maximum par page pour réduire le nombre d'appels
    }
    
    # Ajouter le sélecteur de problèmes si défini
    if problem_selector:
        current_params['problemSelector'] = problem_selector
    
    page_num = 1
    logger.info(f"Début de la récupération des problèmes pour timeframe: {time_from}, status: {status}" + 
                (f", MZ: '{management_zone_name}'" if management_zone_name else ""))
    
    while True:
        if 'nextPageKey' in current_params:
            logger.info(f"Récupération de la page {page_num} avec nextPageKey: {current_params['nextPageKey'][:20]}...")
        else:
            logger.info(f"Récupération de la page {page_num} avec les paramètres initiaux: {current_params}")
        
        try:
            verify_ssl = os.environ.get('VERIFY_SSL', 'False').lower() in ('true', '1', 't')
            response = requests.get(
                problems_url, 
                headers=headers, 
                params=current_params, 
                verify=verify_ssl,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            problems_on_page = data.get('problems', [])
            
            # Vérifier la structure des problèmes et exclure les invalides
            valid_problems = []
            for prob in problems_on_page:
                if not isinstance(prob, dict):
                    logger.warning(f"Problème ignoré: format inattendu (non-dictionnaire): {type(prob)}")
                    continue
                    
                if 'id' not in prob:
                    logger.warning(f"Problème ignoré: pas d'ID trouvé: {json.dumps(prob)[:200]}...")
                    continue
                    
                valid_problems.append(prob)
            
            # Si des problèmes ont été ignorés, enregistrer un avertissement
            if len(valid_problems) < len(problems_on_page):
                logger.warning(f"Page {page_num}: {len(problems_on_page) - len(valid_problems)} problèmes invalides ignorés")
                
            all_problems.extend(valid_problems)
            
            logger.info(f"Page {page_num}: {len(valid_problems)} problèmes valides récupérés. Total jusqu'à présent: {len(all_problems)}.")
            
            next_page_key = data.get("nextPageKey")
            if next_page_key:
                # Pour les pages suivantes, seuls nextPageKey et pageSize sont nécessaires
                current_params = {'nextPageKey': next_page_key, 'pageSize': 500}
                page_num += 1
                # Petite pause pour ne pas surcharger l'API
                time.sleep(0.2)
            else:
                # Plus de pages à récupérer
                break
                
        except requests.exceptions.HTTPError as http_err:
            logger.error(f"Erreur HTTP lors de la récupération des problèmes (page {page_num}): {http_err}")
            logger.error(f"Réponse du serveur: {response.text if response and hasattr(response, 'text') else 'Pas de réponse détaillée'}")
            break
        except requests.exceptions.Timeout as timeout_err:
            logger.error(f"Timeout lors de la requête (page {page_num}): {timeout_err}")
            break
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Erreur de requête générique (page {page_num}): {req_err}")
            break
        except json.JSONDecodeError as json_err:
            logger.error(f"Erreur de décodage JSON (page {page_num}): {json_err}")
            logger.error(f"Réponse brute reçue: {response.text if response and hasattr(response, 'text') else 'Pas de réponse détaillée'}")
            break
        except Exception as e:
            logger.error(f"Erreur inattendue: {e}")
            logger.error(traceback.format_exc())
            break
    
    logger.info(f"Récupération terminée. Nombre total de problèmes: {len(all_problems)}")
    return all_problems

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

@app.route('/api/mz-admin', methods=['GET'])
def get_mz_admin():
    """Endpoint pour récupérer la Management Zone configurée pour l'onglet Hosts"""
    try:
        # Force le rechargement des variables d'environnement depuis le fichier .env
        from dotenv import load_dotenv
        load_dotenv(override=True)  # override=True pour forcer le rechargement
        
        # Récupérer la valeur fraîchement chargée de MZ_ADMIN
        mz_admin = os.environ.get('MZ_ADMIN', '')
        
        # Log pour debug avec timestamp pour voir quand la valeur est récupérée
        current_time = datetime.now().strftime('%H:%M:%S')
        logger.info(f"[{current_time}] Récupération de la MZ admin: {mz_admin}")
        
        # Ajouter le paramètre nocache pour éviter le cache côté client
        if 'nocache' in request.args:
            logger.info(f"Demande sans cache reçue: {request.args.get('nocache')}")
        
        return jsonify({
            'mzadmin': mz_admin,
            'timestamp': current_time
        })
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de MZ_ADMIN: {e}")
        return jsonify({
            'mzadmin': '',
            'error': str(e),
            'timestamp': datetime.now().strftime('%H:%M:%S')
        }), 500

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