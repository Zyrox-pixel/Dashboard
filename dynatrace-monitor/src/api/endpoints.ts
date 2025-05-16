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
  PROBLEMS_72H: '/problems-72h', // Nouvel endpoint dédié pour les problèmes des 72 dernières heures
  
  // Endpoints relatifs aux management zones
  MANAGEMENT_ZONES: '/management-zones',
  CURRENT_MANAGEMENT_ZONE: '/current-management-zone',
  SET_MANAGEMENT_ZONE: '/set-management-zone',
  VITAL_FOR_GROUP_MZS: '/vital-for-group-mzs',
  VITAL_FOR_ENTREPRISE_MZS: '/vital-for-entreprise-mzs', // Nouvel endpoint pour VFE
  DETECTION_MZS: '/detection-ctl-mzs', // Nouvel endpoint pour Detection CTL
  ENCRYPTION_MZS: '/security-encryption-mzs', // Nouvel endpoint pour Security Encryption
  BATCH_ZONE_COUNTS: '/batch-zone-counts', // Endpoint pour récupérer les counts de toutes les zones
  
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

// Interface pour la réponse du batch zone counts
export interface BatchZoneCountsResponse {
  [zoneId: string]: {
    hosts: number;
    services: number;
    processes: number;
  } | null;
}

// Fonction pour récupérer les counts de toutes les zones
export const fetchAllZoneCounts = async (zoneNames?: string[]): Promise<BatchZoneCountsResponse> => {
  let url = `${API_BASE_URL}${ENDPOINTS.BATCH_ZONE_COUNTS}`;
  
  // Ajouter les noms de zones comme paramètres de requête si fournis
  if (zoneNames && zoneNames.length > 0) {
    const params = new URLSearchParams();
    zoneNames.forEach(zone => params.append('zones[]', zone));
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch batch zone counts');
  }
  return response.json();
};