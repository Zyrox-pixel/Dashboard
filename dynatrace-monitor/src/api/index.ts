import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { API_BASE_URL, ENDPOINTS, CACHE_TYPES } from './endpoints';
import { 
  ApiResponse, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse,
  Host,
  Service,
  SummaryData,
  DashboardVariant
} from './types';
import cacheService, { CACHE_DURATIONS } from '../utils/cacheService';

/**
 * API Client optimisé pour PRODSEC Monitor
 * Supporte les modes standard et optimisé
 */
class ApiClient {
  private baseURL: string;
  private cache: Map<string, { data: any, timestamp: number }>;
  private cacheDuration: number; // en millisecondes
  private axiosInstance: AxiosInstance;
  private pendingRequests: Map<string, Promise<any>>;
  private optimizedMode: boolean;

  constructor(baseURL: string, options: { 
    optimized?: boolean,
    cacheDuration?: number 
  } = {}) {
    this.baseURL = baseURL;
    this.optimizedMode = options.optimized || false;
    this.cacheDuration = options.cacheDuration || 30000;
    this.cache = new Map();
    this.pendingRequests = new Map();
    
    // Log pour indiquer l'initialisation du client API
    console.log(`[ApiClient] Initialized (optimized: ${this.optimizedMode})`);

    // Créer une instance axios avec des configurations de base
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: this.optimizedMode ? 15000 : 30000, // Timeout réduit en mode optimisé
    });

    // Configurer les intercepteurs
    this.setupInterceptors();
  }

  /**
   * Configure les intercepteurs pour les requêtes et réponses
   */
  private setupInterceptors(): void {
    // Intercepteur pour les requêtes
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`[API] Requesting ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour les réponses avec gestion avancée des erreurs et retries
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`[API] Response from ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        // Gestion centralisée des erreurs
        console.error('[API] Error:', error);
        
        // Récupérer la configuration de la requête pour un éventuel retry
        const config = error.config;
        
        // Si le serveur ne répond pas ou timeout
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.log('[API] Request timeout, retrying...');
          
          // Réessayer une fois avec un timeout plus long
          if (config && !config.headers['X-Retry-Attempt']) {
            config.headers['X-Retry-Attempt'] = 'true';
            config.timeout = 60000; // 60 secondes pour le retry
            return this.axiosInstance(config);
          }
        }
        
        // Si le serveur retourne une erreur 429 (too many requests)
        if (error.response && error.response.status === 429) {
          console.log('[API] Rate limited, waiting before retry...');
          
          // Attendre 2 secondes avant de réessayer
          if (config && !config.headers['X-Retry-Attempt']) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            config.headers['X-Retry-Attempt'] = 'true';
            return this.axiosInstance(config);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Récupère une valeur du cache si elle est encore valide
   * Utilise le service de cache centralisé si disponible, sinon utilise le cache local
   */
  private getCached<T>(key: string): T | null {
    // Utiliser le service de cache centralisé en priorité
    const cachedData = cacheService.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // Fallback sur le cache local
    const cachedItem = this.cache.get(key);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < this.cacheDuration) {
      console.log(`[ApiClient] Cache hit (local): ${key}`);
      
      // Migrer vers le service de cache centralisé
      const category = key.split(':')[0];
      const ttl = this.getCacheDurationForCategory(category);
      cacheService.set(key, cachedItem.data, { ttl });
      
      return cachedItem.data;
    }
    return null;
  }

  /**
   * Met à jour le cache avec de nouvelles données
   * Utilise le service de cache centralisé si disponible, sinon utilise le cache local
   */
  private setCache<T>(key: string, data: T): void {
    // Déterminer la catégorie et la durée de cache appropriée
    const category = key.split(':')[0];
    const ttl = this.getCacheDurationForCategory(category);
    
    // Mettre à jour le service de cache centralisé
    cacheService.set(key, data, { ttl, category });
    
    // Mettre à jour aussi le cache local pour la compatibilité
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Détermine la durée de cache appropriée pour une catégorie
   */
  private getCacheDurationForCategory(category: string): number {
    // Convertir en secondes
    const defaultDuration = Math.floor(this.cacheDuration / 1000);
    
    // Mapper les catégories aux durées de cache
    if (category === 'get' || category === 'post') {
      if (category.includes('problems')) {
        return CACHE_DURATIONS.PROBLEMS;
      } else if (category.includes('problems-72h')) {
        return CACHE_DURATIONS.PROBLEMS_72H;
      } else if (category.includes('summary')) {
        return CACHE_DURATIONS.SUMMARY;
      } else if (category.includes('hosts')) {
        return CACHE_DURATIONS.HOSTS;
      } else if (category.includes('services')) {
        return CACHE_DURATIONS.SERVICES;
      } else if (category.includes('processes')) {
        return CACHE_DURATIONS.PROCESSES;
      } else if (category.includes('management-zones')) {
        return CACHE_DURATIONS.MANAGEMENT_ZONES;
      } else if (category.includes('counts')) {
        return CACHE_DURATIONS.COUNTS;
      }
    }
    
    return defaultDuration;
  }

  /**
   * Efface une entrée spécifique ou tout le cache
   * Utilise le service de cache centralisé si disponible, sinon utilise le cache local
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      // Effacer uniquement les entrées correspondant au motif dans le service de cache
      cacheService.invalidateCategory(pattern);
      
      // Effacer aussi dans le cache local pour la compatibilité
      Array.from(this.cache.keys()).forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      });
    } else {
      // Effacer tout le cache
      cacheService.clear();
      this.cache.clear();
    }
    
    console.log(`[ApiClient] Cache cleared${pattern ? ` (pattern: ${pattern})` : ''}`);
  }

  /**
   * Exécute plusieurs requêtes en parallèle
   */
  public async batchGet<T>(endpoints: string[]): Promise<ApiResponse<T[]>> {
    try {
      // Vérifier si les données sont en cache
      const cacheKey = `batch:${endpoints.join(',')}`;
      if (this.optimizedMode) {
        const cachedData = this.getCached<T[]>(cacheKey);
        if (cachedData) {
          return { data: cachedData };
        }

        // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
        const pendingRequest = this.pendingRequests.get(cacheKey);
        if (pendingRequest) {
          return pendingRequest;
        }
      }

      // Créer des promesses pour toutes les requêtes
      const promises = endpoints.map(endpoint => 
        this.axiosInstance.get<T>(endpoint)
          .then(response => response.data)
          .catch(error => {
            console.error(`Error fetching ${endpoint}:`, error);
            return null;
          })
      );

      // Exécuter toutes les requêtes en parallèle
      const requestPromise = Promise.all(promises)
        .then(results => {
          // Filtrer les résultats null
          const validResults = results.filter(result => result !== null) as T[];
          
          // Mettre en cache les résultats si en mode optimisé
          if (this.optimizedMode) {
            this.setCache(cacheKey, validResults);
            this.pendingRequests.delete(cacheKey);
          }
          
          return { data: validResults };
        })
        .catch(error => {
          if (this.optimizedMode) {
            this.pendingRequests.delete(cacheKey);
          }
          throw error;
        });

      // Enregistrer la requête en cours si en mode optimisé
      if (this.optimizedMode) {
        this.pendingRequests.set(cacheKey, requestPromise);
      }

      return requestPromise;
    } catch (error) {
      console.error('Batch request error:', error);
      return { data: [] as T[], error: 'Erreur lors de l\'exécution des requêtes en lot' };
    }
  }

  /**
   * Effectue une requête GET avec gestion du cache améliorée
   */
  public async get<T>(endpoint: string, config?: AxiosRequestConfig, useCache: boolean = true): Promise<ApiResponse<T>> {
    try {
      // Générer une clé de cache
      const cacheKey = `get:${endpoint}:${JSON.stringify(config || {})}`;
      
      // Vérifier si les données sont en cache (toujours vérifier, même en mode non-optimisé)
      if (useCache) {
        // Vérifier d'abord le cache centralisé
        const cachedData = cacheService.get<T>(cacheKey);
        if (cachedData) {
          console.log(`[API] Using centralized cached data for ${endpoint}`);
          return { data: cachedData };
        }
        
        // Vérifier ensuite le cache sessionStorage (pour la compatibilité)
        if (!this.optimizedMode) {
          const cachedData = sessionStorage.getItem(cacheKey);
          
          if (cachedData && endpoint !== ENDPOINTS.PROBLEMS && endpoint !== ENDPOINTS.SUMMARY) {
            const parsed = JSON.parse(cachedData);
            const cacheTime = parsed.timestamp;
            const now = Date.now();
            
            // Utiliser le cache si moins de 5 minutes se sont écoulées
            if (now - cacheTime < 5 * 60 * 1000) {
              console.log(`[API] Using sessionStorage cached data for ${endpoint}`);
              
              // Migrer vers le service de cache centralisé
              const category = endpoint.split('/')[0] || 'default';
              const ttl = this.getCacheDurationForCategory(category);
              cacheService.set(cacheKey, parsed.data, { ttl, category });
              
              return { data: parsed.data };
            }
          }
        }
        
        // Vérifier le cache interne (pour la compatibilité)
        if (this.optimizedMode) {
          const cachedData = this.getCached<T>(cacheKey);
          if (cachedData) {
            return { data: cachedData };
          }
        }
        
        // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
        if (this.pendingRequests.has(cacheKey)) {
          return this.pendingRequests.get(cacheKey)!;
        }
      }

      // Créer la requête
      const requestPromise = this.axiosInstance.get<T>(endpoint, config)
        .then(response => {
          // Mettre en cache les données si nécessaire
          if (useCache) {
            // Déterminer la catégorie et la durée de cache
            const category = endpoint.split('/')[0] || 'default';
            const ttl = this.getCacheDurationForCategory(category);
            
            // Mettre à jour le cache centralisé
            cacheService.set(cacheKey, response.data, { ttl, category });
            
            // Mettre à jour aussi les caches existants pour la compatibilité
            if (this.optimizedMode) {
              this.setCache(cacheKey, response.data);
            } else {
              // En mode standard, utiliser sessionStorage pour les données non-critiques
              if (endpoint !== ENDPOINTS.PROBLEMS && endpoint !== ENDPOINTS.SUMMARY) {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  data: response.data,
                  timestamp: Date.now()
                }));
              }
            }
            
            // Nettoyer la requête en cours
            this.pendingRequests.delete(cacheKey);
          }
          
          return { data: response.data };
        })
        .catch(error => {
          // Nettoyer la requête en cours en cas d'erreur
          this.pendingRequests.delete(cacheKey);
          
          if (axios.isAxiosError(error)) {
            return { 
              data: {} as T, 
              error: error.response?.data?.message || error.message 
            };
          }
          return { 
            data: {} as T, 
            error: 'Une erreur inattendue est survenue' 
          };
        });

      // Enregistrer la requête en cours
      if (useCache) {
        this.pendingRequests.set(cacheKey, requestPromise);
      }

      return requestPromise;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { 
          data: {} as T, 
          error: error.response?.data?.message || error.message 
        };
      }
      return { 
        data: {} as T, 
        error: 'Une erreur inattendue est survenue' 
      };
    }
  }

  /**
   * Effectue une requête POST avec gestion du cache améliorée pour les réponses
   */
  public async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig, cacheResponse: boolean = false): Promise<ApiResponse<T>> {
    try {
      // Génère une clé de cache
      const cacheKey = `post:${endpoint}:${JSON.stringify(data || {})}:${JSON.stringify(config || {})}`;
      
      // Vérifier si les données sont en cache (si cacheResponse est activé)
      if (cacheResponse) {
        // Vérifier d'abord le cache centralisé
        const cachedData = cacheService.get<T>(cacheKey);
        if (cachedData) {
          console.log(`[API] Using centralized cached data for POST ${endpoint}`);
          return { data: cachedData };
        }
        
        // Vérifier le cache interne (pour la compatibilité)
        if (this.optimizedMode) {
          const cachedData = this.getCached<T>(cacheKey);
          if (cachedData) {
            return { data: cachedData };
          }
        }
        
        // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
        if (this.pendingRequests.has(cacheKey)) {
          return this.pendingRequests.get(cacheKey)!;
        }
      }

      // Créer la requête
      const requestPromise = this.axiosInstance.post<T>(endpoint, data, config)
        .then(response => {
          // Mettre en cache les données si nécessaire
          if (cacheResponse) {
            // Déterminer la catégorie et la durée de cache
            const category = endpoint.split('/')[0] || 'default';
            const ttl = this.getCacheDurationForCategory(category);
            
            // Mettre à jour le cache centralisé
            cacheService.set(cacheKey, response.data, { ttl, category });
            
            // Mettre à jour aussi le cache local pour la compatibilité
            if (this.optimizedMode) {
              this.setCache(cacheKey, response.data);
            }
            
            // Nettoyer la requête en cours
            this.pendingRequests.delete(cacheKey);
          }
          
          // Invalider les caches liés à cette ressource (mode standard)
          if (!this.optimizedMode) {
            if (endpoint === ENDPOINTS.SET_MANAGEMENT_ZONE) {
              // Supprimer les caches qui dépendent de la management zone
              sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.HOSTS}`);
              sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.SERVICES}`);
              sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.PROCESSES}`);
              
              // Invalider aussi dans le cache centralisé
              cacheService.invalidateCategory('get:hosts');
              cacheService.invalidateCategory('get:services');
              cacheService.invalidateCategory('get:processes');
            }
            
            if (endpoint.includes(ENDPOINTS.REFRESH_CACHE(''))) {
              // Si c'est une requête de rafraîchissement, invalider le cache correspondant
              const cacheType = endpoint.split('/').pop();
              if (cacheType && ENDPOINTS[cacheType.toUpperCase() as keyof typeof ENDPOINTS]) {
                const endpointPath = 
                  typeof ENDPOINTS[cacheType.toUpperCase() as keyof typeof ENDPOINTS] === 'function' 
                    ? ENDPOINTS.REFRESH_CACHE(cacheType) 
                    : ENDPOINTS[cacheType.toUpperCase() as keyof typeof ENDPOINTS];
                
                sessionStorage.removeItem(`dynatrace_monitor:${endpointPath}`);
                
                // Invalider aussi dans le cache centralisé
                cacheService.invalidateCategory(`get:${cacheType}`);
              }
            }
          }
          
          return { data: response.data };
        })
        .catch(error => {
          // Nettoyer la requête en cours en cas d'erreur
          if (cacheResponse) {
            this.pendingRequests.delete(cacheKey);
          }
          
          if (axios.isAxiosError(error)) {
            return { 
              data: {} as T, 
              error: error.response?.data?.message || error.message 
            };
          }
          return { 
            data: {} as T, 
            error: 'Une erreur inattendue est survenue' 
          };
        });

      // Enregistrer la requête en cours si nécessaire
      if (cacheResponse) {
        this.pendingRequests.set(cacheKey, requestPromise);
      }

      return requestPromise;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { 
          data: {} as T, 
          error: error.response?.data?.message || error.message 
        };
      }
      return { 
        data: {} as T, 
        error: 'Une erreur inattendue est survenue' 
      };
    }
  }

  /**
   * Charge toutes les données nécessaires pour le tableau de bord en une seule fois
   * Disponible uniquement en mode optimisé
   */
  public async loadDashboardData(managementZone: string): Promise<{
    summary: ApiResponse<SummaryData>;
    problems: ApiResponse<ProblemResponse[]>;
    problems72h: ApiResponse<ProblemResponse[]>;  // Ajout des problèmes 72h
    hosts: ApiResponse<Host[]>;
    services: ApiResponse<Service[]>;
    processes: ApiResponse<ProcessResponse[]>;
  }> {
    if (!this.optimizedMode) {
      throw new Error('loadDashboardData is only available in optimized mode');
    }
    
    try {
      // Définir la management zone actuelle
      await this.post(ENDPOINTS.SET_MANAGEMENT_ZONE, { name: managementZone });
      
      // Charger toutes les données en parallèle
      const [summaryResponse, problemsResponse, problems72hResponse, hostsResponse, servicesResponse, processesResponse] = await Promise.all([
        this.get<SummaryData>(ENDPOINTS.SUMMARY),
        this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS, { 
          params: { 
            status: "OPEN", 
            // Pas de paramètre "from" pour obtenir tous les problèmes sans limite de temps
            debug: 'true' // Force le rafraîchissement
          } 
        }, false), // Ne pas utiliser le cache
        this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS_72H, {
          params: {
            debug: 'true', // Force le rafraîchissement
            timeframe: '-72h' // Utiliser 72h par défaut pour la méthode loadDashboardData
          }
        }, false), // Ne pas utiliser le cache pour les problèmes
        this.get<Host[]>(ENDPOINTS.HOSTS),
        this.get<Service[]>(ENDPOINTS.SERVICES),
        this.get<ProcessResponse[]>(ENDPOINTS.PROCESSES)
      ]);
      
      return {
        summary: summaryResponse,
        problems: problemsResponse,
        problems72h: problems72hResponse, // Retourner les problèmes 72h
        hosts: hostsResponse,
        services: servicesResponse,
        processes: processesResponse
      };
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      // Retourner des objets de réponse vides avec des erreurs
      const errorResponse = {
        data: {} as any,
        error: 'Erreur lors du chargement des données'
      };
      
      return {
        summary: { ...errorResponse, data: {} as SummaryData },
        problems: { ...errorResponse, data: [] as ProblemResponse[] },
        problems72h: { ...errorResponse, data: [] as ProblemResponse[] }, // Ajout des problèmes 72h
        hosts: { ...errorResponse, data: [] as Host[] },
        services: { ...errorResponse, data: [] as Service[] },
        processes: { ...errorResponse, data: [] as ProcessResponse[] }
      };
    }
  }

  /**
   * Rafraîchit tous les caches
   */
  public async refreshAllCaches(): Promise<ApiResponse<boolean>> {
    try {
      // Appeler l'API pour rafraîchir tous les caches côté serveur
      const response = await this.post<{ success: boolean }>(ENDPOINTS.REFRESH_CACHE('all'));
      
      // Effacer également le cache local
      if (this.optimizedMode) {
        this.clearCache();
      } else {
        // Effacer les caches sessionStorage
        for (const key in CACHE_TYPES) {
          const cacheType = CACHE_TYPES[key as keyof typeof CACHE_TYPES];
          const endpoint = ENDPOINTS[key as keyof typeof ENDPOINTS];
          if (typeof endpoint === 'string') {
            sessionStorage.removeItem(`dynatrace_monitor:${endpoint}`);
          }
        }
      }
      
      return { 
        data: response.data?.success || false
      };
    } catch (error) {
      console.error('Error refreshing caches:', error);
      return { 
        data: false, 
        error: 'Erreur lors du rafraîchissement des caches' 
      };
    }
  }

  // API Methods
  /**
   * Récupérer le résumé des données
   */
  public getSummary() {
    return this.get(ENDPOINTS.SUMMARY);
  }

  /**
   * Récupérer les problèmes
   * @param status Le statut des problèmes à récupérer (OPEN, ALL, etc.)
   * @param timeframe La période de temps (ex: "-24h", "-72h", "all" pour aucune limite)
   * @param dashboardType Le type de dashboard (vfg, vfe)
   * @param forceRefresh Si true, force le rafraîchissement (ignore le cache)
   */
  public getProblems(
    status: string = "OPEN", 
    timeframe: string = "-72h", 
    dashboardType?: string, 
    forceRefresh: boolean = false
  ) {
    const params: any = {
      status: status
    };
    
    // Ajouter le timeframe seulement s'il n'est pas "all"
    if (timeframe !== "all") {
      params.from = timeframe;
    }
    
    // Ajouter le type de dashboard s'il est spécifié
    if (dashboardType) {
      params.type = dashboardType;
    }
    
    // Si on force le rafraîchissement, ajouter le paramètre debug
    // Le backend traitera ce paramètre spécial pour invalider le cache
    if (forceRefresh) {
      params.debug = 'true';
      console.log(`Forçage du rafraîchissement des problèmes (statut: ${status}, timeframe: ${timeframe})`);
    }
    
    // Pour les problèmes actifs, toujours désactiver le cache côté client aussi
    const useCache = !(status === "OPEN" || forceRefresh);
    
    return this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS, { params }, useCache);
  }
  
  /**
   * Récupérer spécifiquement les problèmes pour une période spécifiée (72h par défaut)
   * Utilise l'endpoint dédié basé sur l'implémentation du script Python
   * @param dashboardType Le type de dashboard (vfg, vfe)
   * @param zoneFilter Filtre optionnel pour une MZ spécifique
   * @param forceRefresh Si true, force le rafraîchissement (ignore le cache)
   * @param timeframe La période de temps (ex: "-24h", "-72h", "-7d", etc.)
   */
  public getProblems72h(
    dashboardType?: string,
    zoneFilter?: string,
    forceRefresh: boolean = false,
    timeframe: string = "-72h"
  ) {
    const params: any = {};

    // Ajouter le type de dashboard s'il est spécifié
    if (dashboardType) {
      params.type = dashboardType;
    }

    // Ajouter le filtre de zone s'il est spécifié
    if (zoneFilter) {
      params.zone = zoneFilter;
    }

    // Ajouter la période spécifiée
    params.timeframe = timeframe;

    // Si on force le rafraîchissement, ajouter le paramètre debug
    if (forceRefresh) {
      params.debug = 'true';
      console.log(`Forçage du rafraîchissement des problèmes avec période ${timeframe} (dashboard: ${dashboardType || 'none'}, zone: ${zoneFilter || 'none'})`);
    }

    // Ne pas utiliser le cache si on force le rafraîchissement
    const useCache = !forceRefresh;

    return this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS_72H, { params }, useCache);
  }

  /**
   * Récupérer les management zones
   */
  public getManagementZones() {
    return this.get(ENDPOINTS.MANAGEMENT_ZONES);
  }

  /**
   * Récupérer la management zone actuelle
   */
  public getCurrentManagementZone() {
    return this.get(ENDPOINTS.CURRENT_MANAGEMENT_ZONE);
  }

  /**
   * Récupérer les management zones de Vital for Group
   */
  public getVitalForGroupMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_GROUP_MZS);
  }

  /**
   * Récupérer les management zones de Vital for Entreprise
   */
  public getVitalForEntrepriseMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_ENTREPRISE_MZS);
  }

  /**
   * Récupérer les management zones de Detection
   */
  public getDetectionMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.DETECTION_MZS);
  }

  /**
   * Récupérer les management zones de Encryption
   */
  public getEncryptionMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.ENCRYPTION_MZS);
  }

  /**
   * Définir la management zone actuelle
   */
  public setManagementZone(name: string) {
    if (this.optimizedMode) {
      // Effacer le cache pour forcer le rechargement des données
      this.clearCache('get:');
    }
    return this.post(ENDPOINTS.SET_MANAGEMENT_ZONE, { name });
  }

  /**
   * Récupérer les hôtes
   */
  public getHosts() {
    return this.get<Host[]>(ENDPOINTS.HOSTS);
  }

  /**
   * Récupérer les services
   */
  public getServices() {
    return this.get<Service[]>(ENDPOINTS.SERVICES);
  }

  /**
   * Récupérer les process groups
   */
  public getProcesses() {
    return this.get<ProcessResponse[]>(ENDPOINTS.PROCESSES);
  }

  /**
   * Rafraîchir un type de cache
   */
  public refreshCache(cacheType: string) {
    if (this.optimizedMode) {
      this.clearCache(`get:${cacheType}`);
    }
    return this.post(ENDPOINTS.REFRESH_CACHE(cacheType));
  }

  /**
   * Vérifier le statut de l'API
   */
  public getStatus() {
    return this.get(ENDPOINTS.STATUS);
  }
}

// Créer et exporter les instances API
const standardApi = new ApiClient(API_BASE_URL, { optimized: false });
const optimizedApi = new ApiClient(API_BASE_URL, { optimized: true });

// Exporter les API et les constantes
export { standardApi as api, optimizedApi, CACHE_TYPES };
export const optimizedApiMethods = optimizedApi;
