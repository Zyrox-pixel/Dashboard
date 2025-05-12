import requests
import json
import os
from datetime import datetime
import warnings

# --- Configuration ---
DYNATRACE_BASE_URL = os.environ.get("DYNATRACE_BASE_URL", "https://gmon-itgs.group.echonet/e/6d539108-2970-46ba-b505-d3cf7712f038")
DYNATRACE_API_TOKEN = os.environ.get("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API_DYNATRACE") # REMPLACEZ CECI !
MANAGEMENT_ZONE_NAME = "PRODSEC - AP11038 - WebSSO ITG"

HTML_OUTPUT_FILENAME = "rapport_dynatrace_tableau.html"

# Pour simplifier les noms de métriques dans les entêtes du tableau
METRIC_DISPLAY_NAMES = {
    "builtin:service.response.time:avg": "Temps Rép. Moyen (ms)",
    "builtin:service.requestCount.server:value": "Nb Requêtes",
    "builtin:service.errors.total.count:value": "Nb Erreurs"
}


if "VOTRE_TOKEN_API_DYNATRACE" in DYNATRACE_API_TOKEN:
    print("ERREUR: Veuillez remplacer DYNATRACE_API_TOKEN par votre véritable token dans le script.")
    exit()

METRICS_API_ENDPOINT = f"{DYNATRACE_BASE_URL.rstrip('/')}/api/v2/metrics/query"

def fetch_dynatrace_metrics(api_token, mz_name):
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Content-Type": "application/json"
    }
    # Ces métriques seront les colonnes de notre tableau
    metric_selector = (
        "builtin:service.response.time:avg:splitBy(\"dt.entity.service\"),"
        "builtin:service.requestCount.server:value:splitBy(\"dt.entity.service\"),"
        "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")"
    )
    entity_selector = f'type(SERVICE),mzName("{mz_name}")'
    params = {
        "metricSelector": metric_selector,
        "entitySelector": entity_selector,
        "from": "now-2h",
        "to": "now",
        "resolution": "Inf" # Une seule valeur agrégée pour la période
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

def generate_html_table_report(metrics_data_raw, mz_name):
    # 1. Restructurer les données : { "SERVICE_ID": {"metric1_id": valeur1, "metric2_id": valeur2 ...} }
    services_pivot = {}
    ordered_metric_ids = [] # Pour garder l'ordre des colonnes tel que défini dans la requête

    if metrics_data_raw and metrics_data_raw.get("result"):
        # Déterminer l'ordre des métriques à partir de la première métrique ayant des données (ou de la requête)
        # Ceci est basé sur l'ordre dans metric_selector
        requested_metrics_order = [
            "builtin:service.response.time:avg",
            "builtin:service.requestCount.server:value",
            "builtin:service.errors.total.count:value"
        ]
        # Filtrer pour ne garder que celles présentes dans la réponse et dans l'ordre souhaité
        actual_metric_ids_in_response = {item['metricId'] for item in metrics_data_raw["result"]}
        ordered_metric_ids = [m_id for m_id in requested_metrics_order if m_id in actual_metric_ids_in_response]


        for metric_item in metrics_data_raw.get("result", []):
            metric_id = metric_item.get("metricId")
            for series_data in metric_item.get("data", []):
                service_id = series_data.get("dimensions")[0] if series_data.get("dimensions") else "Service ID inconnu"
                value = series_data.get("values")[0] if series_data.get("values") and series_data.get("values")[0] is not None else "N/A"

                if service_id not in services_pivot:
                    services_pivot[service_id] = {}
                services_pivot[service_id][metric_id] = value
    
    # Générer le HTML
    html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Métriques Dynatrace (Tableau)</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f0f2f5; color: #333; }}
        .container {{ max-width: 1000px; margin: auto; background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #1a237e; text-align: center; border-bottom: 2px solid #3949ab; padding-bottom:10px; font-size: 1.8em; }}
        h2 {{ color: #3949ab; margin-top: 0; font-size: 1.3em; }}
        p.period {{ text-align: center; font-style: italic; color: #546e7a; margin-bottom: 25px;}}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
        th, td {{ border: 1px solid # C5cae9; padding: 10px 12px; text-align: left; }}
        th {{ background-color: #3949ab; color: white; font-size: 0.95em; }}
        tr:nth-child(even) {{ background-color: #e8eaf6; }}
        tr:hover {{ background-color: # C5cae9; }}
        td.service-id {{ font-weight: bold; color: #283593; }}
        td.metric-value {{ text-align: right; }}
        td.na-value {{ color: #78909c; font-style:italic; text-align: center; }}
        .no-data {{ color: #d32f2f; font-weight: bold; text-align: center; padding: 20px; background-color: #ffebee; border: 1px solid #d32f2f; border-radius: 4px; }}
        .error-message {{ background-color: #ffcdd2; border: 1px solid #f44336; color: #c62828; padding: 15px; margin-bottom: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Rapport Métriques de Service Dynatrace</h1>
        <h2>Management Zone: {mz_name}</h2>
        <p class="period">Période: Dernières 2 heures (valeurs agrégées)</p>
"""

    if not services_pivot:
        html_content += "<p class='no-data'>Aucune donnée de service à afficher.</p>"
        if metrics_data_raw and metrics_data_raw.get("error"):
            error_info = metrics_data_raw.get("error")
            html_content += f"""
        <div class="error-message">
            <h4>Erreur de l'API Dynatrace :</h4>
            <p><strong>Code :</strong> {error_info.get('code', 'N/A')}</p>
            <p><strong>Message :</strong> {error_info.get('message', 'N/A')}</p>
        </div>"""
    else:
        html_content += """
        <table>
            <thead>
                <tr>
                    <th>Service ID</th>"""
        for metric_id in ordered_metric_ids:
            display_name = METRIC_DISPLAY_NAMES.get(metric_id, metric_id) # Utilise un nom plus court si disponible
            html_content += f"                    <th>{display_name}</th>\n"
        html_content += """
                </tr>
            </thead>
            <tbody>"""

        for service_id, metrics in sorted(services_pivot.items()): # Tri par Service ID pour la consistence
            html_content += f"""
                <tr>
                    <td class="service-id">{service_id}</td>"""
            for metric_id in ordered_metric_ids:
                value = metrics.get(metric_id, "N/A")
                if isinstance(value, float):
                    value_display = f"{value:.2f}"
                elif value == "N/A":
                     value_display = value
                else: # Entiers ou autres chaînes
                    value_display = str(value)
                
                css_class = "metric-value"
                if value_display == "N/A":
                    css_class = "na-value"

                html_content += f"                    <td class=\"{css_class}\">{value_display}</td>\n"
            html_content += "                </tr>"
        html_content += """
            </tbody>
        </table>
"""

    html_content += """
    </div> </body>
</html>
"""
    try:
        with open(HTML_OUTPUT_FILENAME, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nLe rapport HTML tabulaire a été généré : '{os.path.abspath(HTML_OUTPUT_FILENAME)}'")
        print("Ouvrez ce fichier dans votre navigateur web pour voir les résultats.")
    except IOError as e:
        print(f"Erreur lors de l'écriture du fichier HTML : {e}")

if __name__ == "__main__":
    print(f"--- Script de reporting Dynatrace vers Tableau HTML ---")
    metrics_response = fetch_dynatrace_metrics(DYNATRACE_API_TOKEN, MANAGEMENT_ZONE_NAME)

    # Toujours appeler generate_html_table_report, même si metrics_response est None ou une erreur,
    # car la fonction gère l'affichage des messages d'erreur.
    generate_html_table_report(metrics_response, MANAGEMENT_ZONE_NAME)