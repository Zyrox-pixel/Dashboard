#!/usr/bin/env python3
"""
Script de test simple pour récupérer les problèmes depuis l'API Dynatrace
avec affichage détaillé des requêtes et des réponses.
"""

import requests
import datetime
from datetime import timedelta
import json
import time
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

def test_get_problems(management_zone_name=None, time_from="now-72h", status="OPEN,CLOSED"):
    """
    Test de récupération des problèmes avec logging détaillé
    
    Args:
        management_zone_name (str, optional): Nom de la Management Zone pour filtrer les problèmes.
        time_from (str, optional): Point de départ temporel (ex: "now-72h"). 
        status (str, optional): Statut des problèmes à récupérer ("OPEN", "CLOSED", ou "OPEN,CLOSED").
    """
    # Récupérer les informations d'API depuis les variables d'environnement
    api_url = os.environ.get('DT_ENV_URL')
    api_token = os.environ.get('API_TOKEN')
    verify_ssl = os.environ.get('VERIFY_SSL', 'False').lower() in ('true', '1', 't')
    
    print(f"=== CONFIGURATION ===")
    print(f"API URL: {api_url}")
    print(f"API Token (premiers caractères): {api_token[:10] if api_token else 'Manquant'}")
    print(f"Vérification SSL: {verify_ssl}")
    print(f"Management Zone: {management_zone_name or 'Toutes'}")
    print(f"Timeframe: {time_from}")
    print(f"Status: {status}")
    print(f"==================\n")
    
    if not api_url or not api_token:
        print("ERREUR: URL API ou Token manquant. Vérifiez votre fichier .env")
        return
    
    # Construction des headers pour l'API Dynatrace
    headers = {
        'Authorization': f'Api-Token {api_token}',
        'Accept': 'application/json; charset=utf-8'
    }
    
    # S'assurer que l'URL de base n'a pas de / final
    api_url = api_url.rstrip('/')
    problems_url = f"{api_url}/api/v2/problems"
    
    all_problems = []
    
    # Échapper les guillemets doubles dans le nom de la MZ pour le sélecteur
    problem_selector = ""
    if management_zone_name:
        escaped_mz_name = management_zone_name.replace('"', '\\"')
        problem_selector = f'managementZone("{escaped_mz_name}")'
        print(f"Sélecteur de problèmes: '{problem_selector}'")
    
    # Paramètres initiaux pour la première requête
    current_params = {
        'from': time_from,
        'status': status,
        'pageSize': 500  # Demander le maximum par page pour réduire le nombre d'appels
    }
    
    # Ajouter le sélecteur de problèmes si défini
    if problem_selector:
        current_params['problemSelector'] = problem_selector
    
    page_num = 1
    print(f"Début de la récupération des problèmes pour timeframe: {time_from}, status: {status}" + 
          (f", MZ: '{management_zone_name}'" if management_zone_name else ""))
    
    while True:
        try:
            if 'nextPageKey' in current_params:
                print(f"Récupération de la page {page_num} avec nextPageKey: {current_params['nextPageKey'][:20]}...")
            else:
                print(f"Récupération de la page {page_num} avec les paramètres: {current_params}")
            
            # Générer l'URL complète pour affichage de debug
            req = requests.Request('GET', problems_url, params=current_params)
            prepared_req = req.prepare()
            print(f"URL complète: {prepared_req.url}")
            print(f"Headers: {prepared_req.headers}")
            
            # Effectuer la requête avec un timeout plus long (60 secondes)
            start_time = time.time()
            response = requests.get(
                problems_url, 
                headers=headers, 
                params=current_params, 
                verify=verify_ssl,
                timeout=60
            )
            request_time = time.time() - start_time
            print(f"Temps de requête: {request_time:.2f} secondes")
            print(f"Status code: {response.status_code}")
            
            # Vérifier pour les problèmes
            if response.status_code != 200:
                print(f"ERREUR HTTP: {response.status_code}")
                print(f"Réponse: {response.text}")
                break
                
            response.raise_for_status()
            
            data = response.json()
            problems_on_page = data.get('problems', [])
            all_problems.extend(problems_on_page)
            
            print(f"Page {page_num}: {len(problems_on_page)} problèmes récupérés. Total jusqu'à présent: {len(all_problems)}.")
            
            # Si la page est vide, sortir malgré nextPageKey (sécurité)
            if len(problems_on_page) == 0:
                print("Page vide reçue. Arrêt de la pagination.")
                break
                
            next_page_key = data.get("nextPageKey")
            if next_page_key:
                # Pour les pages suivantes, seuls nextPageKey et pageSize sont nécessaires
                current_params = {'nextPageKey': next_page_key, 'pageSize': 500}
                page_num += 1
                # Petite pause pour ne pas surcharger l'API
                time.sleep(1)
            else:
                # Plus de pages à récupérer
                break
                
        except requests.exceptions.HTTPError as http_err:
            print(f"Erreur HTTP lors de la récupération des problèmes (page {page_num}): {http_err}")
            print(f"Réponse du serveur: {response.text if response and hasattr(response, 'text') else 'Pas de réponse'}")
            break
        except requests.exceptions.Timeout as timeout_err:
            print(f"Timeout lors de la requête (page {page_num}): {timeout_err}")
            break
        except requests.exceptions.RequestException as req_err:
            print(f"Erreur de requête générique (page {page_num}): {req_err}")
            break
        except json.JSONDecodeError as json_err:
            print(f"Erreur de décodage JSON (page {page_num}): {json_err}")
            print(f"Réponse brute reçue: {response.text if response and hasattr(response, 'text') else 'Pas de réponse'}")
            break
        except Exception as e:
            print(f"Erreur inattendue: {e}")
            import traceback
            print(traceback.format_exc())
            break
    
    print(f"\nRécupération terminée. Nombre total de problèmes: {len(all_problems)}")
    
    if all_problems:
        # Afficher un exemple du premier problème
        print("\nExemple de problème (premier de la liste):")
        example = all_problems[0]
        print(json.dumps(example, indent=2))
    else:
        print("\nAucun problème trouvé.")
        
    return all_problems

def main():
    print("=== TEST DE L'API PROBLEMS DYNATRACE ===\n")
    
    # Récupérer la liste des MZs depuis VFG_MZ_LIST
    vfg_mz_string = os.environ.get('VFG_MZ_LIST', '')
    if not vfg_mz_string:
        print("ERREUR: VFG_MZ_LIST est vide dans le fichier .env")
        return
        
    mz_list = [mz.strip() for mz in vfg_mz_string.split(',')]
    print(f"Liste des MZs VFG trouvées: {mz_list}")
    
    # Récupérer tous les problèmes pour chaque MZ et les combiner
    all_problems = []
    
    for mz_name in mz_list:
        print(f"\n\n=== Récupération des problèmes pour la MZ '{mz_name}' ===")
        mz_problems = test_get_problems(management_zone_name=mz_name, time_from="now-72h", status="OPEN,CLOSED")
        
        if mz_problems:
            all_problems.extend(mz_problems)
            print(f"Nombre total de problèmes avec cette MZ: {len(mz_problems)}")
    
    # Afficher le résumé
    # Dédupliquer les problèmes par ID
    unique_problems = []
    problem_ids = set()
    
    for problem in all_problems:
        if problem['id'] not in problem_ids:
            problem_ids.add(problem['id'])
            unique_problems.append(problem)
    
    print(f"\n\n=== RÉSUMÉ ===")
    print(f"Nombre total de problèmes récupérés: {len(all_problems)}")
    print(f"Nombre de problèmes uniques après déduplication: {len(unique_problems)}")
    
    if unique_problems:
        print("\nListe des problèmes uniques trouvés:")
        for i, p in enumerate(unique_problems, 1):
            title = p.get('title', 'Sans titre')
            status = p.get('status', 'INCONNU')
            mz = p.get('managementZones', [])
            mz_names = [zone.get('name', 'Inconnue') for zone in mz] if mz else ['Non spécifié']
            
            print(f"{i}. [{status}] {title} - MZs: {', '.join(mz_names)}")
    
    print("\n=== TEST TERMINÉ ===")

if __name__ == "__main__":
    main()