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
  // Créer l'en-tête du CSV
  const headers = [
    'Identifiant',
    'Date de création',
    'Zone (VFE/VFG)',
    'Sous-zone',
    'Statut',
    'Priorité',
    'Description'
  ];

  // Mapper les problèmes au format CSV
  const rows = problems.map(problem => {
    // Déterminer la zone (VFE/VFG)
    const zoneType = problem.zone.toLowerCase().includes('vfg') 
      ? 'VFG' 
      : problem.zone.toLowerCase().includes('vfe') 
        ? 'VFE' 
        : 'N/A';
    
    // Extraire la date depuis le champ time (ex: "Depuis 2023-04-15 14:30")
    let creationDate = 'N/A';
    const dateMatch = problem.time?.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && dateMatch[1]) {
      creationDate = dateMatch[1];
    }
    
    // Obtenir le statut formaté
    const status = problem.resolved 
      ? 'Résolu' 
      : problem.status === 'critical' 
        ? 'Critique' 
        : problem.status === 'warning' 
          ? 'Avertissement' 
          : 'Bas';
    
    // Mapper la priorité
    const priority = problem.impact === 'ÉLEVÉ'
      ? 'Haute'
      : problem.impact === 'MOYEN'
        ? 'Moyenne'
        : 'Basse';
    
    // Construire la ligne CSV
    return [
      problem.id,
      creationDate,
      zoneType,
      problem.zone,
      status,
      priority,
      problem.title
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