import requests
import os
import json
import argparse
import sys
import shlex # Pour gérer les guillemets dans les arguments en ligne de commande

# --- Configuration ---
# (Comme avant, éviter de coder en dur ici)

def get_entity_count(base_url, api_token, mz_name, entity_type):
    """
    Interroge l'API Dynatrace pour obtenir le nombre d'entités d'un type donné
    dans une Management Zone spécifique par son NOM.

    Args:
        base_url (str): L'URL de base de l'environnement Dynatrace.
        api_token (str): Le token d'API Dynatrace.
        mz_name (str): Le NOM de la Management Zone.
        entity_type (str): Le type d'entité à compter ('HOST', 'SERVICE', 'APPLICATION').

    Returns:
        int | None: Le nombre d'entités, ou None en cas d'erreur.
    """
    api_url = f"{base_url.rstrip('/')}/api/v2/entities"
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json'
    }

    # --- MODIFICATION PRINCIPALE ICI ---
    # Utilise managementZones("NOM_DE_LA_ZONE") pour filtrer par nom.
    # Les guillemets doubles autour de mz_name via f-string gèrent les espaces etc.
    # Attention si le nom lui-même contient des guillemets doubles.
    params = {
        'entitySelector': f'type({entity_type}),managementZones("{mz_name}")',
        'pageSize': 1,
        'fields': 'entityId' # Demander un champ minimal
    }
    # Pour déboguer le sélecteur si besoin :
    # print(f"DEBUG: Entity Selector: {params['entitySelector']}")

    try:
        response = requests.get(api_url, headers=headers, params=params)
        response.raise_for_status() # Lève une exception pour les erreurs HTTP
        data = response.json()
        return data.get('totalCount', 0)

    except requests.exceptions.RequestException as e:
        # Modifier les messages d'erreur pour indiquer qu'on utilise le nom
        print(f"ERREUR API pour MZ (nom) '{mz_name}' ({entity_type}): {e}", file=sys.stderr)
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_details = e.response.json()
                print(f"  Détails API: {json.dumps(error_details, indent=2)}", file=sys.stderr)
            except json.JSONDecodeError:
                print(f"  Réponse API (non-JSON): {e.response.text}", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print(f"ERREUR: Impossible de décoder la réponse JSON pour MZ (nom) '{mz_name}' ({entity_type}).", file=sys.stderr)
        print(f"  Réponse reçue: {response.text}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"ERREUR Inattendue pour MZ (nom) '{mz_name}' ({entity_type}): {e}", file=sys.stderr)
        return None


# --- Exécution Principale ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Récupère les nombres d'hôtes, services et applications pour des Management Zones Dynatrace spécifiques par leur NOM.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument('--url', required=True, help="URL de votre environnement Dynatrace (ex: https://abc12345.live.dynatrace.com)")
    parser.add_argument('--token', required=False, help="Votre token d'API Dynatrace (ou définissez la variable d'environnement DT_API_TOKEN)")
    # Modifier l'aide pour indiquer qu'on attend des NOMS
    parser.add_argument('--mzs', required=True, nargs='+',
                        help="Liste des NOMS des Management Zones (séparés par des espaces). "
                             "Mettez les noms contenant des espaces entre guillemets lors de l'appel: --mzs \"MZ Nom 1\" \"MZ Nom 2\" AutreMZ")

    args = parser.parse_args()

    api_token = args.token or os.getenv('DT_API_TOKEN')
    if not api_token:
        print("ERREUR: Token d'API Dynatrace non fourni. Utilisez --token ou définissez la variable d'environnement DT_API_TOKEN.", file=sys.stderr)
        sys.exit(1)

    base_url = args.url
    # Renommer la variable pour plus de clarté
    management_zone_names = args.mzs

    # Adapter les messages
    print(f"--- Interrogation de l'environnement Dynatrace: {base_url} ---")
    print(f"--- Pour les Management Zones (Noms): {', '.join(management_zone_names)} ---")
    # Ajouter un avertissement important
    print("\nATTENTION: Si des noms de Management Zones ne sont pas uniques,")
    print("           les comptes peuvent inclure des entités de plusieurs zones.")
    print("-" * 60 + "\n")


    results = {}
    all_successful = True

    # Itérer sur les noms
    for mz_name in management_zone_names:
        # Adapter les messages
        print(f"Traitement de la Management Zone (Nom): {mz_name}...")
        # Passer le nom à la fonction
        host_count = get_entity_count(base_url, api_token, mz_name, 'HOST')
        service_count = get_entity_count(base_url, api_token, mz_name, 'SERVICE')
        app_count = get_entity_count(base_url, api_token, mz_name, 'APPLICATION')

        if host_count is None or service_count is None or app_count is None:
            # Adapter les messages
            print(f"  -> Échec de la récupération complète des données pour MZ (Nom): {mz_name}\n")
            results[mz_name] = {'HOST': 'ERREUR', 'SERVICE': 'ERREUR', 'APPLICATION': 'ERREUR'}
            all_successful = False
        else:
            print(f"  -> Hôtes: {host_count}, Services: {service_count}, Applications: {app_count}\n")
            results[mz_name] = {'HOST': host_count, 'SERVICE': service_count, 'APPLICATION': app_count}

    print("\n--- Résultats Finaux ---")
    # Adapter l'affichage final
    for mz_name, counts in results.items():
        print(f"MZ Nom '{mz_name}': Hôtes={counts['HOST']}, Services={counts['SERVICE']}, Applications={counts['APPLICATION']}")

    if not all_successful:
        print("\nAttention: Certaines données n'ont pas pu être récupérées en raison d'erreurs.", file=sys.stderr)
        sys.exit(1)