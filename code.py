from dynatrace import Dynatrace
from datetime import datetime, timedelta
import requests
from jinja2 import Template
import urllib3
import json
import argparse
import os

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

DT_ENV_URL = os.environ.get('DT_ENV_URL') 
API_TOKEN =  os.environ.get('API_TOKEN') 

dt = Dynatrace(DT_ENV_URL, API_TOKEN)
MZ_NAME= os.environ.get('MZ_NAME')

def query_api(endpoint, params=None):
    url = f"{DT_ENV_URL}/api/v2/{endpoint}"
    headers = {
        'Authorization': f'Api-Token {API_TOKEN}',
        'Accept': 'application/json'
    }
    response = requests.get(url, headers=headers, params=params, verify=False)
    response.raise_for_status()
    return response.json()

def extract_technology(entity):
    try:
        entity_details = query_api(f"entities/{entity.entity_id}")
       
        tech_info = []
        tech_icon = "code" 
       
        if 'softwareTechnologies' in entity_details.get('properties', {}):
            techs = entity_details['properties']['softwareTechnologies']
            for tech in techs:
                if 'type' in tech:
                    tech_info.append(tech['type'])
       
        elif 'softwareTechnologies' in entity_details.get('fromRelationships', {}):
            techs = entity_details['fromRelationships']['softwareTechnologies']
            for tech in techs:
                if 'type' in tech:
                    tech_info.append(tech['type'])
       
        if not tech_info:
            if 'tags' in entity_details:
                for tag in entity_details['tags']:
                    if tag.get('key') == 'Technology' or tag.get('key') == 'technology':
                        tech_info.append(tag.get('value'))
       
        if not tech_info:
            name = entity.display_name.lower()
            tech_keywords = {
                'java': ('java', 'coffee'),
                'python': ('python', 'snake'),
                'node.js': ('nodejs', 'node'),
                'nodejs': ('nodejs', 'node'),
                'php': ('php', 'elephant'),
                '.net': ('dotnet', 'windows'),
                'ruby': ('ruby', 'gem'),
                'go': ('go', 'gopher'),
                'postgresql': ('database', 'database'),
                'mysql': ('database', 'database'),
                'mongodb': ('database', 'database'),
                'oracle': ('database', 'database')
            }
           
            for tech, (keyword, icon) in tech_keywords.items():
                if tech in name:
                    tech_info.append(tech.upper())
                    tech_icon = icon
                    break
       
        if tech_info:
            tech_name = tech_info[0].lower()
            if 'java' in tech_name:
                tech_icon = 'coffee'
            elif 'python' in tech_name:
                tech_icon = 'snake'
            elif 'node' in tech_name:
                tech_icon = 'node'
            elif 'php' in tech_name:
                tech_icon = 'elephant'
            elif 'dot' in tech_name or '.net' in tech_name:
                tech_icon = 'windows'
            elif 'ruby' in tech_name:
                tech_icon = 'gem'
            elif 'go' in tech_name:
                tech_icon = 'gopher'
            elif any(db in tech_name for db in ['sql', 'postgres', 'oracle', 'mongo', 'db']):
                tech_icon = 'database'
       
        return {
            'name': ", ".join(tech_info) if tech_info else "Non spécifié",
            'icon': tech_icon
        }
    except Exception as e:
        print(f"Erreur lors de l'extraction de la technologie pour {entity.display_name}: {e}")
        return {
            'name': "Non spécifié",
            'icon': 'question'
        }

def get_metric_history(entity_id, metric_selector, from_time, to_time, resolution="1h"):
    try:
        data = query_api(
            endpoint="metrics/query",
            params={
                "metricSelector": metric_selector,
                "from": from_time,
                "to": to_time,
                "resolution": resolution,
                "entitySelector": f"entityId({entity_id})"
            }
        )
       
        if data.get('result', []) and data['result'][0].get('data', []):
            values = data['result'][0]['data'][0].get('values', [])
            timestamps = data['result'][0]['data'][0].get('timestamps', [])
           
            history = []
            if values and timestamps:
                for i in range(len(values)):
                    if values[i] is not None:
                        history.append({
                            'timestamp': timestamps[i],
                            'value': values[i]
                        })
            return history
        return []
    except Exception as e:
        print(f"Erreur lors de la récupération de l'historique pour {metric_selector}: {e}")
        return []

def get_active_problems():
    try:
        print("Récupération des problèmes actifs...")
        problems_data = query_api(
            endpoint="problems",
            params={
                "status": "OPEN"
                # Nous retirons le filtre managementZone ici car il ne semble pas fonctionner correctement
            }
        )
        
        active_problems = []
        if 'problems' in problems_data:
            total_problems = len(problems_data['problems'])
            print(f"Nombre total de problèmes récupérés: {total_problems}")
            
            # On va filtrer manuellement les problèmes liés à notre Management Zone
            mz_problems = 0
            for problem in problems_data['problems']:
                # Vérifier si le problème est lié à notre Management Zone
                is_in_mz = False
                
                # Rechercher dans les management zones directement attachées au problème
                if 'managementZones' in problem:
                    for mz in problem.get('managementZones', []):
                        if mz.get('name') == MZ_NAME:
                            is_in_mz = True
                            break
                
                # Rechercher aussi dans les entités affectées
                if not is_in_mz:
                    for entity in problem.get('affectedEntities', []):
                        # Vérifier les management zones de chaque entité affectée
                        for mz in entity.get('managementZones', []):
                            if mz.get('name') == MZ_NAME:
                                is_in_mz = True
                                break
                        if is_in_mz:
                            break
                
                # Si le problème est dans notre MZ, l'ajouter à notre liste
                if is_in_mz:
                    mz_problems += 1
                    active_problems.append({
                        'id': problem.get('problemId', 'Unknown'),
                        'title': problem.get('title', 'Problème inconnu'),
                        'impact': problem.get('impactLevel', 'UNKNOWN'),
                        'status': problem.get('status', 'OPEN'),
                        'affected_entities': len(problem.get('affectedEntities', [])),
                        'start_time': datetime.fromtimestamp(problem.get('startTime', 0)/1000).strftime('%Y-%m-%d %H:%M')
                    })
            
            print(f"Problèmes filtrés appartenant à {MZ_NAME}: {mz_problems}/{total_problems}")
        
        return active_problems
    except Exception as e:
        print(f"Erreur lors de la récupération des problèmes: {e}")
        import traceback
        traceback.print_exc()
        return []


try:
    # === RÉCUPÉRATION DES ENTITÉS ===
    print("Récupération des entités...")
    services = dt.entities.list(entity_selector=f"type(SERVICE),mzName(\"{MZ_NAME}\")")
    hosts = dt.entities.list(entity_selector=f"type(HOST),mzName(\"{MZ_NAME}\")")
    process_groups = dt.entities.list(entity_selector=f"type(PROCESS_GROUP),mzName(\"{MZ_NAME}\")")
   
    print(f"Services trouvés: {len(services)}")
    print(f"Hôtes trouvés: {len(hosts)}")
    print(f"Groupes de processus trouvés: {len(process_groups)}")
   
    # === PRÉPARATION DE LA PÉRIODE ===
    now = datetime.now()
    from_time = int((now - timedelta(hours=24)).timestamp() * 1000)
    to_time = int(now.timestamp() * 1000)
   
    # === RÉCUPÉRATION DES MÉTRIQUES ===
    service_metrics = []
    host_metrics = []
    process_metrics = []
   
    # === RÉCUPÉRATION DES PROBLÈMES ACTIFS ===
    active_problems = get_active_problems()
    print(f"Problèmes actifs trouvés: {len(active_problems)}")
   
    # === MÉTRIQUES DES HÔTES (maintenant traité en premier) ===
    print("Récupération des métriques des hôtes...")
    total_cpu = 0
    critical_hosts = 0
   
    for host in hosts:
        host_id = host.entity_id
        print(f"Traitement de l'hôte: {host.display_name}")
       
        cpu_usage = None
        ram_usage = None
        cpu_history = []
        ram_history = []
       
        try:
            cpu_data = query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": "builtin:host.cpu.usage",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({host_id})"
                }
            )
            if cpu_data.get('result', []) and cpu_data['result'][0].get('data', []):
                values = cpu_data['result'][0]['data'][0].get('values', [])
                if values:
                    cpu_usage = int(values[0])
                    if cpu_usage > 80:
                        critical_hosts += 1
                    total_cpu += cpu_usage
           
            # Récupérer l'historique CPU pour les graphiques
            cpu_history = get_metric_history(host_id, "builtin:host.cpu.usage", from_time, to_time)
        except Exception as e:
            print(f"  Erreur pour CPU: {e}")
       
        try:
            ram_data = query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": "builtin:host.mem.usage",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({host_id})"
                }
            )
            if ram_data.get('result', []) and ram_data['result'][0].get('data', []):
                values = ram_data['result'][0]['data'][0].get('values', [])
                if values:
                    ram_usage = int(values[0])
           
            # Récupérer l'historique RAM pour les graphiques
            ram_history = get_metric_history(host_id, "builtin:host.mem.usage", from_time, to_time)
        except Exception as e:
            print(f"  Erreur pour RAM: {e}")
       
        # Récupérer l'URL Dynatrace de l'entité
        dt_url = f"{DT_ENV_URL}/#entity/{host_id}"
       
        host_metrics.append({
            'name': host.display_name,
            'id': host_id,
            'cpu': cpu_usage,
            'ram': ram_usage,
            'cpu_history': cpu_history,
            'ram_history': ram_history,
            'dt_url': dt_url
        })
   
    # Calcul de la moyenne CPU
    avg_cpu = round(total_cpu / len(hosts)) if hosts else 0
   
    # === MÉTRIQUES ET TECHNOLOGIES DES SERVICES ===
    print("Récupération des métriques et technologies des services...")
    total_errors = 0
    total_requests = 0
    services_with_errors = 0
   
    for service in services:
        service_id = service.entity_id
        print(f"Traitement du service: {service.display_name}")
       
        # Vérification du type de service et activité
        service_details = query_api(f"entities/{service_id}")
        service_type = service_details.get('type', '')
        service_status = "Actif"
       
        # Vérifie si le service est inactif (aucune donnée récente)
        if 'monitoring' in service_details.get('properties', {}) and 'monitoringState' in service_details['properties']['monitoring']:
            if service_details['properties']['monitoring']['monitoringState'] != "ACTIVE":
                service_status = "Inactif"
                print(f"  Service {service.display_name} est inactif")
       
        # Récupération des métriques
        response_time = None
        error_rate = None
        requests_count = None
        response_time_history = []
        error_rate_history = []
        request_count_history = []
       
        try:
            response_time_data = query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": "builtin:service.response.time",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                }
            )
           
            if response_time_data.get('result', []) and response_time_data['result'][0].get('data', []):
                values = response_time_data['result'][0]['data'][0].get('values', [])
                if values:
                    response_time = int(values[0])
                else:
                    print(f"  Pas de valeurs pour le temps de réponse (service inactif?)")
            else:
                print(f"  Pas de résultats pour le temps de réponse (mauvaise métrique?)")
               
            # Récupérer l'historique du temps de réponse pour les graphiques
            response_time_history = get_metric_history(service_id, "builtin:service.response.time", from_time, to_time)
        except Exception as e:
            print(f"  Erreur pour le temps de réponse: {e}")
       
        try:
            error_rate_data = query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": "builtin:service.errors.total.rate",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                }
            )
            if error_rate_data.get('result', []) and error_rate_data['result'][0].get('data', []):
                values = error_rate_data['result'][0]['data'][0].get('values', [])
                if values:
                    error_rate = round(values[0], 1)
                    if error_rate > 0:
                        total_errors += error_rate
                        services_with_errors += 1
           
            # Récupérer l'historique du taux d'erreur
            error_rate_history = get_metric_history(service_id, "builtin:service.errors.total.rate", from_time, to_time)
        except Exception as e:
            print(f"  Erreur pour le taux d'erreur: {e}")
       
        try:
            requests_data = query_api(
                endpoint="metrics/query",
                params={
                    "metricSelector": "builtin:service.requestCount.total",
                    "from": from_time,
                    "to": to_time,
                    "entitySelector": f"entityId({service_id})"
                }
            )
            if requests_data.get('result', []) and requests_data['result'][0].get('data', []):
                values = requests_data['result'][0]['data'][0].get('values', [])
                if values:
                    requests_count = int(values[0])
                    total_requests += requests_count
           
            # Récupérer l'historique du nombre de requêtes
            request_count_history = get_metric_history(service_id, "builtin:service.requestCount.total", from_time, to_time)
        except Exception as e:
            print(f"  Erreur pour le nombre de requêtes: {e}")
       
        # Récupération avancée de la technologie
        tech_info = extract_technology(service)
       
        # Récupérer l'URL Dynatrace de l'entité
        dt_url = f"{DT_ENV_URL}/#entity/{service_id}"
       
        service_metrics.append({
            'name': service.display_name,
            'id': service_id,
            'response_time': response_time,
            'error_rate': error_rate,
            'requests': requests_count,
            'technology': tech_info['name'],
            'tech_icon': tech_info['icon'],
            'status': service_status,
            'response_time_history': response_time_history,
            'error_rate_history': error_rate_history,
            'request_count_history': request_count_history,
            'dt_url': dt_url
        })
   
    # Calcul du taux d'erreur moyen
    avg_error_rate = round(total_errors / services_with_errors, 1) if services_with_errors > 0 else 0
   
    # === GROUPES DE PROCESSUS ===
    print("Récupération des informations sur les groupes de processus...")
    for pg in process_groups:
        pg_id = pg.entity_id
       
        # Récupération avancée de la technologie
        tech_info = extract_technology(pg)
       
        # Récupérer l'URL Dynatrace de l'entité
        dt_url = f"{DT_ENV_URL}/#entity/{pg_id}"
       
        process_metrics.append({
            'name': pg.display_name,
            'id': pg_id,
            'technology': tech_info['name'],
            'tech_icon': tech_info['icon'],
            'dt_url': dt_url
        })
   
    # === GÉNÉRATION DU RAPPORT HTML ===
    template = Template("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Rapport Dynatrace - {{ mz_name }}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"></script>
        <style>
            :root {
                --primary-color: #0077cc;
                --secondary-color: #0da5b3;
                --background-dark: #1a1a1a;
                --background-medium: #222;
                --background-light: #2a2a2a;
                --text-color: #fff;
                --border-color: #444;
                --success-color: #66ff66;
                --warning-color: #ffcc00;
                --danger-color: #ff4d4d;
                --info-color: #3498db;
                --header-height: 60px;
            }
           
            /* Éléments de base */
            body {
                font-family: 'Segoe UI', Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: var(--background-dark);
                color: var(--text-color);
                padding-top: var(--header-height);
            }
           
            .container {
                max-width: 1400px;
                margin: 0 auto;
                padding: 20px;
            }
           
            /* Entête fixe */
            header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: var(--header-height);
                background-color: var(--background-medium);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
            }
           
            .header-title {
                font-size: 1.2rem;
                font-weight: 600;
                display: flex;
                align-items: center;
            }
           
            .header-title i {
                margin-right: 10px;
                color: var(--primary-color);
            }
           
            .nav-menu {
                display: flex;
                gap: 15px;
            }
           
            .nav-link {
                color: var(--text-color);
                text-decoration: none;
                padding: 8px 12px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
           
            .nav-link:hover {
                background-color: var(--background-light);
            }
           
            .nav-link.active {
                background-color: var(--primary-color);
            }
           
            /* Contrôles */
            .controls {
                margin: 15px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
           
            .search-box {
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid var(--border-color);
                background-color: var(--background-medium);
                color: var(--text-color);
                width: 250px;
            }
           
            .filter-options {
                display: flex;
                gap: 10px;
            }
           
            .filter-button {
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid var(--border-color);
                background-color: var(--background-medium);
                color: var(--text-color);
                cursor: pointer;
                transition: background-color 0.2s;
            }
           
            .filter-button:hover {
                background-color: var(--background-light);
            }
           
            .filter-button.active {
                background-color: var(--primary-color);
            }
           
            .theme-toggle {
                background: none;
                border: none;
                color: var(--text-color);
                cursor: pointer;
                font-size: 1.2rem;
            }
           
            /* Cartes de résumé */
            .summary-section {
                margin: 30px 0;
            }
           
            .cards-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
           
            .card {
                background-color: var(--background-medium);
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
            }
           
            .card-header {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }
           
            .card-icon {
                background-color: rgba(255, 255, 255, 0.1);
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
            }
           
            .card-title {
                font-size: 1rem;
                font-weight: 500;
                margin: 0;
            }
           
            .card-value {
                font-size: 2rem;
                font-weight: 700;
                margin: 10px 0;
            }
           
            .card-trend {
                display: flex;
                align-items: center;
                font-size: 0.9rem;
                margin-top: auto;
            }
           
            .trend-up {
                color: var(--danger-color);
            }
           
            .trend-down {
                color: var(--success-color);
            }
           
            .trend-neutral {
                color: var(--warning-color);
            }
           
            /* Problèmes actifs */
            .problems-section {
                background-color: var(--background-medium);
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
           
            .problem-item {
                padding: 15px;
                margin: 10px 0;
                border-radius: 6px;
                background-color: var(--background-light);
                display: flex;
                align-items: center;
                gap: 15px;
            }
           
            .problem-icon {
                font-size: 1.5rem;
            }
           
            .impact-INFRASTRUCTURE {
                color: var(--danger-color);
            }
           
            .impact-SERVICE {
                color: var(--warning-color);
            }
           
            .impact-APPLICATION {
                color: var(--info-color);
            }
           
            .problem-details {
                flex: 1;
            }
           
            .problem-title {
                font-weight: 500;
                margin-bottom: 5px;
            }
           
            .problem-meta {
                display: flex;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.7);
            }
           
            .problem-meta > div {
                margin-right: 15px;
            }
           
            .problem-entities {
                background-color: rgba(255, 255, 255, 0.1);
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 0.8rem;
            }
           
            /* Tableaux de données */
            .section {
                background-color: var(--background-medium);
                border-radius: 8px;
                padding: 20px;
                margin: 30px 0;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }
           
            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
           
            .section-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin: 0;
                display: flex;
                align-items: center;
            }
           
            .section-title i {
                margin-right: 10px;
                color: var(--primary-color);
            }
           
            .view-toggle {
                display: flex;
                background-color: var(--background-light);
                border-radius: 4px;
                overflow: hidden;
            }
           
            .view-option {
                padding: 8px 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
           
            .view-option:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
           
            .view-option.active {
                background-color: var(--primary-color);
            }
           
            table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 0;
                background-color: var(--background-medium);
            }
           
            th, td {
                border: none;
                padding: 12px 15px;
                text-align: left;
            }
           
            th {
                background-color: var(--background-light);
                color: var(--text-color);
                position: sticky;
                top: var(--header-height);
                z-index: 10;
            }
           
            tr {
                transition: background-color 0.2s;
            }
           
            tr:nth-child(even) {
                background-color: rgba(255, 255, 255, 0.03);
            }
           
            tr:hover {
                background-color: rgba(255, 255, 255, 0.05);
            }
           
            /* Classes utilitaires */
            .error-high {
                color: var(--danger-color);
                font-weight: bold;
            }
           
            .error-medium {
                color: var(--warning-color);
                font-weight: bold;
            }
           
            .error-low {
                color: var(--success-color);
            }
           
            .high-usage {
                color: var(--danger-color);
                font-weight: bold;
            }
           
            .medium-usage {
                color: var(--warning-color);
                font-weight: bold;
            }
           
            .normal-usage {
                color: var(--success-color);
            }
           
            .inactive {
                color: #888;
                font-style: italic;
            }
           
            .tech-badge {
                display: inline-flex;
                align-items: center;
                padding: 4px 8px;
                border-radius: 4px;
                background-color: rgba(255, 255, 255, 0.1);
                font-size: 0.9em;
            }
           
            .tech-badge i {
                margin-right: 5px;
            }
           
            .note {
                background-color: var(--background-light);
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid var(--secondary-color);
            }
           
            .pagination {
                display: flex;
                justify-content: center;
                margin-top: 20px;
                gap: 5px;
            }
           
            .pagination-btn {
                padding: 8px 12px;
                border-radius: 4px;
                background-color: var(--background-light);
                border: none;
                color: var(--text-color);
                cursor: pointer;
                transition: background-color 0.2s;
            }
           
            .pagination-btn:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
           
            .pagination-btn.active {
                background-color: var(--primary-color);
            }
           
            /* Graphiques et visualisations */
            .chart-container {
                margin: 15px 0;
                background-color: var(--background-light);
                border-radius: 6px;
                padding: 15px;
                height: 150px;
            }
           
            .mini-chart {
                height: 30px;
                width: 120px;
                display: inline-block;
                vertical-align: middle;
            }
           
            .gauge-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }
           
            .gauge {
                width: 40px;
                height: 40px;
                position: relative;
            }
           
            .gauge-value {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 0.8rem;
                font-weight: bold;
            }
           
            /* Tooltips */
            .tooltip {
                position: relative;
                display: inline-block;
            }
           
            .tooltip .tooltip-content {
                visibility: hidden;
                background-color: var(--background-dark);
                color: var(--text-color);
                text-align: center;
                border-radius: 6px;
                padding: 10px;
                position: absolute;
                z-index: 1000;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                width: 250px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
                opacity: 0;
                transition: opacity 0.3s;
            }
           
            .tooltip:hover .tooltip-content {
                visibility: visible;
                opacity: 1;
            }
           
            /* Status indicators */
            .status-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                display: inline-block;
                margin-right: 5px;
            }
           
            .status-active {
                background-color: var(--success-color);
            }
           
            .status-inactive {
                background-color: #888;
            }
           
            .status-warning {
                background-color: var(--warning-color);
            }
           
            .status-error {
                background-color: var(--danger-color);
            }
           
            /* Liens externes */
            .external-link {
                color: var(--primary-color);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: color 0.2s;
            }
           
            .external-link:hover {
                color: var(--secondary-color);
                text-decoration: underline;
            }
           
            /* Switchs de thème */
            .theme-switcher {
                margin-left: auto;
            }
           
            /* Footers et infos de pagination */
            .table-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                font-size: 0.9rem;
            }
           
            .export-buttons {
                display: flex;
                gap: 10px;
            }
           
            .export-btn {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 5px 10px;
                border-radius: 4px;
                background-color: var(--background-light);
                color: var(--text-color);
                border: none;
                cursor: pointer;
                font-size: 0.9rem;
                transition: background-color 0.2s;
            }
           
            .export-btn:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }
           
            /* Loading spinner */
            .loader {
                width: 30px;
                height: 30px;
                border: 3px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                border-top-color: var(--primary-color);
                animation: spin 1s ease-in-out infinite;
                margin: 20px auto;
            }
           
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
           
            /* Responsive design */
            @media (max-width: 1200px) {
                .cards-container {
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                }
            }
           
            @media (max-width: 992px) {
                th, td {
                    padding: 10px;
                }
               
                .chart-container {
                    height: 120px;
                }
            }
           
            @media (max-width: 768px) {
                .cards-container {
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                }
               
                .nav-menu {
                    display: none;
                }
               
                .header-title {
                    font-size: 1rem;
                }
               
                .mobile-menu-toggle {
                    display: block;
                }
               
                .card-value {
                    font-size: 1.5rem;
                }
               
                .problem-meta {
                    flex-direction: column;
                    gap: 5px;
                }
               
                .problem-meta > div {
                    margin-right: 0;
                }
            }
           
            @media (max-width: 576px) {
                .cards-container {
                    grid-template-columns: 1fr;
                }
               
                .controls {
                    flex-direction: column;
                    align-items: stretch;
                }
               
                .search-box {
                    width: 100%;
                }
               
                .filter-options {
                    justify-content: space-between;
                }
            }
        </style>
    </head>
    <body>
        <header>
            <div class="header-title">
                <i class="fas fa-chart-line"></i>
                <span>Dynatrace - {{ mz_name }}</span>
            </div>
            <nav class="nav-menu">
                <a href="#summary" class="nav-link active">Résumé</a>
                <a href="#problems" class="nav-link">Problèmes</a>
                <a href="#hosts" class="nav-link">Hôtes</a>
                <a href="#services" class="nav-link">Services</a>
                <a href="#processes" class="nav-link">Process</a>
            </nav>
            <button class="theme-toggle" id="themeToggle">
                <i class="fas fa-moon"></i>
            </button>
        </header>
       
        <div class="container">
            <div class="controls">
                <input type="text" class="search-box" id="searchBox" placeholder="Rechercher...">
                <div class="filter-options">
                    <button class="filter-button active" data-filter="all">Tous</button>
                    <button class="filter-button" data-filter="critical">Critiques</button>
                    <button class="filter-button" data-filter="warning">Avertissements</button>
                    <button class="filter-button" data-filter="healthy">En bonne santé</button>
                </div>
            </div>
           
            <!-- Section Résumé -->
            <div id="summary" class="summary-section">
                <h2>Résumé de l'environnement</h2>
                <p>État de l'environnement au {{ date }}. Période d'analyse: dernières 24 heures.</p>
               
                <div class="cards-container">
                    <!-- Carte de résumé des hôtes -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-server"></i>
                            </div>
                            <h3 class="card-title">Hôtes</h3>
                        </div>
                        <div class="card-value">{{ host_metrics|length }}</div>
                        <div class="card-info">
                            CPU Moyen: <span class="{{ 'high-usage' if avg_cpu > 80 else 'medium-usage' if avg_cpu > 60 else 'normal-usage' }}">{{ avg_cpu }}%</span>
                        </div>
                        <div class="card-trend">
                            <i class="fas fa-exclamation-triangle {{ 'trend-up' if critical_hosts > 0 else 'trend-neutral' }}"></i>
                            <span>{{ critical_hosts }} hôte(s) critique(s)</span>
                        </div>
                    </div>
                   
                    <!-- Carte de résumé des services -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-code"></i>
                            </div>
                            <h3 class="card-title">Services</h3>
                        </div>
                        <div class="card-value">{{ service_metrics|length }}</div>
                        <div class="card-info">
                            <span>{{ services_with_errors }} service(s) avec erreurs</span>
                        </div>
                        <div class="card-trend">
                            <i class="fas fa-chart-line {{ 'trend-up' if services_with_errors > 0 else 'trend-neutral' }}"></i>
                            <span>Taux d'erreur moyen: {{ avg_error_rate }}%</span>
                        </div>
                    </div>
                   
                    <!-- Carte de résumé des requêtes -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-exchange-alt"></i>
                            </div>
                            <h3 class="card-title">Requêtes</h3>
                        </div>
                        <div class="card-value">{{ total_requests }}</div>
                        <div class="card-info">
                            <span>Dernières 24 heures</span>
                        </div>
                        <div class="card-trend">
                            <i class="fas fa-chart-bar trend-neutral"></i>
                            <span>Moyenne horaire: {{ (total_requests / 24)|int }}</span>
                        </div>
                    </div>
                   
                    <!-- Carte de résumé des problèmes -->
                    <div class="card">
                        <div class="card-header">
                            <div class="card-icon">
                                <i class="fas fa-exclamation-circle"></i>
                            </div>
                            <h3 class="card-title">Problèmes</h3>
                        </div>
                        <div class="card-value">{{ active_problems|length }}</div>
                        <div class="card-info">
                            <span>Problèmes actifs</span>
                        </div>
                        <div class="card-trend">
                            <i class="fas fa-exclamation-triangle {{ 'trend-up' if active_problems|length > 0 else 'trend-neutral' }}"></i>
                            <span>{{ active_problems|length }} à examiner</span>
                        </div>
                    </div>
                </div>
            </div>
           
            <!-- Section Problèmes -->
            <div id="problems" class="problems-section">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-exclamation-circle"></i>
                        Problèmes Actifs
                    </h2>
                </div>
               
                {% if active_problems|length > 0 %}
                    {% for problem in active_problems %}
                    <div class="problem-item">
                        <div class="problem-icon impact-{{ problem.impact }}">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="problem-details">
                            <div class="problem-title">{{ problem.title }}</div>
                            <div class="problem-meta">
                                <div>
                                    <i class="fas fa-clock"></i>
                                    Depuis {{ problem.start_time }}
                                </div>
                                <div>
                                    <i class="fas fa-exclamation-circle"></i>
                                    Impact: {{ problem.impact }}
                                </div>
                                <div class="problem-entities">
                                    <i class="fas fa-cubes"></i>
                                    {{ problem.affected_entities }} entités affectées
                                </div>
                            </div>
                        </div>
                        <a href="{{ dt_env_url }}/#problems/problemdetails;pid={{ problem.id }}" target="_blank" class="external-link">
                            <i class="fas fa-external-link-alt"></i>
                            Détails
                        </a>
                    </div>
                    {% endfor %}
                {% else %}
                <div class="note">
                    <i class="fas fa-check-circle"></i>
                    Aucun problème actif détecté dans cette Management Zone.
                </div>
                {% endif %}
            </div>
           
            <!-- Section Hôtes -->
            <div id="hosts" class="section">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-server"></i>
                        Hôtes
                    </h2>
                    <div class="view-toggle">
                        <div class="view-option active" data-view="table">
                            <i class="fas fa-table"></i>
                        </div>
                        <div class="view-option" data-view="cards">
                            <i class="fas fa-th-large"></i>
                        </div>
                    </div>
                </div>
               
                <div class="note">
                    Les valeurs CPU et RAM représentent l'utilisation moyenne sur les dernières 24h.
                    Cliquez sur un hôte pour voir plus de détails.
                </div>
               
                <table id="hostsTable">
                    <tr>
                        <th>Nom</th>
                        <th>CPU (%)</th>
                        <th>Tendance CPU</th>
                        <th>RAM (%)</th>
                        <th>Tendance RAM</th>
                        <th>Actions</th>
                    </tr>
                    {% for host in host_metrics %}
                    <tr data-status="{{ 'critical' if host.cpu and host.cpu > 80 or host.ram and host.ram > 80 else 'warning' if host.cpu and host.cpu > 60 or host.ram and host.ram > 60 else 'healthy' }}">
                        <td>{{ host.name }}</td>
                        <td class="{{ 'high-usage' if host.cpu and host.cpu > 80 else 'medium-usage' if host.cpu and host.cpu > 60 else 'normal-usage' }}">
                            {% if host.cpu is not none %}
                            <div class="gauge-container">
                                <canvas class="gauge" data-value="{{ host.cpu }}" data-type="cpu"></canvas>
                                <span>{{ host.cpu }}</span>
                            </div>
                            {% else %}
                            N/A
                            {% endif %}
                        </td>
                        <td>
                            {% if host.cpu_history|length > 0 %}
                            <canvas class="mini-chart" data-history="{{ host.cpu_history|tojson }}"></canvas>
                            {% else %}
                            Pas de données
                            {% endif %}
                        </td>
                        <td class="{{ 'high-usage' if host.ram and host.ram > 80 else 'medium-usage' if host.ram and host.ram > 60 else 'normal-usage' }}">
                            {% if host.ram is not none %}
                            <div class="gauge-container">
                                <canvas class="gauge" data-value="{{ host.ram }}" data-type="ram"></canvas>
                                <span>{{ host.ram }}</span>
                            </div>
                            {% else %}
                            N/A
                            {% endif %}
                        </td>
                        <td>
                            {% if host.ram_history|length > 0 %}
                            <canvas class="mini-chart" data-history="{{ host.ram_history|tojson }}"></canvas>
                            {% else %}
                            Pas de données
                            {% endif %}
                        </td>
                        <td>
                            <a href="{{ host.dt_url }}" target="_blank" class="external-link">
                                <i class="fas fa-external-link-alt"></i>
                                Dynatrace
                            </a>
                        </td>
                    </tr>
                    {% endfor %}
                </table>
               
                <div class="table-footer">
                    <div class="pagination">
                        <button class="pagination-btn" data-page="prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="pagination-btn active" data-page="1">1</button>
                        <button class="pagination-btn" data-page="2">2</button>
                        <button class="pagination-btn" data-page="next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="export-buttons">
                        <button class="export-btn" id="exportCSV">
                            <i class="fas fa-file-csv"></i>
                            CSV
                        </button>
                        <button class="export-btn" id="exportPDF">
                            <i class="fas fa-file-pdf"></i>
                            PDF
                        </button>
                    </div>
                </div>
            </div>
           
            <!-- Section Services -->
            <div id="services" class="section">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-code"></i>
                        Services
                    </h2>
                    <div class="view-toggle">
                        <div class="view-option active" data-view="table">
                            <i class="fas fa-table"></i>
                        </div>
                        <div class="view-option" data-view="cards">
                            <i class="fas fa-th-large"></i>
                        </div>
                    </div>
                </div>
               
                <div class="note">
                    Note: Les services sans données de métriques (N/A) sont probablement inactifs ou n'ont pas reçu de trafic durant la période analysée (dernières 24h).
                </div>
               
                <table id="servicesTable">
                    <tr>
                        <th>Nom</th>
                        <th>Technologie</th>
                        <th>Temps de réponse (ms)</th>
                        <th>Tendance</th>
                        <th>Erreurs (%)</th>
                        <th>Requêtes</th>
                        <th>Actions</th>
                    </tr>
                    {% for svc in service_metrics %}
                    <tr class="{{ 'inactive' if svc.status == 'Inactif' and svc.response_time is none }}"
                        data-status="{{ 'critical' if svc.error_rate and svc.error_rate > 5 else 'warning' if svc.error_rate and svc.error_rate > 1 else 'healthy' }}">
                        <td>
                            <div class="tooltip">
                                <span class="status-indicator {{ 'status-active' if svc.status == 'Actif' else 'status-inactive' }}"></span>
                                {{ svc.name }}
                                <div class="tooltip-content">
                                    <strong>{{ svc.name }}</strong><br>
                                    Status: {{ svc.status }}<br>
                                    {% if svc.requests is not none %}
                                    Requêtes totales: {{ svc.requests }}
                                    {% else %}
                                    Aucune requête détectée
                                    {% endif %}
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="tech-badge">
                                <i class="fas fa-{{ svc.tech_icon }}"></i>
                                {{ svc.technology }}
                            </span>
                        </td>
                        <td>{{ svc.response_time if svc.response_time is not none else 'N/A' }}</td>
                        <td>
                            {% if svc.response_time_history|length > 0 %}
                            <canvas class="mini-chart" data-history="{{ svc.response_time_history|tojson }}"></canvas>
                            {% else %}
                            Pas de données
                            {% endif %}
                        </td>
                        <td class="{{ 'error-high' if svc.error_rate and svc.error_rate > 5 else 'error-medium' if svc.error_rate and svc.error_rate > 1 else 'error-low' }}">
                            {{ svc.error_rate if svc.error_rate is not none else '0' }}
                        </td>
                        <td>{{ svc.requests if svc.requests is not none else 'N/A' }}</td>
                        <td>
                            <a href="{{ svc.dt_url }}" target="_blank" class="external-link">
                                <i class="fas fa-external-link-alt"></i>
                                Dynatrace
                            </a>
                        </td>
                    </tr>
                    {% endfor %}
                </table>
               
                <div class="table-footer">
                    <div class="pagination">
                        <button class="pagination-btn" data-page="prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="pagination-btn active" data-page="1">1</button>
                        <button class="pagination-btn" data-page="2">2</button>
                        <button class="pagination-btn" data-page="next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="export-buttons">
                        <button class="export-btn" id="exportCSV">
                            <i class="fas fa-file-csv"></i>
                            CSV
                        </button>
                        <button class="export-btn" id="exportPDF">
                            <i class="fas fa-file-pdf"></i>
                            PDF
                        </button>
                    </div>
                </div>
            </div>
           
            <!-- Section Process Groups -->
            <div id="processes" class="section">
                <div class="section-header">
                    <h2 class="section-title">
                        <i class="fas fa-cubes"></i>
                        Process Groups
                    </h2>
                </div>
               
                <table id="processesTable">
                    <tr>
                        <th>Nom</th>
                        <th>Technologie</th>
                        <th>Actions</th>
                    </tr>
                    {% for proc in process_metrics %}
                    <tr>
                        <td>{{ proc.name }}</td>
                        <td>
                            <span class="tech-badge">
                                <i class="fas fa-{{ proc.tech_icon }}"></i>
                                {{ proc.technology }}
                            </span>
                        </td>
                        <td>
                            <a href="{{ proc.dt_url }}" target="_blank" class="external-link">
                                <i class="fas fa-external-link-alt"></i>
                                Dynatrace
                            </a>
                        </td>
                    </tr>
                    {% endfor %}
                </table>
               
                <div class="table-footer">
                    <div class="pagination">
                        <button class="pagination-btn" data-page="prev">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="pagination-btn active" data-page="1">1</button>
                        <button class="pagination-btn" data-page="next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
       
        <script>
            // Initialisation des graphiques et visualisations
            document.addEventListener('DOMContentLoaded', function() {
                // Initialiser les mini-charts (sparklines)
                initSparklines();
               
                // Initialiser les jauges
                initGauges();
               
                // Initialiser les filtres et la recherche
                initFilters();
               
                // Initialiser le thème
                initTheme();
               
                // Initialiser la navigation
                initNavigation();
               
                // Initialiser la pagination
                initPagination();
               
                // Initialiser les boutons d'exportation
                initExportButtons();
            });
           
            // Fonction pour initialiser les mini-graphiques (sparklines)
            function initSparklines() {
                const miniCharts = document.querySelectorAll('.mini-chart');
               
                miniCharts.forEach(function(canvas) {
                    const historyData = JSON.parse(canvas.getAttribute('data-history'));
                    if (!historyData || historyData.length === 0) return;
                   
                    const ctx = canvas.getContext('2d');
                    const values = historyData.map(item => item.value);
                   
                    // Créer un mini graphique linéaire
                    new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: Array(values.length).fill(''),
                            datasets: [{
                                data: values,
                                borderColor: '#0077cc',
                                borderWidth: 1.5,
                                fill: true,
                                backgroundColor: 'rgba(0, 119, 204, 0.1)',
                                pointRadius: 0,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    enabled: false
                                }
                            },
                            scales: {
                                x: {
                                    display: false
                                },
                                y: {
                                    display: false,
                                    min: 0,
                                    suggestedMax: Math.max(...values) * 1.1
                                }
                            },
                            animation: false
                        }
                    });
                });
            }
           
            // Fonction pour initialiser les jauges
            function initGauges() {
                const gauges = document.querySelectorAll('.gauge');
               
                gauges.forEach(function(canvas) {
                    const value = parseInt(canvas.getAttribute('data-value'));
                    const type = canvas.getAttribute('data-type');
                    const ctx = canvas.getContext('2d');
                   
                    // Déterminer la couleur en fonction de la valeur
                    let color;
                    if (value > 80) {
                        color = '#ff4d4d'; // rouge
                    } else if (value > 60) {
                        color = '#ffcc00'; // jaune
                    } else {
                        color = '#66ff66'; // vert
                    }
                   
                    // Dessiner la jauge
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            datasets: [{
                                data: [value, 100 - value],
                                backgroundColor: [color, 'rgba(255, 255, 255, 0.1)'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            cutout: '70%',
                            responsive: true,
                            maintainAspectRatio: true,
                            circumference: 270,
                            rotation: -135,
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    enabled: false
                                }
                            },
                            animation: false
                        }
                    });
                   
                    // Ajouter le texte au centre
                    const gaugeValue = canvas.nextElementSibling;
                    if (gaugeValue) {
                        gaugeValue.textContent = value + '%';
                        gaugeValue.style.color = color;
                    }
                });
            }
           
            // Fonction pour initialiser les filtres et la recherche
            function initFilters() {
                const searchBox = document.getElementById('searchBox');
                const filterButtons = document.querySelectorAll('.filter-button');
               
                // Gestionnaire pour la recherche
                searchBox.addEventListener('input', function() {
                    const searchText = this.value.toLowerCase();
                    filterTables(searchText);
                });
               
                // Gestionnaire pour les boutons de filtre
                filterButtons.forEach(function(button) {
                    button.addEventListener('click', function() {
                        // Mettre à jour l'état actif
                        filterButtons.forEach(btn => btn.classList.remove('active'));
                        this.classList.add('active');
                       
                        // Appliquer le filtre
                        const filterType = this.getAttribute('data-filter');
                        filterTablesByStatus(filterType);
                    });
                });
               
                // Fonction pour filtrer les tableaux par texte
                function filterTables(searchText) {
                    const tables = [
                        document.getElementById('hostsTable'),
                        document.getElementById('servicesTable'),
                        document.getElementById('processesTable')
                    ];
                   
                    tables.forEach(function(table) {
                        if (!table) return;
                       
                        const rows = table.querySelectorAll('tr');
                       
                        // Commencer à 1 pour ignorer l'en-tête
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const text = row.textContent.toLowerCase();
                           
                            if (text.includes(searchText)) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        }
                    });
                }
               
                // Fonction pour filtrer les tableaux par statut
                function filterTablesByStatus(statusFilter) {
                    const tables = [
                        document.getElementById('hostsTable'),
                        document.getElementById('servicesTable'),
                        document.getElementById('processesTable')
                    ];
                   
                    tables.forEach(function(table) {
                        if (!table) return;
                       
                        const rows = table.querySelectorAll('tr');
                       
                        // Commencer à 1 pour ignorer l'en-tête
                        for (let i = 1; i < rows.length; i++) {
                            const row = rows[i];
                            const rowStatus = row.getAttribute('data-status');
                           
                            if (statusFilter === 'all' || !rowStatus || rowStatus === statusFilter) {
                                row.style.display = '';
                            } else {
                                row.style.display = 'none';
                            }
                        }
                    });
                }
            }
           
            // Fonction pour initialiser le thème
            function initTheme() {
                const themeToggle = document.getElementById('themeToggle');
                const root = document.documentElement;
               
                // Vérifier s'il y a un thème sauvegardé
                const savedTheme = localStorage.getItem('dynatraceReportTheme');
                if (savedTheme === 'light') {
                    applyLightTheme();
                }
               
                themeToggle.addEventListener('click', function() {
                    const currentBg = getComputedStyle(root).getPropertyValue('--background-dark').trim();
                   
                    if (currentBg === '#1a1a1a') {
                        applyLightTheme();
                        localStorage.setItem('dynatraceReportTheme', 'light');
                    } else {
                        applyDarkTheme();
                        localStorage.setItem('dynatraceReportTheme', 'dark');
                    }
                });
               
                function applyLightTheme() {
                    root.style.setProperty('--background-dark', '#f8f9fa');
                    root.style.setProperty('--background-medium', '#ffffff');
                    root.style.setProperty('--background-light', '#f1f3f5');
                    root.style.setProperty('--text-color', '#212529');
                    root.style.setProperty('--border-color', '#dee2e6');
                    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
               
                function applyDarkTheme() {
                    root.style.setProperty('--background-dark', '#1a1a1a');
                    root.style.setProperty('--background-medium', '#222');
                    root.style.setProperty('--background-light', '#2a2a2a');
                    root.style.setProperty('--text-color', '#fff');
                    root.style.setProperty('--border-color', '#444');
                    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                }
            }
           
            // Fonction pour initialiser la navigation
            function initNavigation() {
                const navLinks = document.querySelectorAll('.nav-link');
               
                navLinks.forEach(function(link) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                       
                        // Mettre à jour l'état actif
                        navLinks.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                       
                        // Faire défiler jusqu'à la section
                        const targetId = this.getAttribute('href').substring(1);
                        const targetElement = document.getElementById(targetId);
                       
                        if (targetElement) {
                            // Offset pour tenir compte de l'en-tête fixe
                            const headerHeight = document.querySelector('header').offsetHeight;
                            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                           
                            window.scrollTo({
                                top: targetPosition,
                                behavior: 'smooth'
                            });
                        }
                    });
                });
               
                // Mettre à jour la navigation active pendant le défilement
                window.addEventListener('scroll', function() {
                    const sections = [
                        document.getElementById('summary'),
                        document.getElementById('problems'),
                        document.getElementById('hosts'),
                        document.getElementById('services'),
                        document.getElementById('processes')
                    ];
                   
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const scrollPosition = window.scrollY + headerHeight + 10;
                   
                    let currentSection = null;
                   
                    sections.forEach(function(section) {
                        if (!section) return;
                       
                        if (section.offsetTop <= scrollPosition &&
                            section.offsetTop + section.offsetHeight > scrollPosition) {
                            currentSection = section.id;
                        }
                    });
                   
                    if (currentSection) {
                        navLinks.forEach(function(link) {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === '#' + currentSection) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            }
           
            // Fonction pour initialiser la pagination
            function initPagination() {
                const tableIds = ['hostsTable', 'servicesTable', 'processesTable'];
                const rowsPerPage = 10;
               
                tableIds.forEach(function(tableId) {
                    const table = document.getElementById(tableId);
                    if (!table) return;
                   
                    const rows = table.querySelectorAll('tr');
                    if (rows.length <= rowsPerPage + 1) return; // +1 pour l'en-tête
                   
                    const totalPages = Math.ceil((rows.length - 1) / rowsPerPage);
                    let currentPage = 1;
                   
                    // Obtenir les boutons de pagination pour cette table
                    const paginationContainer = table.parentNode.querySelector('.pagination');
                    if (!paginationContainer) return;
                   
                    const pageButtons = paginationContainer.querySelectorAll('[data-page]');
                   
                    // Mettre à jour la pagination
                    updatePageButtons();
                    showPage(1);
                   
                    // Ajouter des événements aux boutons
                    pageButtons.forEach(function(button) {
                        button.addEventListener('click', function() {
                            const pageAction = this.getAttribute('data-page');
                           
                            if (pageAction === 'prev') {
                                if (currentPage > 1) showPage(currentPage - 1);
                            } else if (pageAction === 'next') {
                                if (currentPage < totalPages) showPage(currentPage + 1);
                            } else {
                                const pageNum = parseInt(pageAction);
                                if (!isNaN(pageNum)) showPage(pageNum);
                            }
                        });
                    });
                   
                    // Fonction pour afficher une page spécifique
                    function showPage(pageNum) {
                        currentPage = pageNum;
                       
                        // Calculer les indices des lignes à afficher
                        const start = (pageNum - 1) * rowsPerPage + 1; // +1 pour ignorer l'en-tête
                        const end = Math.min(start + rowsPerPage - 1, rows.length - 1);
                       
                        // Masquer toutes les lignes de données
                        for (let i = 1; i < rows.length; i++) {
                            rows[i].style.display = 'none';
                        }
                       
                        // Afficher les lignes de la page actuelle
                        for (let i = start; i <= end; i++) {
                            rows[i].style.display = '';
                        }
                       
                        // Mettre à jour l'état des boutons
                        updatePageButtons();
                    }
                   
                    // Mise à jour des boutons de pagination
                    function updatePageButtons() {
                        pageButtons.forEach(function(button) {
                            const pageAction = button.getAttribute('data-page');
                           
                            if (pageAction === 'prev') {
                                button.disabled = currentPage <= 1;
                            } else if (pageAction === 'next') {
                                button.disabled = currentPage >= totalPages;
                            } else {
                                const pageNum = parseInt(pageAction);
                                if (!isNaN(pageNum)) {
                                    button.classList.toggle('active', pageNum === currentPage);
                                   
                                    // Mise à jour de la visibilité des boutons de page
                                    if (totalPages <= 5) {
                                        // Afficher tous les boutons si <= 5 pages
                                        button.style.display = pageNum <= totalPages ? '' : 'none';
                                    } else {
                                        // Logique pour afficher un sous-ensemble de boutons
                                        if (pageNum === 1 || pageNum === totalPages) {
                                            button.style.display = '';
                                        } else if (pageNum >= currentPage - 1 && pageNum <= currentPage + 1) {
                                            button.style.display = '';
                                        } else {
                                            button.style.display = 'none';
                                        }
                                    }
                                }
                            }
                        });
                    }
                });
            }
           
            // Fonction pour initialiser les boutons d'exportation
            function initExportButtons() {
                const exportCSVButtons = document.querySelectorAll('#exportCSV');
                const exportPDFButtons = document.querySelectorAll('#exportPDF');
               
                exportCSVButtons.forEach(function(button) {
                    button.addEventListener('click', function() {
                        // Trouver la table associée à ce bouton
                        const tableContainer = this.closest('.section');
                        if (!tableContainer) return;
                       
                        const table = tableContainer.querySelector('table');
                        if (!table) return;
                       
                        exportTableToCSV(table, tableContainer.querySelector('.section-title').textContent.trim() + '.csv');
                    });
                });
               
                exportPDFButtons.forEach(function(button) {
                    button.addEventListener('click', function() {
                        alert('La fonctionnalité d\'exportation PDF sera disponible dans une future mise à jour.');
                    });
                });
               
                // Fonction pour exporter une table au format CSV
                function exportTableToCSV(table, filename) {
                    const rows = table.querySelectorAll('tr');
                    let csv = [];
                   
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        const cols = row.querySelectorAll('td, th');
                        let rowData = [];
                       
                        for (let j = 0; j < cols.length; j++) {
                            // Récupérer le texte brut sans les éléments HTML internes
                            let cellText = cols[j].innerText.trim();
                           
                            // Échapper les guillemets doubles
                            cellText = cellText.replace(/"/g, '""');
                           
                            // Entourer de guillemets si nécessaire
                            rowData.push('"' + cellText + '"');
                        }
                       
                        csv.push(rowData.join(','));
                    }
                   
                    // Créer un élément de lien pour télécharger
                    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join('\n'));
                    const link = document.createElement('a');
                    link.setAttribute('href', csvContent);
                    link.setAttribute('download', filename);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
           
            // Fonctions utilitaires
            function formatNumber(num) {
                return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
            }
        </script>
    </body>
    </html>
    """)
   
    html_content = template.render(
        mz_name=MZ_NAME,
        date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        service_metrics=service_metrics,
        host_metrics=host_metrics,
        process_metrics=process_metrics,
        active_problems=active_problems,
        avg_cpu=avg_cpu,
        avg_error_rate=avg_error_rate,
        critical_hosts=critical_hosts,
        services_with_errors=services_with_errors,
        total_requests=total_requests,
        dt_env_url=DT_ENV_URL
    )
   
    # Enregistrement du rapport HTML
    filename = f"rapport_dynatrace_{MZ_NAME.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M')}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_content)
   
    print(f"Rapport amélioré généré : {filename}")

except Exception as e:
    print(f"Une erreur est survenue : {e}")
    import traceback
    traceback.print_exc()