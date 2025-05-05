import pandas as pd
import requests
import os
import sys
import time

# --- Configuration ---
# !! Sécurité : Récupérer le token depuis une variable d'environnement !!
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN")
# Remplacez VOTRE_URL par votre URL d'environnement Dynatrace (ex: https://abc12345.live.dynatrace.com)
DYNATRACE_BASE_URL = "VOTRE_URL/api/v2"
# Nom du fichier Excel d'entrée et de sortie
EXCEL_FILE = "OS_DYNATRACE.xlsx"
OUTPUT_EXCEL_FILE = "OS_DYNATRACE_updated.xlsx" # Sauvegarde dans un nouveau fichier par sécurité
# Noms des colonnes dans le fichier Excel
HOSTNAME_COLUMN = "Hostname" # Colonne contenant le nom à comparer avec 'VMware name'
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
    Récupère tous les hosts depuis l'API Dynatrace v2 avec les propriétés nécessaires.
    Gère la pagination.
    """
    all_hosts_data = {}
    endpoint = f"{base_url}/entities"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }
    # Champs nécessaires : nom VMware, type d'OS, version d'OS
    fields = "properties.vmwareName,properties.osType,properties.osVersion,entityId,displayName"
    params = {
        "entitySelector": 'type("HOST")',
        "fields": f"+{fields}",
        "pageSize": 400 # Augmenter pour réduire le nombre d'appels (max 1000 normalement)
    }
    next_page_key = None
    total_fetched = 0

    print("Début de la récupération des hosts depuis Dynatrace...")

    while True:
        if next_page_key:
            params["nextPageKey"] = next_page_key
        else:
            # Supprime la clé si elle existe d'une itération précédente
            params.pop("nextPageKey", None)

        try:
            response = requests.get(endpoint, headers=headers, params=params, timeout=60) # Timeout de 60s
            response.raise_for_status() # Lève une exception pour les codes d'erreur HTTP (4xx, 5xx)
            data = response.json()

            hosts_page = data.get("entities", [])
            count_page = len(hosts_page)
            total_fetched += count_page
            print(f"  Récupéré {count_page} hosts (total: {total_fetched} / {data.get('totalCount', 'N/A')})...")

            for host in hosts_page:
                properties = host.get("properties", {})
                vmware_name = properties.get("vmwareName")
                os_type = properties.get("osType", "N/A")
                os_version = properties.get("osVersion", "N/A")
                entity_id = host.get("entityId", "N/A")
                display_name = host.get("displayName", "N/A")

                # Utilise le vmwareName comme clé s'il existe, sinon ignore (ou log l'info)
                if vmware_name:
                    # Formatte la chaîne OS
                    os_string = f"{os_type} {os_version}".strip()
                    if os_string == "N/A N/A":
                        os_string = "OS Info Missing in Dynatrace"

                    # Gère les doublons de vmwareName (prend le dernier vu, ou log un avertissement)
                    if vmware_name in all_hosts_data:
                         print(f"  Avertissement: VMware name '{vmware_name}' est dupliqué. Ancienne valeur: {all_hosts_data[vmware_name]['os_string']}, Nouvelle valeur (pour host {entity_id}/{display_name}): {os_string}")
                    
                    all_hosts_data[vmware_name] = {
                        "os_string": os_string,
                        "entity_id": entity_id,
                        "display_name": display_name
                    }
                #else:
                #    print(f"  Info: Host {entity_id} ('{display_name}') n'a pas de propriété 'vmwareName'. Ignoré pour le matching.")


            next_page_key = data.get("nextPageKey")
            if not next_page_key:
                print("Fin de la récupération des hosts Dynatrace.")
                break # Sortir de la boucle while si plus de pages

            # Petite pause pour éviter de surcharger l'API (optionnel mais recommandé)
            # time.sleep(0.5)

        except requests.exceptions.RequestException as e:
            print(f"\nErreur lors de l'appel API Dynatrace : {e}")
            print(f"URL: {e.request.url if e.request else 'N/A'}")
            if e.response is not None:
                print(f"Statut: {e.response.status_code}")
                print(f"Réponse: {e.response.text}")
            return None # Retourne None en cas d'erreur API

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

    # Vérifier si la colonne Hostname existe
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
        print("Avertissement : Aucune donnée de host avec 'vmwareName' n'a été récupérée depuis Dynatrace.")
        # On continue quand même pour créer la colonne, mais elle sera vide ou remplie de "Not Found".

    print(f"\nTraitement des {len(df)} lignes du fichier Excel...")
    results = []
    found_count = 0
    not_found_count = 0

    # Itérer sur chaque ligne du DataFrame Excel
    for index, row in df.iterrows():
        # Récupérer le nom d'hôte depuis la colonne spécifiée
        excel_hostname = row[HOSTNAME_COLUMN]

        # Gérer les cas où le nom d'hôte est vide ou NaN dans l'Excel
        if pd.isna(excel_hostname) or not excel_hostname:
            results.append("Hostname manquant dans Excel")
            not_found_count += 1
            continue # Passer à la ligne suivante

        # Nettoyer le nom d'hôte (par ex. enlever les espaces superflus)
        excel_hostname_cleaned = str(excel_hostname).strip()

        # Rechercher le nom d'hôte nettoyé dans les données Dynatrace (clé = vmwareName)
        host_info = dynatrace_hosts.get(excel_hostname_cleaned)

        if host_info:
            # Si trouvé, récupérer la chaîne OS formatée
            os_dynatrace = host_info["os_string"]
            results.append(os_dynatrace)
            found_count += 1
            # print(f"  Trouvé: '{excel_hostname_cleaned}' -> '{os_dynatrace}' (Dynatrace Host: {host_info['display_name']}/{host_info['entity_id']})")
        else:
            # Si non trouvé, mettre une valeur par défaut
            results.append("Not Found in Dynatrace by VMware Name")
            not_found_count += 1
            # print(f"  Non trouvé: '{excel_hostname_cleaned}'")

        # Afficher la progression (optionnel)
        if (index + 1) % 50 == 0:
             print(f"  Traité {index + 1}/{len(df)} lignes...")


    # Ajouter la nouvelle colonne (ou la mettre à jour si elle existe déjà)
    print(f"\nAjout/Mise à jour de la colonne '{NEW_OS_COLUMN}' dans le DataFrame...")
    df[NEW_OS_COLUMN] = results

    print(f"\nRésumé du matching:")
    print(f"  - Serveurs trouvés dans Dynatrace (via VMware Name): {found_count}")
    print(f"  - Serveurs non trouvés ou Hostname manquant: {not_found_count}")

    # Sauvegarder le DataFrame modifié dans un NOUVEAU fichier Excel
    try:
        print(f"\nSauvegarde des résultats dans : {OUTPUT_EXCEL_FILE}")
        df.to_excel(OUTPUT_EXCEL_FILE, index=False) # index=False pour ne pas écrire l'index pandas dans le fichier
        print("Opération terminée avec succès !")
    except Exception as e:
        print(f"\nErreur lors de la sauvegarde du fichier Excel '{OUTPUT_EXCEL_FILE}' : {e}")
        print("Les données mises à jour n'ont pas pu être sauvegardées.")

if __name__ == "__main__":
    main()