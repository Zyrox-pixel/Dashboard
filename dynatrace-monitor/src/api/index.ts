import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL, ENDPOINTS, CACHE_TYPES } from './endpoints';
import { 
  ApiResponse, 
  VitalForGroupMZsResponse,
  ProblemResponse,
  ProcessResponse
} from './types';

// Création d'une instance axios avec des configurations de base
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 secondes pour laisser plus de temps aux requêtes lourdes
});

// Intercepteur pour les requêtes
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] Requesting ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses avec gestion avancée des erreurs et retries
apiClient.interceptors.response.use(
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
        return apiClient(config);
      }
    }
    
    // Si le serveur retourne une erreur 429 (too many requests)
    if (error.response && error.response.status === 429) {
      console.log('[API] Rate limited, waiting before retry...');
      
      // Attendre 2 secondes avant de réessayer
      if (config && !config.headers['X-Retry-Attempt']) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        config.headers['X-Retry-Attempt'] = 'true';
        return apiClient(config);
      }
    }
    
    return Promise.reject(error);
  }
);

// Helper pour batched requests
const batchRequests = async <T>(requests: Promise<ApiResponse<T>>[]) => {
  try {
    const responses = await Promise.all(requests);
    return responses.map(response => response.data);
  } catch (error) {
    console.error('[API] Batch request error:', error);
    throw error;
  }
};

// Fonctions wrapper pour les appels API
const api = {
  // Fonction générique pour les requêtes GET avec caching dans sessionStorage
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      // Vérifier si les données sont en cache dans sessionStorage (pour les données non-critiques)
      const cacheKey = `dynatrace_monitor:${endpoint}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      
      if (cachedData && endpoint !== ENDPOINTS.PROBLEMS && endpoint !== ENDPOINTS.SUMMARY) {
        const parsed = JSON.parse(cachedData);
        const cacheTime = parsed.timestamp;
        const now = Date.now();
        
        // Utiliser le cache si moins de 5 minutes se sont écoulées
        if (now - cacheTime < 5 * 60 * 1000) {
          console.log(`[API] Using cached data for ${endpoint}`);
          return { data: parsed.data };
        }
      }
      
      // Si pas de cache ou données expirées, faire la requête
      const response = await apiClient.get<T>(endpoint, config);
      
      // Stocker les nouvelles données en cache
      if (endpoint !== ENDPOINTS.PROBLEMS && endpoint !== ENDPOINTS.SUMMARY) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      }
      
      return { data: response.data };
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
  },

  // Fonction générique pour les requêtes POST
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post<T>(endpoint, data, config);
      
      // Invalider les caches liés à cette ressource
      if (endpoint === ENDPOINTS.SET_MANAGEMENT_ZONE) {
        // Supprimer les caches qui dépendent de la management zone
        sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.HOSTS}`);
        sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.SERVICES}`);
        sessionStorage.removeItem(`dynatrace_monitor:${ENDPOINTS.PROCESSES}`);
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
        }
      }
      
      return { data: response.data };
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
  },

  // Méthodes spécifiques

  // Récupérer le résumé des données
  getSummary() {
    return this.get(ENDPOINTS.SUMMARY);
  },

  // Récupérer les problèmes
  getProblems() {
    return this.get<ProblemResponse[]>(ENDPOINTS.PROBLEMS);
  },

  // Récupérer les management zones
  getManagementZones() {
    return this.get(ENDPOINTS.MANAGEMENT_ZONES);
  },

  // Récupérer la management zone actuelle
  getCurrentManagementZone() {
    return this.get(ENDPOINTS.CURRENT_MANAGEMENT_ZONE);
  },

  // Récupérer les management zones de Vital for Group
  getVitalForGroupMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_GROUP_MZS);
  },

  // Récupérer les management zones de Vital for Entreprise
  getVitalForEntrepriseMZs() {
    return this.get<VitalForGroupMZsResponse>(ENDPOINTS.VITAL_FOR_ENTREPRISE_MZS);
  },

  // Définir la management zone actuelle
  setManagementZone(name: string) {
    return this.post(ENDPOINTS.SET_MANAGEMENT_ZONE, { name });
  },

  // Récupérer les hôtes
  getHosts() {
    return this.get(ENDPOINTS.HOSTS);
  },

  // Récupérer les services
  getServices() {
    return this.get(ENDPOINTS.SERVICES);
  },

  // Récupérer les process groups
  getProcesses() {
    return this.get<ProcessResponse[]>(ENDPOINTS.PROCESSES);
  },

  // Rafraîchir un type de cache
  refreshCache(cacheType: string) {
    return this.post(ENDPOINTS.REFRESH_CACHE(cacheType));
  },

  // Vérifier le statut de l'API
  getStatus() {
    return this.get(ENDPOINTS.STATUS);
  }
};

export { api, CACHE_TYPES, batchRequests };