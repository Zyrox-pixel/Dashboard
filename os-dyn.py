import pandas as pd
import requests
import os
import sys
import time
import urllib3
import json # Utilisé seulement si on veut débugger/afficher le JSON

# --- Désactivation des avertissements SSL ---
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Configuration ---
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN")
DYNATRACE_BASE_URL = "VOTRE_URL/api/v2" # À remplir
EXCEL_FILE = "OS_DYNATRACE.xlsx"
OUTPUT_EXCEL_FILE = "OS_DYNATRACE_updated_v2.xlsx" # Nouveau nom de sortie pour éviter d'écraser
HOSTNAME_COLUMN = "Hostname" # Colonne Excel avec le nom court
NEW_OS_COLUMN = "OS DYNATRACE"

# --- Vérification de la configuration ---
if not DYNATRACE_API_TOKEN:
    print("Erreur : La variable d'environnement DYNATRACE_API_TOKEN n'est pas définie.")
    sys.exit(1)
if "VOTRE_URL" in DYNATRACE_BASE_URL:
     print(f"Erreur : Veuillez remplacer 'VOTRE_URL' dans la variable DYNATRACE_BASE_URL par votre URL Dynatrace.")
     sys.exit(1)

# --- Fonctions ---

def get_host_os_info_startswith(short_hostname, base_url, api_token):
    """
    Tente de récupérer l'info OS pour un host en utilisant un filtre startsWith (expérimental).
    Gère les cas 0, 1 ou plusieurs hosts trouvés par le filtre.
    """
    endpoint = f"{base_url}/entities"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    # Champs nécessaires : detectedName (pour vérifier le match), osType, osVersion
    fields = "properties.detectedName,properties.osType,properties.osVersion"

    # *** ATTENTION : Syntaxe 'entityName.startsWith' expérimentale ! ***
    # Assurez-vous que le nom d'hôte ne contient pas de guillemets qui casseraient la chaîne
    safe_hostname = short_hostname.replace('"', "'") # Simple précaution
    entity_selector = f'type("HOST"),entityName.startsWith("{safe_hostname}")'

    params = {
        "entitySelector": entity_selector,
        "fields": fields
        # pageSize n'est pas utile ici, on s'attend à peu de résultats par nom court
    }

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=60, verify=False)

        # Gérer spécifiquement l'erreur 400 qui pourrait indiquer que 'startsWith' n'est pas supporté
        if response.status_code == 400:
             try:
                 error_data = response.json()
                 if "constraintViolations" in error_data.get("error", {}):
                     for violation in error_data["error"]["constraintViolations"]:
                         if "entitySelector" in violation.get("path", "") and "startsWith" in violation.get("message", ""):
                             return "Error: Filtre 'startsWith' non supporté par l'API ?"
             except ValueError: # Pas de JSON dans la réponse d'erreur
                 pass # On renverra l'erreur générale ci-dessous
             # Relancer l'exception pour l'erreur 400 générique si ce n'est pas lié à startsWith
             response.raise_for_status()

        response.raise_for_status() # Gère les autres erreurs HTTP (4xx, 5xx sauf 400 déjà traité)
        data = response.json()
        entities = data.get("entities", [])
        num_found = len(entities)

        if num_found == 0:
            return "Not Found (startsWith)"

        elif num_found == 1:
            entity = entities[0]
            properties = entity.get("properties", {})
            detected_name = properties.get("detectedName")
            # Vérification stricte : le detectedName doit commencer par short_hostname suivi d'un . ou être égal
            if detected_name and (detected_name == short_hostname or detected_name.startswith(short_hostname + '.')):
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")
                os_string = f"{os_type} {os_version}".strip()
                return os_string if os_string not in ["N/A N/A", "N/A"] else "OS Info Missing"
            else:
                # Trouvé 1 mais le nom ne correspond pas exactement au début
                return f"Mismatch (startsWith found {detected_name})"

        else: # num_found > 1
            verified_entity = None
            match_count = 0
            possible_matches = []
            for entity in entities:
                properties = entity.get("properties", {})
                detected_name = properties.get("detectedName")
                possible_matches.append(detected_name or "N/A")
                # Vérification stricte
                if detected_name and (detected_name == short_hostname or detected_name.startswith(short_hostname + '.')):
                    match_count += 1
                    verified_entity = entity # Garde le dernier trouvé en cas de doublon exact (rare)

            if match_count == 1:
                # Un seul correspondait exactement au début du nom
                properties = verified_entity.get("properties", {})
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")
                os_string = f"{os_type} {os_version}".strip()
                return os_string if os_string not in ["N/A N/A", "N/A"] else "OS Info Missing"
            elif match_count > 1:
                return f"Ambiguous (startsWith - {match_count} exact prefix matches)"
            else: # match_count == 0
                return f"Ambiguous (startsWith - found {num_found}, none matching prefix: {', '.join(possible_matches[:3])}..)"

    except requests.exceptions.RequestException as e:
        print(f"\nErreur API pour hostname '{short_hostname}' : {e}")
        # Si c'est une erreur 400 non interceptée plus haut
        if e.response is not None and e.response.status_code == 400:
             try:
                 error_data = e.response.json()
                 return f"Error 400: {error_data.get('error', {}).get('message', e.response.text)}"
             except ValueError:
                 return f"Error 400: {e.response.text}"
        return f"Error: Network/API ({type(e).__name__})"

    except Exception as e:
        print(f"\nErreur inattendue pour hostname '{short_hostname}' : {e}")
        return f"Error: Unexpected ({type(e).__name__})"

# --- Script principal ---
def main():
    print(f"Lecture du fichier Excel : {EXCEL_FILE}")
    try:
        df = pd.read_excel(EXCEL_FILE)
    except FileNotFoundError:
        print(f"Erreur : Le fichier '{EXCEL_FILE}' n'a pas été trouvé.")
        sys.exit(1)
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier Excel : {e}")
        sys.exit(1)

    if HOSTNAME_COLUMN not in df.columns:
        print(f"Erreur : La colonne '{HOSTNAME_COLUMN}' (nom court) est introuvable.")
        sys.exit(1)

    print(f"Traitement de {len(df)} lignes du fichier Excel (mode serveur par serveur - startsWith)...")
    results = []
    # Créer un Rate Limiter simple (ex: 1 seconde entre chaque appel)
    # Utile pour éviter de surcharger l'API avec N appels rapides
    api_call_delay = 0.5 # secondes entre les appels (ajustez si nécessaire)

    for index, row in df.iterrows():
        start_time = time.time()
        short_hostname_excel = row[HOSTNAME_COLUMN]

        if pd.isna(short_hostname_excel) or not short_hostname_excel:
            results.append("Hostname manquant dans Excel")
            print(f" Ligne {index + 1}/{len(df)}: Ignoré (Hostname vide)")
            continue

        short_hostname_cleaned = str(short_hostname_excel).strip()
        print(f" Ligne {index + 1}/{len(df)}: Recherche de '{short_hostname_cleaned}'...", end='')

        # Appel de la fonction pour récupérer l'info OS
        os_info = get_host_os_info_startswith(short_hostname_cleaned, DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN)
        results.append(os_info)
        print(f" Résultat: {os_info}")

        # Pause pour éviter le rate limiting
        elapsed_time = time.time() - start_time
        sleep_time = max(0, api_call_delay - elapsed_time)
        if sleep_time > 0:
            time.sleep(sleep_time)


    print("\nAjout de la colonne OS...")
    df[NEW_OS_COLUMN] = results

    # Calcul simple des stats
    total_processed = len(results)
    success_count = sum(1 for r in results if not isinstance(r, str) or ("Error" not in r and "Found" not in r and "Mismatch" not in r and "Ambiguous" not in r and "manquant" not in r))
    not_found_count = sum(1 for r in results if isinstance(r, str) and "Not Found" in r)
    error_count = sum(1 for r in results if isinstance(r, str) and "Error" in r)
    other_issues = total_processed - success_count - not_found_count - error_count

    print(f"\nRésumé du traitement ({total_processed} lignes):")
    print(f"  - Succès (OS trouvé): {success_count}")
    print(f"  - Non trouvés (startsWith): {not_found_count}")
    print(f"  - Erreurs (API, etc.): {error_count}")
    print(f"  - Autres (Ambigu, Mismatch, Vide): {other_issues}")

    try:
        print(f"\nSauvegarde des résultats dans : {OUTPUT_EXCEL_FILE}")
        df.to_excel(OUTPUT_EXCEL_FILE, index=False)
        print("Opération terminée !")
    except Exception as e:
        print(f"\nErreur lors de la sauvegarde du fichier Excel : {e}")

if __name__ == "__main__":
    main()