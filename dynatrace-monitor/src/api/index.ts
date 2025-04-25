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
  timeout: 10000, // 10 secondes
});

// Intercepteur pour les requêtes
apiClient.interceptors.request.use(
  (config) => {
    // Vous pouvez ajouter ici des tokens d'authentification si nécessaire
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Gestion centralisée des erreurs
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Fonctions wrapper pour les appels API
const api = {
  // Fonction générique pour les requêtes GET
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get<T>(endpoint, config);
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

export { api, CACHE_TYPES };