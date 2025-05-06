import requests
import datetime
from datetime import timedelta
import json

def list_dynatrace_problems(api_url, api_token, management_zone_name):
    """
    Liste tous les problèmes d'une zone de gestion Dynatrace (ouverts et fermés) 
    sur les 72 dernières heures.
    
    Args:
        api_url (str): L'URL de base de l'API Dynatrace (exemple: https://yourdomain.live.dynatrace.com)
        api_token (str): Token d'API avec les permissions nécessaires
        management_zone_name (str): Nom de la zone de gestion
        
    Returns:
        list: Liste des problèmes trouvés
    """
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json'
    }
    
    # Calculer le timestamp pour les 72 dernières heures (en millisecondes)
    now = datetime.datetime.now()
    time_72h_ago = now - timedelta(hours=72)
    from_timestamp = int(time_72h_ago.timestamp() * 1000)
    
    # Construire l'URL pour obtenir les problèmes
    problems_url = f"{api_url}/api/v2/problems"
    params = {
        'from': from_timestamp,
        'managementZone': management_zone_name,  # Utiliser directement le nom au lieu de l'ID
        'status': 'OPEN,CLOSED'  # Pour inclure à la fois les problèmes ouverts et fermés
    }
    
    # Effectuer la requête pour obtenir les problèmes (sans vérification SSL)
    response = requests.get(problems_url, headers=headers, params=params, verify=False)
    
    if response.status_code != 200:
        print(f"Erreur lors de la récupération des problèmes: {response.status_code}")
        print(response.text)
        return []
    
    # Récupérer les problèmes
    problems = response.json().get('problems', [])
    
    return problems

def display_problems(problems):
    """
    Affiche les problèmes de manière claire
    
    Args:
        problems (list): Liste des problèmes à afficher
    """
    if not problems:
        print("Aucun problème trouvé.")
        return
    
    print(f"Nombre total de problèmes trouvés: {len(problems)}")
    print("=" * 80)
    
    for idx, problem in enumerate(problems, 1):
        status = problem.get('status', 'INCONNU')
        title = problem.get('title', 'Sans titre')
        severity = problem.get('severityLevel', 'INCONNU')
        impact = problem.get('impactLevel', 'INCONNU')
        
        # Convertir les timestamps en dates lisibles
        start_time = datetime.datetime.fromtimestamp(problem.get('startTime', 0) / 1000).strftime('%Y-%m-%d %H:%M:%S')
        
        end_time = "En cours"
        if problem.get('endTime'):
            end_time = datetime.datetime.fromtimestamp(problem.get('endTime') / 1000).strftime('%Y-%m-%d %H:%M:%S')
        
        print(f"Problème #{idx}:")
        print(f"  - ID: {problem.get('problemId', 'N/A')}")
        print(f"  - Titre: {title}")
        print(f"  - Statut: {status}")
        print(f"  - Sévérité: {severity}")
        print(f"  - Impact: {impact}")
        print(f"  - Début: {start_time}")
        print(f"  - Fin: {end_time}")
        print(f"  - URL: {problem.get('problemDetailsWebUrl', 'N/A')}")
        print("=" * 80)

if __name__ == "__main__":
    # Ces variables devront être définies par l'utilisateur
    api_url = "https://your-environment.live.dynatrace.com"  # Remplacer par l'URL de votre environnement Dynatrace
    api_token = "your-api-token"  # Remplacer par votre token API
    management_zone_name = "your-management-zone-name"  # Remplacer par le nom de votre zone de gestion
    
    # Récupérer et afficher les problèmes
    problems = list_dynatrace_problems(api_url, api_token, management_zone_name)
    display_problems(problems)