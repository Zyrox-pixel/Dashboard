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
  }
  
  // Types pour les process groups
  export interface ProcessGroup {
    name: string;
    technology: string;
    icon: React.ReactNode;
    type: 'technology' | 'database' | 'server';
  }
  
  // Types pour les réponses API
  export interface ApiResponse<T> {
    data: T;
    timestamp?: number;
    error?: string;
  }
  
  // Type pour le résumé des données
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
  
  // Type pour les hôtes
  export interface Host {
    id: string;
    name: string;
    cpu: number | null;
    ram: number | null;
    cpu_history: MetricHistory[];
    ram_history: MetricHistory[];
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