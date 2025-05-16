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
import json

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
        
        # Configuration avancée des retries
        retry_strategy = requests.adapters.Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "PUT", "DELETE", "OPTIONS", "TRACE"]
        )
        
        # Sessions HTTP réutilisables pour optimiser les connexions
        self.sessions = []
        for _ in range(self.max_connections):
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=1,
                pool_maxsize=1,
                max_retries=retry_strategy
            )
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            session.headers.update(self._default_headers())
            session.verify = self.verify_ssl
            self.sessions.append(session)
        
        self.session_index = 0
        self.session_lock = threading.Lock()
        
        # Regroupement des requêtes pour optimisation
        self.request_groups = {}
        self.request_groups_lock = threading.Lock()
        
        # Métriques de performance
        self.metrics = {
            'total_requests': 0,
            'cache_hits': 0,
            'api_calls': 0,
            'error_count': 0,
            'total_api_time': 0,
            'retry_count': 0,
            'batch_optimization': 0
        }
        self.metrics_lock = threading.Lock()

    def _default_headers(self):
        """Headers par défaut pour toutes les requêtes"""
        return {
            'Authorization': f'Api-Token {self.api_token}',
            'Accept': 'application/json; charset=utf-8',
            'Content-Type': 'application/json'
        }

    def _get_session(self):
        """Obtient une session HTTP disponible en rotation"""
        with self.session_lock:
            session = self.sessions[self.session_index]
            self.session_index = (self.session_index + 1) % len(self.sessions)
            return session

    def _cache_key(self, endpoint, params=None, custom_key=None):
        """Génère une clé de cache unique"""
        if custom_key:
            return custom_key
        key_parts = [endpoint]
        if params:
            sorted_params = sorted(params.items())
            key_parts.append(str(sorted_params))
        return ":".join(key_parts)

    def _get_from_cache(self, cache_key):
        """Récupère une valeur du cache si elle existe et n'est pas expirée"""
        with self.cache_lock:
            if cache_key in self.cache:
                data, timestamp = self.cache[cache_key]
                if time.time() - timestamp < self.cache_duration:
                    with self.metrics_lock:
                        self.metrics['cache_hits'] += 1
                    return data
                else:
                    del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key, data):
        """Stocke une valeur dans le cache avec timestamp"""
        with self.cache_lock:
            self.cache[cache_key] = (data, time.time())

    def _clear_cache(self, pattern=None):
        """Efface le cache complet ou les entrées correspondant au pattern"""
        with self.cache_lock:
            if pattern:
                keys_to_delete = [key for key in self.cache.keys() if pattern in key]
                for key in keys_to_delete:
                    del self.cache[key]
            else:
                self.cache.clear()

    def get_cache_stats(self):
        """Retourne les statistiques de performance"""
        with self.metrics_lock:
            stats = self.metrics.copy()
            if stats['total_requests'] > 0:
                stats['cache_hit_rate'] = stats['cache_hits'] / stats['total_requests'] * 100
                stats['api_hit_rate'] = stats['api_calls'] / stats['total_requests'] * 100
                stats['error_rate'] = stats['error_count'] / stats['total_requests'] * 100
            if stats['api_calls'] > 0:
                stats['avg_api_time'] = stats['total_api_time'] / stats['api_calls']
            return stats

    def single_query(self, endpoint, params=None, use_cache=True, custom_cache_key=None, timeout=None):
        """
        Effectue une requête unique à l'API Dynatrace avec cache automatique
        """
        with self.metrics_lock:
            self.metrics['total_requests'] += 1
        
        # Vérifier le cache si activé
        if use_cache:
            cache_key = self._cache_key(endpoint, params, custom_cache_key)
            cached_data = self._get_from_cache(cache_key)
            if cached_data is not None:
                return cached_data
        
        # Faire la requête API
        url = f"{self.env_url}/api/v2/{endpoint}"
        session = self._get_session()
        
        start_time = time.time()
        retry_count = 0
        
        while retry_count <= 3:
            try:
                # Gestion intelligente du timeout
                if timeout is None:
                    # Timeout adaptatif basé sur le type de requête
                    if 'metrics/query' in endpoint:
                        timeout = 60  # Requêtes de métriques plus longues
                    elif 'problems' in endpoint:
                        timeout = 30  # Requêtes de problèmes moyennes
                    else:
                        timeout = 15  # Requêtes standard
                
                response = session.get(url, params=params, timeout=timeout)
                
                if response.status_code == 200:
                    with self.metrics_lock:
                        self.metrics['api_calls'] += 1
                        self.metrics['total_api_time'] += time.time() - start_time
                    
                    data = response.json()
                    
                    # Mettre en cache si activé
                    if use_cache:
                        self._set_cache(cache_key, data)
                    
                    return data
                
                elif response.status_code == 429:  # Rate limit
                    retry_count += 1
                    wait_time = min(2 ** retry_count, 30)
                    logger.warning(f"Rate limit atteint, attente de {wait_time}s...")
                    time.sleep(wait_time)
                    with self.metrics_lock:
                        self.metrics['retry_count'] += 1
                
                else:
                    response.raise_for_status()
                    
            except requests.exceptions.Timeout:
                retry_count += 1
                if retry_count > 3:
                    with self.metrics_lock:
                        self.metrics['error_count'] += 1
                    raise Exception(f"Timeout après {retry_count} tentatives pour {endpoint}")
                time.sleep(2 ** retry_count)
                
            except Exception as e:
                with self.metrics_lock:
                    self.metrics['error_count'] += 1
                logger.error(f"Erreur lors de la requête {endpoint}: {str(e)}")
                return None
        
        with self.metrics_lock:
            self.metrics['error_count'] += 1
        return None

    def batch_query(self, queries):
        """
        Effectue plusieurs requêtes en parallèle avec optimisation intelligente
        
        Args:
            queries: Liste de tuples (endpoint, params, use_cache, custom_cache_key)
        
        Returns:
            Liste des résultats dans l'ordre des requêtes
        """
        results = [None] * len(queries)
        
        # Séparer les requêtes qui peuvent être groupées
        grouped_queries = self._group_similar_queries(queries)
        
        # Créer un ThreadPoolExecutor avec un nombre optimal de workers
        adaptive_workers = min(self.max_workers, len(queries))
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=adaptive_workers) as executor:
            future_to_index = {}
            
            # Pour chaque groupe de requêtes similaires
            for group_key, group_data in grouped_queries.items():
                indices = group_data['indices']
                
                # Si on peut optimiser ce groupe (même endpoint, différents paramètres)
                if len(indices) > 1 and self._can_batch_optimize(group_key):
                    # Créer une requête unique optimisée pour tout le groupe
                    future = executor.submit(self._optimized_group_query, group_data)
                    future_to_index[future] = indices
                else:
                    # Sinon, faire les requêtes individuellement
                    for idx in indices:
                        query = queries[idx]
                        endpoint = query[0]
                        params = query[1] if len(query) > 1 else None
                        use_cache = query[2] if len(query) > 2 else True
                        custom_cache_key = query[3] if len(query) > 3 else None
                        
                        future = executor.submit(
                            self.single_query,
                            endpoint,
                            params,
                            use_cache,
                            custom_cache_key
                        )
                        future_to_index[future] = [idx]
            
            # Récupérer les résultats
            for future in concurrent.futures.as_completed(future_to_index):
                indices = future_to_index[future]
                try:
                    result = future.result()
                    
                    # Si c'est un résultat groupé
                    if isinstance(result, dict) and '_batch_results' in result:
                        for idx, res in zip(indices, result['_batch_results']):
                            results[idx] = res
                    else:
                        # Résultat simple
                        for idx in indices:
                            results[idx] = result
                            
                except Exception as e:
                    logger.error(f"Erreur dans requête batch: {str(e)}")
                    for idx in indices:
                        results[idx] = None
        
        return results

    def _group_similar_queries(self, queries):
        """Groupe les requêtes similaires pour optimisation"""
        groups = {}
        
        for idx, query in enumerate(queries):
            endpoint = query[0]
            group_key = endpoint.split('?')[0]  # Endpoint sans paramètres
            
            if group_key not in groups:
                groups[group_key] = {
                    'queries': [],
                    'indices': [],
                    'endpoint': endpoint
                }
            
            groups[group_key]['queries'].append(query)
            groups[group_key]['indices'].append(idx)
        
        return groups

    def _can_batch_optimize(self, endpoint):
        """Détermine si un endpoint peut être optimisé en batch"""
        batch_optimizable = [
            'entities',
            'problems',
            'metrics/query',
            'events'
        ]
        
        return any(opt in endpoint for opt in batch_optimizable)

    def _optimized_group_query(self, group_data):
        """
        Exécute une requête optimisée pour un groupe
        """
        endpoint = group_data['endpoint']
        queries = group_data['queries']
        
        # Pour les entités, on peut combiner les IDs
        if 'entities' in endpoint:
            return self._batch_entities_query(queries)
        
        # Pour les métriques, on peut combiner les sélecteurs
        elif 'metrics/query' in endpoint:
            return self._batch_metrics_query(queries)
        
        # Sinon, pas d'optimisation
        return None

    def _batch_entities_query(self, queries):
        """Combine plusieurs requêtes d'entités en une seule"""
        try:
            # Extraire tous les IDs d'entités
            entity_ids = []
            for query in queries:
                endpoint = query[0]
                if 'entities/' in endpoint:
                    entity_id = endpoint.split('entities/')[-1]
                    entity_ids.append(entity_id)
            
            if not entity_ids:
                return None
            
            # Créer une requête unique pour toutes les entités
            params = {
                'entitySelector': f'entityId({",".join(entity_ids)})'
            }
            
            result = self.single_query('entities', params)
            
            if result and 'entities' in result:
                # Créer un dictionnaire pour mapper les résultats
                entities_map = {e['entityId']: e for e in result['entities']}
                
                # Retourner les résultats dans l'ordre original
                batch_results = []
                for entity_id in entity_ids:
                    batch_results.append(entities_map.get(entity_id))
                
                return {'_batch_results': batch_results}
            
            with self.metrics_lock:
                self.metrics['batch_optimization'] += 1
            
        except Exception as e:
            logger.error(f"Erreur dans batch entities: {str(e)}")
        
        return None

    def _batch_metrics_query(self, queries):
        """Combine plusieurs requêtes de métriques"""
        try:
            # Regrouper par timeframe similaire
            timeframe_groups = {}
            
            for query in queries:
                params = query[1] if len(query) > 1 else {}
                timeframe = params.get('from', 'now-1h')
                
                if timeframe not in timeframe_groups:
                    timeframe_groups[timeframe] = []
                
                timeframe_groups[timeframe].append(params)
            
            # Pour chaque groupe de timeframe
            results = []
            for timeframe, params_list in timeframe_groups.items():
                # Combiner les metric selectors
                selectors = []
                for params in params_list:
                    if 'metricSelector' in params:
                        selectors.append(params['metricSelector'])
                
                if selectors:
                    combined_params = {
                        'metricSelector': ','.join(selectors),
                        'from': timeframe,
                        'to': params_list[0].get('to', 'now')
                    }
                    
                    result = self.single_query('metrics/query', combined_params)
                    
                    if result:
                        results.append(result)
            
            with self.metrics_lock:
                self.metrics['batch_optimization'] += 1
            
            return {'_batch_results': results}
            
        except Exception as e:
            logger.error(f"Erreur dans batch metrics: {str(e)}")
        
        return None


class OptimizedAPIDynatrace:
    """Classe optimisée pour les interactions avec l'API Dynatrace"""
    
    def __init__(self, api_token, environment_url, verify_ssl=False, max_workers=20):
        self.client = OptimizedAPIClient(
            env_url=environment_url,
            api_token=api_token,
            verify_ssl=verify_ssl,
            max_workers=max_workers
        )
        
        # Métriques de performance par type d'appel
        self.call_metrics = {}
        self.call_metrics_lock = threading.Lock()
    
    def _track_call(self, call_type, duration, success=True):
        """Enregistre les métriques d'un appel API"""
        with self.call_metrics_lock:
            if call_type not in self.call_metrics:
                self.call_metrics[call_type] = {
                    'count': 0,
                    'success': 0,
                    'errors': 0,
                    'total_time': 0,
                    'min_time': float('inf'),
                    'max_time': 0
                }
            
            metrics = self.call_metrics[call_type]
            metrics['count'] += 1
            metrics['total_time'] += duration
            
            if success:
                metrics['success'] += 1
                metrics['min_time'] = min(metrics['min_time'], duration)
                metrics['max_time'] = max(metrics['max_time'], duration)
            else:
                metrics['errors'] += 1
    
    def get_performance_report(self):
        """Génère un rapport de performance détaillé"""
        report = {
            'client_metrics': self.client.get_cache_stats(),
            'call_metrics': {}
        }
        
        with self.call_metrics_lock:
            for call_type, metrics in self.call_metrics.items():
                report['call_metrics'][call_type] = metrics.copy()
                if metrics['count'] > 0:
                    report['call_metrics'][call_type]['avg_time'] = metrics['total_time'] / metrics['count']
                    report['call_metrics'][call_type]['success_rate'] = metrics['success'] / metrics['count'] * 100
        
        return report
    
    def get_all_processes_status_optimized(self):
        """
        Récupère le statut de tous les processus avec optimisation avancée
        """
        start_time = time.time()
        
        try:
            # Utiliser un sélecteur d'entités optimisé
            params = {
                'entitySelector': 'type(PROCESS_GROUP_INSTANCE)',
                'fields': 'properties.state,properties.softwareTechnologies,properties.metadata,fromRelationships.runsOn',
                'from': 'now-5m',
                'pageSize': 500
            }
            
            all_processes = []
            next_page_key = True
            
            while next_page_key:
                if next_page_key != True:
                    params['nextPageKey'] = next_page_key
                
                result = self.client.single_query('entities', params, use_cache=True)
                
                if result and 'entities' in result:
                    all_processes.extend(result['entities'])
                    next_page_key = result.get('nextPageKey')
                else:
                    break
            
            # Optimiser le formatage des résultats
            formatted_processes = []
            for process in all_processes:
                formatted_process = {
                    'entityId': process.get('entityId'),
                    'displayName': process.get('displayName'),
                    'state': process.get('properties', {}).get('state'),
                    'technologies': process.get('properties', {}).get('softwareTechnologies', []),
                    'metadata': process.get('properties', {}).get('metadata', {}),
                    'host': None
                }
                
                # Extraire l'information de l'hôte
                relations = process.get('fromRelationships', {})
                if 'runsOn' in relations and relations['runsOn']:
                    formatted_process['host'] = relations['runsOn'][0].get('id')
                
                formatted_processes.append(formatted_process)
            
            duration = time.time() - start_time
            self._track_call('get_all_processes_status', duration, success=True)
            
            return formatted_processes
            
        except Exception as e:
            duration = time.time() - start_time
            self._track_call('get_all_processes_status', duration, success=False)
            logger.error(f"Erreur dans get_all_processes_status_optimized: {str(e)}")
            return []
    
    def get_all_hosts_metrics_optimized(self, from_time='now-1h', to_time='now'):
        """
        Récupère les métriques de tous les hôtes avec optimisation maximale
        """
        start_time = time.time()
        
        try:
            # 1. Récupérer tous les hôtes
            host_params = {
                'entitySelector': 'type(HOST)',
                'fields': 'properties.state,properties.osType,properties.osVersion,tags',
                'pageSize': 500
            }
            
            all_hosts = []
            next_page_key = True
            
            while next_page_key:
                if next_page_key != True:
                    host_params['nextPageKey'] = next_page_key
                
                result = self.client.single_query('entities', host_params, use_cache=True)
                
                if result and 'entities' in result:
                    all_hosts.extend(result['entities'])
                    next_page_key = result.get('nextPageKey')
                else:
                    break
            
            if not all_hosts:
                return []
            
            # 2. Préparer les requêtes de métriques en batch
            host_ids = [host['entityId'] for host in all_hosts]
            
            # Si beaucoup d'hôtes, traiter par lots
            if len(host_ids) > 50:
                return self._process_large_host_batch(host_ids, from_time, to_time)
            else:
                return self._process_host_metrics_batch(host_ids, from_time, to_time)
            
        except Exception as e:
            duration = time.time() - start_time
            self._track_call('get_all_hosts_metrics', duration, success=False)
            logger.error(f"Erreur dans get_all_hosts_metrics_optimized: {str(e)}")
            return []
    
    def _process_host_metrics_batch(self, host_ids, from_time, to_time):
        """
        Traite les métriques pour un batch d'hôtes
        """
        # Créer des requêtes pour toutes les métriques nécessaires
        metric_selectors = [
            'builtin:host.cpu.usage',
            'builtin:host.mem.usage',
            'builtin:host.disk.avail.percent',
            'builtin:host.net.nic.trafficIn',
            'builtin:host.net.nic.trafficOut'
        ]
        
        # Construire une requête batch pour toutes les métriques et tous les hôtes
        batch_queries = []
        
        for metric_selector in metric_selectors:
            # Créer un sélecteur pour tous les hôtes
            entity_selector = f'type(HOST),entityId({",".join(host_ids)})'
            
            params = {
                'metricSelector': metric_selector,
                'entitySelector': entity_selector,
                'from': from_time,
                'to': to_time,
                'resolution': 'Inf'  # Une seule valeur agrégée
            }
            
            batch_queries.append(('metrics/query', params))
        
        # Exécuter toutes les requêtes en parallèle
        results = self.client.batch_query(batch_queries)
        
        # Organiser les résultats par hôte
        host_metrics = {}
        
        for metric_idx, result in enumerate(results):
            if result and 'result' in result:
                metric_name = metric_selectors[metric_idx].split(':')[-1]
                
                for metric_result in result['result']:
                    if 'data' in metric_result and metric_result['data']:
                        for data_point in metric_result['data']:
                            host_id = data_point.get('dimensions', [None])[0]
                            if host_id:
                                if host_id not in host_metrics:
                                    host_metrics[host_id] = {
                                        'entityId': host_id,
                                        'metrics': {}
                                    }
                                
                                values = data_point.get('values', [])
                                if values:
                                    host_metrics[host_id]['metrics'][metric_name] = values[0]
        
        return list(host_metrics.values())
    
    def _process_large_host_batch(self, host_ids, from_time, to_time):
        """
        Traite un grand nombre d'hôtes en les divisant en lots plus petits
        """
        chunk_size = 50
        all_results = []
        
        for i in range(0, len(host_ids), chunk_size):
            chunk_ids = host_ids[i:i + chunk_size]
            logger.info(f"Traitement du lot {i//chunk_size + 1}/{(len(host_ids) + chunk_size - 1)//chunk_size}")
            
            chunk_results = self._process_host_metrics_batch(chunk_ids, from_time, to_time)
            all_results.extend(chunk_results)
            
            # Petite pause entre les lots
            if i + chunk_size < len(host_ids):
                time.sleep(0.5)
        
        return all_results
    
    def get_management_zones_optimized(self):
        """
        Récupère toutes les management zones avec leurs comptes d'entités
        """
        start_time = time.time()
        
        try:
            # 1. Récupérer toutes les management zones
            mz_result = self.client.single_query('settings/objects', {
                'schemaIds': 'builtin:management-zones',
                'pageSize': 500
            })
            
            if not mz_result or 'objects' not in mz_result:
                return []
            
            # 2. Préparer les requêtes pour compter les entités dans chaque zone
            count_queries = []
            zone_info = {}
            
            for mz in mz_result['objects']:
                mz_id = mz.get('objectId')
                mz_name = mz.get('value', {}).get('name', 'Unknown')
                
                zone_info[mz_id] = {
                    'id': mz_id,
                    'name': mz_name,
                    'counts': {}
                }
                
                # Requêtes pour différents types d'entités
                entity_types = [
                    'PROCESS_GROUP_INSTANCE',
                    'SERVICE',
                    'HOST',
                    'APPLICATION'
                ]
                
                for entity_type in entity_types:
                    params = {
                        'entitySelector': f'type({entity_type}),mzId({mz_id})',
                        'from': 'now-5m',
                        'fields': '+properties.state'
                    }
                    
                    cache_key = f"mz_count:{mz_id}:{entity_type}"
                    count_queries.append(('entities', params, True, cache_key))
            
            # 3. Exécuter toutes les requêtes en parallèle
            results = self.client.batch_query(count_queries)
            
            # 4. Traiter les résultats
            query_idx = 0
            for mz_id, mz_data in zone_info.items():
                for entity_type_idx, entity_type in enumerate(['PROCESS_GROUP_INSTANCE', 'SERVICE', 'HOST', 'APPLICATION']):
                    result = results[query_idx]
                    query_idx += 1
                    
                    if result and 'totalCount' in result:
                        type_key = {
                            'PROCESS_GROUP_INSTANCE': 'processes',
                            'SERVICE': 'services',
                            'HOST': 'hosts',
                            'APPLICATION': 'applications'
                        }.get(entity_type, 'other')
                        
                        mz_data['counts'][type_key] = result['totalCount']
                    else:
                        mz_data['counts'][entity_type.lower()] = 0
            
            duration = time.time() - start_time
            self._track_call('get_management_zones', duration, success=True)
            
            return list(zone_info.values())
            
        except Exception as e:
            duration = time.time() - start_time
            self._track_call('get_management_zones', duration, success=False)
            logger.error(f"Erreur dans get_management_zones_optimized: {str(e)}")
            return []
    
    def get_problems_optimized(self, status='OPEN', from_time='now-7d'):
        """
        Récupère les problèmes avec optimisation pour grandes volumétries
        """
        start_time = time.time()
        
        try:
            params = {
                'problemSelector': f'status({status})',
                'from': from_time,
                'fields': '+impactedEntities,+managementZone,+rootCauseEntity',
                'pageSize': 100  # Taille optimale pour les problèmes avec détails
            }
            
            all_problems = []
            next_page_key = True
            page_count = 0
            
            # Limite de sécurité pour éviter les boucles infinies
            max_pages = 50
            
            while next_page_key and page_count < max_pages:
                if next_page_key != True:
                    params['nextPageKey'] = next_page_key
                
                result = self.client.single_query('problems', params, use_cache=True)
                
                if result and 'problems' in result:
                    all_problems.extend(result['problems'])
                    next_page_key = result.get('nextPageKey')
                    page_count += 1
                    
                    # Pause entre les pages pour éviter le rate limiting
                    if next_page_key:
                        time.sleep(0.1)
                else:
                    break
            
            # Enrichir les problèmes avec des informations supplémentaires si nécessaire
            if all_problems:
                self._enrich_problems_data(all_problems)
            
            duration = time.time() - start_time
            self._track_call('get_problems', duration, success=True)
            
            return all_problems
            
        except Exception as e:
            duration = time.time() - start_time
            self._track_call('get_problems', duration, success=False)
            logger.error(f"Erreur dans get_problems_optimized: {str(e)}")
            return []
    
    def _enrich_problems_data(self, problems):
        """
        Enrichit les données des problèmes avec des informations supplémentaires
        """
        # Collecter tous les IDs d'entités impactées pour un enrichissement batch
        entity_ids = set()
        
        for problem in problems:
            # Collecter les IDs des entités impactées
            if 'impactedEntities' in problem:
                for entity in problem['impactedEntities']:
                    entity_ids.add(entity.get('entityId'))
            
            # Collecter l'ID de l'entité root cause
            if 'rootCauseEntity' in problem and problem['rootCauseEntity']:
                entity_ids.add(problem['rootCauseEntity'].get('entityId'))
        
        if not entity_ids:
            return
        
        # Récupérer les détails de toutes les entités en une seule requête
        entity_details = self._batch_get_entity_details(list(entity_ids))
        
        # Enrichir chaque problème avec les détails des entités
        for problem in problems:
            if 'impactedEntities' in problem:
                for entity in problem['impactedEntities']:
                    entity_id = entity.get('entityId')
                    if entity_id in entity_details:
                        entity.update(entity_details[entity_id])
            
            if 'rootCauseEntity' in problem and problem['rootCauseEntity']:
                entity_id = problem['rootCauseEntity'].get('entityId')
                if entity_id in entity_details:
                    problem['rootCauseEntity'].update(entity_details[entity_id])
    
    def _batch_get_entity_details(self, entity_ids):
        """
        Récupère les détails de plusieurs entités en batch
        """
        if not entity_ids:
            return {}
        
        # Diviser en lots si nécessaire
        chunk_size = 100
        all_details = {}
        
        for i in range(0, len(entity_ids), chunk_size):
            chunk_ids = entity_ids[i:i + chunk_size]
            
            params = {
                'entitySelector': f'entityId({",".join(chunk_ids)})',
                'fields': '+tags,+managementZones,+properties'
            }
            
            result = self.client.single_query('entities', params, use_cache=True)
            
            if result and 'entities' in result:
                for entity in result['entities']:
                    all_details[entity['entityId']] = entity
        
        return all_details
    
    def get_process_group_instances(self, process_group_id):
        """
        Récupère toutes les instances d'un groupe de processus
        """
        params = {
            'entitySelector': f'type(PROCESS_GROUP_INSTANCE),fromRelationships.isInstanceOf(type(PROCESS_GROUP),entityId({process_group_id}))',
            'fields': '+properties,+fromRelationships,+toRelationships',
            'pageSize': 500
        }
        
        return self._get_all_entities(params)
    
    def _get_all_entities(self, initial_params):
        """
        Méthode générique pour récupérer toutes les entités avec pagination
        """
        all_entities = []
        params = initial_params.copy()
        next_page_key = True
        
        while next_page_key:
            if next_page_key != True:
                params['nextPageKey'] = next_page_key
            
            result = self.client.single_query('entities', params, use_cache=True)
            
            if result and 'entities' in result:
                all_entities.extend(result['entities'])
                next_page_key = result.get('nextPageKey')
            else:
                break
        
        return all_entities

# Nouvelles fonctions pour l'optimisation du Volet 3

def load_mz_config():
    """Charge la configuration des management zones depuis le fichier JSON"""
    try:
        with open('mz_config.json', 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Erreur lors du chargement de mz_config.json: {str(e)}")
        return {"management_zones": []}

def get_count_for_single_zone_from_dynatrace(zone_id, api_client):
    """
    Récupère les counts pour une seule zone depuis Dynatrace
    """
    try:
        counts = {}
        entity_types = {
            'hosts': 'HOST',
            'services': 'SERVICE',
            'processes': 'PROCESS_GROUP'
        }
        
        for key, entity_type in entity_types.items():
            params = {
                'entitySelector': f'type({entity_type}),mzId({zone_id})',
                'from': 'now-5m',
                'pageSize': 1  # On veut juste le count
            }
            
            result = api_client.single_query('entities', params, use_cache=True)
            
            if result and 'totalCount' in result:
                counts[key] = result['totalCount']
            else:
                counts[key] = 0
        
        return counts
            
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des counts pour la zone {zone_id}: {str(e)}")
        return None

def fetch_all_zone_counts_optimized(api_token=None, environment_url=None):
    """
    Récupère les counts de toutes les zones de manière optimisée
    """
    try:
        # Charger la configuration des zones
        mz_data = load_mz_config()
        zone_ids = [zone['id'] for zone in mz_data.get('management_zones', []) if zone.get('id')]
        
        if not zone_ids:
            logger.warning("Aucune zone trouvée dans la configuration")
            return {}
        
        # Utiliser les valeurs par défaut si non fournies
        if not api_token:
            api_token = os.getenv('DYNATRACE_API_TOKEN')
        if not environment_url:
            environment_url = os.getenv('DYNATRACE_ENVIRONMENT_URL')
        
        # Créer un client API optimisé
        api_client = OptimizedAPIClient(
            env_url=environment_url,
            api_token=api_token,
            verify_ssl=False,
            max_workers=10
        )
        
        results = {}
        
        # Utiliser ThreadPoolExecutor pour des appels concurrents
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_zone = {
                executor.submit(get_count_for_single_zone_from_dynatrace, zone_id, api_client): zone_id 
                for zone_id in zone_ids
            }
            
            for future in concurrent.futures.as_completed(future_to_zone):
                zone_id = future_to_zone[future]
                try:
                    count = future.result()
                    results[zone_id] = count
                except Exception as exc:
                    logger.error(f'Erreur lors de la récupération du count pour la zone {zone_id}: {exc}')
                    results[zone_id] = None
        
        return results
        
    except Exception as e:
        logger.error(f"Erreur dans fetch_all_zone_counts_optimized: {str(e)}")
        return {}