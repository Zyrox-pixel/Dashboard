# Dashboard

## Structure du projet

- `backend/` : Application backend principale (Flask)
- `dynatrace-monitor/` : Application frontend React
- `archived_scripts/` : Scripts obsolètes ou doublons archivés

## Nettoyage effectué

- Supprimé les composants frontend en doublon (ModernHeader, ModernLayout, ModernSidebar)
- Archivé les scripts Python non utilisés dans le dossier `archived_scripts`
- Nettoyé les références obsolètes

## Utilisation

Pour exécuter l'application :

1. Démarrer le backend : `cd backend && python app.py`
2. Démarrer le frontend : `cd dynatrace-monitor && npm start`