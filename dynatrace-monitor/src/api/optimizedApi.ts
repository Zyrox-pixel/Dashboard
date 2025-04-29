import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, ENDPOINTS, CACHE_TYPES } from './endpoints';
import { 
  ApiResponse, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse,
  Host,
  Service,
  SummaryData
} from './types';

/**
 * Classe pour gérer les appels API optimisés.
 * Cette classe implémente:
 * - Requêtes parallèles/bulk
 * - Cache côté client
 * - Gestion des erreurs intelligente
 * - Récupération de données incrémentielle
 */
class OptimizedApiClient {
  private baseURL: string;
  private cache: Map<string, { data: any, timestamp: number }>;
  private cacheDuration: number; // en millisecondes
  private axiosInstance;
  private pendingRequests: Map<string, Promise<any>>;

  constructor(baseURL: string, cacheDuration: number = 30000) {
    this.baseURL = baseURL;
    this.cacheDuration = cacheDuration;
    this.cache = new Map();
    this.pendingRequests = new Map();

    // Créer une instance axios avec des configurations de base
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 secondes
    });

    // Intercepteur pour les requêtes
    this.axiosInstance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour les réponses
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        // Gestion centralisée des erreurs
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Récupère une valeur du cache si elle est encore valide
   */
  private getCached<T>(key: string): T | null {
    const cachedItem = this.cache.get(key);
    if (cachedItem && (Date.now() - cachedItem.timestamp) < this.cacheDuration) {
      console.log(`Cache hit: ${key}`);
      return cachedItem.data;
    }
    return null;
  }

  /**
   * Met à jour le cache avec de nouvelles données
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Efface une entrée spécifique ou tout le cache
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      // Effacer uniquement les entrées correspondant au motif
      // Correction de l'erreur TS2802 en utilisant Array.from
      Array.from(this.cache.keys()).forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      });
    } else {
      // Effacer tout le cache
      this.cache.clear();
    }
  }

  /**
   * Exécute plusieurs requêtes en parallèle
   */
  public async batchGet<T>(endpoints: string[]): Promise<ApiResponse<T[]>> {
    try {
      // Vérifier si les données sont en cache
      const cacheKey = `batch:${endpoints.join(',')}`;
      const cachedData = this.getCached<T[]>(cacheKey);
      if (cachedData) {
        return { data: cachedData };
      }

      // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
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

      // Stocker la promesse en cours
      const requestPromise = Promise.all(promises)
        .then(results => {
          // Filtrer les résultats null
          const validResults = results.filter(result => result !== null) as T[];
          
          // Mettre en cache les résultats
          this.setCache(cacheKey, validResults);
          
          // Nettoyer la requête en cours
          this.pendingRequests.delete(cacheKey);
          
          return { data: validResults };
        })
        .catch(error => {
          // Nettoyer la requête en cours en cas d'erreur
          this.pendingRequests.delete(cacheKey);
          throw error;
        });

      // Enregistrer la requête en cours
      this.pendingRequests.set(cacheKey, requestPromise);

      return requestPromise;
    } catch (error) {
      console.error('Batch request error:', error);
      return { data: [] as T[], error: 'Erreur lors de l\'exécution des requêtes en lot' };
    }
  }

  /**
   * Effectue une requête GET avec gestion du cache
   */
  public async get<T>(endpoint: string, config?: AxiosRequestConfig, useCache: boolean = true): Promise<ApiResponse<T>> {
    try {
      // Générer une clé de cache
      const cacheKey = `get:${endpoint}:${JSON.stringify(config || {})}`;
      
      // Vérifier si les données sont en cache
      if (useCache) {
        const cachedData = this.getCached<T>(cacheKey);
        if (cachedData) {
          return { data: cachedData };
        }
      }

      // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
      const pendingRequest = this.pendingRequests.get(cacheKey);
      if (pendingRequest) {
        return pendingRequest;
      }

      // Créer et stocker la nouvelle requête
      const requestPromise = this.axiosInstance.get<T>(endpoint, config)
        .then(response => {
          // Mettre en cache les données si nécessaire
          if (useCache) {
            this.setCache(cacheKey, response.data);
          }
          
          // Nettoyer la requête en cours
          this.pendingRequests.delete(cacheKey);
          
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
      this.pendingRequests.set(cacheKey, requestPromise);

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
   * Effectue une requête POST avec gestion du cache pour les réponses
   */
  public async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig, cacheResponse: boolean = false): Promise<ApiResponse<T>> {
    try {
      // Générer une clé de cache si nécessaire
      const cacheKey = cacheResponse ? `post:${endpoint}:${JSON.stringify(data || {})}:${JSON.stringify(config || {})}` : '';
      
      // Vérifier si les données sont en cache (uniquement pour les requêtes GET ou si cacheResponse est true)
      if (cacheResponse) {
        const cachedData = this.getCached<T>(cacheKey);
        if (cachedData) {
          return { data: cachedData };
        }
      }

      // Si nous avons déjà une requête en cours pour cette clé, retourner la promesse existante
      if (cacheResponse && this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)!;
      }

      // Créer la requête
      const requestPromise = this.axiosInstance.post<T>(endpoint, data, config)
        .then(response => {
          // Mettre en cache les données si nécessaire
          if (cacheResponse) {
            this.setCache(cacheKey, response.data);
            this.pendingRequests.delete(cacheKey);
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
   */
  public async loadDashboardData(managementZone: string): Promise<{
    summary: ApiResponse<SummaryData>;
    problems: ApiResponse<ProblemResponse[]>;
    hosts: ApiResponse<Host[]>;
    services: ApiResponse<Service[]>;
    processes: ApiResponse<ProcessResponse[]>;
  }> {
    try {
      // Définir la management zone actuelle
      await this.post(ENDPOINTS.SET_MANAGEMENT_ZONE, { name: managementZone });
      
      // Charger toutes les données en parallèle
      const [summaryResponse, problemsResponse, hostsResponse, servicesResponse, processesResponse] = await Promise.all([
        this.get<SummaryData>(ENDPOINTS.SUMMARY),
        this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS),
        this.get<Host[]>(ENDPOINTS.HOSTS),
        this.get<Service[]>(ENDPOINTS.SERVICES),
        this.get<ProcessResponse[]>(ENDPOINTS.PROCESSES)
      ]);
      
      return {
        summary: summaryResponse,
        problems: problemsResponse,
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
      this.clearCache();
      
      // Correction de l'erreur TS2322 en retournant uniquement des propriétés valides
      return { 
        data: response.data?.success || false,
        error: undefined // Utiliser error au lieu de message pour la compatibilité avec ApiResponse
      };
    } catch (error) {
      console.error('Error refreshing caches:', error);
      return { 
        data: false, 
        error: 'Erreur lors du rafraîchissement des caches' 
      };
    }
  }
}

// Exporter une instance du client optimisé
const optimizedApi = new OptimizedApiClient(API_BASE_URL);

// Créer des méthodes d'API optimisées
const optimizedApiMethods = {
  // Récupérer le résumé des données
  getSummary() {
    return optimizedApi.get<SummaryData>(ENDPOINTS.SUMMARY);
  },

  // Récupérer les problèmes
  getProblems() {
    return optimizedApi.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS);
  },

  // Récupérer les management zones
  getManagementZones() {
    return optimizedApi.get(ENDPOINTS.MANAGEMENT_ZONES);
  },

  // Récupérer la management zone actuelle
  getCurrentManagementZone() {
    return optimizedApi.get(ENDPOINTS.CURRENT_MANAGEMENT_ZONE);
  },

  // Récupérer les management zones de Vital for Group
  getVitalForGroupMZs() {
    return optimizedApi.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_GROUP_MZS);
  },

  // Récupérer les management zones de Vital for Entreprise
  getVitalForEntrepriseMZs() {
    return optimizedApi.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_ENTREPRISE_MZS);
  },

  // Définir la management zone actuelle
  setManagementZone(name: string) {
    // Effacer le cache pour forcer le rechargement des données
    optimizedApi.clearCache('get:');
    return optimizedApi.post(ENDPOINTS.SET_MANAGEMENT_ZONE, { name });
  },

  // Récupérer les hôtes
  getHosts() {
    return optimizedApi.get<Host[]>(ENDPOINTS.HOSTS);
  },

  // Récupérer les services
  getServices() {
    return optimizedApi.get<Service[]>(ENDPOINTS.SERVICES);
  },

  // Récupérer les process groups
  getProcesses() {
    return optimizedApi.get<ProcessResponse[]>(ENDPOINTS.PROCESSES);
  },

  // Rafraîchir un type de cache
  refreshCache(cacheType: string) {
    optimizedApi.clearCache(`get:${cacheType}`);
    return optimizedApi.post(ENDPOINTS.REFRESH_CACHE(cacheType));
  },

  // Vérifier le statut de l'API
  getStatus() {
    return optimizedApi.get(ENDPOINTS.STATUS);
  },

  // Charger toutes les données du tableau de bord en une seule fois
  loadDashboardData(managementZone: string) {
    return optimizedApi.loadDashboardData(managementZone);
  },

  // Rafraîchir tous les caches
  refreshAllCaches() {
    return optimizedApi.refreshAllCaches();
  }
};

export { optimizedApi, optimizedApiMethods };