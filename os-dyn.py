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
# !!! REMPLACEZ VOTRE_URL CI-DESSOUS !!!
DYNATRACE_BASE_URL = "VOTRE_URL/api/v2"
EXCEL_FILE = "OS_DYNATRACE.xlsx"
OUTPUT_EXCEL_FILE = "OS_DYNATRACE_updated_v3.xlsx" # Encore un nouveau nom de sortie
HOSTNAME_COLUMN = "Hostname" # Colonne Excel avec le nom court
NEW_OS_COLUMN = "OS DYNATRACE"

# !!! VÉRIFIEZ ET COMPLÉTEZ CETTE LISTE SI NÉCESSAIRE !!!
# Ordre : Les suffixes les plus probables en premier pour optimiser un peu.
# "" (chaîne vide) à la fin pour tester le nom court seul.
KNOWN_SUFFIXES = [
    ".fr.net.intra",
    ".apps.tech.net.intra",
    ".fra.net.intra",
    ".warp.net.intra",
    ".oned.net.intra",
    "" # Pour tester le nom court sans suffixe en dernier
]

# Délai en secondes entre le traitement de chaque ligne Excel pour éviter le rate limiting
# Augmentez si vous obtenez des erreurs API (ex: 429 Too Many Requests)
# Diminuez prudemment si c'est trop lent ET que l'API le supporte.
API_CALL_DELAY_PER_ROW = 0.75 # secondes

# --- Vérification de la configuration ---
if not DYNATRACE_API_TOKEN:
    print("Erreur : La variable d'environnement DYNATRACE_API_TOKEN n'est pas définie.")
    sys.exit(1)
if "VOTRE_URL" in DYNATRACE_BASE_URL:
     print(f"Erreur : Veuillez remplacer 'VOTRE_URL' dans la variable DYNATRACE_BASE_URL par votre URL Dynatrace.")
     sys.exit(1)

# --- Fonctions ---

def find_host_and_get_os(short_hostname, suffixes_to_try, base_url, api_token):
    """
    Cherche un host en essayant d'ajouter des suffixes au nom court.
    Retourne l'info OS si trouvé, ou un statut sinon.
    """
    endpoint = f"{base_url}/entities"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    # Champs OS nécessaires. On n'a plus besoin de detectedName ici.
    fields = "properties.osType,properties.osVersion"

    # Nettoyage simple du nom d'hôte pour l'URL
    safe_hostname = short_hostname.replace('"', "'")

    for suffix in suffixes_to_try:
        potential_fqdn = safe_hostname + suffix
        # print(f"    Essai avec FQDN: {potential_fqdn}") # Décommenter pour voir les essais

        entity_selector = f'type("HOST"),entityName("{potential_fqdn}")'
        params = {
            "entitySelector": entity_selector,
            "fields": fields
        }

        try:
            # Petit délai optionnel *entre* les essais de suffixes pour un même host
            # time.sleep(0.1)

            response = requests.get(endpoint, headers=headers, params=params, timeout=60, verify=False)
            response.raise_for_status() # Lève une exception pour les erreurs HTTP (4xx, 5xx)
            data = response.json()
            entities = data.get("entities", [])

            if len(entities) == 1:
                # Trouvé !
                entity = entities[0]
                properties = entity.get("properties", {})
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")
                os_string = f"{os_type} {os_version}".strip()
                # print(f" -> Trouvé!") # Décommenter pour voir quand ça matche
                return os_string if os_string not in ["N/A N/A", "N/A"] else "OS Info Missing"
            elif len(entities) > 1:
                # Ne devrait pas arriver avec un entityName exact, mais sécurité
                print(f"  Avertissement: Plusieurs ({len(entities)}) hosts trouvés pour FQDN exact '{potential_fqdn}'. Utilisation du premier.")
                entity = entities[0]
                properties = entity.get("properties", {})
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")
                os_string = f"{os_type} {os_version}".strip()
                return os_string if os_string not in ["N/A N/A", "N/A"] else "OS Info Missing"
            # Si len(entities) == 0, on continue et essaie le suffixe suivant

        except requests.exceptions.RequestException as e:
            # Gérer les erreurs API spécifiques à cet essai, mais continuer à essayer les autres suffixes
            print(f"\n    Erreur API pour FQDN '{potential_fqdn}' : {e.response.status_code if e.response is not None else e}")
            # Si l'erreur est une erreur client (4xx) autre que 404, cela peut indiquer un problème avec le nom/suffixe
            if e.response is not None and 400 <= e.response.status_code < 500 and e.response.status_code != 404:
                 # On pourrait arrêter d'essayer les suffixes pour ce nom court si l'erreur est bloquante
                 # return f"Error API {e.response.status_code} on {potential_fqdn}"
                 pass # Pour l'instant, on continue les autres suffixes
            # Si c'est une erreur serveur (5xx) ou réseau, on pourrait arrêter
            elif e.response is None or e.response.status_code >= 500:
                 return f"Error: Network/API Server ({type(e).__name__})"


        except Exception as e:
            print(f"\n    Erreur inattendue pour FQDN '{potential_fqdn}' : {e}")
            # Continuer à essayer les autres suffixes
            pass

    # Si la boucle se termine sans avoir trouvé de correspondance
    return "Not Found (all suffixes tried)"

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

    print(f"Traitement de {len(df)} lignes du fichier Excel (mode serveur par serveur - essai suffixes)...")
    print(f"Suffixes qui seront testés (dans l'ordre): {KNOWN_SUFFIXES}")
    print(f"Pause entre chaque ligne Excel: {API_CALL_DELAY_PER_ROW} secondes")

    results = []

    # Estimer le temps total (très approximatif)
    estimated_calls_max = len(df) * len(KNOWN_SUFFIXES)
    estimated_seconds_max = len(df) * API_CALL_DELAY_PER_ROW + estimated_calls_max * 0.1 # Ajoute une petite estimation par appel
    print(f"Estimation: ~{len(df)} lignes, jusqu'à {estimated_calls_max} appels API possibles.")
    print(f"             Temps estimé max: {time.strftime('%H:%M:%S', time.gmtime(estimated_seconds_max))} (HH:MM:SS)")
    print("-" * 30)

    start_total_time = time.time()

    for index, row in df.iterrows():
        start_row_time = time.time()
        short_hostname_excel = row[HOSTNAME_COLUMN]

        if pd.isna(short_hostname_excel) or not short_hostname_excel:
            results.append("Hostname manquant dans Excel")
            print(f" Ligne {index + 1}/{len(df)}: Ignoré (Hostname vide)")
            continue

        short_hostname_cleaned = str(short_hostname_excel).strip()
        print(f" Ligne {index + 1}/{len(df)}: Recherche de '{short_hostname_cleaned}'...", end='', flush=True)

        # Appel de la fonction pour trouver l'hôte et récupérer l'info OS
        os_info = find_host_and_get_os(short_hostname_cleaned, KNOWN_SUFFIXES, DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN)
        results.append(os_info)
        print(f" Résultat: {os_info}")

        # Pause principale entre le traitement de chaque LIGNE Excel
        elapsed_row_time = time.time() - start_row_time
        sleep_time = max(0, API_CALL_DELAY_PER_ROW - elapsed_row_time)
        if sleep_time > 0:
            time.sleep(sleep_time)

    end_total_time = time.time()
    print("-" * 30)
    print(f"Temps total d'exécution : {time.strftime('%H:%M:%S', time.gmtime(end_total_time - start_total_time))}")

    print("\nAjout de la colonne OS...")
    df[NEW_OS_COLUMN] = results

    # Calcul simple des stats
    total_processed = len(results)
    success_count = sum(1 for r in results if not isinstance(r, str) or ("Error" not in r and "Found" not in r and "Missing" not in r and "manquant" not in r))
    not_found_count = sum(1 for r in results if isinstance(r, str) and "Not Found" in r)
    error_count = sum(1 for r in results if isinstance(r, str) and "Error" in r)
    os_missing_count = sum(1 for r in results if isinstance(r, str) and "OS Info Missing" in r)
    other_issues = total_processed - success_count - not_found_count - error_count - os_missing_count

    print(f"\nRésumé du traitement ({total_processed} lignes):")
    print(f"  - Succès (OS trouvé): {success_count}")
    print(f"  - OS non trouvé (host trouvé): {os_missing_count}")
    print(f"  - Hôte non trouvé (tous suffixes): {not_found_count}")
    print(f"  - Erreurs (API, etc.): {error_count}")
    print(f"  - Autres (Vide): {other_issues}")


    try:
        print(f"\nSauvegarde des résultats dans : {OUTPUT_EXCEL_FILE}")
        df.to_excel(OUTPUT_EXCEL_FILE, index=False)
        print("Opération terminée !")
    except Exception as e:
        print(f"\nErreur lors de la sauvegarde du fichier Excel : {e}")

if __name__ == "__main__":
    main()