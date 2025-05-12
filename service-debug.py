import requests
import json
import os
from datetime import datetime
import warnings

# --- Configuration ---
DYNATRACE_BASE_URL = os.environ.get("DYNATRACE_BASE_URL", "https://gmon-itgs.group.echonet/e/6d539108-2970-46ba-b505-d3cf7712f038")
DYNATRACE_API_TOKEN = os.environ.get("DYNATRACE_API_TOKEN", "VOTRE_TOKEN_API_DYNATRACE") # REMPLACEZ CECI !
MANAGEMENT_ZONE_NAME = "PRODSEC - AP11038 - WebSSO ITG"

HTML_OUTPUT_FILENAME = "rapport_dynatrace_services_names.html"

# Utilisation des longs metricId (avec splitBy) comme clés, basé sur les logs précédents
PREFERRED_METRIC_ORDER_AND_NAMES = {
    "builtin:service.response.time:avg:splitBy(\"dt.entity.service\")": "Temps Rép. Moyen (s)",
    "builtin:service.requestCount.server:value:splitBy(\"dt.entity.service\")": "Nb Requêtes",
    "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")": "Nb Erreurs"
}
RESPONSE_TIME_METRIC_ID_KEY = "builtin:service.response.time:avg:splitBy(\"dt.entity.service\")"

if "VOTRE_TOKEN_API_DYNATRACE" in DYNATRACE_API_TOKEN:
    print("ERREUR: Veuillez remplacer DYNATRACE_API_TOKEN par votre véritable token dans le script.")
    exit()

METRICS_API_ENDPOINT = f"{DYNATRACE_BASE_URL.rstrip('/')}/api/v2/metrics/query"
ENTITIES_API_ENDPOINT = f"{DYNATRACE_BASE_URL.rstrip('/')}/api/v2/entities"

def fetch_dynatrace_data(api_token, mz_name):
    # ... (Logique fetch métriques identique à la précédente) ...
    headers = {
        "Authorization": f"Api-Token {api_token}",
        "Content-Type": "application/json"
    }
    metric_selector = (
        "builtin:service.response.time:avg:splitBy(\"dt.entity.service\"),"
        "builtin:service.requestCount.server:value:splitBy(\"dt.entity.service\"),"
        "builtin:service.errors.total.count:value:splitBy(\"dt.entity.service\")"
    )
    entity_selector_metrics = f'type(SERVICE),mzName("{mz_name}")'
    params_metrics = {
        "metricSelector": metric_selector,
        "entitySelector": entity_selector_metrics,
        "from": "now-30m", # Période 30 min
        "to": "now",
        "resolution": "Inf"
    }
    print(f"Tentative de récupération des métriques (30 min) pour la MZ: {mz_name}...")
    metrics_data = None
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", requests.packages.urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(METRICS_API_ENDPOINT, headers=headers, params=params_metrics, verify=False)
        response.raise_for_status()
        metrics_data = response.json()
        print("Données de métriques récupérées avec succès.")
    except requests.exceptions.HTTPError as http_err:
        print(f"Erreur HTTP (métriques): {http_err}\nRéponse de l'API: {response.text if 'response' in locals() else 'N/A'}")
        return None, {} 
    except Exception as e:
        print(f"Une erreur inattendue (métriques): {e}")
        return None, {}

    if not metrics_data or not metrics_data.get("result"):
        print("Aucune donnée de métrique ou structure de résultat inattendue.")
        return metrics_data, {}

    service_ids_from_metrics = set()
    for metric_item in metrics_data.get("result", []):
        for series_data in metric_item.get("data", []):
            if series_data.get("dimensions"):
                service_ids_from_metrics.add(series_data.get("dimensions")[0])
    
    print(f"ID de service extraits des métriques: {service_ids_from_metrics}") 

    if not service_ids_from_metrics:
        print("Aucun ID de service trouvé.")
        return metrics_data, {}

    # --- Récupération des noms ---
    print(f"\n--- Début Récupération Noms Services ---")
    print(f"Vérification pour {len(service_ids_from_metrics)} ID(s) de service...")
    service_id_to_name_map = {}
    entity_selector_names = f'entityId({",".join(f'"{sid}"' for sid in service_ids_from_metrics)})'
    print(f"Sélecteur d'entités utilisé : {entity_selector_names}") 
    params_entities = { "entitySelector": entity_selector_names, "fields": "displayName,entityId", "from": "now-15m", "to": "now" }
    
    try:
        print(f"Appel à l'API Entités: {ENTITIES_API_ENDPOINT} avec les paramètres ci-dessus")
        # !!! Rappel : Vérifiez que le token API a la permission 'entities.read' !!!
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", requests.packages.urllib3.exceptions.InsecureRequestWarning)
            response_entities = requests.get(ENTITIES_API_ENDPOINT, headers=headers, params=params_entities, verify=False)
        print(f"Statut de la réponse API Entités: {response_entities.status_code}") # DEBUG Statut HTTP
        response_entities.raise_for_status() # Vérifie les erreurs HTTP
        entities_data = response_entities.json()
        print(f"Réponse brute de l'API Entités (JSON): {json.dumps(entities_data, indent=2)}") # DEBUG Brut
        
        found_entities = entities_data.get("entities", [])
        print(f"Nombre d'entités trouvées dans la réponse: {len(found_entities)}") # DEBUG Nombre
        for entity in found_entities:
            entity_id = entity.get("entityId")
            display_name = entity.get("displayName")
            if entity_id and display_name:
                 service_id_to_name_map[entity_id] = display_name
                 print(f"  Mapping trouvé: {entity_id} -> {display_name}") # DEBUG Mapping
            elif entity_id:
                 service_id_to_name_map[entity_id] = entity_id # Fallback si pas de nom
                 print(f"  Mapping (fallback ID): {entity_id} -> {entity_id}") # DEBUG Fallback

        print(f"Noms récupérés/mappés pour {len(service_id_to_name_map)} service(s).")
        print(f"CONTENU FINAL de service_id_to_name_map: {service_id_to_name_map}") # <-- Vérifiez attentivement ceci !

        if len(service_id_to_name_map) < len(service_ids_from_metrics):
            print("Attention: Certains noms de services n'ont pas pu être récupérés via l'API Entités.")
            missing_ids = service_ids_from_metrics - set(service_id_to_name_map.keys())
            print(f"IDs pour lesquels le nom est manquant: {missing_ids}") 
            
    except requests.exceptions.HTTPError as http_err:
        print(f"ERREUR HTTP (lors de la récupération des noms): {http_err}")
        print(f"Réponse de l'API Entités: {response_entities.text if 'response_entities' in locals() else 'N/A'}")
    except Exception as e:
        print(f"ERREUR Inattendue (lors de la récupération des noms): {e}")
    print(f"--- Fin Récupération Noms Services ---")   
    return metrics_data, service_id_to_name_map


def generate_html_table_report(metrics_data_raw, service_id_to_name_map, mz_name):
    # ... (Début identique, traitement des métriques et IDs) ...
    services_pivot = {}
    actual_metric_ids_from_response = set()
    ordered_metric_ids_for_table = []

    if metrics_data_raw and metrics_data_raw.get("result"):
        print("\n--- DÉBUT DÉBOGAGE generate_html_table_report ---")
        for metric_item in metrics_data_raw.get("result", []):
             metric_id_from_item = metric_item.get("metricId")
             if not metric_id_from_item: continue
             actual_metric_ids_from_response.add(metric_id_from_item)
             for series_data in metric_item.get("data", []):
                 service_id = series_data.get("dimensions")[0] if series_data.get("dimensions") else "Inconnu"
                 value = series_data.get("values")[0] if series_data.get("values") and series_data.get("values")[0] is not None else "N/A"
                 if service_id not in services_pivot: services_pivot[service_id] = {}
                 services_pivot[service_id][metric_id_from_item] = value
        print(f"IDs métriques réels: {actual_metric_ids_from_response}") 
        preferred_keys_ordered = list(PREFERRED_METRIC_ORDER_AND_NAMES.keys())
        for pref_key in preferred_keys_ordered:
             if pref_key in actual_metric_ids_from_response: ordered_metric_ids_for_table.append(pref_key)
        other_received_ids = sorted([m_id for m_id in actual_metric_ids_from_response if m_id not in ordered_metric_ids_for_table])
        ordered_metric_ids_for_table.extend(other_received_ids)
        print(f"IDs métriques ordonnés pour colonnes: {ordered_metric_ids_for_table}")
        print("--- FIN DÉBOGAGE generate_html_table_report ---\n")

    # --- Génération HTML ---
    html_content = f"""
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport Services Dynatrace</title>
    <style>
        /* ... (Styles CSS identiques) ... */
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f0f2f5; color: #333; }}
        .container {{ max-width: 1100px; margin: auto; background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #1a237e; text-align: center; border-bottom: 2px solid #3949ab; padding-bottom:10px; font-size: 1.8em; }}
        h2 {{ color: #3949ab; margin-top: 0; font-size: 1.3em; }}
        p.period {{ text-align: center; font-style: italic; color: #546e7a; margin-bottom: 25px;}}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
        th, td {{ border: 1px solid #c5cae9; padding: 10px 12px; text-align: left; word-wrap: break-word; }}
        th {{ background-color: #3949ab; color: white; font-size: 0.95em; }}
        tr:nth-child(even) {{ background-color: #e8eaf6; }}
        tr:hover {{ background-color: #c5cae9; }}
        td.service-name {{ font-weight: bold; color: #283593; }}
        td.service-id-marker {{ font-size: 0.85em; color: #777; }}
        td.metric-value {{ text-align: right; }}
        td.na-value {{ color: #78909c; font-style:italic; text-align: center; }}
        .no-data {{ color: #d32f2f; font-weight: bold; text-align: center; padding: 20px; background-color: #ffebee; border: 1px solid #d32f2f; border-radius: 4px; }}
        .error-message {{ background-color: #ffcdd2; border: 1px solid #f44336; color: #c62828; padding: 15px; margin-bottom: 20px; border-radius: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Rapport des Métriques de Service Dynatrace</h1>
        <h2>Management Zone: {mz_name}</h2>
        <p class="period">Période: Dernières 30 minutes (valeurs agrégées)</p>
"""

    if not services_pivot or not ordered_metric_ids_for_table:
        html_content += "<p class='no-data'>Aucune donnée de service à afficher ou aucune colonne de métrique définie. Vérifiez les logs console.</p>"
        # ... (gestion erreur API métriques) ...
    else:
        html_content += """
        <table>
            <thead>
                <tr>
                    <th>Service</th>""" # En-tête simplifié
        for metric_id in ordered_metric_ids_for_table:
            display_name = PREFERRED_METRIC_ORDER_AND_NAMES.get(metric_id, metric_id) 
            html_content += f"                    <th>{display_name}</th>\n"
        html_content += """
                </tr>
            </thead>
            <tbody>"""

        for service_id, metrics in sorted(services_pivot.items()):
            # Affichage uniquement du nom du service, jamais de l'ID
            service_display = service_id_to_name_map.get(service_id, "Service inconnu")

            html_content += f"""
                <tr>
                    <td class="service-name">{service_display}</td>"""
            for metric_id_col in ordered_metric_ids_for_table:
                value = metrics.get(metric_id_col, "N/A")
                value_display = "N/A"
                css_class = "na-value"

                if value != "N/A":
                    css_class = "metric-value"
                    if isinstance(value, (float, int)):
                        if metric_id_col == RESPONSE_TIME_METRIC_ID_KEY:
                            # Conversion secondes (le debug print est optionnel maintenant si l'on est sûr de la clé)
                            # print(f"DEBUG - Conversion secondes pour {service_id}, metric_id: {metric_id_col}, valeur brute: {value}, type: {type(value)}")
                            value_seconds = float(value) / 1000.0
                            value_display = f"{value_seconds:.3f}"
                        elif isinstance(value, float):
                            value_display = f"{value:.2f}"
                        else: # int
                            value_display = str(value)
                    else: 
                        value_display = str(value)
                
                html_content += f"                    <td class=\"{css_class}\">{value_display}</td>\n"
            html_content += "                </tr>"
        html_content += """
            </tbody>
        </table>
"""

    html_content += """
    </div>
</body>
</html>
"""
    try:
        with open(HTML_OUTPUT_FILENAME, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nLe rapport HTML a été généré : '{os.path.abspath(HTML_OUTPUT_FILENAME)}'")
    except IOError as e:
        print(f"Erreur lors de l'écriture du fichier HTML : {e}")

if __name__ == "__main__":
    print(f"--- Script de reporting Dynatrace (Debug Noms/Secondes) ---")
    metrics_response_data, service_names_map = fetch_dynatrace_data(DYNATRACE_API_TOKEN, MANAGEMENT_ZONE_NAME)
    generate_html_table_report(metrics_response_data, service_names_map, MANAGEMENT_ZONE_NAME)