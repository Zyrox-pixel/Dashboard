import requests
import os
import sys
import json
from datetime import datetime, timezone
# import urllib.parse # Non requis si requests gère bien l'encodage des params

# --- Configuration ---
DYNATRACE_BASE_URL = os.getenv("DYNATRACE_BASE_URL", "https://VOTRE_URL_DYNATRACE")
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API")

if DYNATRACE_BASE_URL == "https://VOTRE_URL_DYNATRACE" or DYNATRACE_API_TOKEN == "VOTRE_TOKEN_API":
    print("ERREUR: Veuillez définir les variables d'environnement DYNATRACE_BASE_URL et DYNATRACE_API_TOKEN,")
    print("        ou modifier directement les variables dans le script.")
    print("Exemple DYNATRACE_BASE_URL: https://xyz12345.live.dynatrace.com")
    sys.exit(1)

if DYNATRACE_BASE_URL.endswith('/'):
    DYNATRACE_BASE_URL = DYNATRACE_BASE_URL[:-1]

# --- Fonctions ---

def get_management_zone_id_settings_v2(base_url, api_token, mz_name):
    """
    Trouve l'objectId d'une Management Zone à partir de son nom via l'API Settings v2.
    Cet objectId peut être utilisé comme ID de MZ dans d'autres appels API (ex: Problems API).
    Nécessite la permission 'settings.read'.
    """
    endpoint = f"{base_url}/api/v2/settings/objects"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    # Filtre DSQL (Dynatrace Settings Query Language) pour trouver par nom.
    # La bibliothèque requests s'occupe de l'encodage URL des paramètres.
    params = {
        "schemaIds": "builtin:management-zones",
        "scopes": "environment", # 'environment' est généralement correct pour SaaS.
                                 # Pour Managed, cela pourrait être l'ID de l'environnement.
        "filter": f'value.name="{mz_name}"',
        "fields": "objectId,value.name" # Récupérer objectId et le nom pour vérification
    }

    print(f"\nRecherche de l'ID (Settings API v2) pour la Management Zone : '{mz_name}'...")
    try:
        response = requests.get(endpoint, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()

        items = data.get("items", [])
        if not items:
            print(f"ERREUR: Management Zone '{mz_name}' non trouvée via Settings API v2.")
            print(f"Vérifiez le nom exact et les permissions du token ('settings.read').")
            return None
        
        if len(items) > 1:
            print(f"ATTENTION: Plusieurs ({len(items)}) Management Zones trouvées avec le nom '{mz_name}'.")
            print("Utilisation de la première trouvée. Assurez-vous que les noms de MZ sont uniques si ce n'est pas attendu.")
            for i, item in enumerate(items):
                print(f"  {i+1}. objectId: {item.get('objectId')}, Nom: {item.get('value', {}).get('name')}")


        mz_object = items[0] # Prendre le premier résultat
        mz_object_id = mz_object.get("objectId")
        
        if mz_object_id:
            actual_name = mz_object.get("value", {}).get("name", "N/A")
            print(f"Management Zone trouvée via Settings API: Nom='{actual_name}', objectId='{mz_object_id}'")
            return mz_object_id
        else:
            print(f"ERREUR: objectId non trouvé dans la réponse pour '{mz_name}'.")
            print(f"Réponse partielle de l'item: {json.dumps(mz_object, indent=2)}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de l'appel API (Settings v2) pour récupérer la Management Zone : {e}")
        if hasattr(e, 'response') and e.response is not None:
             print(f"Réponse API: {e.response.status_code} - {e.response.text}")
        return None
    except json.JSONDecodeError:
        print(f"Erreur lors du décodage de la réponse JSON de l'API Settings v2.")
        if 'response' in locals() and response is not None:
            print(f"Réponse reçue: {response.text}")
        return None


def get_problems_for_mz(base_url, api_token, mz_id_or_object_id):
    """
    Récupère tous les problèmes (ouverts et fermés) des dernières 72h
    pour un ID de Management Zone (ou objectId de Settings API) donné via l'API Problems v2.
    Nécessite la permission 'problems.read'.
    """
    all_problems = []
    endpoint = f"{base_url}/api/v2/problems"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    params = {
        "problemSelector": f'managementZoneIds("{mz_id_or_object_id}")', # Accepte objectId
        "from": "now-72h",
        "pageSize": 200,
    }

    print(f"\nRécupération des problèmes des dernières 72h pour la MZ ID/ObjectId: {mz_id_or_object_id}...")
    next_page_key = None

    while True:
        current_params = params.copy() # Copier pour ne pas modifier l'original dans la boucle
        if next_page_key:
            current_params["nextPageKey"] = next_page_key
        
        try:
            response = requests.get(endpoint, headers=headers, params=current_params)
            response.raise_for_status()
            data = response.json()

            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            print(f"  {len(problems_on_page)} problème(s) trouvé(s) sur cette page (total: {len(all_problems)})...")

            next_page_key = data.get('nextPageKey')
            total_count = data.get('totalCount', 0)

            if not next_page_key or len(all_problems) >= total_count:
                # print("Fin de la pagination ou tous les problèmes récupérés.")
                break

        except requests.exceptions.RequestException as e:
            print(f"Erreur lors de l'appel API pour récupérer les problèmes : {e}")
            if hasattr(e, 'response') and e.response is not None:
                 print(f"Réponse API: {e.response.status_code} - {e.response.text}")
            return None
        except json.JSONDecodeError:
            print(f"Erreur lors du décodage de la réponse JSON de l'API Problèmes.")
            if 'response' in locals() and response is not None:
                print(f"Réponse reçue: {response.text}")
            return None

    print(f"\nTotal de {len(all_problems)} problème(s) récupéré(s) pour la MZ ID/ObjectId {mz_id_or_object_id} sur les dernières 72h.")
    return all_problems

def format_timestamp(epoch_ms):
    if epoch_ms == -1 or epoch_ms is None:
        return "N/A (Ouvert ou non terminé)"
    try:
        # Certains timestamps peuvent être énormes et invalides
        dt_object = datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc)
        return dt_object.strftime('%Y-%m-%d %H:%M:%S %Z')
    except (OSError, TypeError, ValueError):
        return f"Timestamp invalide ({epoch_ms})"


# --- Exécution Principale ---
if __name__ == "__main__":
    management_zone_name = input("Entrez le nom exact de la Management Zone : ")

    if not management_zone_name:
        print("Le nom de la Management Zone ne peut pas être vide.")
        sys.exit(1)

    # Utilisation de la nouvelle fonction avec Settings API v2
    mz_objectid_found = get_management_zone_id_settings_v2(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, management_zone_name)

    if mz_objectid_found:
        problems_list = get_problems_for_mz(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, mz_objectid_found)

        if problems_list is not None:
            if not problems_list:
                print(f"\nAucun problème trouvé pour la Management Zone '{management_zone_name}' (ObjectId: {mz_objectid_found}) sur les dernières 72 heures.")
            else:
                print(f"\n--- Liste des Problèmes pour '{management_zone_name}' (ObjectId: {mz_objectid_found}) - Dernières 72h ---")
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
        print("Impossible de continuer sans l'ID (ObjectId) de la Management Zone.")