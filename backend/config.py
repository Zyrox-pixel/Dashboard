import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

class Config:
    # Configuration Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'secret-key-de-developpement')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    
    # Configuration de la base de données
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///dynatrace_dashboard.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Configuration Dynatrace

    
    # Configuration du planificateur
    SCHEDULER_INTERVAL_MINUTES = int(os.getenv('SCHEDULER_INTERVAL_MINUTES', '5'))
    
    # Configuration SSL
    VERIFY_SSL = os.getenv('VERIFY_SSL', 'False').lower() in ('true', '1', 't')