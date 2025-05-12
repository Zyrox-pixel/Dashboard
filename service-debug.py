import requests
import json
import os
from datetime import datetime
import warnings

# --- Configuration ---
# URL et Management Zone pré-remplies d'après vos logs d'erreur.
# VEUILLEZ VÉRIFIER ET SURTOUT REMPLACER VOTRE_TOKEN_API_DYNATRACE
DYNATRACE_BASE_URL = os.environ.get("DYNATRACE_BASE_URL", "https://gmon-itgs.group.echonet/e/6d539108-2970-46ba-b505-d3cf7712f038")
DYNATRACE_API_TOKEN = os.environ.get("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API_DYNATRACE") # REMPLACEZ CECI !
MANAGEMENT_ZONE_NAME = "PRODSEC - AP11038 - WebSSO ITG"

if "VOTRE_TOKEN_API_DYNATRACE" in DYNATRACE_API_TOKEN:
    print("ERREUR: Veuillez remplacer DYNATRACE_API_TOKEN par votre véritable token dans le script.")
    exit()

METRICS_API_ENDPOINT = f"{DYNATRACE_BASE_URL.rstrip('/')}/api/v2/metrics/query"
HTML_OUTPUT_FILENAME = "rapport_dynatrace.html"

def fetch_dynatrace_metrics(api_token, mz_name):
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Content-Type": "application/json"
    }
    metric_selector = (
        "builtin:service.response.time:avg:splitBy(\"dt.entity.service\"),"
        "builtin:service.requestCount.server:value:splitBy(\"dt.entity.service\")," # Utilisation de :value
        "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")"  # Utilisation de :value
    )
    entity_selector = f'type(SERVICE),mzName("{mz_name}")'
    params = {
        "metricSelector": metric_selector,
        "entitySelector": entity_selector,
        "from": "now-2h",
        "to": "now",
        "resolution": "Inf"
    }
    print(f"Tentative de récupération des métriques depuis Dynatrace pour la MZ: {mz_name}...")
    print(f"URL de l'API: {METRICS_API_ENDPOINT}")
    print(f"Paramètres: {json.dumps(params)}")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", requests.packages.urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(METRICS_API_ENDPOINT, headers=headers, params=params, verify=False)
        response.raise_for_status()
        print("Données récupérées avec succès de Dynatrace.")
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        print(f"Erreur HTTP lors de la récupération des données: {http_err}")
        print(f"Réponse de l'API: {response.text}")
    except requests.exceptions.RequestException as req_err:
        print(f"Erreur de Requête: {req_err}")
    except json.JSONDecodeError:
        print(f"Erreur de décodage JSON. Réponse brute: {response.text if 'response' in locals() else 'N/A'}")
    except Exception as e:
        print(f"Une erreur inattendue est survenue lors de la récupération des données: {e}")
    return None

def generate_html_report(metrics_data, mz_name):
    html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Métriques Dynatrace</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }}
        .container {{ max-width: 900px; margin: auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom:10px; }}
        h2 {{ color: #3498db; margin-top: 0; }}
        p.period {{ text-align: center; font-style: italic; color: #7f8c8d; margin-bottom: 20px;}}
        .metric-section {{ margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #fdfdfd; }}
        .metric-title {{ font-size: 1.4em; color: #2980b9; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;}}
        .service-block {{ border-left: 3px solid #3498db; padding-left: 15px; margin-bottom: 15px; }}
        .service-id {{ font-weight: bold; color: #555; }}
        .timestamp {{ color: #777; font-size: 0.9em; }}
        .value {{ font-size: 1.1em; color: #27ae60; }}
        .no-data {{ color: #e74c3c; font-weight: bold; text-align: center; padding: 20px;}}
        .error-message {{ background-color: #fdd; border: 1px solid #e74c3c; color: #c0392b; padding: 15px; margin-bottom: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Rapport des Métriques de Service Dynatrace</h1>
        <h2>Management Zone: {mz_name}</h2>
        <p class="period">Période: Dernières 2 heures (données agrégées à la fin de la période)</p>
"""

    if not metrics_data or not metrics_data.get("result"):
        html_content += "<p class='no-data'>Aucune donnée de métrique n'a été récupérée ou la structure des données est incorrecte.</p>"
        if metrics_data and metrics_data.get("error"): # Si Dynatrace a renvoyé une erreur JSON structurée
            error_info = metrics_data.get("error")
            html_content += f"""
        <div class="error-message">
            <h4>Erreur de l'API Dynatrace :</h4>
            <p><strong>Code :</strong> {error_info.get('code', 'N/A')}</p>
            <p><strong>Message :</strong> {error_info.get('message', 'N/A')}</p>
        </div>"""
    else:
        for metric_item in metrics_data.get("result", []):
            metric_id = metric_item.get("metricId", "Métrique inconnue")
            html_content += f"""
        <div class="metric-section">
            <h3 class="metric-title">{metric_id}</h3>"""

            if not metric_item.get("data"):
                html_content += "<p>Aucune donnée pour cette métrique.</p>"
            else:
                for series_data in metric_item.get("data", []):
                    service_id = series_data.get("dimensions")[0] if series_data.get("dimensions") else "Service ID non disponible"
                    timestamps = series_data.get("timestamps", [])
                    values = series_data.get("values", [])

                    if timestamps and values and values[0] is not None:
                        # Timestamp est en millisecondes
                        timestamp_dt = datetime.fromtimestamp(timestamps[0] / 1000)
                        value = values[0]
                        html_content += f"""
            <div class="service-block">
                <p><span class="service-id">Service ID :</span> {service_id}</p>
                <p><span class="timestamp">Fin de période :</span> {timestamp_dt.strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><span class="value">Valeur :</span> {value:.2f} """ # Formatage à 2 décimales
                        # Ajout d'unité simple pour le temps de réponse
                        if "response.time" in metric_id:
                            html_content += "ms"
                        html_content += "</p>"
                    else:
                        html_content += f"""
            <div class="service-block">
                <p><span class="service-id">Service ID :</span> {service_id}</p>
                <p>Pas de valeur de données pour cette période.</p>"""
                    html_content += "</div>" # Fin service-block
            html_content += "</div>" # Fin metric-section

    html_content += """
    </div> </body>
</html>
"""
    try:
        with open(HTML_OUTPUT_FILENAME, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nLe rapport HTML a été généré : '{os.path.abspath(HTML_OUTPUT_FILENAME)}'")
        print("Ouvrez ce fichier dans votre navigateur web pour voir les résultats.")
    except IOError as e:
        print(f"Erreur lors de l'écriture du fichier HTML : {e}")

if __name__ == "__main__":
    print(f"--- Script de reporting Dynatrace vers HTML ---")
    metrics_response = fetch_dynatrace_metrics(DYNATRACE_API_TOKEN, MANAGEMENT_ZONE_NAME)

    if metrics_response:
        generate_html_report(metrics_response, MANAGEMENT_ZONE_NAME)
    else:
        print("Échec de la récupération des données de Dynatrace. Le rapport HTML ne sera pas généré avec des données.")
        # On peut quand même générer un HTML avec le message d'erreur si metrics_response est une erreur structurée
        if isinstance(metrics_response, dict) and "error" in metrics_response:
             generate_html_report(metrics_response, MANAGEMENT_ZONE_NAME)
        else:
             # Générer un HTML indiquant un échec plus générique
             empty_error_data = {"error": {"code": "SCRIPT_ERROR", "message": "Impossible de récupérer les données de Dynatrace. Vérifiez les logs console."}}
             generate_html_report(empty_error_data, MANAGEMENT_ZONE_NAME)