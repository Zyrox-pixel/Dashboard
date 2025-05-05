import requests
import os
import sys
import json

# --- Configuration ---
# Récupérer depuis les variables d'environnement ou remplacer directement ici
DYNATRACE_BASE_URL = os.getenv("DYNATRACE_BASE_URL", "https://VOTRE_URL_DYNATRACE") # Ex: https://xyz12345.live.dynatrace.com
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API")

# Vérifier si les configurations de base sont fournies
if DYNATRACE_BASE_URL == "https://VOTRE_URL_DYNATRACE" or DYNATRACE_API_TOKEN == "VOTRE_TOKEN_API":
    print("ERREUR: Veuillez définir les variables d'environnement DYNATRACE_BASE_URL et DYNATRACE_API_TOKEN,")
    print("        ou modifier directement les variables dans le script.")
    sys.exit(1)

# Nettoyer l'URL (enlever le / final si présent)
if DYNATRACE_BASE_URL.endswith('/'):
    DYNATRACE_BASE_URL = DYNATRACE_BASE_URL[:-1]

# --- Fonctions ---

def get_management_zone_id(base_url, api_token, mz_name):
    """
    Trouve l'ID d'une Management Zone à partir de son nom via l'API v1.
    """
    endpoint = f"{base_url}/api/config/v1/managementZones"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json"
    }
    params = {
        "Api-Token": api_token # Certains endpoints v1 préfèrent le token en paramètre
    }

    print(f"Recherche de l'ID pour la Management Zone : '{mz_name}'...")
    try:
        response = requests.get(endpoint, headers=headers, params=params)
        response.raise_for_status() # Lève une exception pour les erreurs HTTP (4xx, 5xx)

        mz_list = response.json().get('values', [])
        for mz in mz_list:
            if mz.get('name') == mz_name:
                print(f"Management Zone trouvée. ID: {mz.get('id')}")
                return mz.get('id')

        print(f"ERREUR: Management Zone '{mz_name}' non trouvée.")
        return None

    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel API pour récupérer les Management Zones : {e}")
        if response is not None:
            print(f"Réponse API: {response.status_code} - {response.text}")
        return None
    except json.JSONDecodeError:
        print(f"Erreur lors du décodage de la réponse JSON de l'API Management Zones.")
        print(f"Réponse reçue: {response.text}")
        return None


def get_problems_for_mz(base_url, api_token, mz_id):
    """
    Récupère tous les problèmes (ouverts et fermés) pour un ID de Management Zone donné via l'API v2.
    Gère la pagination.
    """
    all_problems = []
    endpoint = f"{base_url}/api/v2/problems"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8" # Spécifier charset pour éviter erreurs potentielles
    }
    # problemSelector filtre les problèmes liés aux entités de cette MZ
    # La timeframe par défaut de l'API v2 est souvent les 72 dernières heures.
    # Ajustez 'from' et 'to' si vous avez besoin d'une période différente.
    # Pour lister TOUS les problèmes (potentiellement très long), il faudrait itérer sur des timeframes.
    # Ici, on utilise la timeframe par défaut ou une timeframe large.
    params = {
        "problemSelector": f'managementZoneIds("{mz_id}")',
        "pageSize": 500, # Augmenter la taille de page pour réduire le nombre d'appels
        # "from": "now-7d" # Décommenter et ajuster pour une timeframe spécifique (ex: 7 derniers jours)
    }

    print(f"Récupération des problèmes pour la Management Zone ID: {mz_id}...")
    next_page_key = None

    while True:
        if next_page_key:
            params["nextPageKey"] = next_page_key
        else:
            # Assurer que nextPageKey n'est pas dans les params pour le premier appel
            params.pop("nextPageKey", None)

        try:
            response = requests.get(endpoint, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            print(f"  {len(problems_on_page)} problème(s) trouvé(s) sur cette page...")

            next_page_key = data.get('nextPageKey')
            if not next_page_key:
                print("Fin de la pagination.")
                break # Sortir de la boucle s'il n'y a plus de pages

        except requests.exceptions.RequestException as e:
            print(f"Erreur lors de l'appel API pour récupérer les problèmes : {e}")
            if response is not None:
                 print(f"Réponse API: {response.status_code} - {response.text}")
            # Décider s'il faut arrêter ou essayer de continuer (ici on arrête)
            return None
        except json.JSONDecodeError:
            print(f"Erreur lors du décodage de la réponse JSON de l'API Problèmes.")
            print(f"Réponse reçue: {response.text}")
            return None # Arrêter en cas d'erreur JSON

    print(f"Total de {len(all_problems)} problème(s) récupéré(s) pour la MZ ID {mz_id}.")
    return all_problems

# --- Exécution Principale ---

if __name__ == "__main__":
    management_zone_name = input("Entrez le nom exact de la Management Zone : ")

    if not management_zone_name:
        print("Le nom de la Management Zone ne peut pas être vide.")
        sys.exit(1)

    mz_id = get_management_zone_id(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, management_zone_name)

    if mz_id:
        problems = get_problems_for_mz(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, mz_id)

        if problems is not None:
            if not problems:
                print(f"\nAucun problème trouvé pour la Management Zone '{management_zone_name}' (ID: {mz_id}) dans la timeframe considérée par l'API.")
            else:
                print(f"\n--- Liste des Problèmes pour '{management_zone_name}' (ID: {mz_id}) ---")
                for problem in problems:
                    print(f"\n  ID Problème : {problem.get('problemId')}")
                    print(f"  Display ID  : {problem.get('displayId')}")
                    print(f"  Titre       : {problem.get('title')}")
                    print(f"  Statut      : {problem.get('status')}")
                    print(f"  Impact      : {problem.get('impactLevel')}")
                    print(f"  Sévérité    : {problem.get('severityLevel')}")
                    # Les temps sont en millisecondes epoch UTC, on peut les convertir si besoin
                    print(f"  Début (UTC) : {problem.get('startTime')}")
                    print(f"  Fin (UTC)   : {problem.get('endTime', 'N/A (Ouvert ou non terminé)')}")
                print("\n--- Fin de la liste ---")
        else:
            print("Impossible de récupérer la liste des problèmes.")
    else:
        print("Impossible de continuer sans l'ID de la Management Zone.")