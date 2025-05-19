#!/bin/bash

# Script de démarrage du backend optimisé
echo "Démarrage du backend Dynatrace Dashboard avec optimisations..."

# Vérifier si Python est installé
if ! command -v python3 &> /dev/null; then
    echo "Erreur: Python 3 n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Vérifier que les dépendances sont installées
if [ ! -f "requirements.txt" ]; then
    echo "Erreur: Fichier requirements.txt non trouvé."
    exit 1
fi

# Installer ou mettre à jour les dépendances
echo "Installation/mise à jour des dépendances..."

# Vérifier la présence du fichier .env
if [ ! -f ".env" ]; then
    echo "Attention: Fichier .env non trouvé. Création d'un fichier .env par défaut..."
    cp .env.example .env 2>/dev/null || echo "# Configuration Flask
FLASK_DEBUG=True

# Configuration de la base de données
DATABASE_URL=sqlite:///dynatrace_dashboard.db

# Configuration Dynatrace
DT_ENV_URL=https://your-environment.live.dynatrace.com
API_TOKEN=your-api-token

# Vital for Group Management Zones (séparées par des virgules)
VFG_MZ_LIST=PRODSEC - AP03566 - ACESID,PRODSEC - AP11564 - OCSP,PRODSEC - AP11038 - WebSSO ITG

# MZ par défaut (première MZ de la liste)
MZ_NAME=PRODSEC - AP03566 - ACESID

# Configuration du planificateur
SCHEDULER_INTERVAL_MINUTES=5

# Configuration SSL
VERIFY_SSL=False

# Durée de cache (en secondes)
CACHE_DURATION=300

# Optimisation des requêtes
REQUEST_CHUNK_SIZE=20
MAX_WORKERS=30
MAX_CONNECTIONS=60
PROBLEMS_CACHE_DURATION=60" > .env
    echo "Veuillez configurer votre fichier .env avec vos informations Dynatrace."
fi

# Lancer le serveur avec Gunicorn si disponible
if command -v gunicorn &> /dev/null; then
    echo "Démarrage avec Gunicorn (production)..."
    gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 app:app
else
    echo "Démarrage avec Flask (développement)..."
    export FLASK_APP=app.py
    export FLASK_DEBUG=True
    python3 -m flask run --host=0.0.0.0
fi