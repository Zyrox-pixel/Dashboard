import { Problem } from '../api/types';

/**
 * Convertit un tableau de problèmes en format CSV
 * @param problems Tableau de problèmes à exporter
 * @param filterType Type de vue (vfg, vfe, all)
 * @param datePrefix Préfixe de date pour le nom de fichier (format: YYYYMMDD)
 * @returns Un objet contenant le contenu CSV et le nom du fichier
 */
export const exportProblemsToCSV = (
  problems: Problem[],
  filterType: 'vfg' | 'vfe' | 'all',
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

    // Déterminer l'entité impactée - utiliser en priorité host/impacted
    const impactedEntity = problem.host || problem.impacted || 'Non spécifiée';

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

  // Combiner l'en-tête et les lignes
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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
  // Créer un Blob avec le contenu CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
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