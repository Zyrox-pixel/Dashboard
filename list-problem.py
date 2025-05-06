import requests
import datetime # Utilisé pour datetime.datetime.now() et timedelta
from datetime import timedelta # Spécifiquement pour timedelta
import json
import time # Pour une éventuelle pause entre les appels paginés

def list_dynatrace_problems_corrected(api_url, api_token, management_zone_name):
    """
    Liste tous les problèmes d'une zone de gestion Dynatrace (ouverts et fermés) 
    sur les 72 dernières heures, avec gestion de la pagination et filtrage correct.
    
    Args:
        api_url (str): L'URL de base de l'API Dynatrace (ex: https://votre-domaine.live.dynatrace.com)
        api_token (str): Token d'API avec la permission 'problems.read'
        management_zone_name (str): Nom exact de la zone de gestion
        
    Returns:
        list: Liste des problèmes trouvés, ou une liste vide en cas d'erreur.
    """
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json; charset=utf-8' # Bonne pratique d'inclure charset
    }
    
    # S'assurer que l'URL de base n'a pas de / final pour éviter les doubles //
    api_url = api_url.rstrip('/')
    problems_url = f"{api_url}/api/v2/problems"
    
    all_problems = []
    
    # Échapper les guillemets doubles dans le nom de la MZ pour le sélecteur (bonne pratique)
    escaped_mz_name = management_zone_name.replace('"', '\\"')

    # Paramètres initiaux pour la première requête
    # Utiliser "now-72h" est simple et géré par Dynatrace.
    current_params = {
        'from': "now-72h", 
        'problemSelector': f'managementZone("{escaped_mz_name}")',
        'status': 'OPEN,CLOSED', # Pour inclure les problèmes ouverts et fermés
        'pageSize': 500  # Demander le maximum par page pour réduire le nombre d'appels
    }
    
    page_num = 1
    print(f"Début de la récupération des problèmes pour MZ: '{management_zone_name}' (utilisé dans sélecteur: '{escaped_mz_name}') sur les 72 dernières heures.")

    while True:
        if 'nextPageKey' in current_params:
            print(f"Récupération de la page {page_num} avec nextPageKey: {current_params['nextPageKey'][:20]}...") # Affiche les 20 premiers caractères de la clé
        else:
            # Affiche les paramètres seulement pour le premier appel pour la clarté
            print(f"Récupération de la page {page_num} avec les paramètres initiaux: {current_params}")


        try:
            # Pour un débogage plus approfondi de l'URL, décommentez :
            # req = requests.Request('GET', problems_url, params=current_params)
            # prepared_req = req.prepare()
            # print(f"DEBUG: URL de la requête: {prepared_req.url}")

            response = requests.get(
                problems_url, 
                headers=headers, 
                params=current_params, 
                verify=True, # Recommandé: True. Mettre à False si problèmes de certificat SSL et en connaissance de cause.
                timeout=30  # (secondes pour connexion, secondes pour lecture)
            )
            response.raise_for_status() # Lève une exception pour les codes d'erreur HTTP (4xx, 5xx)
            
            data = response.json()
            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            
            print(f"Page {page_num}: {len(problems_on_page)} problèmes récupérés. Total jusqu'à présent: {len(all_problems)}.")

            next_page_key = data.get("nextPageKey")
            if next_page_key:
                # Pour les pages suivantes, seuls nextPageKey et pageSize sont nécessaires.
                current_params = {'nextPageKey': next_page_key, 'pageSize': 500}
                page_num += 1
                # Optionnel: ajouter une petite pause pour ne pas surcharger l'API
                # time.sleep(0.2) 
            else:
                # Plus de pages à récupérer
                break
                
        except requests.exceptions.HTTPError as http_err:
            print(f"Erreur HTTP lors de la récupération des problèmes (page {page_num}): {http_err}")
            print(f"Réponse du serveur: {response.text if response and hasattr(response, 'text') else 'Pas de réponse détaillée'}")
            return all_problems # Retourne ce qui a été collecté jusqu'à présent
        except requests.exceptions.Timeout as timeout_err:
            print(f"Timeout lors de la requête (page {page_num}): {timeout_err}")
            return all_problems # Retourne ce qui a été collecté
        except requests.exceptions.RequestException as req_err: # Erreur plus générique (DNS, connexion, etc.)
            print(f"Erreur de requête générique (page {page_num}): {req_err}")
            return [] 
        except json.JSONDecodeError as json_err:
            print(f"Erreur de décodage JSON (page {page_num}): {json_err}")
            print(f"Réponse brute reçue: {response.text if response and hasattr(response, 'text') else 'Pas de réponse détaillée'}")
            return all_problems # Retourne ce qui a été collecté

    total_problems_retrieved = len(all_problems)
    # Comparer avec totalCount si vous voulez vérifier que la pagination a tout ramené (nécessite de stocker le premier totalCount)
    # initial_total_count = data.get('totalCount', 0) # 'data' ici serait celui du dernier appel, pas idéal. Il faudrait stocker le premier.
    # print(f"L'API a initialement rapporté {initial_total_count} problèmes au total pour ces critères.")
    print(f"Récupération terminée. Nombre total de problèmes pour '{management_zone_name}': {total_problems_retrieved}")
    return all_problems

def display_problems(problems, api_url_for_links):
    """
    Affiche les problèmes de manière claire
    
    Args:
        problems (list): Liste des problèmes à afficher
        api_url_for_links (str): L'URL de base de l'environnement Dynatrace pour construire les liens.
    """
    if not problems:
        print("Aucun problème trouvé pour les critères spécifiés.")
        return
    
    print(f"\nNombre total de problèmes trouvés: {len(problems)}")
    print("=" * 80)
    
    # S'assurer que l'URL de base pour les liens n'a pas de / final
    base_link_url = api_url_for_links.rstrip('/')

    for idx, problem in enumerate(problems, 1):
        status = problem.get('status', 'INCONNU')
        title = problem.get('title', 'Sans titre')
        severity = problem.get('severityLevel', 'INCONNU')
        impact = problem.get('impactLevel', 'INCONNU')
        problem_id = problem.get('problemId') # Utiliser problemId, qui devrait exister
        
        try:
            start_time_ms = problem.get('startTime')
            if start_time_ms:
                start_time_dt = datetime.datetime.fromtimestamp(start_time_ms / 1000)
                start_time_str = start_time_dt.strftime('%Y-%m-%d %H:%M:%S')
            else:
                start_time_str = "N/A"
        except Exception as e:
            start_time_str = f"Erreur date ({e})"
            
        end_time_str = "En cours"
        end_time_ms = problem.get('endTime')
        if end_time_ms and end_time_ms > 0 : 
            try:
                end_time_dt = datetime.datetime.fromtimestamp(end_time_ms / 1000)
                end_time_str = end_time_dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception as e:
                end_time_str = f"Erreur date ({e})"
        
        problem_details_url = f"{base_link_url}/#problems/problemdetails;pid={problem_id}" if problem_id else 'N/A'

        print(f"Problème #{idx}:")
        print(f"  - ID Problème: {problem_id if problem_id else 'N/A'}")
        print(f"  - Titre: {title}")
        print(f"  - Statut: {status}")
        print(f"  - Sévérité: {severity}")
        print(f"  - Impact: {impact}")
        print(f"  - Début: {start_time_str}")
        print(f"  - Fin: {end_time_str}")
        print(f"  - URL Dynatrace: {problem_details_url}")
        print("-" * 40)

    print("=" * 80)

if __name__ == "__main__":
    # --- Configuration Utilisateur ---
    # Remplacez ces valeurs par les vôtres :
    # Exemple pour api_url: "https://xyz12345.live.dynatrace.com" 
    # ou "https://votre-domaine-managed.com/e/VOTRE_ID_ENVIRONNEMENT"
    
    # UTILISEZ VOS INFORMATIONS RÉELLES CI-DESSOUS
    DT_API_URL = "https://gmon-itgs.group.echonet/e/6d539108-2970-46ba-b505-d3cf7712f03" 
    DT_API_TOKEN = "dt0c01....SMNWS" # Remplacez par VOTRE token API complet
    MZ_NAME = "PRODSEC - AP03566 - ACESID" 
    # ---------------------------------

    # Vérification simple des placeholders (adaptez si vous changez les valeurs par défaut)
    if "VOTRE_URL_DYNATRACE" in DT_API_URL or \
       "VOTRE_TOKEN_API_DYNATRACE" in DT_API_TOKEN or \
       "NOM_DE_VOTRE_MANAGEMENT_ZONE" in MZ_NAME or \
       DT_API_TOKEN == "dt0c01....SMNWS": # Vérification supplémentaire pour le token partiel
        print("ERREUR: Veuillez remplacer les valeurs des placeholders DT_API_URL, DT_API_TOKEN, et MZ_NAME dans le script par vos informations réelles.")
        print("Assurez-vous que DT_API_TOKEN est votre token complet.")
    else:
        print(f"Récupération des problèmes pour la Management Zone : '{MZ_NAME}'")
        print(f"Depuis l'environnement Dynatrace : {DT_API_URL}")
        print(f"Token utilisé commence par : {DT_API_TOKEN[:10]}") # Affiche les 10 premiers caractères du token
        print("Assurez-vous que le token API a la permission 'problems.read'.")
        
        problems_found = list_dynatrace_problems_corrected(DT_API_URL, DT_API_TOKEN, MZ_NAME)
        display_problems(problems_found, DT_API_URL) # Passer l'URL pour construire les liens