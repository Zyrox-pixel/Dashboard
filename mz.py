import requests
import os
import json
import argparse
import sys

# --- Configuration ---
# Il est recommandé de ne PAS coder en dur le token ici.
# Utilisez les arguments ou une variable d'environnement.
# DT_API_TOKEN = "VOTRE_TOKEN_ICI" # Déconseillé
# DT_BASE_URL = "VOTRE_URL_DYNATRACE_ICI" # Déconseillé

def get_entity_count(base_url, api_token, mz_id, entity_type):
    """
    Interroge l'API Dynatrace pour obtenir le nombre d'entités d'un type donné
    dans une Management Zone spécifique.

    Args:
        base_url (str): L'URL de base de l'environnement Dynatrace.
        api_token (str): Le token d'API Dynatrace.
        mz_id (str): L'ID de la Management Zone.
        entity_type (str): Le type d'entité à compter ('HOST', 'SERVICE', 'APPLICATION').

    Returns:
        int | None: Le nombre d'entités, ou None en cas d'erreur.
    """
    api_url = f"{base_url.rstrip('/')}/api/v2/entities"
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json'
        }
    # Utilise mzId pour filtrer par ID de Management Zone (plus fiable)
    # pageSize=1 est une optimisation car nous n'avons besoin que du totalCount
    params = {
        'entitySelector': f'type({entity_type}),mzId({mz_id})',
        'pageSize': 1,
        'fields': 'entityId' # Demander un champ minimal peut parfois aider
    }

    try:
        response = requests.get(api_url, headers=headers, params=params)
        # Lève une exception pour les codes d'erreur HTTP (4xx ou 5xx)
        response.raise_for_status()
        data = response.json()
        # Le nombre total est dans la clé 'totalCount'
        return data.get('totalCount', 0)

    except requests.exceptions.RequestException as e:
        print(f"ERREUR API pour MZ '{mz_id}' ({entity_type}): {e}", file=sys.stderr)
        # Essayer d'afficher plus de détails de l'erreur API si disponibles
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_details = e.response.json()
                print(f"  Détails API: {json.dumps(error_details, indent=2)}", file=sys.stderr)
            except json.JSONDecodeError:
                print(f"  Réponse API (non-JSON): {e.response.text}", file=sys.stderr)
        return None # Indique un échec
    except json.JSONDecodeError:
        print(f"ERREUR: Impossible de décoder la réponse JSON pour MZ '{mz_id}' ({entity_type}).", file=sys.stderr)
        print(f"  Réponse reçue: {response.text}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"ERREUR Inattendue pour MZ '{mz_id}' ({entity_type}): {e}", file=sys.stderr)
        return None


# --- Exécution Principale ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Récupère les nombres d'hôtes, services et applications pour des Management Zones Dynatrace spécifiques.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--url', required=True, help="URL de votre environnement Dynatrace (ex: https://abc12345.live.dynatrace.com)")
    parser.add_argument('--token', required=False, help="Votre token d'API Dynatrace (ou définissez la variable d'environnement DT_API_TOKEN)")
    parser.add_argument('--mzs', required=True, nargs='+', help="Liste des IDs des Management Zones (séparés par des espaces)")

    args = parser.parse_args()

    # Récupérer le token depuis l'argument ou la variable d'environnement
    api_token = args.token or os.getenv('DT_API_TOKEN')
    if not api_token:
        print("ERREUR: Token d'API Dynatrace non fourni. Utilisez --token ou définissez la variable d'environnement DT_API_TOKEN.", file=sys.stderr)
        sys.exit(1)

    base_url = args.url
    management_zone_ids = args.mzs

    print(f"--- Interrogation de l'environnement Dynatrace: {base_url} ---")
    print(f"--- Pour les Management Zones (IDs): {', '.join(management_zone_ids)} ---\n")

    results = {}
    all_successful = True

    for mz_id in management_zone_ids:
        print(f"Traitement de la Management Zone ID: {mz_id}...")
        host_count = get_entity_count(base_url, api_token, mz_id, 'HOST')
        service_count = get_entity_count(base_url, api_token, mz_id, 'SERVICE')
        app_count = get_entity_count(base_url, api_token, mz_id, 'APPLICATION') # Inclut Web, Mobile, Custom

        if host_count is None or service_count is None or app_count is None:
            print(f"  -> Échec de la récupération complète des données pour MZ ID: {mz_id}\n")
            results[mz_id] = {'HOST': 'ERREUR', 'SERVICE': 'ERREUR', 'APPLICATION': 'ERREUR'}
            all_successful = False
        else:
            print(f"  -> Hôtes: {host_count}, Services: {service_count}, Applications: {app_count}\n")
            results[mz_id] = {'HOST': host_count, 'SERVICE': service_count, 'APPLICATION': app_count}

    print("\n--- Résultats Finaux ---")
    for mz_id, counts in results.items():
        print(f"MZ ID '{mz_id}': Hôtes={counts['HOST']}, Services={counts['SERVICE']}, Applications={counts['APPLICATION']}")

    if not all_successful:
        print("\nAttention: Certaines données n'ont pas pu être récupérées en raison d'erreurs.", file=sys.stderr)
        sys.exit(1) # Termine avec un code d'erreur si nécessaire