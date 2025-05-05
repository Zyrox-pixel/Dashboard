import pandas as pd
import requests
import os
import sys
import time
import urllib3 # Ajouté pour désactiver les avertissements SSL

# --- Désactivation des avertissements SSL ---
# Utilisé car verify=False est ajouté plus bas.
# ATTENTION : Cela désactive une vérification de sécurité. Utilisez avec prudence.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Configuration ---
# !! Sécurité : Récupérer le token depuis une variable d'environnement !!
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN")
# Remplacez VOTRE_URL par votre URL d'environnement Dynatrace (ex: https://abc12345.live.dynatrace.com)
DYNATRACE_BASE_URL = "VOTRE_URL/api/v2" # Assurez-vous que c'est la bonne URL de base API v2
# Nom du fichier Excel d'entrée et de sortie
EXCEL_FILE = "OS_DYNATRACE.xlsx"
OUTPUT_EXCEL_FILE = "OS_DYNATRACE_updated.xlsx" # Sauvegarde dans un nouveau fichier par sécurité
# Noms des colonnes dans le fichier Excel
HOSTNAME_COLUMN = "Hostname" # Colonne contenant le nom à comparer avec 'detectedName'
NEW_OS_COLUMN = "OS DYNATRACE" # Colonne à ajouter/mettre à jour

# --- Vérification de la configuration ---
if not DYNATRACE_API_TOKEN:
    print("Erreur : La variable d'environnement DYNATRACE_API_TOKEN n'est pas définie.")
    print("Veuillez la définir avant d'exécuter le script.")
    sys.exit(1) # Quitte le script si le token manque

if "VOTRE_URL" in DYNATRACE_BASE_URL:
     print(f"Erreur : Veuillez remplacer 'VOTRE_URL' dans la variable DYNATRACE_BASE_URL par votre URL Dynatrace (ex: https://abc12345.live.dynatrace.com)")
     sys.exit(1) # Quitte le script si l'URL n'est pas configurée

# --- Fonctions ---

def fetch_all_dynatrace_hosts(base_url, api_token):
    """
    Récupère tous les hosts depuis l'API Dynatrace v2 avec les propriétés nécessaires
    (detectedName, osType, osVersion) en demandant explicitement les 'properties'.
    Gère la pagination.
    """
    all_hosts_data = {}
    endpoint = f"{base_url}/entities"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    # Champs nécessaires identifiés via le débogage :
    # detectedName (pour le matching), osType, osVersion.
    # On demande 'properties' pour s'assurer d'obtenir ces clés.
    # Note: L'API semble exiger 'fields=properties' dans cet environnement pour renvoyer les détails.
    #       On ne peut pas lister 'properties.detectedName' etc. directement comme dans d'autres cas.
    #       On filtre donc après avoir reçu TOUTES les propriétés.
    fields_to_request = "properties"

    params = {
        "entitySelector": 'type("HOST")',
        "fields": fields_to_request, # Demande explicite des propriétés
        "pageSize": 400 # Taille de page raisonnable
    }
    next_page_key = None
    total_fetched = 0

    print("Début de la récupération des hosts depuis Dynatrace...")

    while True:
        if next_page_key:
            params["nextPageKey"] = next_page_key
        else:
            params.pop("nextPageKey", None)

        try:
            # Ajout de verify=False pour ignorer les erreurs de certificat SSL
            response = requests.get(endpoint, headers=headers, params=params, timeout=60, verify=False)
            response.raise_for_status()
            data = response.json()

            hosts_page = data.get("entities", [])
            count_page = len(hosts_page)
            total_fetched += count_page
            print(f"  Récupéré {count_page} hosts (total: {total_fetched} / {data.get('totalCount', 'N/A')})...")

            for host in hosts_page:
                properties = host.get("properties", {}) # Récupère le bloc properties
                entity_id = host.get("entityId", "N/A") # entityId est normalement inclus par défaut

                # Extraire les valeurs nécessaires des propriétés
                dynatrace_hostname = properties.get("detectedName") # Utilise detectedName pour le matching
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")

                # Utilise le detectedName comme clé s'il existe
                if dynatrace_hostname:
                    # Formatte la chaîne OS
                    os_string = f"{os_type} {os_version}".strip()
                    if os_string == "N/A N/A" or os_string == "N/A":
                        os_string = "OS Info Missing in Dynatrace"

                    # Gère les doublons de detectedName (log un avertissement)
                    if dynatrace_hostname in all_hosts_data:
                         print(f"  Avertissement: detectedName '{dynatrace_hostname}' est dupliqué. Host ID: {entity_id}. OS: {os_string}")

                    # Stocke l'info OS avec detectedName comme clé
                    all_hosts_data[dynatrace_hostname] = {
                        "os_string": os_string,
                        "entity_id": entity_id
                    }
                #else:
                #    print(f"  Info: Host {entity_id} n'a pas de propriété 'detectedName'. Ignoré pour le matching.")


            next_page_key = data.get("nextPageKey")
            if not next_page_key:
                print("Fin de la récupération des hosts Dynatrace.")
                break # Sortir de la boucle while

            # time.sleep(0.2) # Pause optionnelle

        except requests.exceptions.RequestException as e:
            print(f"\nErreur lors de l'appel API Dynatrace : {e}")
            # ... (gestion des erreurs comme avant) ...
            return None
        except Exception as e:
            print(f"\nErreur inattendue lors de la récupération des hosts : {e}")
            return None

    return all_hosts_data

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
        print(f"Erreur : La colonne '{HOSTNAME_COLUMN}' est introuvable dans le fichier Excel.")
        print(f"Colonnes disponibles : {list(df.columns)}")
        sys.exit(1)

    # Récupérer les données des hosts depuis Dynatrace
    dynatrace_hosts = fetch_all_dynatrace_hosts(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN)

    if dynatrace_hosts is None:
        print("Impossible de continuer sans les données Dynatrace.")
        sys.exit(1)

    if not dynatrace_hosts:
        print("Avertissement : Aucune donnée de host avec 'detectedName' n'a été récupérée depuis Dynatrace.")

    print(f"\nTraitement des {len(df)} lignes du fichier Excel...")
    results = []
    found_count = 0
    not_found_count = 0

    # Itérer sur chaque ligne du DataFrame Excel
    for index, row in df.iterrows():
        excel_hostname = row[HOSTNAME_COLUMN]

        if pd.isna(excel_hostname) or not excel_hostname:
            results.append("Hostname manquant dans Excel")
            not_found_count += 1
            continue

        excel_hostname_cleaned = str(excel_hostname).strip()

        # Rechercher l'hostname Excel dans les clés du dictionnaire dynatrace_hosts (qui sont les detectedName)
        # !! IMPORTANT : Suppose que excel_hostname_cleaned est identique à detectedName (ex: FQDN) !!
        host_info = dynatrace_hosts.get(excel_hostname_cleaned)

        if host_info:
            os_dynatrace = host_info["os_string"]
            results.append(os_dynatrace)
            found_count += 1
        else:
            results.append("Not Found in Dynatrace by detectedName") # Message mis à jour
            not_found_count += 1

        if (index + 1) % 100 == 0:
             print(f"  Traité {index + 1}/{len(df)} lignes...")

    print(f"  Traité {len(df)}/{len(df)} lignes.")

    print(f"\nAjout/Mise à jour de la colonne '{NEW_OS_COLUMN}' dans le DataFrame...")
    df[NEW_OS_COLUMN] = results

    print(f"\nRésumé du matching:")
    print(f"  - Serveurs trouvés dans Dynatrace (via detectedName): {found_count}")
    print(f"  - Serveurs non trouvés ou Hostname manquant: {not_found_count}")

    try:
        print(f"\nSauvegarde des résultats dans : {OUTPUT_EXCEL_FILE}")
        df.to_excel(OUTPUT_EXCEL_FILE, index=False)
        print("Opération terminée avec succès !")
    except Exception as e:
        print(f"\nErreur lors de la sauvegarde du fichier Excel '{OUTPUT_EXCEL_FILE}' : {e}")
        print("Les données mises à jour n'ont pas pu être sauvegardées.")

if __name__ == "__main__":
    main()