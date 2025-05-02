"""
Module d'optimisation des requêtes API Dynatrace - OPTIMISÉ
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
import os
import re

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Désactiver les avertissements SSL si nécessaire
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class OptimizedAPIClient:
    """Client API optimisé pour Dynatrace avec support de requêtes parallèles et cache intelligent"""
    
    def __init__(self, env_url, api_token, verify_ssl=False, max_workers=20, max_connections=50, cache_duration=300):
        """
        Initialise un client API optimisé
        
        Args:
            env_url (str): URL de l'environnement Dynatrace
            api_token (str): Token API Dynatrace
            verify_ssl (bool): Vérifier les certificats SSL
            max_workers (int): Nombre maximum de workers parallèles
            max_connections (int): Nombre maximum de connexions HTTP simultanées
            cache_duration (int): Durée de vie du cache en secondes
        """
        self.env_url = env_url
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.max_workers = max_workers
        self.max_connections = max_connections
        self.cache_duration = cache_duration
        self.cache = {}
        self.cache_lock = threading.Lock()
        
        # Configuration avancée des connexions
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=max_connections,
            pool_maxsize=max_connections,
            max_retries=3,
            pool_block=False  # Ne pas bloquer lorsque le pool est plein
        )
        
        # Créer une session pour réutiliser les connexions
        self.session = requests.Session()
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        self.session.headers.update({
            'Authorization': f'Api-Token {self.api_token}',
            'Accept': 'application/json'
        })
        self.session.verify = self.verify_ssl
        
        # Utiliser des sémaphores pour contrôler l'accès aux ressources
        self.semaphore = threading.BoundedSemaphore(value=self.max_connections)
        
        # Ajouter un compteur de requêtes pour le monitoring
        self.request_count = 0
        self.request_count_lock = threading.Lock()
        
        logger.info(f"Client API initialisé avec {max_workers} workers et {max_connections} connexions maximales")
    
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
    
    # Ajouter une méthode pour gérer les requêtes avec sémaphore
    def _request_with_semaphore(self, method, url, **kwargs):
        with self.semaphore:
            with self.request_count_lock:
                self.request_count += 1
            
            try:
                response = self.session.request(method, url, **kwargs)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                logger.error(f"Erreur de requête HTTP: {e}")
                raise
            finally:
                # Libérer la connexion explicitement
                if 'response' in locals():
                    response.close()

    def query_api(self, endpoint, params=None, use_cache=True, cache_key=None):
        """
        Exécute une requête API avec gestion du cache et sémaphore
        
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
        
        # Exécuter la requête avec sémaphore
        url = f"{self.env_url}/api/v2/{endpoint}"
        try:
            response = self._request_with_semaphore("GET", url, params=params, timeout=(5, 30))
            result = response.json()
            
            # Mettre en cache le résultat
            if use_cache:
                self.set_cache(cache_key, result)
                
            return result
        except requests.RequestException as e:
            logger.error(f"API request error for {endpoint}: {str(e)}")
            # Réessayer une fois en cas d'erreur de connexion
            if "Connection" in str(e):
                logger.info(f"Tentative de reconnexion pour {endpoint}")
                time.sleep(1)  # Attendre 1 seconde avant de réessayer
                try:
                    response = self._request_with_semaphore("GET", url, params=params, timeout=(5, 30))
                    result = response.json()
                    if use_cache:
                        self.set_cache(cache_key, result)
                    return result
                except Exception as retry_e:
                    logger.error(f"Échec de la seconde tentative: {retry_e}")
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
        Exécute plusieurs requêtes API en parallèle avec contrôle de charge
        
        Args:
            queries (list): Liste de tuples (endpoint, params, use_cache, cache_key)
            
        Returns:
            list: Liste des résultats correspondants
        """
        # Si trop de requêtes, diviser en lots plus petits
        if len(queries) > self.max_connections:
            logger.info(f"Divisant {len(queries)} requêtes en lots de {self.max_connections}")
            results = []
            # Diviser les requêtes en groupes de max_connections
            for i in range(0, len(queries), self.max_connections):
                chunk = queries[i:i + self.max_connections]
                chunk_results = self._execute_batch(chunk)
                results.extend(chunk_results)
                # Pause courte entre les lots pour éviter la surcharge
                if i + self.max_connections < len(queries):
                    time.sleep(0.5)
            return results
        else:
            return self._execute_batch(queries)

    def _execute_batch(self, queries):
        """
        Exécute un lot de requêtes avec ThreadPoolExecutor
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
        Récupère les métriques pour plusieurs services en parallèle
        Optimisé pour gérer de grands nombres de services
        
        Args:
            service_ids (list): Liste des IDs de services
            from_time (int): Timestamp de début
            to_time (int): Timestamp de fin
            
        Returns:
            list: Métriques pour tous les services
        """
        # Si trop de services, traiter par lots
        chunk_size = int(os.environ.get('REQUEST_CHUNK_SIZE', 15))
        if len(service_ids) > chunk_size:
            logger.info(f"Traitement par lots de {len(service_ids)} services")
            all_service_metrics = []
            
            # Diviser les IDs en lots plus petits
            for i in range(0, len(service_ids), chunk_size):
                chunk_ids = service_ids[i:i + chunk_size]
                logger.info(f"Traitement du lot {i//chunk_size + 1}/{(len(service_ids) + chunk_size - 1)//chunk_size} ({len(chunk_ids)} services)")
                
                # Traiter ce lot
                chunk_metrics = self._process_service_chunk(chunk_ids, from_time, to_time)
                all_service_metrics.extend(chunk_metrics)
                
                # Petite pause entre les lots pour éviter de surcharger l'API
                if i + chunk_size < len(service_ids):
                    time.sleep(1)
            
            return all_service_metrics
        else:
            # Si peu de services, utiliser la méthode normale
            return self._process_service_chunk(service_ids, from_time, to_time)

    def _process_service_chunk(self, service_ids, from_time, to_time):
        """
        Traite un lot de services
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
        
        # Récupérer les technologies en parallèle avec caching
        tech_dict = {}
        for service_id in service_ids:
            tech_info = self.extract_technology(service_id)
            tech_dict[service_id] = tech_info
        
        # Pour l'historique, ne le faire que pour un sous-ensemble si trop nombreux
        history_sample_size = min(len(service_ids), 5)  # Limiter l'historique aux 5 premiers services
        history_service_ids = service_ids[:history_sample_size]
        
        # Préparer les requêtes d'historique avec clés explicites
        history_queries = []
        for service_id in history_service_ids:
            # Historique du temps de réponse avec résolution très fine (1min pour 30min de données)
            history_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.response.time",
                    "from": from_time,
                    "to": to_time,
                    "resolution": "1m",  # Résolution plus fine : 1 minute pour 30 minutes de données
                    "entitySelector": f"entityId({service_id})"
                },
                True,
                f"rt_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
            
            # Historique du taux d'erreur avec résolution très fine
            history_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.errors.total.rate",
                    "from": from_time,
                    "to": to_time,
                    "resolution": "1m",  # Résolution plus fine : 1 minute pour 30 minutes de données
                    "entitySelector": f"entityId({service_id})"
                },
                True,
                f"er_history:{service_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
            
            # Historique du nombre de requêtes avec résolution très fine
            history_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.requestCount.total",
                    "from": from_time,
                    "to": to_time,
                    "resolution": "1m",  # Résolution plus fine : 1 minute pour 30 minutes de données
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
        for service_id in history_service_ids:
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
            
            # Extraire le temps de réponse (conversion en ms)
            if response_time_data and 'result' in response_time_data and response_time_data['result']:
                result = response_time_data['result'][0]
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    if values and values[0] is not None:
                        # Conversion en secondes comme demandé
                        raw_value = values[0]
                        if raw_value < 10:  # Déjà en secondes
                            response_time = round(raw_value, 2)
                            logger.info(f"Service {service_id}: Temps de réponse en secondes: {response_time}s")
                        else:
                            # Convertir de millisecondes à secondes
                            response_time = round(raw_value / 1000, 2)
                            logger.info(f"Service {service_id}: Temps de réponse converti de {raw_value}ms à {response_time}s")
            
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
            
            # Traiter les historiques (uniquement si disponible dans le dictionnaire)
            response_time_history = []
            error_rate_history = []
            request_count_history = []
            
            # Historique du temps de réponse (uniquement si disponible)
            if service_id in rt_history_dict:
                rt_history_data = rt_history_dict[service_id]
                if rt_history_data and 'result' in rt_history_data and rt_history_data['result']:
                    result = rt_history_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        timestamps = result['data'][0].get('timestamps', [])
                        if values and timestamps:
                            for i in range(len(values)):
                                if values[i] is not None:
                                    # Conversion en secondes pour les valeurs historiques
                                    raw_value = values[i]
                                    if raw_value < 10:  # Déjà en secondes
                                        adjusted_value = round(raw_value, 2)
                                    else:
                                        # Convertir de millisecondes à secondes
                                        adjusted_value = round(raw_value / 1000, 2)
                                        
                                    response_time_history.append({
                                        'timestamp': timestamps[i],
                                        'value': adjusted_value
                                    })
            
            # Historique du taux d'erreur (uniquement si disponible)
            if service_id in er_history_dict:
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
            
            # Historique du nombre de requêtes (uniquement si disponible)
            if service_id in req_history_dict:
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

    def get_hosts_metrics_parallel(self, host_ids, from_time, to_time):
        """
        Récupère les métriques pour plusieurs hôtes en parallèle
        Optimisé pour gérer de grands nombres d'hôtes
        
        Args:
            host_ids (list): Liste des IDs d'hôtes
            from_time (int): Timestamp de début
            to_time (int): Timestamp de fin
            
        Returns:
            list: Métriques pour tous les hôtes
        """
        # Si trop d'hôtes, traiter par lots
        chunk_size = int(os.environ.get('REQUEST_CHUNK_SIZE', 15))
        if len(host_ids) > chunk_size:
            logger.info(f"Traitement par lots de {len(host_ids)} hôtes")
            all_host_metrics = []
            
            # Diviser les IDs en lots plus petits
            for i in range(0, len(host_ids), chunk_size):
                chunk_ids = host_ids[i:i + chunk_size]
                logger.info(f"Traitement du lot {i//chunk_size + 1}/{(len(host_ids) + chunk_size - 1)//chunk_size} ({len(chunk_ids)} hôtes)")
                
                # Traiter ce lot
                chunk_metrics = self._process_host_chunk(chunk_ids, from_time, to_time)
                all_host_metrics.extend(chunk_metrics)
                
                # Petite pause entre les lots pour éviter de surcharger l'API
                if i + chunk_size < len(host_ids):
                    time.sleep(1)
            
            return all_host_metrics
        else:
            # Si peu d'hôtes, utiliser la méthode normale
            return self._process_host_chunk(host_ids, from_time, to_time)

    def _process_host_chunk(self, host_ids, from_time, to_time):
        """
        Traite un lot d'hôtes
        """
        # Préparer les requêtes pour la récupération des détails des hôtes avec ID explicite
        host_details_queries = []
        for host_id in host_ids:
            host_details_queries.append((
                f"entities/{host_id}", 
                None, 
                True,
                f"host_details:{host_id}"  # Clé de cache explicite avec ID
            ))
        
        # Récupérer les détails des hôtes en parallèle
        host_details_results = self.batch_query(host_details_queries)
        
        # Créer un dictionnaire pour associer les résultats aux hôtes
        host_details_dict = {}
        for i, host_id in enumerate(host_ids):
            host_details_dict[host_id] = host_details_results[i]
        
        # Préparer les requêtes de métriques avec clés explicites
        metric_queries = []
        for host_id in host_ids:
            # Requête pour l'utilisation CPU avec ID explicite
            metric_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:host.cpu.usage",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({host_id})"
                },
                True,
                f"cpu_usage:{host_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
            
            # Requête pour l'utilisation RAM avec ID explicite
            metric_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:host.mem.usage",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({host_id})"
                },
                True,
                f"ram_usage:{host_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
        
        # Exécuter toutes les requêtes de métriques en parallèle
        all_metric_results = self.batch_query(metric_queries)
        
        # Créer des dictionnaires pour associer les résultats de métriques aux hôtes
        cpu_metrics = {}
        ram_metrics = {}
        
        # Distribuer les résultats dans des dictionnaires par ID d'hôte
        result_index = 0
        for host_id in host_ids:
            cpu_metrics[host_id] = all_metric_results[result_index]
            result_index += 1
            ram_metrics[host_id] = all_metric_results[result_index]
            result_index += 1
        
        # Pour l'historique, ne le faire que pour un sous-ensemble si trop nombreux
        history_sample_size = min(len(host_ids), 5)  # Limiter l'historique aux 5 premiers hôtes
        history_host_ids = host_ids[:history_sample_size]
        
        # Préparer les requêtes d'historique avec clés explicites
        history_queries = []
        for host_id in history_host_ids:
            # Historique CPU avec ID explicite
            history_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:host.cpu.usage",
                    "from": from_time,
                    "to": to_time,
                    "resolution": "1h",
                    "entitySelector": f"entityId({host_id})"
                },
                True,
                f"cpu_history:{host_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
            
            # Historique RAM avec ID explicite
            history_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:host.mem.usage",
                    "from": from_time,
                    "to": to_time,
                    "resolution": "1h",
                    "entitySelector": f"entityId({host_id})"
                },
                True,
                f"ram_history:{host_id}:{from_time}:{to_time}"  # Clé explicite avec ID
            ))
        
        # Exécuter les requêtes d'historique en parallèle
        history_results = self.batch_query(history_queries)
        
        # Créer des dictionnaires pour associer les résultats d'historique aux hôtes
        cpu_history_dict = {}
        ram_history_dict = {}
        
        # Distribuer les résultats d'historique dans des dictionnaires par ID d'hôte
        result_index = 0
        for host_id in history_host_ids:
            cpu_history_dict[host_id] = history_results[result_index]
            result_index += 1
            ram_history_dict[host_id] = history_results[result_index]
            result_index += 1
        
        # Maintenant, assembler les métriques pour chaque hôte
        host_metrics = []
        for host_id in host_ids:
            host_details = host_details_dict[host_id]
            cpu_data = cpu_metrics[host_id]
            ram_data = ram_metrics[host_id]
            
            # Extraire les valeurs de métriques
            cpu_usage = None
            ram_usage = None
            
            # Traitement des données CPU
            if cpu_data and 'result' in cpu_data and cpu_data['result']:
                result = cpu_data['result'][0]
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    if values and values[0] is not None:
                        cpu_usage = round(values[0], 1)
            
            # Traitement des données RAM
            if ram_data and 'result' in ram_data and ram_data['result']:
                result = ram_data['result'][0]
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    if values and values[0] is not None:
                        ram_usage = round(values[0], 1)
            
            # Traiter les historiques (uniquement si disponible dans le dictionnaire)
            cpu_history = []
            ram_history = []
            
            # Historique CPU (uniquement si disponible)
            if host_id in cpu_history_dict:
                cpu_history_data = cpu_history_dict[host_id]
                if cpu_history_data and 'result' in cpu_history_data and cpu_history_data['result']:
                    result = cpu_history_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        timestamps = result['data'][0].get('timestamps', [])
                        if values and timestamps:
                            for i in range(len(values)):
                                if values[i] is not None:
                                    cpu_history.append({
                                        'timestamp': timestamps[i],
                                        'value': values[i]
                                    })
            
            # Historique RAM (uniquement si disponible)
            if host_id in ram_history_dict:
                ram_history_data = ram_history_dict[host_id]
                if ram_history_data and 'result' in ram_history_data and ram_history_data['result']:
                    result = ram_history_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        timestamps = result['data'][0].get('timestamps', [])
                        if values and timestamps:
                            for i in range(len(values)):
                                if values[i] is not None:
                                    ram_history.append({
                                        'timestamp': timestamps[i],
                                        'value': values[i]
                                    })
            
            # Extraire la version de l'OS des propriétés de l'hôte
            os_version = "Non spécifié"
            if host_details and 'properties' in host_details:
                properties = host_details.get('properties', {})
                
                # Vérifier différentes propriétés possibles pour l'OS
                if 'osType' in properties:
                    os_type = properties.get('osType', "")
                    os_version = os_type
                    
                    # Ajouter la version si disponible
                    if 'osVersion' in properties:
                        os_version = f"{os_type} {properties.get('osVersion', '')}"
                elif 'kernelVersion' in properties:
                    os_version = f"Kernel {properties.get('kernelVersion', '')}"
                    
                    # Si osVersion est également disponible
                    if 'osVersion' in properties:
                        os_version = f"{properties.get('osVersion', '')} (Kernel {properties.get('kernelVersion', '')})"
                
                # Si aucune propriété spécifique n'est trouvée, chercher dans les tags
                if os_version == "Non spécifié" and 'tags' in host_details:
                    for tag in host_details.get('tags', []):
                        # Chercher les tags liés à l'OS
                        if tag.get('key') in ['OS', 'os', 'Operating System', 'system']:
                            os_version = tag.get('value', "Non spécifié")
                            break
            
            # Créer l'objet de métriques d'hôte
            host_metrics.append({
                'id': host_id,
                'name': host_details.get('displayName', 'Unknown') if host_details else 'Unknown',
                'cpu': cpu_usage,
                'ram': ram_usage,
                'os_version': os_version,  # Ajout de la version de l'OS
                'dt_url': f"{self.env_url}/#entity/{host_id}",
                'cpu_history': cpu_history,
                'ram_history': ram_history
            })
        
        return host_metrics


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
        # Utiliser une clé de cache unique pour chaque combinaison de paramètres
        cache_key = f"problems:{mz_name}:{time_from}:{status}"
        
        # Pour les problèmes OPEN (actifs) et ALL, ne pas utiliser le cache afin d'avoir des données en temps réel
        # Cela garantit que les problèmes résolus sont immédiatement reflétés dans l'interface
        # De même, pour status="ALL", on veut toujours des données à jour
        if status == "OPEN" or status == "ALL":
            logger.info(f"Récupération en temps réel des problèmes pour {mz_name} avec statut={status}, période={time_from}")
            # On continue sans consulter le cache
        else:
            # Pour les autres types de requêtes, on peut utiliser le cache mais avec une durée plus courte
            cached_data = self.get_cached(cache_key)
            if cached_data is not None:
                return cached_data
        
        try:
            # Récupérer tous les problèmes sans filtrer par MZ via l'API
            params = {"from": time_from}
            
            # Pour ALL, on veut tous les problèmes, y compris OPEN et CLOSED
            # Pour ce faire, nous ne spécifierons pas de statut à l'API Dynatrace,
            # ce qui retournera tous les problèmes, puis nous filtrerons selon les besoins
            if status is not None and status != "ALL":
                params["status"] = status
                
            # Déboguer les paramètres
            logger.info(f"Requête problèmes avec paramètres: {params}, mz_name: {mz_name}")
            
            # Pour les problèmes avec ALL sur une longue période, augmenter la taille max de page
            if status == "ALL" and (time_from.startswith("-7") or time_from.startswith("-3")):
                params["pageSize"] = 500  # Augmenter la taille maximale des résultats
            
            problems_data = self.query_api(
                endpoint="problems",
                params=params,
                use_cache=False  # Forcer la requête sans utiliser le cache interne de query_api
            )
            
            # Déboguer les résultats
            total_problems = len(problems_data.get('problems', [])) if 'problems' in problems_data else 0
            logger.info(f"Nombre total de problèmes récupérés: {total_problems} (statut:{status}, période:{time_from})")
            
            active_problems = []
            if 'problems' in problems_data:
                # Filtrage temporel supplémentaire côté serveur 
                # Calculer le timestamp limite pour filtrer les problèmes
                current_time = int(time.time() * 1000)  # Convertir en millisecondes
                time_limit = None
                
                # Traiter les différents formats de période
                if time_from == "-24h":
                    time_limit = current_time - (24 * 60 * 60 * 1000)
                elif time_from == "-72h" or time_from == "-3d":
                    time_limit = current_time - (72 * 60 * 60 * 1000)
                    logger.info(f"Récupération des problèmes sur 72 heures")
                elif time_from == "-30d":
                    time_limit = current_time - (30 * 24 * 60 * 60 * 1000)
                    logger.info(f"Récupération des problèmes sur 30 jours")
                elif time_from.startswith("-") and time_from.endswith("d"):
                    # Supporter des périodes personnalisées en jours (-Nd)
                    try:
                        days = int(time_from[1:-1])
                        time_limit = current_time - (days * 24 * 60 * 60 * 1000)
                        logger.info(f"Période personnalisée de {days} jours appliquée")
                    except ValueError:
                        logger.warning(f"Format de période non reconnu: {time_from}, utilisation des 72h par défaut")
                        time_limit = current_time - (72 * 60 * 60 * 1000)
                elif time_from.startswith("-") and time_from.endswith("h"):
                    # Supporter des périodes personnalisées en heures (-Nh)
                    try:
                        hours = int(time_from[1:-1])
                        time_limit = current_time - (hours * 60 * 60 * 1000)
                        logger.info(f"Période personnalisée de {hours} heures appliquée")
                    except ValueError:
                        logger.warning(f"Format de période non reconnu: {time_from}, utilisation des 72h par défaut")
                        time_limit = current_time - (72 * 60 * 60 * 1000)
                else:
                    logger.warning(f"Format de période non reconnu: {time_from}, utilisation des 72h par défaut")
                    time_limit = current_time - (72 * 60 * 60 * 1000)
                
                # On va filtrer manuellement les problèmes liés à notre Management Zone
                mz_problems = 0
                for problem in problems_data['problems']:
                    # Vérification explicite du statut pour les problèmes OPEN
                    if status == "OPEN" and problem.get('status') != 'OPEN':
                        logger.debug(f"Problème {problem.get('id')} ignoré car son statut est {problem.get('status')}")
                        continue
                    
                    # Vérifier aussi l'heure de fermeture pour les problèmes ouverts
                    if status == "OPEN" and problem.get('endTime', 0) > 0:
                        logger.debug(f"Problème {problem.get('id')} ignoré car il a une heure de fermeture")
                        continue
                    
                    # Filtrer par date si nécessaire
                    problem_start_time = problem.get('startTime', 0)
                    
                    # Pour le statut ALL, nous voulons inclure tous les problèmes qui étaient actifs pendant la période,
                    # même s'ils ont commencé avant la limite de temps
                    if time_limit and problem_start_time < time_limit:
                        # Pour le statut ALL, on vérifie si le problème était toujours actif pendant la période demandée
                        if status == "ALL":
                            end_time = problem.get('endTime', 0)
                            
                            # Si le problème n'a pas de temps de fin ou s'il s'est terminé après notre limite de temps,
                            # cela signifie qu'il était actif pendant la période demandée
                            if end_time == 0 or end_time >= time_limit:
                                # Inclure ce problème car il était actif pendant la période
                                logger.debug(f"Problème {problem.get('id')} inclus car actif pendant la période demandée (début: {problem_start_time}, fin: {end_time})")
                            else:
                                # Le problème s'est terminé avant notre période
                                logger.debug(f"Problème {problem.get('id')} ignoré car terminé avant la période: fin {end_time} < {time_limit}")
                                continue
                        else:
                            # Pour les autres statuts, suivre le comportement existant
                            logger.debug(f"Problème {problem.get('id')} ignoré car trop ancien: {problem_start_time} < {time_limit}")
                            continue
                        
                    # Si aucune MZ n'est spécifiée, inclure tous les problèmes
                    if mz_name is None:
                        # Pour les requêtes avec statut "ALL", ajouter l'info resolved
                        formatted_problem = self._format_problem(problem)
                        if status == "ALL":
                            formatted_problem['resolved'] = problem.get('status') != 'OPEN' or problem.get('endTime', 0) > 0
                        active_problems.append(formatted_problem)
                        continue
                    
                    # Vérifier si le problème est lié à notre Management Zone
                    is_in_mz = False
                    
                    # Rechercher dans les management zones directement attachées au problème (méthode standard)
                    if 'managementZones' in problem:
                        for mz in problem.get('managementZones', []):
                            if mz.get('name') == mz_name:
                                is_in_mz = True
                                break
                    
                    # Rechercher aussi dans les entités affectées si pas trouvé
                    if not is_in_mz:
                        for entity in problem.get('affectedEntities', []):
                            # Vérifier les management zones de chaque entité affectée
                            if 'managementZones' in entity:
                                for mz in entity.get('managementZones', []):
                                    if mz.get('name') == mz_name:
                                        is_in_mz = True
                                        break
                            if is_in_mz:
                                break
                    
                    # Si le problème est dans notre MZ, l'ajouter à notre liste
                    if is_in_mz:
                        mz_problems += 1
                        formatted_problem = self._format_problem(problem, mz_name)
                        # Pour les requêtes avec statut "ALL", ajouter l'info resolved
                        if status == "ALL":
                            formatted_problem['resolved'] = problem.get('status') != 'OPEN' or problem.get('endTime', 0) > 0
                        active_problems.append(formatted_problem)
                
                if mz_name:
                    logger.info(f"Problèmes filtrés appartenant à {mz_name}: {mz_problems}/{total_problems}")
            
            # Pour les problèmes actifs (OPEN), utiliser une durée de cache réduite
            # pour les autres types, utiliser la durée standard
            if status == "OPEN" or status is None:
                # La durée de mise en cache pour les problèmes actifs est gérée par PROBLEMS_CACHE_DURATION dans app.py
                # Elle est plus courte pour garantir des données plus à jour
                # Utiliser la méthode standard mais noter qu'en app.py, le cache sera court-circuité pour les OPEN
                self.set_cache(cache_key, active_problems)
                logger.info(f"Mise en cache des problèmes actifs pour {cache_key} - durée limitée")
            else:
                self.set_cache(cache_key, active_problems)
                logger.info(f"Mise en cache standard des problèmes pour {cache_key}")
            
            return active_problems
        
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des problèmes: {e}")
            return []
    
    def _format_problem(self, problem, zone=None):
        """Formate un problème pour la réponse API avec extraction améliorée des informations de machine"""
        # Vérification améliorée pour détecter les problèmes résolus
        # Un problème est résolu s'il a une heure de fermeture, statut non-OPEN, 
        # ou si son statut de résolution est défini
        is_resolved = (
            problem.get('status') != 'OPEN' or 
            problem.get('endTime', 0) > 0 or
            problem.get('resolutionState') == 'RESOLVED' or
            problem.get('resolved', False)
        )
        
        # Si l'état est 'OPEN' mais qu'il y a une heure de fermeture, forcer la résolution
        if problem.get('status') == 'OPEN' and problem.get('endTime', 0) > 0:
            logger.info(f"Problème {problem.get('problemId')} marqué comme résolu car il a une heure de fermeture")
            is_resolved = True
        
        # Calculer la durée du problème en secondes
        start_time_ms = problem.get('startTime', 0)
        end_time_ms = problem.get('endTime', 0) if problem.get('endTime', 0) > 0 else int(time.time() * 1000)
        duration_sec = (end_time_ms - start_time_ms) / 1000
        
        # Formatage des dates pour l'affichage avec indication explicite qu'il s'agit d'UTC
        # Les timestamps Dynatrace sont en millisecondes depuis epoch en UTC
        # Ajouter des logs pour débogage des problèmes de timezone
        logger.info(f"Problème {problem.get('problemId')}: timestamp={start_time_ms}, timestamp_sec={start_time_ms/1000}")
        
        # Utiliser datetime.utcfromtimestamp pour garantir la cohérence, puis convertir en heure locale
        start_time_utc = datetime.utcfromtimestamp(start_time_ms/1000)
        # On ajoute 2 heures pour prendre en compte le décalage horaire CEST (UTC+2)
        start_time_local = start_time_utc + timedelta(hours=2)
        start_time_str = start_time_local.strftime('%Y-%m-%d %H:%M')
        
        # Ajouter l'heure de fermeture si elle existe
        end_time_str = None
        if problem.get('endTime', 0) > 0:
            end_time_ms = problem.get('endTime', 0)
            # Même ajustement pour l'heure de fin
            end_time_utc = datetime.utcfromtimestamp(end_time_ms/1000)
            # On ajoute 2 heures pour prendre en compte le décalage horaire CEST (UTC+2)
            end_time_local = end_time_utc + timedelta(hours=2)
            end_time_str = end_time_local.strftime('%Y-%m-%d %H:%M')
            logger.info(f"Problème {problem.get('problemId')}: fin_timestamp={end_time_ms}, fin_formatée={end_time_str}")
        
        # Déterminer la durée au format lisible (en jours plutôt qu'en heures)
        duration_display = ""
        if duration_sec < 60:
            duration_display = f"{int(duration_sec)}s"
        elif duration_sec < 3600:
            duration_display = f"{int(duration_sec / 60)}m"
        elif duration_sec < 86400:  # Moins d'un jour
            duration_display = f"{int(duration_sec / 3600)}h {int((duration_sec % 3600) / 60)}m"
        else:  # Plus d'un jour
            days = int(duration_sec / 86400)
            hours = int((duration_sec % 86400) / 3600)
            duration_display = f"{days}j {hours}h"
            
        # NOUVELLE FONCTIONNALITÉ: Extraction améliorée du nom de machine
        host_name = "Non spécifié"
        
        # Chercher d'abord dans les entités affectées
        if 'affectedEntities' in problem:
            for entity in problem.get('affectedEntities', []):
                if entity.get('type') == 'HOST':
                    host_name = entity.get('name', entity.get('displayName', "Non spécifié"))
                    logger.info(f"Hôte trouvé dans affectedEntities: {host_name}")
                    break
        
        # Si aucun hôte n'est trouvé, essayer d'extraire depuis le titre
        if host_name == "Non spécifié" and problem.get('title'):
            title = problem.get('title', '')
            
            # Essayer plusieurs patterns de correspondance
            patterns = [
                r'HOST:\s*(\S+)',             # HOST: hostname
                r'host\s+(\S+)',              # host hostname
                r'\bon\s+(\S+)',              # on hostname
                r'\bat\s+(\S+)',              # at hostname
                r'\b([Ss][A-Za-z0-9]{5,})\b', # Serveurs commençant par S
                r'\b(WIN\w+)\b'               # Serveurs Windows
            ]
            
            for pattern in patterns:
                host_match = re.search(pattern, title, re.IGNORECASE)
                if host_match:
                    # Récupérer le premier groupe non-None
                    match_value = next((g for g in host_match.groups() if g), "Non spécifié")
                    
                    # Filtrer les faux positifs (mots courants qui ne sont pas des noms d'hôtes)
                    if match_value.lower() not in ["status", "service", "such", "still", "some", "system", "server"]:
                        host_name = match_value
                        logger.info(f"Hôte trouvé dans le titre via pattern {pattern}: {host_name}")
                        break
        
        # Si toujours pas d'hôte, essayer dans le sous-titre ou la description
        if host_name == "Non spécifié" and problem.get('description'):
            description = problem.get('description', '')
            host_match = re.search(r'\b([Ss][A-Za-z0-9]{5,}|WIN\w+)\b', description)
            if host_match and host_match.group(1).lower() not in ["status", "service", "such", "still", "some", "system", "server"]:
                host_name = host_match.group(1)
                logger.info(f"Hôte trouvé dans la description: {host_name}")
        
        return {
            'id': problem.get('problemId', 'Unknown'),
            'title': problem.get('title', 'Problème inconnu'),
            'impact': problem.get('impactLevel', 'UNKNOWN'),
            'status': 'RESOLVED' if is_resolved else problem.get('status', 'OPEN'),
            'affected_entities': len(problem.get('affectedEntities', [])),
            'start_time': start_time_str,
            'end_time': end_time_str,  # Ajout de l'heure de fermeture
            'duration': duration_display,  # Ajout de la durée du problème
            'dt_url': f"{self.env_url}/#problems/problemdetails;pid={problem.get('problemId', 'Unknown')}",
            'zone': zone or self._extract_problem_zone(problem),
            'resolved': is_resolved,
            'host': host_name,  # Ajout du champ host explicite
            'impacted': host_name  # Ajout pour compatibilité avec le frontend actuel
        }
        
    def _extract_problem_zone(self, problem):
        """Extrait la zone principale d'un problème"""
        if 'managementZones' in problem and problem['managementZones']:
            return problem['managementZones'][0].get('name', 'Non spécifié')
        return 'Non spécifié'

    def get_summary_parallelized(self, mz_name, from_time, to_time):
        """
        Récupère un résumé des métriques en utilisant des requêtes parallèles optimisées
        
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
            # Préparer les requêtes de base avec clés explicites et timeout
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
            
            # Exécuter les requêtes en parallèle avec un retry en cas d'échec
            results = None
            retry_count = 0
            max_retries = 3
            
            while results is None and retry_count < max_retries:
                try:
                    results = self.batch_query(entity_queries)
                    if not all(results):
                        # Si une des requêtes a échoué, réessayer
                        logger.warning(f"Certaines requêtes ont échoué, retry {retry_count+1}/{max_retries}")
                        results = None
                        retry_count += 1
                        time.sleep(1)  # Attendre avant de réessayer
                        continue
                except Exception as e:
                    logger.error(f"Erreur lors des requêtes en lot: {e}, retry {retry_count+1}/{max_retries}")
                    retry_count += 1
                    time.sleep(1)  # Attendre avant de réessayer
                    if retry_count >= max_retries:
                        raise

            # S'il n'y a toujours pas de résultats après les tentatives
            if results is None:
                logger.error("Impossible d'obtenir les résultats après plusieurs tentatives")
                return {
                    'error': "Impossible d'obtenir les données après plusieurs tentatives",
                    'timestamp': int(time.time() * 1000)
                }
            
            # Utiliser des index explicites
            services_data = results[0]
            hosts_data = results[1]
            problems_data = results[2]
            
            # Vérifier que les résultats sont valides
            if not services_data or not hosts_data:
                logger.warning("Données incomplètes reçues de l'API")
                services_count = 0 if not services_data else len(services_data.get('entities', []))
                hosts_count = 0 if not hosts_data else len(hosts_data.get('entities', []))
                problems_count = 0 if not problems_data else len(problems_data.get('problems', []))
                
                # Créer un résumé minimal avec les informations disponibles
                summary = {
                    'hosts': {
                        'count': hosts_count,
                        'avg_cpu': 0,
                        'critical_count': 0
                    },
                    'services': {
                        'count': services_count,
                        'with_errors': 0,
                        'avg_error_rate': 0
                    },
                    'requests': {
                        'total': 0,
                        'hourly_avg': 0
                    },
                    'problems': {
                        'count': problems_count
                    },
                    'timestamp': int(time.time() * 1000),
                    'data_quality': 'partial'  # Indiquer que les données sont partielles
                }
                
                self.set_cache(cache_key, summary)
                return summary
            
            # Calculer les métriques résumées
            services_count = len(services_data.get('entities', []))
            hosts_count = len(hosts_data.get('entities', []))
            problems_count = len(problems_data.get('problems', []))
            
            # Limiter le nombre d'hôtes et de services pour éviter la surcharge
            max_metrics_entities = int(os.environ.get('MAX_METRICS_ENTITIES', 20))
            
            # Pour les hôtes, ne prendre que les MAX_METRICS_ENTITIES premiers
            host_entities = hosts_data.get('entities', [])[:max_metrics_entities]
            
            # Préparer les requêtes de métriques en lot pour les hôtes limités
            host_metric_queries = []
            
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
            valid_cpu_count = 0
            
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
                            valid_cpu_count += 1
            
            avg_cpu = round(total_cpu / valid_cpu_count, 1) if valid_cpu_count > 0 else 0
            
            # Pour les services, ne prendre que les MAX_METRICS_ENTITIES premiers
            service_entities = services_data.get('entities', [])[:max_metrics_entities]
            
            # Préparer les requêtes de métriques pour les services limités
            service_metric_queries = []
            
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
                'timestamp': int(time.time() * 1000),
                'data_quality': 'full'  # Indiquer que les données sont complètes
            }
            
            # Mettre en cache le résumé
            self.set_cache(cache_key, summary)
            
            return summary
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du résumé: {e}")
            return {
                'error': str(e),
                'timestamp': int(time.time() * 1000),
                'data_quality': 'error'
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