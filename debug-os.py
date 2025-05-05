import requests
import os
import sys
import time
import urllib3
import json # Ajouté pour pretty-print le JSON

# --- Désactivation des avertissements SSL ---
# Utilisé car verify=False est ajouté plus bas.
# ATTENTION : Cela désactive une vérification de sécurité. Utilisez avec prudence.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Configuration ---
# !! Sécurité : Récupérer le token depuis une variable d'environnement !!
DYNATRACE_API_TOKEN = os.getenv("DYNATRACE_API_TOKEN")
# Remplacez VOTRE_URL par votre URL d'environnement Dynatrace (ex: https://abc12345.live.dynatrace.com)
DYNATRACE_BASE_URL = "VOTRE_URL/api/v2" # Assurez-vous que c'est la bonne URL de base API v2

# --- Vérification de la configuration ---
if not DYNATRACE_API_TOKEN:
    print("Erreur : La variable d'environnement DYNATRACE_API_TOKEN n'est pas définie.")
    print("Veuillez la définir avant d'exécuter le script.")
    sys.exit(1) # Quitte le script si le token manque

if "VOTRE_URL" in DYNATRACE_BASE_URL:
     print(f"Erreur : Veuillez remplacer 'VOTRE_URL' dans la variable DYNATRACE_BASE_URL par votre URL Dynatrace (ex: https://abc12345.live.dynatrace.com)")
     sys.exit(1) # Quitte le script si l'URL n'est pas configurée

# --- Fonction de récupération (Mode Débogage) ---

def fetch_and_print_one_host_json(base_url, api_token):
    """
    MODE DÉBOGAGE : Récupère toutes les infos d'un seul host (ou de la première page)
    pour inspecter la structure JSON et trouver la bonne clé pour 'VMware name'.
    """
    endpoint = f"{base_url}/entities"
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Accept": "application/json; charset=utf-8"
    }

    params = {
        "entitySelector": 'type("HOST")', # Gardez ceci ou filtrez sur un ID connu si possible
        # Pas de paramètre "fields" pour récupérer la structure complète par défaut
        "pageSize": 1 # Modifié pour ne récupérer qu'un seul hôte pour l'analyse
    }

    print("Début de la récupération depuis Dynatrace (Mode Débogage - 1 host)...")

    try:
        # Utilisation de verify=False pour ignorer les erreurs SSL (proxy interne)
        response = requests.get(endpoint, headers=headers, params=params, timeout=60, verify=False)
        response.raise_for_status() # Lève une exception pour les codes d'erreur HTTP (4xx, 5xx)
        data = response.json()

        hosts_page = data.get("entities", [])
        count_page = len(hosts_page)

        if count_page > 0:
            print(f"\n--- Début de la structure JSON du premier Host trouvé ---")
            # Afficher le JSON du premier host de manière lisible
            first_host_json = hosts_page[0]
            print(json.dumps(first_host_json, indent=2)) # pretty-print JSON
            print(f"--- Fin de la structure JSON ---\n")

            # Aide à la recherche de la clé
            print("--> Instructions :")
            print("    1. Examinez attentivement le JSON ci-dessus.")
            print("    2. Repérez la valeur qui correspond au nom VMware que vous attendez (ex: 's01vl9946175').")
            print("    3. Notez la clé EXACTE associée à cette valeur (ex: 'VMware name', 'vmwareName', 'detectedName', etc.).")
            print("    4. Notez également si cette clé se trouve directement sous 'properties' ou ailleurs.")

        else:
            print("  Aucun host n'a été récupéré avec les paramètres actuels.")
            print("  Vérifiez le entitySelector ou les permissions du token API.")

    except requests.exceptions.RequestException as e:
        print(f"\nErreur lors de l'appel API Dynatrace : {e}")
        print(f"URL: {e.request.url if e.request else 'N/A'}")
        if e.response is not None:
            print(f"Statut: {e.response.status_code}")
            try:
                error_details = e.response.json()
                print(f"Réponse JSON: {error_details}")
            except ValueError:
                print(f"Réponse texte: {e.response.text}")
        sys.exit(1) # Quitte en cas d'erreur API

    except Exception as e:
        print(f"\nErreur inattendue : {e}")
        sys.exit(1) # Quitte en cas d'erreur inattendue

# --- Exécution principale ---
if __name__ == "__main__":
    print("**************************************************************")
    print("* Script de débogage pour identifier la clé 'VMware name'    *")
    print("* Ce script NE MODIFIE PAS le fichier Excel.                 *")
    print("**************************************************************")
    fetch_and_print_one_host_json(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN)
    print("\nFin du script de débogage.")