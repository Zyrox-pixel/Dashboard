import requests
import datetime # Note: 'from datetime import datetime, timedelta' est plus courant
from datetime import timedelta # Assurez-vous que timedelta est importé
import json
import time # Pour une éventuelle pause entre les appels paginés

def list_dynatrace_problems_corrected(api_url, api_token, management_zone_name):
    """
    Liste tous les problèmes d'une zone de gestion Dynatrace (ouverts et fermés) 
    sur les 72 dernières heures, avec gestion de la pagination et filtrage correct.
    
    Args:
        api_url (str): L'URL de base de l'API Dynatrace
        api_token (str): Token d'API avec la permission 'problems.read'
        management_zone_name (str): Nom exact de la zone de gestion
        
    Returns:
        list: Liste des problèmes trouvés, ou une liste vide en cas d'erreur.
    """
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json; charset=utf-8' # Bonne pratique d'inclure charset
    }
    
    # Utiliser "now-72h" est plus simple et géré par Dynatrace directement
    # Ou calculer le timestamp comme vous l'aviez fait :
    # now_dt = datetime.datetime.now()
    # time_72h_ago = now_dt - timedelta(hours=72)
    # from_timestamp_ms = int(time_72h_ago.timestamp() * 1000)

    problems_url = f"{api_url.rstrip('/')}/api/v2/problems" # Assurer que l'URL n'a pas de / en double
    
    all_problems = []
    
    # Paramètres initiaux pour la première requête
    current_params = {
        'from': "now-72h", # Dynatrace gère cette chaîne relative
        # 'from': from_timestamp_ms, # Alternative avec timestamp absolu
        'problemSelector': f'managementZone("{management_zone_name}")',
        'status': 'OPEN,CLOSED',
        'pageSize': 500  # Demander le maximum par page pour réduire le nombre d'appels
    }
    
    page_num = 1
    print(f"Début de la récupération des problèmes pour MZ: '{management_zone_name}' sur les 72 dernières heures.")

    while True:
        print(f"Récupération de la page {page_num} avec paramètres: {current_params.get('nextPageKey', 'Params initiaux')}")
        try:
            # Pour le débogage, affichez l'URL complète de la requête
            # req = requests.Request('GET', problems_url, params=current_params)
            # prepared_req = req.prepare()
            # print(f"DEBUG: URL de la requête: {prepared_req.url}")

            response = requests.get(problems_url, headers=headers, params=current_params, verify=True, timeout=30) # verify=True est recommandé
            response.raise_for_status() # Lève une exception pour les codes d'erreur HTTP (4xx, 5xx)
            
            data = response.json()
            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            
            print(f"Page {page_num}: {len(problems_on_page)} problèmes récupérés. Total jusqu'à présent: {len(all_problems)}.")

            next_page_key = data.get("nextPageKey")
            if next_page_key:
                # Pour les pages suivantes, seuls nextPageKey et pageSize sont nécessaires.
                # Les autres filtres sont conservés par le contexte du nextPageKey côté serveur.
                current_params = {'nextPageKey': next_page_key, 'pageSize': 500}
                page_num += 1
                # Optionnel: ajouter une petite pause pour ne pas surcharger l'API
                # time.sleep(0.2) 
            else:
                # Plus de pages à récupérer
                break
                
        except requests.exceptions.HTTPError as http_err:
            print(f"Erreur HTTP lors de la récupération des problèmes (page {page_num}): {http_err}")
            print(f"Réponse: {response.text if response else 'Pas de réponse'}")
            # En cas d'erreur HTTP, on arrête et on retourne ce qu'on a pu collecter
            # ou une liste vide si vous préférez un échec total.
            return all_problems if all_problems else []
        except requests.exceptions.RequestException as req_err:
            print(f"Erreur de requête lors de la récupération des problèmes (page {page_num}): {req_err}")
            return [] # Ou all_problems
        except json.JSONDecodeError as json_err:
            print(f"Erreur de décodage JSON (page {page_num}): {json_err}")
            print(f"Réponse brute: {response.text if response else 'Pas de réponse'}")
            return all_problems if all_problems else []
            
    print(f"Récupération terminée. Nombre total de problèmes pour '{management_zone_name}': {len(all_problems)}")
    return all_problems

# Votre fonction display_problems est bonne.
# Votre bloc if __name__ == "__main__": est bon pour tester.
# Assurez-vous de remplacer les placeholders par vos vraies valeurs.
# Et pour 'verify_ssl=True', si vous avez des soucis de certificat dans votre environnement,
# vous devrez peut-être configurer Python pour qu'il fasse confiance à ces certificats,
# ou temporairement remettre verify=False pour tester, tout en étant conscient du risque.