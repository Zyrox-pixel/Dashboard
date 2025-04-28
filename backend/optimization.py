"""
Module d'optimisation des requêtes API Dynatrace
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
            futures = []
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
                
                futures.append(
                    executor.submit(self.query_api, endpoint, params, use_cache, cache_key)
                )
            
            # Collecter les résultats
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    results.append(future.result())
                except Exception as e:
                    logger.error(f"Error in batch query: {str(e)}")
                    results.append(None)
            
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
        
        Args:
            service_ids (list): Liste des IDs de services
            from_time (int): Timestamp de début
            to_time (int): Timestamp de fin
            
        Returns:
            dict: Métriques pour tous les services
        """
        # Préparer les requêtes pour la récupération des détails des services
        service_details_queries = [(f"entities/{service_id}", None) for service_id in service_ids]
        
        # Récupérer les détails des services en parallèle
        service_details_list = self.batch_query(service_details_queries)
        
        # Préparer les requêtes de métriques pour tous les services
        metric_queries = []
        for service_id in service_ids:
            # Requête pour le temps de réponse
            metric_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.response.time",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                },
                True,
                f"response_time:{service_id}:{from_time}:{to_time}"
            ))
            
            # Requête pour le taux d'erreur
            metric_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.errors.total.rate",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                },
                True,
                f"error_rate:{service_id}:{from_time}:{to_time}"
            ))
            
            # Requête pour le nombre de requêtes
            metric_queries.append((
                "metrics/query",
                {
                    "metricSelector": "builtin:service.requestCount.total",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                },
                True,
                f"requests:{service_id}:{from_time}:{to_time}"
            ))
        
        # Exécuter toutes les requêtes de métriques en parallèle
        metric_results = self.batch_query(metric_queries)
        
        # Organiser les résultats par service
        service_metrics = {}
        metric_index = 0
        
        for i, service_id in enumerate(service_ids):
            service_details = service_details_list[i]
            
            # Vérification du type de service et activité
            service_status = "Actif"
            if service_details and 'properties' in service_details and 'monitoring' in service_details['properties']:
                if service_details['properties']['monitoring'].get('monitoringState') != "ACTIVE":
                    service_status = "Inactif"
            
            # Extraire les métriques pour ce service
            response_time_data = metric_results[metric_index]
            metric_index += 1
            error_rate_data = metric_results[metric_index]
            metric_index += 1
            requests_data = metric_results[metric_index]
            metric_index += 1
            
            # Traiter les résultats des métriques
            response_time = None
            error_rate = None
            requests_count = None
            
            # Extraire le temps de réponse
            if response_time_data and 'result' in response_time_data and response_time_data['result']:
                result = response_time_data['result'][0]
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    if values and values[0] is not None:
                        response_time = int(values[0])
            
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
            
            # Extraire la technologie de façon parallélisée ultérieurement
            service_metrics[service_id] = {
                'id': service_id,
                'name': service_details.get('displayName', 'Unknown') if service_details else 'Unknown',
                'response_time': response_time,
                'error_rate': error_rate,
                'requests': requests_count,
                'status': service_status,
                'dt_url': f"{self.env_url}/#entity/{service_id}"
            }
        
        # Récupérer les technologies en parallèle
        tech_queries = [(f"entities/{service_id}", None) for service_id in service_ids]
        tech_results = self.batch_query(tech_queries)
        
        # Extraire et ajouter les technologies
        for i, service_id in enumerate(service_ids):
            tech_info = self.extract_technology(service_id)
            service_metrics[service_id]['technology'] = tech_info['name']
            service_metrics[service_id]['tech_icon'] = tech_info['icon']
        
        # Récupérer les historiques de métriques en parallèle
        history_queries = []
        for service_id in service_ids:
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
                f"rt_history:{service_id}:{from_time}:{to_time}"
            ))
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
                f"er_history:{service_id}:{from_time}:{to_time}"
            ))
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
                f"req_history:{service_id}:{from_time}:{to_time}"
            ))
        
        # Exécuter les requêtes d'historique en parallèle
        history_results = self.batch_query(history_queries)
        
        # Traiter les résultats d'historique
        history_index = 0
        for service_id in service_ids:
            # Historique du temps de réponse
            rt_history_data = history_results[history_index]
            history_index += 1
            
            # Historique du taux d'erreur
            er_history_data = history_results[history_index]
            history_index += 1
            
            # Historique du nombre de requêtes
            req_history_data = history_results[history_index]
            history_index += 1
            
            # Transformer les données pour l'affichage
            response_time_history = []
            error_rate_history = []
            request_count_history = []
            
            # Traiter l'historique du temps de réponse
            if rt_history_data and 'result' in rt_history_data and rt_history_data['result']:
                result = rt_history_data['result'][0]
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    timestamps = result['data'][0].get('timestamps', [])
                    if values and timestamps:
                        for i in range(len(values)):
                            if values[i] is not None:
                                response_time_history.append({
                                    'timestamp': timestamps[i],
                                    'value': values[i]
                                })
            
            # Traiter l'historique du taux d'erreur
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
            
            # Traiter l'historique du nombre de requêtes
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
            
            # Ajouter les historiques aux métriques du service
            service_metrics[service_id]['response_time_history'] = response_time_history
            service_metrics[service_id]['error_rate_history'] = error_rate_history
            service_metrics[service_id]['request_count_history'] = request_count_history
        
        return list(service_metrics.values())

    # Modification à apporter dans le fichier backend/optimization.py
# Cherchez la méthode get_hosts_metrics_parallel et remplacez-la par celle-ci

def get_hosts_metrics_parallel(self, host_ids, from_time, to_time):
    """
    Récupère les métriques pour plusieurs hôtes en parallèle
    
    Args:
        host_ids (list): Liste des IDs d'hôtes
        from_time (int): Timestamp de début
        to_time (int): Timestamp de fin
        
    Returns:
        list: Métriques pour tous les hôtes
    """
    # Préparer les requêtes pour la récupération des détails des hôtes
    host_details_queries = [(f"entities/{host_id}", None) for host_id in host_ids]
    
    # Récupérer les détails des hôtes en parallèle
    host_details_list = self.batch_query(host_details_queries)
    
    # Préparer les requêtes de métriques pour tous les hôtes
    metric_queries = []
    for host_id in host_ids:
        # Requête pour l'utilisation CPU
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:host.cpu.usage",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({host_id})"
            },
            False,  # Désactivation du cache pour ce call
            f"cpu_usage:{host_id}:{from_time}:{to_time}"
        ))
        
        # Requête pour l'utilisation RAM
        metric_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:host.mem.usage",
                "from": from_time,
                "to": to_time,
                "entitySelector": f"entityId({host_id})"
            },
            False,  # Désactivation du cache pour ce call
            f"ram_usage:{host_id}:{from_time}:{to_time}"
        ))
    
    # Exécuter toutes les requêtes de métriques en parallèle
    metric_results = self.batch_query(metric_queries)
    
    # Organiser les résultats par hôte
    host_metrics = {}
    metric_index = 0
    
    for i, host_id in enumerate(host_ids):
        host_details = host_details_list[i]
        
        # Extraire les métriques pour cet hôte
        cpu_data = metric_results[metric_index]
        metric_index += 1
        ram_data = metric_results[metric_index]
        metric_index += 1
        
        # Traiter les résultats des métriques
        cpu_usage = None
        ram_usage = None
        
        # Extraire l'utilisation CPU
        logger.info(f"Traitement CPU pour l'hôte: {host_id}")
        try:
            if cpu_data and 'result' in cpu_data and cpu_data['result']:
                result = cpu_data['result'][0]
                logger.info(f"Host {host_id} - CPU result: {result}")
                
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    logger.info(f"Host {host_id} - CPU values brutes: {values}")
                    
                    if values and values[0] is not None:
                        # Exactement comme dans code.py
                        cpu_usage = int(values[0])
                        logger.info(f"Host {host_id} - CPU usage calculé: {cpu_usage}")
                    else:
                        logger.info(f"Host {host_id} - Pas de valeurs CPU (hôte inactif?)")
                else:
                    logger.info(f"Host {host_id} - Pas de résultats pour le CPU (mauvaise métrique?)")
        except Exception as e:
            logger.error(f"Host {host_id} - Erreur pour CPU: {e}")
        
        # Extraire l'utilisation RAM
        logger.info(f"Traitement RAM pour l'hôte: {host_id}")
        try:
            if ram_data and 'result' in ram_data and ram_data['result']:
                result = ram_data['result'][0]
                logger.info(f"Host {host_id} - RAM result: {result}")
                
                if 'data' in result and result['data']:
                    values = result['data'][0].get('values', [])
                    logger.info(f"Host {host_id} - RAM values brutes: {values}")
                    
                    if values and values[0] is not None:
                        # Exactement comme dans code.py
                        ram_usage = int(values[0])
                        logger.info(f"Host {host_id} - RAM usage calculé: {ram_usage}")
                    else:
                        logger.info(f"Host {host_id} - Pas de valeurs RAM (hôte inactif?)")
                else:
                    logger.info(f"Host {host_id} - Pas de résultats pour la RAM (mauvaise métrique?)")
        except Exception as e:
            logger.error(f"Host {host_id} - Erreur pour RAM: {e}")
        
        host_metrics[host_id] = {
            'id': host_id,
            'name': host_details.get('displayName', 'Unknown') if host_details else 'Unknown',
            'cpu': cpu_usage,
            'ram': ram_usage,
            'dt_url': f"{self.env_url}/#entity/{host_id}"
        }
        
        logger.info(f"Host {host_id} - Données finales: CPU={cpu_usage}, RAM={ram_usage}")
    
    # Récupérer les historiques de métriques en parallèle
    history_queries = []
    for host_id in host_ids:
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:host.cpu.usage",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({host_id})"
            },
            False,  # Désactivation du cache pour ce call
            f"cpu_history:{host_id}:{from_time}:{to_time}"
        ))
        history_queries.append((
            "metrics/query",
            {
                "metricSelector": "builtin:host.mem.usage",
                "from": from_time,
                "to": to_time,
                "resolution": "1h",
                "entitySelector": f"entityId({host_id})"
            },
            False,  # Désactivation du cache pour ce call
            f"ram_history:{host_id}:{from_time}:{to_time}"
        ))
    
    # Exécuter les requêtes d'historique en parallèle
    history_results = self.batch_query(history_queries)
    
    # Traiter les résultats d'historique
    history_index = 0
    for host_id in host_ids:
        # Historique CPU
        cpu_history_data = history_results[history_index]
        history_index += 1
        
        # Historique RAM
        ram_history_data = history_results[history_index]
        history_index += 1
        
        # Transformer les données pour l'affichage
        cpu_history = []
        ram_history = []
        
        # Traiter l'historique CPU
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
        
        # Traiter l'historique RAM
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
        
        # Ajouter les historiques aux métriques de l'hôte
        host_metrics[host_id]['cpu_history'] = cpu_history
        host_metrics[host_id]['ram_history'] = ram_history
    
    return list(host_metrics.values())

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
        Récupère un résumé des métriques en utilisant des requêtes parallèles
        
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
            # Préparer les requêtes de base
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
                    f"host_cpu:{host_id}:{from_time}:{to_time}"
                ))
            
            # Exécuter les requêtes CPU en parallèle
            host_cpu_results = self.batch_query(host_metric_queries)
            
            # Calculer l'utilisation moyenne du CPU et le nombre d'hôtes critiques
            total_cpu = 0
            critical_hosts = 0
            
            for i, host in enumerate(host_entities):
                cpu_data = host_cpu_results[i]
                
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
                    f"service_requests:{service_id}:{from_time}:{to_time}"
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
                    f"service_errors:{service_id}:{from_time}:{to_time}"
                ))
            
            # Exécuter les requêtes de services en parallèle
            service_metric_results = self.batch_query(service_metric_queries)
            
            # Calculer le nombre total de requêtes et le taux d'erreur moyen
            total_requests = 0
            total_errors = 0
            services_with_errors = 0
            
            for i, service in enumerate(service_entities):
                # Extraire les données de requêtes
                request_index = i * 2
                requests_data = service_metric_results[request_index]
                
                if requests_data and 'result' in requests_data and requests_data['result']:
                    result = requests_data['result'][0]
                    if 'data' in result and result['data']:
                        values = result['data'][0].get('values', [])
                        if values and values[0] is not None:
                            requests_count = int(values[0])
                            total_requests += requests_count
                
                # Extraire les données d'erreurs
                error_index = i * 2 + 1
                error_rate_data = service_metric_results[error_index]
                
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