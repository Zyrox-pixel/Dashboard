"""
Module d'optimisation des requêtes API Dynatrace - CORRIGÉ
Ce module fournit des fonctions pour améliorer les performances des requêtes API
en utilisant des techniques comme les requêtes parallèles et la mise en cache intelligente.
"""
import asyncio
import time
import concurrent.futures
import threading
import requests
import urllib3
from functools import wraps
from datetime import datetime, timedelta
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Désactiver les avertissements SSL si nécessaire
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class OptimizedAPIClient:
    """Client API optimisé pour Dynatrace avec support de requêtes parallèles et cache intelligent"""
    
    def __init__(self, env_url, api_token, verify_ssl=False, max_workers=10, cache_duration=300):
        """
        Initialise un client API optimisé
        
        Args:
            env_url (str): URL de l'environnement Dynatrace
            api_token (str): Token API Dynatrace
            verify_ssl (bool): Vérifier les certificats SSL
            max_workers (int): Nombre maximum de workers parallèles
            cache_duration (int): Durée de vie du cache en secondes
        """
        self.env_url = env_url
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.max_workers = max_workers
        self.cache_duration = cache_duration
        self.cache = {}
        self.cache_lock = threading.Lock()
        
        # Créer une session pour réutiliser les connexions
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Api-Token {self.api_token}',
            'Accept': 'application/json'
        })
        self.session.verify = self.verify_ssl

    def get_cached(self, cache_key):
        """Récupère une valeur du cache si elle existe et n'est pas expirée"""
        with self.cache_lock:
            if cache_key in self.cache:
                item = self.cache[cache_key]
                if time.time() - item['timestamp'] < self.cache_duration:
                    logger.debug(f"Cache hit for {cache_key}")
                    return item['data']
        logger.debug(f"Cache miss for {cache_key}")
        return None

    def set_cache(self, cache_key, data):
        """Met à jour le cache avec de nouvelles données"""
        with self.cache_lock:
            self.cache[cache_key] = {
                'data': data,
                'timestamp': time.time()
            }

    def clear_cache(self, pattern=None):
        """
        Efface le cache
        
        Args:
            pattern (str): Motif pour effacer sélectivement le cache (None pour tout effacer)
        """
        with self.cache_lock:
            if pattern:
                keys_to_delete = [key for key in self.cache if pattern in key]
                for key in keys_to_delete:
                    del self.cache[key]
            else:
                self.cache.clear()
        logger.info(f"Cache cleared. Pattern: {pattern}")

    def query_api(self, endpoint, params=None, use_cache=True, cache_key=None):
        """
        Exécute une requête API avec gestion du cache
        
        Args:
            endpoint (str): Point de terminaison de l'API
            params (dict): Paramètres de requête
            use_cache (bool): Utiliser le cache
            cache_key (str): Clé de cache personnalisée (si None, générée automatiquement)
            
        Returns:
            dict: Réponse JSON de l'API
        """
        # Générer une clé de cache si elle n'est pas fournie
        if cache_key is None:
            param_str = str(params) if params else ""
            cache_key = f"{endpoint}:{param_str}"
        
        # Vérifier le cache si activé
        if use_cache:
            cached_data = self.get_cached(cache_key)
            if cached_data is not None:
                return cached_data
        
        # Exécuter la requête
        url = f"{self.env_url}/api/v2/{endpoint}"
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            # Mettre en cache le résultat
            if use_cache:
                self.set_cache(cache_key, result)
                
            return result
        except requests.RequestException as e:
            logger.error(f"API request error for {endpoint}: {str(e)}")
            raise

    async def query_api_async(self, endpoint, params=None, use_cache=True, cache_key=None):
        """Version asynchrone de query_api utilisant asyncio avec ThreadPoolExecutor"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            lambda: self.query_api(endpoint, params, use_cache, cache_key)
        )

    def batch_query(self, queries):
        """
        Exécute plusieurs requêtes API en parallèle
        
        Args:
            queries (list): Liste de tuples (endpoint, params, use_cache, cache_key)
            
        Returns:
            list: Liste des résultats correspondants
        """
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {}  # Utiliser un dictionnaire pour conserver le mapping entre futures et queries
            
            for i, query in enumerate(queries):
                # Gérer les différents formats de requêtes
                if isinstance(query, tuple):
                    if len(query) == 2:
                        endpoint, params = query
                        use_cache, cache_key = True, None
                    elif len(query) == 3:
                        endpoint, params, use_cache = query
                        cache_key = None
                    elif len(query) >= 4:
                        endpoint, params, use_cache, cache_key = query[:4]
                else:
                    endpoint, params = query, None
                    use_cache, cache_key = True, None
                
                # Utiliser l'index comme identifiant unique pour chaque future
                future = executor.submit(self.query_api, endpoint, params, use_cache, cache_key)
                futures[i] = future
            
            # Collecter les résultats dans l'ordre original des requêtes
            results = [None] * len(queries)
            for i, future in futures.items():
                try:
                    results[i] = future.result()
                except Exception as e:
                    logger.error(f"Error in batch query for index {i}: {str(e)}")
                    results[i] = None
            
            return results

    async def batch_query_async(self, queries):
        """Version asynchrone de batch_query utilisant asyncio"""
        tasks = []
        for query in queries:
            # Gérer les différents formats de requêtes
            if isinstance(query, tuple):
                if len(query) == 2:
                    endpoint, params = query
                    use_cache, cache_key = True, None
                elif len(query) == 3:
                    endpoint, params, use_cache = query
                    cache_key = None
                elif len(query) >= 4:
                    endpoint, params, use_cache, cache_key = query[:4]
            else:
                endpoint, params = query, None
                use_cache, cache_key = True, None
            
            tasks.append(self.query_api_async(endpoint, params, use_cache, cache_key))
        
        return await asyncio.gather(*tasks, return_exceptions=True)

    def extract_technology(self, entity_id, use_cache=True):
        """
        Extrait les informations de technologie d'une entité
        Optimisé à partir de la fonction dans code.py
        
        Args:
            entity_id (str): ID de l'entité
            use_cache (bool): Utiliser le cache
            
        Returns:
            dict: Informations sur la technologie
        """
        cache_key = f"technology:{entity_id}"
        if use_cache:
            cached_data = self.get_cached(cache_key)
            if cached_data is not None:
                return cached_data

        try:
            entity_details = self.query_api(f"entities/{entity_id}")
            
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
            
            # Approche alternative, chercher des indices dans les tags
            if not tech_info:
                # Chercher dans les tags
                if 'tags' in entity_details:
                    for tag in entity_details['tags']:
                        if tag.get('key') == 'Technology' or tag.get('key') == 'technology':
                            tech_info.append(tag.get('value'))
            
            # Si rien n'est trouvé, chercher des mots-clés dans le nom
            if not tech_info:
                name = entity_details.get('displayName', '').lower()
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
            
            if use_cache:
                self.set_cache(cache_key, result)
                
            return result
        except Exception as e:
            logger.error(f"Erreur lors de l'extraction de la technologie pour {entity_id}: {e}")
            return {
                'name': "Non spécifié",
                'icon': 'question'
            }

    def get_metric_history(self, entity_id, metric_selector, from_time, to_time, resolution="1h", use_cache=True):
        """
        Récupère l'historique des métriques avec gestion du cache
        
        Args:
            entity_id (str): ID de l'entité
            metric_selector (str): Sélecteur de métrique
            from_time (int): Timestamp de début
            to_time (int): Timestamp de fin
            resolution (str): Résolution temporelle
            use_cache (bool): Utiliser le cache
            
        Returns:
            list: Historique des métriques
        """
        cache_key = f"metric_history:{entity_id}:{metric_selector}:{from_time}:{to_time}:{resolution}"
        if use_cache:
            cached_data = self.get_cached(cache_key)
            if cached_data is not None:
                return cached_data
                
        try:
            data = self.query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": metric_selector,
                    "from": from_time,
                    "to": to_time,
                    "resolution": resolution,
                    "entitySelector": f"entityId({entity_id})"
                },
                use_cache=False  # On utilise notre propre cache
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
                
                if use_cache:
                    self.set_cache(cache_key, history)
                    
                return history
            
            if use_cache:
                self.set_cache(cache_key, [])
                
            return []
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'historique pour {metric_selector}: {e}")
            return []

    def get_service_metrics_parallel(self, service_ids, from_time, to_time):
    """
    Récupère les métriques pour plusieurs services en parallèle - CORRIGÉ
    
    Args:
        service_ids (list): Liste des IDs de services
        from_time (int): Timestamp de début
        to_time (int): Timestamp de fin
        
    Returns:
        list: Métriques pour tous les services
    """
    # Préparer les requêtes pour la récupération des détails des services avec ID explicite
    service_details_queries = []
    for service_id in service_ids:
        service_details_queries.append((
            f"entities/{service_id}", 
            None, 
            True,
            f"service_details:{service_id}"  # Clé de cache explicite avec ID
        ))
    
    # Récupérer les détails des services en parallèle
    service_details_results = self.batch_query(service_details_queries)
    
    # Créer un dictionnaire pour associer les résultats aux services
    service_details_dict = {}
    for i, service_id in enumerate(service_ids):
        service_details_dict[service_id] = service_details_results[i]
    
    # Préparer les requêtes de métriques pour tous les services avec clés explicites
    metric_queries = []
    for service_id in service_ids:
        # Requête pour le temps de réponse avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.response.time",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"response_time:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Requête pour le taux d'erreur avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.errors.total.rate",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"error_rate:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Requête pour le nombre de requêtes avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.requestCount.total",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"requests:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
    
    # Exécuter toutes les requêtes de métriques en parallèle
    all_metric_results = self.batch_query(metric_queries)
    
    # Créer des dictionnaires pour associer les résultats de métriques aux services
    response_time_metrics = {}
    error_rate_metrics = {}
    request_metrics = {}
    
    # Distribuer les résultats dans des dictionnaires par ID de service
    result_index = 0
    for service_id in service_ids:
        response_time_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
        error_rate_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
        request_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
    
    # Récupérer les technologies en parallèle
    tech_queries = []
    for service_id in service_ids:
        tech_queries.append((
            f"entities/{service_id}", 
            None, 
            True,
            f"tech:{service_id}"  # Clé explicite avec ID
        ))
    
    tech_results = self.batch_query(tech_queries)
    tech_dict = {}
    for i, service_id in enumerate(service_ids):
        tech_info = self.extract_technology(service_id)
        tech_dict[service_id] = tech_info
    
    # Préparer les requêtes d'historique avec clés explicites
    history_queries = []
    for service_id in service_ids:
        # Historique du temps de réponse
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.response.time",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"rt_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Historique du taux d'erreur
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.errors.total.rate",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"er_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Historique du nombre de requêtes
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.requestCount.total",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"req_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
    
    # Exécuter les requêtes d'historique en parallèle
    history_results = self.batch_query(history_queries)
    
    # Créer des dictionnaires pour associer les résultats d'historique aux services
    rt_history_dict = {}
    er_history_dict = {}
    req_history_dict = {}
    
    # Distribuer les résultats d'historique dans des dictionnaires par ID de service
    result_index = 0
    for service_id in service_ids:
        rt_history_dict[service_id] = history_results[result_index]
        result_index += 1
        er_history_dict[service_id] = history_results[result_index]
        result_index += 1
        req_history_dict[service_id] = history_results[result_index]
        result_index += 1
    
    # Maintenant, assembler les métriques pour chaque service
    service_metrics = []
    for service_id in service_ids:
        service_details = service_details_dict[service_id]
        
        # Vérification du type de service et activité
        service_status = "Actif"
        if service_details and 'properties' in service_details and 'monitoring' in service_details['properties']:
            if service_details['properties']['monitoring'].get('monitoringState') != "ACTIVE":
                service_status = "Inactif"
        
        # Extraire les métriques pour ce service
        response_time_data = response_time_metrics[service_id]
        error_rate_data = error_rate_metrics[service_id]
        requests_data = request_metrics[service_id]
        
        # Traiter les résultats des métriques
        response_time = None
        error_rate = None
        requests_count = None
        
        # Extraire le temps de réponse - SECTION MODIFIÉE
        if response_time_data and 'result' in response_time_data and response_time_data['result']:
            result = response_time_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    raw_value = values[0]
                    
                    # CORRECTION: Vérifier si la valeur est anormalement élevée (probablement en µs)
                    if raw_value > 10000:  # Si > 10 secondes
                        response_time = int(raw_value / 1000)  # Convertir en ms
                    else:
                        response_time = int(raw_value)
                    
                    # Limiter les valeurs extrêmes à un maximum raisonnable
                    if response_time > 30000:  # Max 30 secondes
                        response_time = 30000
        
        # Extraire le taux d'erreur
        if error_rate_data and 'result' in error_rate_data and error_rate_data['result']:
            result = error_rate_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    error_rate = round(values[0], 1)
        
        # Extraire le nombre de requêtes
        if requests_data and 'result' in requests_data and requests_data['result']:
            result = requests_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    requests_count = int(values[0])
        
        # Extraire la technologie du dictionnaire
        tech_info = tech_dict[service_id]
        
        # Traiter les historiques
        response_time_history = []
        error_rate_history = []
        request_count_history = []
        
        # Historique du temps de réponse - SECTION MODIFIÉE
        rt_history_data = rt_history_dict[service_id]
        if rt_history_data and 'result' in rt_history_data and rt_history_data['result']:
            result = rt_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            # CORRECTION: Appliquer la même logique aux valeurs historiques
                            rt_value = values[i]
                            if rt_value > 10000:  # Si > 10 secondes
                                rt_value = rt_value / 1000  # Convertir en ms
                            
                            # Limiter les valeurs extrêmes
                            rt_value = min(rt_value, 30000)
                            
                            response_time_history.append({
                                'timestamp': timestamps[i],
                                'value': rt_value
                            })
        
        # Historique du taux d'erreur
        er_history_data = er_history_dict[service_id]
        if er_history_data and 'result' in er_history_data and er_history_data['result']:
            result = er_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            error_rate_history.append({
                                'timestamp': timestamps[i],
                                'value': values[i]
                            })
        
        # Historique du nombre de requêtes
        req_history_data = req_history_dict[service_id]
        if req_history_data and 'result' in req_history_data and req_history_data['result']:
            result = req_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            request_count_history.append({
                                'timestamp': timestamps[i],
                                'value': values[i]
                            })
        
        # Créer l'objet de métriques pour ce service
        service_metrics.append({
            'id': service_id,
            'name': service_details.get('displayName', 'Unknown') if service_details else 'Unknown',
            'response_time': response_time,
            'error_rate': error_rate,
            'requests': requests_count,
            'status': service_status,
            'technology': tech_info['name'],
            'tech_icon': tech_info['icon'],
            'dt_url': f"{self.env_url}/#entity/{service_id}",
            'response_time_history': response_time_history,
            'error_rate_history': error_rate_history,
            'request_count_history': request_count_history
        })
    
    return service_metrics

    def get_service_metrics_parallel(self, service_ids, from_time, to_time):
    # Préparer les requêtes pour la récupération des détails des services avec ID explicite
    service_details_queries = []
    for service_id in service_ids:
        service_details_queries.append((
            f"entities/{service_id}", 
            None, 
            True,
            f"service_details:{service_id}"  # Clé de cache explicite avec ID
        ))
    
    # Récupérer les détails des services en parallèle
    service_details_results = self.batch_query(service_details_queries)
    
    # Créer un dictionnaire pour associer les résultats aux services
    service_details_dict = {}
    for i, service_id in enumerate(service_ids):
        service_details_dict[service_id] = service_details_results[i]
    
    # Préparer les requêtes de métriques pour tous les services avec clés explicites
    metric_queries = []
    for service_id in service_ids:
        # Requête pour le temps de réponse avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.response.time",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"response_time:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Requête pour le taux d'erreur avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.errors.total.rate",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"error_rate:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Requête pour le nombre de requêtes avec ID explicite
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.requestCount.total",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"requests:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
    
    # Exécuter toutes les requêtes de métriques en parallèle
    all_metric_results = self.batch_query(metric_queries)
    
    # Créer des dictionnaires pour associer les résultats de métriques aux services
    response_time_metrics = {}
    error_rate_metrics = {}
    request_metrics = {}
    
    # Distribuer les résultats dans des dictionnaires par ID de service
    result_index = 0
    for service_id in service_ids:
        response_time_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
        error_rate_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
        request_metrics[service_id] = all_metric_results[result_index]
        result_index += 1
    
    # Récupérer les technologies en parallèle
    tech_queries = []
    for service_id in service_ids:
        tech_queries.append((
            f"entities/{service_id}", 
            None, 
            True,
            f"tech:{service_id}"  # Clé explicite avec ID
        ))
    
    tech_results = self.batch_query(tech_queries)
    tech_dict = {}
    for i, service_id in enumerate(service_ids):
        tech_info = self.extract_technology(service_id)
        tech_dict[service_id] = tech_info
    
    # Préparer les requêtes d'historique avec clés explicites
    history_queries = []
    for service_id in service_ids:
        # Historique du temps de réponse
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.response.time",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"rt_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Historique du taux d'erreur
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.errors.total.rate",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"er_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
        
        # Historique du nombre de requêtes
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:service.requestCount.total",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({service_id})"
            },
            True,
            f"req_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
        ))
    
    # Exécuter les requêtes d'historique en parallèle
    history_results = self.batch_query(history_queries)
    
    # Créer des dictionnaires pour associer les résultats d'historique aux services
    rt_history_dict = {}
    er_history_dict = {}
    req_history_dict = {}
    
    # Distribuer les résultats d'historique dans des dictionnaires par ID de service
    result_index = 0
    for service_id in service_ids:
        rt_history_dict[service_id] = history_results[result_index]
        result_index += 1
        er_history_dict[service_id] = history_results[result_index]
        result_index += 1
        req_history_dict[service_id] = history_results[result_index]
        result_index += 1
    
    # Maintenant, assembler les métriques pour chaque service
    service_metrics = []
    for service_id in service_ids:
        service_details = service_details_dict[service_id]
        
        # Vérification du type de service et activité
        service_status = "Actif"
        if service_details and 'properties' in service_details and 'monitoring' in service_details['properties']:
            if service_details['properties']['monitoring'].get('monitoringState') != "ACTIVE":
                service_status = "Inactif"
        
        # Extraire les métriques pour ce service
        response_time_data = response_time_metrics[service_id]
        error_rate_data = error_rate_metrics[service_id]
        requests_data = request_metrics[service_id]
        
        # Traiter les résultats des métriques
        response_time = None
        error_rate = None
        requests_count = None
        
        # Extraire le temps de réponse - SECTION MODIFIÉE
        if response_time_data and 'result' in response_time_data and response_time_data['result']:
            result = response_time_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    raw_value = values[0]
                    
                    # CORRECTION: Vérifier si la valeur est anormalement élevée (probablement en µs)
                    if raw_value > 10000:  # Si > 10 secondes
                        response_time = int(raw_value / 1000)  # Convertir en ms
                    else:
                        response_time = int(raw_value)
                    
                    # Limiter les valeurs extrêmes à un maximum raisonnable
                    if response_time > 30000:  # Max 30 secondes
                        response_time = 30000
        
        # Extraire le taux d'erreur
        if error_rate_data and 'result' in error_rate_data and error_rate_data['result']:
            result = error_rate_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    error_rate = round(values[0], 1)
        
        # Extraire le nombre de requêtes
        if requests_data and 'result' in requests_data and requests_data['result']:
            result = requests_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                if values and values[0] is not None:
                    requests_count = int(values[0])
        
        # Extraire la technologie du dictionnaire
        tech_info = tech_dict[service_id]
        
        # Traiter les historiques
        response_time_history = []
        error_rate_history = []
        request_count_history = []
        
        # Historique du temps de réponse - SECTION MODIFIÉE
        rt_history_data = rt_history_dict[service_id]
        if rt_history_data and 'result' in rt_history_data and rt_history_data['result']:
            result = rt_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            # CORRECTION: Appliquer la même logique aux valeurs historiques
                            rt_value = values[i]
                            if rt_value > 10000:  # Si > 10 secondes
                                rt_value = rt_value / 1000  # Convertir en ms
                            
                            # Limiter les valeurs extrêmes
                            rt_value = min(rt_value, 30000)
                            
                            response_time_history.append({
                                'timestamp': timestamps[i],
                                'value': rt_value
                            })
        
        # Historique du taux d'erreur
        er_history_data = er_history_dict[service_id]
        if er_history_data and 'result' in er_history_data and er_history_data['result']:
            result = er_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            error_rate_history.append({
                                'timestamp': timestamps[i],
                                'value': values[i]
                            })
        
        # Historique du nombre de requêtes
        req_history_data = req_history_dict[service_id]
        if req_history_data and 'result' in req_history_data and req_history_data['result']:
            result = req_history_data['result'][0]
            if 'data' in result and result['data']:
                values = result['data'][0].get('values', [])
                timestamps = result['data'][0].get('timestamps', [])
                if values and timestamps:
                    for i in range(len(values)):
                        if values[i] is not None:
                            request_count_history.append({
                                'timestamp': timestamps[i],
                                'value': values[i]
                            })
        
        # Créer l'objet de métriques pour ce service
        service_metrics.append({
            'id': service_id,
            'name': service_details.get('displayName', 'Unknown') if service_details else 'Unknown',
            'response_time': response_time,
            'error_rate': error_rate,
            'requests': requests_count,
            'status': service_status,
            'technology': tech_info['name'],
            'tech_icon': tech_info['icon'],
            'dt_url': f"{self.env_url}/#entity/{service_id}",
            'response_time_history': response_time_history,
            'error_rate_history': error_rate_history,
            'request_count_history': request_count_history
        })
    
    return service_metrics

    def get_problems_filtered(self, mz_name=None, time_from="-24h", status="OPEN"):
        """
        Récupère et filtre les problèmes pour une management zone spécifique
        
        Args:
            mz_name (str): Nom de la Management Zone (None pour toutes)
            time_from (str): Période de temps (ex: "-24h")
            status (str): Statut des problèmes ("OPEN", "CLOSED", etc.)
            
        Returns:
            list: Liste des problèmes filtrés
        """
        cache_key = f"problems:{mz_name}:{time_from}:{status}"
        cached_data = self.get_cached(cache_key)
        if cached_data is not None:
            return cached_data
        
        try:
            # Récupérer tous les problèmes sans filtrer par MZ via l'API
            problems_data = self.query_api(
                endpoint="problems",
                params={
                    "from": time_from,
                    "status": status
                },
                use_cache=False
            )
            
            active_problems = []
            if 'problems' in problems_data:
                total_problems = len(problems_data['problems'])
                logger.info(f"Nombre total de problèmes récupérés: {total_problems}")
                
                # On va filtrer manuellement les problèmes liés à notre Management Zone
                mz_problems = 0
                for problem in problems_data['problems']:
                    # Si aucune MZ n'est spécifiée, inclure tous les problèmes
                    if mz_name is None:
                        active_problems.append(self._format_problem(problem))
                        continue
                    
                    # Vérifier si le problème est lié à notre Management Zone
                    is_in_mz = False
                    
                    # Rechercher dans les management zones directement attachées au problème
                    if 'managementZones' in problem:
                        for mz in problem.get('managementZones', []):
                            if mz.get('name') == mz_name:
                                is_in_mz = True
                                break
                    
                    # Rechercher aussi dans les entités affectées
                    if not is_in_mz:
                        for entity in problem.get('affectedEntities', []):
                            # Vérifier les management zones de chaque entité affectée
                            for mz in entity.get('managementZones', []):
                                if mz.get('name') == mz_name:
                                    is_in_mz = True
                                    break
                            if is_in_mz:
                                break
                    
                    # Si le problème est dans notre MZ, l'ajouter à notre liste
                    if is_in_mz:
                        mz_problems += 1
                        active_problems.append(self._format_problem(problem, mz_name))
                
                if mz_name:
                    logger.info(f"Problèmes filtrés appartenant à {mz_name}: {mz_problems}/{total_problems}")
            
            self.set_cache(cache_key, active_problems)
            return active_problems
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des problèmes: {e}")
            return []
    
    def _format_problem(self, problem, zone=None):
        """Formate un problème pour la réponse API"""
        return {
            'id': problem.get('problemId', 'Unknown'),
            'title': problem.get('title', 'Problème inconnu'),
            'impact': problem.get('impactLevel', 'UNKNOWN'),
            'status': problem.get('status', 'OPEN'),
            'affected_entities': len(problem.get('affectedEntities', [])),
            'start_time': datetime.fromtimestamp(problem.get('startTime', 0)/1000).strftime('%Y-%m-%d %H:%M'),
            'dt_url': f"{self.env_url}/#problems/problemdetails;pid={problem.get('problemId', 'Unknown')}",
            'zone': zone or self._extract_problem_zone(problem)
        }
    
    def _extract_problem_zone(self, problem):
        """Extrait la zone principale d'un problème"""
        if 'managementZones' in problem and problem['managementZones']:
            return problem['managementZones'][0].get('name', 'Non spécifié')
        return 'Non spécifié'

    def get_summary_parallelized(self, mz_name, from_time, to_time):
        """
        Récupère un résumé des métriques en utilisant des requêtes parallèles - CORRIGÉ
        
        Args:
            mz_name (str): Nom de la Management Zone
            from_time (int): Timestamp de début
            to_time (int): Timestamp de fin
            
        Returns:
            dict: Résumé des métriques
        """
        cache_key = f"summary:{mz_name}:{from_time}:{to_time}"
        cached_data = self.get_cached(cache_key)
        if cached_data is not None:
            return cached_data
        
        try:
            # Préparer les requêtes de base avec clés explicites
            entity_queries = [
                (
                    "entities",
                    {
                        "entitySelector": f"type(SERVICE),mzName(\"{mz_name}\")",
                        "fields": "+properties,+fromRelationships"
                    },
                    True,
                    f"services:{mz_name}"
                ),
                (
                    "entities",
                    {
                        "entitySelector": f"type(HOST),mzName(\"{mz_name}\")",
                        "fields": "+properties,+fromRelationships"
                    },
                    True,
                    f"hosts:{mz_name}"
                ),
                (
                    "problems",
                    {
                        "from": "-24h",
                        "status": "OPEN",
                        "managementZone": mz_name
                    },
                    True,
                    f"problems:{mz_name}"
                )
            ]
            
            # Exécuter les requêtes en parallèle
            results = self.batch_query(entity_queries)
            
            # Utiliser des index explicites
            services_data = results[0]
            hosts_data = results[1]
            problems_data = results[2]
            
            # Calculer les métriques résumées
            services_count = len(services_data.get('entities', []))
            hosts_count = len(hosts_data.get('entities', []))
            problems_count = len(problems_data.get('problems', []))
            
            # Préparer les requêtes de métriques en lot pour les hôtes
            host_metric_queries = []
            host_entities = hosts_data.get('entities', [])
            
            for host in host_entities:
                host_id = host.get('entityId')
                host_metric_queries.append((
                    "metrics/query",
                    {
                        "metricSelector": "builtin:host.cpu.usage",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({host_id})"
                    },
                    True,
                    f"summary_host_cpu:{host_id}:{from_time}:{to_time}"  # Clé explicite avec ID
                ))
            
            # Exécuter les requêtes CPU en parallèle
            host_cpu_results = self.batch_query(host_metric_queries)
            
            # Créer un mapping hôte ID -> résultats CPU
            host_cpu_dict = {}
            for i, host in enumerate(host_entities):
                host_id = host.get('entityId')
                host_cpu_dict[host_id] = host_cpu_results[i]
            
            # Calculer l'utilisation moyenne du CPU et le nombre d'hôtes critiques
            total_cpu = 0
            critical_hosts = 0
            
            for host in host_entities:
                host_id = host.get('entityId')
                cpu_data = host_cpu_dict[host_id]
                
                if cpu_data and 'result' in cpu_data and cpu_data['result']:
                    result = cpu_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        if values and values[0] is not None:
                            cpu_usage = int(values[0])
                            if cpu_usage > 80:
                                critical_hosts += 1
                            total_cpu += cpu_usage
            
            avg_cpu = round(total_cpu / hosts_count) if hosts_count > 0 else 0
            
            # Préparer les requêtes de métriques pour les services
            service_metric_queries = []
            service_entities = services_data.get('entities', [])
            
            for service in service_entities:
                service_id = service.get('entityId')
                # Requête pour le nombre de requêtes
                service_metric_queries.append((
                    "metrics/query",
                    {
                        "metricSelector": "builtin:service.requestCount.total",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    },
                    True,
                    f"summary_service_requests:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
                ))
                
                # Requête pour le taux d'erreur
                service_metric_queries.append((
                    "metrics/query",
                    {
                        "metricSelector": "builtin:service.errors.total.rate",
                        "from": from_time,
                        "to": to_time,
                        "entitySelector": f"entityId({service_id})"
                    },
                    True,
                    f"summary_service_errors:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
                ))
            
            # Exécuter les requêtes de services en parallèle
            service_metric_results = self.batch_query(service_metric_queries)
            
            # Créer des dictionnaires pour associer les résultats aux services
            service_requests_dict = {}
            service_errors_dict = {}
            
            # Distribuer les résultats dans des dictionnaires
            result_index = 0
            for service in service_entities:
                service_id = service.get('entityId')
                service_requests_dict[service_id] = service_metric_results[result_index]
                result_index += 1
                service_errors_dict[service_id] = service_metric_results[result_index]
                result_index += 1
            
            # Calculer le nombre total de requêtes et le taux d'erreur moyen
            total_requests = 0
            total_errors = 0
            services_with_errors = 0
            
            for service in service_entities:
                service_id = service.get('entityId')
                
                # Extraire les données de requêtes
                requests_data = service_requests_dict[service_id]
                
                if requests_data and 'result' in requests_data and requests_data['result']:
                    result = requests_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        if values and values[0] is not None:
                            requests_count = int(values[0])
                            total_requests += requests_count
                
                # Extraire les données d'erreurs
                error_rate_data = service_errors_dict[service_id]
                
                if error_rate_data and 'result' in error_rate_data and error_rate_data['result']:
                    result = error_rate_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        if values and values[0] is not None:
                            error_rate = round(values[0], 1)
                            if error_rate > 0:
                                total_errors += error_rate
                                services_with_errors += 1
            
            avg_error_rate = round(total_errors / services_with_errors, 1) if services_with_errors > 0 else 0
            
            # Créer le résumé
            summary = {
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
            
            # Mettre en cache le résumé
            self.set_cache(cache_key, summary)
            
            return summary
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du résumé: {e}")
            return {
                'error': str(e),
                'timestamp': int(time.time() * 1000)
            }

# Décorateur pour mesurer le temps d'exécution des fonctions
def time_execution(func):
    """Décorateur pour mesurer le temps d'exécution des fonctions"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        elapsed_time = end_time - start_time
        logger.info(f"Fonction {func.__name__} exécutée en {elapsed_time:.2f} secondes")
        return result
    return wrapper