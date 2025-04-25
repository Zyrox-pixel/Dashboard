// Définition des endpoints de l'API

// URL de base de l'API
export const API_BASE_URL = 'http://localhost:5000/api';

// Endpoints
export const ENDPOINTS = {
  // Endpoints relatifs aux résumés et statuts
  SUMMARY: '/summary',
  STATUS: '/status',
  
  // Endpoints relatifs aux entités
  HOSTS: '/hosts',
  SERVICES: '/services',
  PROCESSES: '/processes',
  
  // Endpoints relatifs aux problèmes
  PROBLEMS: '/problems',
  
  // Endpoints relatifs aux management zones
  MANAGEMENT_ZONES: '/management-zones',
  CURRENT_MANAGEMENT_ZONE: '/current-management-zone',
  SET_MANAGEMENT_ZONE: '/set-management-zone',
  VITAL_FOR_GROUP_MZS: '/vital-for-group-mzs', // Nouvel endpoint
  
  // Endpoint de rafraîchissement du cache
  REFRESH_CACHE: (cacheType: string) => `/refresh/${cacheType}`
};

// Types d'entités pour le rafraîchissement du cache
export const CACHE_TYPES = {
  SERVICES: 'services',
  HOSTS: 'hosts',
  PROCESS_GROUPS: 'process_groups',
  PROBLEMS: 'problems',
  SUMMARY: 'summary',
  MANAGEMENT_ZONES: 'management_zones'
};