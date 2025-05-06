import requests
import os
import sys
import json
from datetime import datetime, timezone

# --- Configuration ---
# Récupérer depuis les variables d'environnement ou remplacer directement ici
# Exemple pour DYNATRACE_BASE_URL: "https://votre-id-env.live.dynatrace.com" ou "https://votre-domaine-managed/e/votre-id-env"
DYNATRACE_BASE_URL = os.getenv("DYNATRACE_BASE_URL", "https://VOTRE_URL_DYNATRACE")
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API")

# Vérifier si les configurations de base sont fournies
if DYNATRACE_BASE_URL == "https://VOTRE_URL_DYNATRACE" or DYNATRACE_API_TOKEN == "VOTRE_TOKEN_API":
    print("ERREUR: Veuillez définir les variables d'environnement DYNATRACE_BASE_URL et DYNATRACE_API_TOKEN,")
    print("        ou modifier directement les variables dans le script.")
    print("Exemple DYNATRACE_BASE_URL: https://xyz12345.live.dynatrace.com")
    sys.exit(1)

# Nettoyer l'URL (enlever le / final si présent)
if DYNATRACE_BASE_URL.endswith('/'):
    DYNATRACE_BASE_URL = DYNATRACE_BASE_URL[:-1]

# --- Fonctions ---

def get_management_zone_id(base_url, api_token, mz_name):
    """
    Trouve l'ID d'une Management Zone à partir de son nom via l'API config v1.
    """
    endpoint = f"{base_url}/api/config/v1/managementZones"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json"
    }
    # Pour l'API config v1, le token est parfois aussi attendu en paramètre
    # mais l'en-tête Authorization est la méthode standard.
    # params = { "Api-Token": api_token }

    print(f"\nRecherche de l'ID pour la Management Zone : '{mz_name}'...")
    try:
        response = requests.get(endpoint, headers=headers) #, params=params)
        response.raise_for_status() # Lève une exception pour les erreurs HTTP (4xx, 5xx)

        mz_data = response.json()
        mz_list = mz_data.get('values', [])

        for mz in mz_list:
            if mz.get('name') == mz_name:
                print(f"Management Zone trouvée. ID: {mz.get('id')}")
                return mz.get('id')

        print(f"ERREUR: Management Zone '{mz_name}' non trouvée.")
        return None

    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel API pour récupérer les Management Zones : {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Réponse API: {e.response.status_code} - {e.response.text}")
        return None
    except json.JSONDecodeError:
        print(f"Erreur lors du décodage de la réponse JSON de l'API Management Zones.")
        if 'response' in locals() and response is not None: # Check if response exists
            print(f"Réponse reçue: {response.text}")
        return None


def get_problems_for_mz(base_url, api_token, mz_id):
    """
    Récupère tous les problèmes (ouverts et fermés) des dernières 72h
    pour un ID de Management Zone donné via l'API Problems v2.
    Gère la pagination.
    """
    all_problems = []
    endpoint = f"{base_url}/api/v2/problems"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    params = {
        "problemSelector": f'managementZoneIds("{mz_id}")',
        "from": "now-72h", # Problèmes des dernières 72 heures
        "pageSize": 200,  # Taille de page (max 500 pour cette API)
    }

    print(f"\nRécupération des problèmes des dernières 72h pour la Management Zone ID: {mz_id}...")
    next_page_key = None

    while True:
        if next_page_key:
            params["nextPageKey"] = next_page_key
        else:
            params.pop("nextPageKey", None) # S'assurer qu'il n'est pas là pour le premier appel

        try:
            response = requests.get(endpoint, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            print(f"  {len(problems_on_page)} problème(s) trouvé(s) sur cette page (total: {len(all_problems)})...")

            next_page_key = data.get('nextPageKey')
            total_count = data.get('totalCount', 0) # totalCount est le nombre total correspondant aux filtres

            if not next_page_key or len(all_problems) >= total_count:
                print("Fin de la pagination ou tous les problèmes récupérés.")
                break

        except requests.exceptions.RequestException as e:
            print(f"Erreur lors de l'appel API pour récupérer les problèmes : {e}")
            if hasattr(e, 'response') and e.response is not None:
                 print(f"Réponse API: {e.response.status_code} - {e.response.text}")
            return None # Arrêter en cas d'erreur
        except json.JSONDecodeError:
            print(f"Erreur lors du décodage de la réponse JSON de l'API Problèmes.")
            if 'response' in locals() and response is not None:
                print(f"Réponse reçue: {response.text}")
            return None

    print(f"\nTotal de {len(all_problems)} problème(s) récupéré(s) pour la MZ ID {mz_id} sur les dernières 72h.")
    return all_problems

def format_timestamp(epoch_ms):
    """Convertit un timestamp epoch en millisecondes en une chaîne de caractères lisible."""
    if epoch_ms == -1 or epoch_ms is None: # -1 est parfois utilisé pour "pas de fin"
        return "N/A (Ouvert ou non terminé)"
    dt_object = datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc)
    return dt_object.strftime('%Y-%m-%d %H:%M:%S %Z')

# --- Exécution Principale ---

if __name__ == "__main__":
    management_zone_name = input("Entrez le nom exact de la Management Zone : ")

    if not management_zone_name:
        print("Le nom de la Management Zone ne peut pas être vide.")
        sys.exit(1)

    mz_id_found = get_management_zone_id(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, management_zone_name)

    if mz_id_found:
        problems_list = get_problems_for_mz(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, mz_id_found)

        if problems_list is not None: # Si la fonction n'a pas retourné None (erreur)
            if not problems_list:
                print(f"\nAucun problème trouvé pour la Management Zone '{management_zone_name}' (ID: {mz_id_found}) sur les dernières 72 heures.")
            else:
                print(f"\n--- Liste des Problèmes pour '{management_zone_name}' (ID: {mz_id_found}) - Dernières 72h ---")
                for problem in problems_list:
                    print(f"\n  ID Problème : {problem.get('problemId')}")
                    print(f"  Display ID  : {problem.get('displayId')}")
                    print(f"  Titre       : {problem.get('title')}")
                    print(f"  Statut      : {problem.get('status')}")
                    print(f"  Impact      : {problem.get('impactLevel')}")
                    print(f"  Sévérité    : {problem.get('severityLevel')}")
                    print(f"  Début       : {format_timestamp(problem.get('startTime'))}")
                    print(f"  Fin         : {format_timestamp(problem.get('endTime'))}")
                print(f"\n--- Fin de la liste ({len(problems_list)} problème(s) affiché(s)) ---")
        else:
            print("Impossible de récupérer la liste des problèmes en raison d'erreurs précédentes.")
    else:
        print("Impossible de continuer sans l'ID de la Management Zone.")