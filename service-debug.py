import requests
import json
import os
from datetime import datetime, timedelta

# --- Configuration ---
# Récupérez ces valeurs depuis vos variables d'environnement ou entrez-les directement
# Pour la sécurité, il est préférable d'utiliser des variables d'environnement pour le token.
DYNATRACE_BASE_URL = os.environ.get("DYNATRACE_BASE_URL", "https_://VOTRE_URL_DYNATRACE") # Ex: "https_://abcd12345.live.dynatrace.com"
DYNATRACE_API_TOKEN = os.environ.get("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API_DYNATRACE")
MANAGEMENT_ZONE_NAME = "NOM DE VOTRE MANAGEMENT ZONE" # Remplacez par le nom exact

# Vérifiez que les placeholders ont été remplacés (sauf si vous utilisez des variables d'env)
if "VOTRE_URL_DYNATRACE" in DYNATRACE_BASE_URL or "VOTRE_TOKEN_API_DYNATRACE" in DYNATRACE_API_TOKEN:
    print("ERREUR: Veuillez remplacer les placeholders DYNATRACE_BASE_URL et DYNATRACE_API_TOKEN.")
    exit()

if MANAGEMENT_ZONE_NAME == "NOM DE VOTRE MANAGEMENT ZONE":
    print("ERREUR: Veuillez remplacer le placeholder MANAGEMENT_ZONE_NAME.")
    exit()

# --- API Dynatrace ---
METRICS_API_ENDPOINT = f"{DYNATRACE_BASE_URL.rstrip('/')}/api/v2/metrics/query"

def fetch_service_metrics_by_mz_name(base_url, api_token, mz_name):
    """
    Récupère des métriques de service pour une Management Zone donnée sur les 2 dernières heures.
    """
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Content-Type": "application/json"
    }

    # Sélecteur de métriques : Temps de réponse moyen, nombre de requêtes, nombre d'erreurs
    # :splitBy("dt.entity.service") permet d'avoir les résultats par service
    metric_selector = (
        "builtin:service.response.time:avg:splitBy(\"dt.entity.service\"),"
        "builtin:service.requestCount.server:value:splitBy(\"dt.entity.service\")," # Doit être :value
        "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")"  # Doit être :value
    )

    # Sélecteur d'entités : Cible les entités de type SERVICE
    # et appartenant à la Management Zone spécifiée par son nom.
    entity_selector = f'type(SERVICE),mzName("{mz_name}")'

    # Période : les 2 dernières heures
    # resolution="Inf" donne une seule valeur agrégée pour la période par métrique/service.
    # Vous pourriez utiliser "10m", "1h" etc. pour une série temporelle plus détaillée.
    params = {
        "metricSelector": metric_selector,
        "entitySelector": entity_selector,
        "from": "now-2h", # Les 2 dernières heures
        "to": "now",
        "resolution": "Inf"
    }

    print(f"Requête API vers : {METRICS_API_ENDPOINT}")
    print(f"Paramètres : {params}\n")

    try:
        response = requests.get(METRICS_API_ENDPOINT, headers=headers, params=params, verify=False)
        response.raise_for_status()  # Lève une exception pour les codes d'erreur HTTP (4xx ou 5xx)
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        print(f"Erreur HTTP: {http_err}")
        print(f"Réponse de l'API: {response.text}")
    except requests.exceptions.RequestException as req_err:
        print(f"Erreur de Requête: {req_err}")
    except json.JSONDecodeError:
        print("Erreur: Impossible de décoder la réponse JSON.")
        print(f"Réponse de l'API: {response.text}")
    except Exception as e:
        print(f"Une erreur inattendue est survenue: {e}")
    return None

if __name__ == "__main__":
    print(f"--- Récupération des métriques pour la Management Zone : '{MANAGEMENT_ZONE_NAME}' ---")
    metrics_data = fetch_service_metrics_by_mz_name(DYNATRACE_BASE_URL, DYNATRACE_API_TOKEN, MANAGEMENT_ZONE_NAME)

    if metrics_data:
        print("\n--- Données Récupérées (JSON Brut) ---")
        print(json.dumps(metrics_data, indent=2))

        # Optionnel : Un petit traitement pour un affichage plus lisible
        print("\n--- Données Formatées (Exemple) ---")
        total_results = metrics_data.get("totalCount", 0)
        print(f"Nombre total de séries de métriques trouvées : {total_results}")

        for result_item in metrics_data.get("result", []):
            metric_id = result_item.get("metricId")
            print(f"\n  Métrique : {metric_id}")
            for series_data in result_item.get("data", []):
                # Les dimensions incluent l'ID de l'entité (service dans ce cas)
                service_id = series_data.get("dimensions")[0] if series_data.get("dimensions") else "N/A"
                # Avec resolution="Inf", il ne devrait y avoir qu'un seul point de données
                timestamps = series_data.get("timestamps", [])
                values = series_data.get("values", [])

                if timestamps and values:
                    # Le timestamp est en millisecondes, conversion en datetime lisible
                    timestamp_dt = datetime.fromtimestamp(timestamps[0] / 1000)
                    value = values[0]
                    print(f"    Service ID : {service_id}")
                    print(f"      Timestamp (fin de période) : {timestamp_dt.strftime('%Y-%m-%d %H:%M:%S')}")
                    print(f"      Valeur : {value}")
                else:
                    print(f"    Service ID : {service_id} - Pas de données pour cette période.")
    else:
        print("Aucune donnée n'a été récupérée ou une erreur est survenue.")