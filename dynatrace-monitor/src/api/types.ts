// Types pour les entités Dynatrace

// Type pour les variantes de dashboard
export type DashboardVariant = 'vfg' | 'vfe' | 'detection' | 'encryption' | 'all';

// Types pour les entités dans Dynatrace
export interface EntityStub {
  id: string;
  name?: string;
  displayName?: string;
  entityName?: string;
  type?: string;
  entityType?: string;
}

// Types pour les problèmes
// Types pour les problèmes
// Types pour les problèmes
export interface Problem {
  id: string;
  title: string;
  code: string;
  subtitle: string;
  time: string;
  type: string;
  responseTime?: string;
  cpuUsage?: string;
  errorRate?: string;
  host?: string;
  servicesImpacted?: string;
  usersAffected?: string;
  failedTransactions?: string;
  duration?: string;
  impact: 'FAIBLE' | 'MOYEN' | 'ÉLEVÉ';
  status: 'low' | 'warning' | 'critical';
  zone: string;
  dt_url?: string;
  resolved?: boolean; // Champ pour distinguer les problèmes résolus
  
  // Entités impactées par le problème - format optimisé
  impactedEntities?: Array<{
    entityId: {
      type: string;
      id?: string;
    };
    name: string;
    displayName?: string;
    [key: string]: any;
  }>;
  
  impacted?: string; // Nom direct de la machine impactée (si disponible)
  
  // Champs additionnels de l'API Dynatrace (optionnels)
  rootCauseEntity?: {
    type: string;
    name?: string;
    displayName?: string;
    entityId?: {
      type: string;
      id?: string;
    }
  };
  startTime?: number;             // Heure de début en ms
  endTime?: number;               // Heure de fin en ms
  displayId?: string;             // ID d'affichage
  severityLevel?: string;         // Niveau de sévérité
  managementZones?: { name: string }[]; // Zones de gestion associées
}

// Types pour les management zones
export interface ManagementZone {
  id: string;
  name: string;
  code: string;
  icon: React.ReactNode;
  problemCount: number;
  apps: number;
  services: number;
  hosts: number;
  availability: string;
  status: 'healthy' | 'warning';
  color: 'red' | 'amber' | 'orange' | 'blue' | 'emerald' | 'purple' | 'green';
  dt_url: string;
}

// Types pour les process groups
export interface ProcessGroup {
  id: string;  // Ajouté cette propriété
  name: string;
  technology: string;
  icon: React.ReactNode;
  type: 'technology' | 'database' | 'server';
  dt_url?: string;
}


// Type pour les hôtes
export interface Host {
  id: string;
  name: string;
  cpu: number | null;
  ram: number | null;
  os_version: string; // Nouveau champ pour la version de l'OS
  cpu_history?: MetricHistory[]; 
  ram_history?: MetricHistory[]; 
  dt_url: string;
}

// Type pour les services
export interface Service {
  id: string;
  name: string;
  response_time: number | null;
  median_response_time: number | null; // Temps de réponse médian ajouté
  error_rate: number | null;
  requests: number | null;
  technology: string;
  tech_icon: string;
  status: string;
  response_time_history: MetricHistory[];
  median_response_time_history: MetricHistory[]; // Historique du temps médian ajouté
  error_rate_history: MetricHistory[];
  request_count_history: MetricHistory[];
  dt_url: string;
}

// Type pour l'historique des métriques
export interface MetricHistory {
  timestamp: number;
  value: number;
}

// Types pour le résumé des données
export interface SummaryData {
  hosts: {
    count: number;
    avg_cpu: number;
    critical_count: number;
  };
  services: {
    count: number;
    with_errors: number;
    avg_error_rate: number;
  };
  requests: {
    total: number;
    hourly_avg: number;
  };
  problems: {
    count: number;
  };
  timestamp: number;
}

// ----------------
// Types pour les réponses API
// ----------------

// Type de base pour les réponses API
export interface ApiResponse<T> {
  data: T;
  timestamp?: number;
  error?: string;
}

// Type pour la réponse de l'API VitalForGroupMZs
export interface VitalForGroupMZsResponse {
  mzs: string[];
}

// Type pour la réponse d'un problème de l'API
// Type pour la réponse d'un problème de l'API
export interface ProblemResponse {
  id: string;
  title: string;
  status: string;
  impact: string;
  zone?: string;
  affected_entities?: number;
  start_time?: string;
  end_time?: string;
  duration?: string;
  dt_url?: string;
  host?: string;       // Nom explicite de la machine hôte
  impacted?: string;   // Champ alternatif pour le nom d'hôte
  displayId?: string;  // ID d'affichage du problème qui pourrait contenir des infos sur l'hôte
  resolved?: boolean;  // Indique si le problème est résolu
  rootCauseEntity?: {
    type: string;
    name?: string;
    displayName?: string;
    entityId?: {
      type: string;
      id?: string;
    }
  };
  // Nouveau champ pour les entités impactées directement depuis l'API Dynatrace
  impactedEntities?: Array<{
    entityId: {
      type: string;
      id?: string;
    };
    name: string;
    displayName?: string;
    [key: string]: any;
  }>;
  [key: string]: any; // Pour permettre d'autres propriétés
}

// Type pour la réponse d'un processus de l'API
export interface ProcessResponse {
  id: string;
  name: string;
  technology?: string;
  tech_icon?: string;
  dt_url?: string;
  [key: string]: any; // Pour permettre d'autres propriétés
}