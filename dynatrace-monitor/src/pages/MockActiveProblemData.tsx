import { Problem } from '../api/types';

// Mock data for active problems (status: critical)
export const mockActiveProblems: Problem[] = [
  {
    id: 'PROB-1234',
    title: 'High CPU usage on application server',
    code: 'CPU_SATURATION',
    subtitle: 'CPU usage exceeded 95% for more than 10 minutes',
    time: '2025-05-01T09:15:00.000Z',
    type: 'PERFORMANCE',
    responseTime: '2.5s',
    cpuUsage: '97%',
    host: 'prod-app-server-01',
    servicesImpacted: '3',
    usersAffected: '1250',
    duration: '25m',
    impact: 'ÉLEVÉ',
    status: 'critical',
    zone: 'PRODUCTION-WEB',
    dt_url: 'https://dynatrace.example.com/problems/PROB-1234'
  },
  {
    id: 'PROB-5678',
    title: 'Database connection failures',
    code: 'DB_CONNECTION_FAILED',
    subtitle: 'Connection pool exhausted on primary database',
    time: '2025-05-01T10:30:00.000Z',
    type: 'AVAILABILITY',
    responseTime: '5.8s',
    errorRate: '15%',
    host: 'prod-db-primary',
    servicesImpacted: '7',
    usersAffected: '3500',
    failedTransactions: '1450',
    duration: '18m',
    impact: 'ÉLEVÉ',
    status: 'critical',
    zone: 'PRODUCTION-DB',
    dt_url: 'https://dynatrace.example.com/problems/PROB-5678'
  },
  {
    id: 'PROB-9012',
    title: 'Memory leak in authentication service',
    code: 'MEMORY_LEAK',
    subtitle: 'Heap usage continuously increasing',
    time: '2025-05-01T11:45:00.000Z',
    type: 'RESOURCE',
    responseTime: '1.2s',
    host: 'prod-auth-service-02',
    servicesImpacted: '2',
    usersAffected: '950',
    duration: '45m',
    impact: 'MOYEN',
    status: 'critical',
    zone: 'PRODUCTION-AUTH',
    dt_url: 'https://dynatrace.example.com/problems/PROB-9012'
  },
  {
    id: 'PROB-3456',
    title: 'API Gateway timeout errors',
    code: 'GATEWAY_TIMEOUT',
    subtitle: 'External payment service not responding',
    time: '2025-05-01T13:20:00.000Z',
    type: 'SERVICE',
    responseTime: '30s+',
    errorRate: '78%',
    servicesImpacted: '4',
    usersAffected: '2750',
    failedTransactions: '980',
    duration: '32m',
    impact: 'ÉLEVÉ',
    status: 'critical',
    zone: 'PRODUCTION-API',
    dt_url: 'https://dynatrace.example.com/problems/PROB-3456'
  }
];

export default mockActiveProblems;