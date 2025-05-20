import { Problem, Host, Service, ProcessGroup } from '../api/types';

/**
 * Convertit un tableau de problèmes en format CSV
 * @param problems Tableau de problèmes à exporter
 * @param filterType Type de vue (vfg, vfe, vfp, vfa, detection, security, all)
 * @param mgmtZone Zone de management optionnelle pour le filtrage
 * @returns Un objet contenant le contenu CSV et le nom du fichier
 */
export const exportProblemsToCSV = (
  problems: Problem[],
  filterType: 'vfg' | 'vfe' | 'vfp' | 'vfa' | 'detection' | 'security' | 'all',
  mgmtZone?: string
): { csv: string; filename: string } => {
  // Créer l'en-tête du CSV selon les nouvelles exigences
  const headers = [
    'Management Zone',
    'Contenu du problème',
    'Entité impactée',
    'Date',
    'Durée'
  ];

  // Mapper les problèmes au format CSV
  const rows = problems.map(problem => {
    // Extraire la date depuis le champ time (ex: "Depuis 2023-04-15 14:30")
    let creationDate = 'N/A';
    const dateMatch = problem.time?.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && dateMatch[1]) {
      creationDate = dateMatch[1];
    }

    // Déterminer l'entité impactée de la même façon que ProblemCard.tsx
    let impactedEntity = 'Non spécifiée';
    
    // PRIORITÉ 1: Utiliser le champ impacted
    if (problem.impacted && problem.impacted !== "Non spécifié") {
      impactedEntity = problem.impacted;
    }
    // PRIORITÉ 2: Utiliser le champ host s'il existe
    else if (problem.host && problem.host !== "Non spécifié") {
      impactedEntity = problem.host;
    }
    // PRIORITÉ 3: Utiliser impactedEntities s'il existe et contient des entités
    else if (problem.impactedEntities && Array.isArray(problem.impactedEntities)) {
      // Chercher d'abord un HOST
      const hostEntity = problem.impactedEntities.find(entity => 
        entity.entityId && entity.entityId.type === 'HOST' && entity.name
      );
      
      if (hostEntity) {
        impactedEntity = hostEntity.name;
      }
      // Si aucun HOST, chercher tout autre type d'entité
      else {
        const anyEntity = problem.impactedEntities.find(entity => 
          entity.entityId && entity.name
        );
        
        if (anyEntity) {
          impactedEntity = anyEntity.name;
        }
      }
    }
    // PRIORITÉ 4: Vérifier rootCauseEntity
    else if (problem.rootCauseEntity && problem.rootCauseEntity.name) {
      impactedEntity = problem.rootCauseEntity.name;
    }

    // Utiliser la durée si disponible, sinon N/A
    const duration = problem.duration || 'N/A';
    
    // Construire la ligne CSV avec le nouveau format
    return [
      problem.zone,                 // Management Zone
      problem.title,                // Contenu du problème (description)
      impactedEntity,               // Entité impactée
      creationDate,                 // Date
      duration                      // Durée
    ];
  });

  // Créer un en-tête informatif avec la zone et l'heure d'extraction
  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR');
  
  // Créer un en-tête encadré pour le CSV
  const headerFrame = [
    '"=========================================="',
    `"       EXPORT PROBLEMES DYNATRACE        "`,
    '"=========================================="',
    `"Management Zone: ${mgmtZone || (filterType === 'all' ? 'TOUTES ZONES' : filterType.toUpperCase())}"`,
    `"Date d'extraction: ${formattedDateTime}"`,
    '"=========================================="',
    '""',  // Ligne vide pour séparer l'en-tête des données
  ];

  // Ajouter BOM (Byte Order Mark) pour l'encodage UTF-8 correct
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    ...headerFrame,
    // Utiliser des guillemets pour chaque cellule et échapper les guillemets doubles
    headers.map(header => `"${header.replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Générer le nom du fichier
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  let zoneLabel = '';
  
  switch (filterType) {
    case 'vfg':
      zoneLabel = 'VFG';
      break;
    case 'vfe':
      zoneLabel = 'VFE';
      break;
    case 'vfp':
      zoneLabel = 'VFP';
      break;
    case 'vfa':
      zoneLabel = 'VFA';
      break;
    case 'detection':
      zoneLabel = 'DETECTION';
      break;
    case 'security':
      zoneLabel = 'SECURITY';
      break;
    case 'all':
      zoneLabel = 'ALL';
      break;
  }
  
  // Si une zone de management spécifique est fournie, l'ajouter au nom du fichier
  const mgmtZoneLabel = mgmtZone ? `_${mgmtZone.replace(/[^a-z0-9]/gi, '_')}` : '';
  
  const filename = `problems_${zoneLabel}${mgmtZoneLabel}_${datePrefix}.csv`;

  return { csv: csvContent, filename };
};

/**
 * Déclenche le téléchargement d'un fichier CSV
 * @param csvContent Contenu CSV à télécharger
 * @param filename Nom du fichier
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Créer un Blob avec le contenu CSV et spécifier l'encodage UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Créer un lien de téléchargement
  const link = document.createElement('a');
  
  // Créer une URL pour le Blob
  const url = URL.createObjectURL(blob);
  
  // Configurer le lien
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Ajouter le lien au document
  document.body.appendChild(link);
  
  // Cliquer sur le lien pour déclencher le téléchargement
  link.click();
  
  // Nettoyer
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Convertit un tableau d'hôtes en format CSV
 * @param hosts Tableau d'hôtes à exporter
 * @param zoneName Nom de la zone de management
 * @returns Un objet contenant le contenu CSV et le nom du fichier
 */
export const exportHostsToCSV = (
  hosts: Host[],
  zoneName: string
): { csv: string; filename: string } => {
  // Créer l'en-tête du CSV
  const headers = [
    'Nom de la machine',
    'Système d\'exploitation',
    'CPU (%)',
    'RAM (%)'
  ];

  // Mapper les hôtes au format CSV
  const rows = hosts.map(host => [
    host.name,                                // Nom de la machine
    host.os_version || 'Non spécifié',        // OS
    host.cpu !== null ? `${host.cpu}%` : 'N/A', // CPU
    host.ram !== null ? `${host.ram}%` : 'N/A'  // RAM
  ]);

  // Créer un en-tête informatif avec la zone et l'heure d'extraction
  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR');
  
  // Créer un en-tête encadré pour le CSV
  const headerFrame = [
    '"=========================================="',
    `"          EXPORT HOSTS DYNATRACE         "`,
    '"=========================================="',
    `"Management Zone: ${zoneName}"`,
    `"Date d'extraction: ${formattedDateTime}"`,
    '"=========================================="',
    '""',  // Ligne vide pour séparer l'en-tête des données
  ];

  // Ajouter BOM (Byte Order Mark) pour l'encodage UTF-8 correct
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    ...headerFrame,
    // Utiliser des guillemets pour chaque cellule et échapper les guillemets doubles
    headers.map(header => `"${header.replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Générer le nom du fichier avec la date du jour
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Nettoyer le nom de la zone pour le nom de fichier
  const safeZoneName = zoneName.replace(/[^a-z0-9]/gi, '_');
  
  const filename = `hosts_${safeZoneName}_${datePrefix}.csv`;

  return { csv: csvContent, filename };
};

/**
 * Convertit un tableau de services en format CSV
 * @param services Tableau de services à exporter
 * @param zoneName Nom de la zone de management
 * @returns Un objet contenant le contenu CSV et le nom du fichier
 */
export const exportServicesToCSV = (
  services: Service[],
  zoneName: string
): { csv: string; filename: string } => {
  // Créer l'en-tête du CSV
  const headers = [
    'Nom du service',
    'Technologie',
    'Temps de réponse (s)',
    'Taux d\'erreur (%)',
    'Nombre de requêtes'
  ];

  // Mapper les services au format CSV
  const rows = services.map(service => [
    service.name,                                             // Nom du service
    service.technology || 'Non spécifié',                     // Technologie
    service.response_time !== null ? service.response_time.toString() : 'N/A', // Temps de réponse
    service.error_rate !== null ? service.error_rate.toString() : 'N/A',       // Taux d'erreur
    service.requests !== null ? service.requests.toString() : 'N/A'            // Nombre de requêtes
  ]);

  // Créer un en-tête informatif avec la zone et l'heure d'extraction
  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR');
  
  // Créer un en-tête encadré pour le CSV
  const headerFrame = [
    '"=========================================="',
    `"        EXPORT SERVICES DYNATRACE        "`,
    '"=========================================="',
    `"Management Zone: ${zoneName}"`,
    `"Date d'extraction: ${formattedDateTime}"`,
    '"=========================================="',
    '""',  // Ligne vide pour séparer l'en-tête des données
  ];

  // Ajouter BOM (Byte Order Mark) pour l'encodage UTF-8 correct
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    ...headerFrame,
    // Utiliser des guillemets pour chaque cellule et échapper les guillemets doubles
    headers.map(header => `"${header.replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Générer le nom du fichier avec la date du jour
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Nettoyer le nom de la zone pour le nom de fichier
  const safeZoneName = zoneName.replace(/[^a-z0-9]/gi, '_');
  
  const filename = `services_${safeZoneName}_${datePrefix}.csv`;

  return { csv: csvContent, filename };
};

/**
 * Convertit un tableau de process groups en format CSV
 * @param processGroups Tableau de process groups à exporter
 * @param zoneName Nom de la zone de management
 * @returns Un objet contenant le contenu CSV et le nom du fichier
 */
export const exportProcessGroupsToCSV = (
  processGroups: ProcessGroup[],
  zoneName: string
): { csv: string; filename: string } => {
  // Créer l'en-tête du CSV
  const headers = [
    'Nom du process group',
    'Technologie',
    'Type de process'
  ];

  // Mapper les process groups au format CSV
  const rows = processGroups.map(process => {
    // Convertir le type de process en libellé lisible
    let processType = 'Autre';
    if (process.type === 'technology') processType = 'Technologie';
    else if (process.type === 'database') processType = 'Base de données';
    else if (process.type === 'server') processType = 'Serveur';
    
    return [
      process.name,                    // Nom du process group
      process.technology || 'Non spécifié', // Technologie
      processType                      // Type de process
    ];
  });

  // Créer un en-tête informatif avec la zone et l'heure d'extraction
  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR');
  
  // Créer un en-tête encadré pour le CSV
  const headerFrame = [
    '"=========================================="',
    `"    EXPORT PROCESS GROUPS DYNATRACE      "`,
    '"=========================================="',
    `"Management Zone: ${zoneName}"`,
    `"Date d'extraction: ${formattedDateTime}"`,
    '"=========================================="',
    '""',  // Ligne vide pour séparer l'en-tête des données
  ];

  // Ajouter BOM (Byte Order Mark) pour l'encodage UTF-8 correct
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    ...headerFrame,
    // Utiliser des guillemets pour chaque cellule et échapper les guillemets doubles
    headers.map(header => `"${header.replace(/"/g, '""')}"`).join(';'),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
  ].join('\n');

  // Générer le nom du fichier avec la date du jour
  const today = new Date();
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Nettoyer le nom de la zone pour le nom de fichier
  const safeZoneName = zoneName.replace(/[^a-z0-9]/gi, '_');
  
  const filename = `process_groups_${safeZoneName}_${datePrefix}.csv`;

  return { csv: csvContent, filename };
};