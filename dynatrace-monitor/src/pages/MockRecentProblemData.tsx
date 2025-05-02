import { Problem } from '../api/types';

// Mock data for recent problems (status: warning)
export const mockRecentProblems: Problem[] = [
  {
    id: 'PROB-7890',
    title: 'Slow response time in checkout process',
    code: 'RESPONSE_TIME_DEGRADATION',
    subtitle: 'Response time increased by 65% compared to baseline',
    time: '2025-04-29T14:45:00.000Z',
    type: 'PERFORMANCE',
    responseTime: '1.8s',
    host: 'web-server-05',
    servicesImpacted: '1',
    usersAffected: '320',
    duration: '15m',
    impact: 'MOYEN',
    status: 'warning',
    zone: 'STAGING-WEB',
    dt_url: 'https://dynatrace.example.com/problems/PROB-7890'
  },
  {
    id: 'PROB-2468',
    title: 'Intermittent network packet loss',
    code: 'NETWORK_ISSUES',
    subtitle: 'Packet loss detected between application and cache server',
    time: '2025-04-30T08:10:00.000Z',
    type: 'INFRASTRUCTURE',
    host: 'network-switch-02',
    servicesImpacted: '5',
    usersAffected: '180',
    duration: '12m',
    impact: 'FAIBLE',
    status: 'warning',
    zone: 'NETWORK-INFRASTRUCTURE',
    dt_url: 'https://dynatrace.example.com/problems/PROB-2468'
  },
  {
    id: 'PROB-1357',
    title: 'Elevated error rate in logging service',
    code: 'ERROR_RATE_INCREASE',
    subtitle: 'Error rate increased to 3.5%',
    time: '2025-04-30T16:25:00.000Z',
    type: 'SERVICE',
    errorRate: '3.5%',
    host: 'logging-service-01',
    servicesImpacted: '2',
    usersAffected: '0',
    failedTransactions: '128',
    duration: '22m',
    impact: 'FAIBLE',
    status: 'warning',
    zone: 'INTERNAL-SERVICES',
    dt_url: 'https://dynatrace.example.com/problems/PROB-1357'
  },
  {
    id: 'PROB-8642',
    title: 'Disk space warning on backup server',
    code: 'DISK_SPACE_LOW',
    subtitle: 'Free disk space below 15% threshold',
    time: '2025-05-01T02:15:00.000Z',
    type: 'RESOURCE',
    host: 'backup-server-03',
    duration: '240m',
    impact: 'MOYEN',
    status: 'warning',
    zone: 'BACKUP-INFRASTRUCTURE',
    dt_url: 'https://dynatrace.example.com/problems/PROB-8642'
  },
  {
    id: 'PROB-9753',
    title: 'Increased latency in search functionality',
    code: 'LATENCY_INCREASE',
    subtitle: 'Search queries taking 30% longer than normal',
    time: '2025-05-01T06:50:00.000Z',
    type: 'PERFORMANCE',
    responseTime: '0.9s',
    host: 'search-service-cluster',
    servicesImpacted: '1',
    usersAffected: '425',
    duration: '35m',
    impact: 'MOYEN',
    status: 'warning',
    zone: 'SEARCH-SERVICES',
    dt_url: 'https://dynatrace.example.com/problems/PROB-9753'
  }
];

export default mockRecentProblems;