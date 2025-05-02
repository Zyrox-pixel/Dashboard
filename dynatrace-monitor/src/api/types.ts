// Types pour les entités Dynatrace

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
  resolved?: boolean; // Nouveau champ pour distinguer les problèmes résolus
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
  error_rate: number | null;
  requests: number | null;
  technology: string;
  tech_icon: string;
  status: string;
  response_time_history: MetricHistory[];
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
export interface ProblemResponse {
  id: string;
  title: string;
  status: string;
  impact: string;
  zone?: string;
  affected_entities?: number;
  start_time?: string;
  dt_url?: string;
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