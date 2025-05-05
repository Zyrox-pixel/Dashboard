import pandas as pd
import requests
import configparser
import os
import time
from datetime import datetime

# Configuration
# Créez un fichier config.ini avec vos informations d'authentification Dynatrace
def load_config():
    config = configparser.ConfigParser()
    if os.path.exists('config.ini'):
        config.read('config.ini')
        return config
    else:
        # Créer un fichier de configuration par défaut si inexistant
        config['DYNATRACE'] = {
            'tenant_url': 'https://gmon-itgs.group.echonet',
            'environment_id': 'e/6d539108-2970-46ba-b505-d3cf7712f038',  # ID d'environnement
            'api_token': 'VOTRE_API_TOKEN',
            'timeout': '30'
        }
        with open('config.ini', 'w') as f:
            config.write(f)
        print("Fichier de configuration créé. Veuillez le modifier avec votre URL tenant et API token Dynatrace.")
        exit(1)

# Fonction pour vérifier si le token Dynatrace est valide
def check_dynatrace_token(config):
    try:
        # Construire l'URL complète avec l'ID d'environnement
        api_url = f"{config['DYNATRACE']['tenant_url']}/{config['DYNATRACE']['environment_id']}/api/v1/time"
        
        response = requests.get(
            api_url,
            headers={"Authorization": f"Api-Token {config['DYNATRACE']['api_token']}"},
            timeout=int(config['DYNATRACE']['timeout']),
            verify=False  # Ignorer la vérification TLS
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Erreur lors de la vérification du token Dynatrace: {e}")
        print(f"URL utilisée: {api_url}")
        return False

# Fonction pour interroger Dynatrace et obtenir l'OS pour un système
def get_os_from_dynatrace(hostname, ip_address, config):
    """
    Cette fonction utilise l'API Dynatrace pour récupérer les informations d'OS
    pour un host spécifique, en utilisant d'abord la propriété "VMware name" si disponible.
    """
    try:
        # Désactiver les avertissements pour les certificats non vérifiés
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        # Construire l'URL complète avec l'ID d'environnement
        api_url = f"{config['DYNATRACE']['tenant_url']}/{config['DYNATRACE']['environment_id']}/api/v1/entities"
        
        print(f"Interrogation de Dynatrace via: {api_url}")
        
        # Essayons d'abord de trouver l'entité host par domaine ou hostname partiel
        response = requests.get(
            api_url,
            params={
                "entitySelector": f"type(HOST)",
                "fields": "+properties,+displayName,+tags"
            },
            headers={"Authorization": f"Api-Token {config['DYNATRACE']['api_token']}"},
            timeout=int(config['DYNATRACE']['timeout']),
            verify=False  # Ignorer la vérification TLS
        )
        response.raise_for_status()
        data = response.json()
        
        # Récupérer toutes les entités et examiner leurs propriétés
        entities = data.get('entities', [])
        
        # Pour débogage - examiner la première entité pour voir sa structure
        if entities and len(entities) > 0:
            sample_entity = entities[0]
            print(f"Exemple de structure d'entité: {sample_entity.get('displayName')}")
            print(f"Propriétés disponibles: {list(sample_entity.get('properties', {}).keys())}")
        
        # Rechercher le bon host par correspondance partielle sur hostname ou IP
        found_entity = None
        
        for entity in entities:
            # Vérifier si le hostname de l'entité contient notre hostname
            entity_hostname = entity.get('displayName', '').lower()
            entity_props = entity.get('properties', {})
            
            # Vérifier les deux formats possibles pour VMware name
            vmware_name = ""
            if "VMware name" in entity_props:
                vmware_name = entity_props.get("VMware name", "").lower()
            elif "vmwareName" in entity_props:
                vmware_name = entity_props.get("vmwareName", "").lower()
            
            # Imprimer les deux valeurs pour débogage
            if hostname and (hostname.lower() in entity_hostname or hostname.lower() in vmware_name):
                print(f"Correspondance trouvée: {entity_hostname} / VMware name: {vmware_name}")
            
            # Vérifier les correspondances possibles
            if hostname and (hostname.lower() in entity_hostname or 
                             hostname.lower() in vmware_name):
                found_entity = entity
                break
                
            # Si nous avons une adresse IP, vérifier dans les propriétés
            if ip_address and not found_entity:
                # Chercher l'IP dans les propriétés et les tags
                # L'API Dynatrace ne renvoie pas toujours directement les IPs dans les propriétés principales
                entity_str = str(entity)
                if ip_address in entity_str:
                    found_entity = entity
                    break
        
        # Si nous avons trouvé une entité, récupérer les informations d'OS
        if found_entity:
            properties = found_entity.get('properties', {})
            os_type = properties.get('osType', '')
            os_version = properties.get('osVersion', '')
            
            # Tentative de récupération des technologies logicielles pour des informations OS plus détaillées
            software_technologies = properties.get('softwareTechnologies', [])
            os_details = ""
            
            for tech in software_technologies:
                if tech.get('type') == 'OS':
                    os_details = tech.get('version', '')
                    break
            
            # Combiner les informations d'OS
            if os_type and os_version:
                return f"{os_type} {os_version}"
            elif os_type and os_details:
                return f"{os_type} {os_details}"
            elif os_type:
                return os_type
            else:
                return "Informations d'OS limitées"
        else:
            return "Non trouvé dans Dynatrace"
    except Exception as e:
        print(f"Erreur lors de la requête Dynatrace pour {hostname}: {e}")
        return "Erreur de requête"

# Fonction principale
def main():
    # Charger la configuration
    config = load_config()
    
    # Définir le chemin du fichier Excel avec option de modification
    default_excel_file = "OS_DYNATRACE.xlsx"
    excel_file = input(f"Entrez le chemin complet du fichier Excel [{default_excel_file}]: ") or default_excel_file
    
    # Créer une copie de sauvegarde du fichier
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{os.path.splitext(excel_file)[0]}_{timestamp}_backup.xlsx"
    
    try:
        # Lire le fichier Excel
        print(f"Lecture du fichier {excel_file}...")
        df = pd.read_excel(excel_file)
        
        # Créer une copie de sauvegarde
        df.to_excel(backup_file, index=False)
        print(f"Sauvegarde créée: {backup_file}")
        
        # Vérifier la validité du token Dynatrace
        if not check_dynatrace_token(config):
            print("Impossible de se connecter à Dynatrace. Vérifiez votre token API.")
            exit(1)
        
        # Créer une colonne pour l'OS Dynatrace si elle n'existe pas déjà
        if 'OS DYNATRACE' not in df.columns:
            df['OS DYNATRACE'] = ""
        
        # Parcourir chaque ligne et récupérer les informations d'OS
        print("Récupération des informations OS depuis Dynatrace...")
        total_rows = len(df)
        
        for idx, row in df.iterrows():
            # Selon votre fichier, adapter les noms de colonnes
            hostname = row.get('Hostname', '')
            ip_address = None
            
            # Chercher l'adresse IP dans les colonnes possibles
            for col_name in ['Ip Address', 'IP', 'IP Address', 'Ip Adress']:
                if col_name in row and row[col_name]:
                    ip_address = row[col_name]
                    break
            
            if not hostname and not ip_address:
                df.at[idx, 'OS DYNATRACE'] = "Données insuffisantes"
                continue
                
            print(f"Traitement ({idx+1}/{total_rows}): {hostname or ip_address}")
            
            # Récupérer l'OS depuis Dynatrace
            os_info = get_os_from_dynatrace(hostname, ip_address, config)
            df.at[idx, 'OS DYNATRACE'] = os_info
            
            # Ajouter un délai pour éviter de surcharger l'API
            time.sleep(0.5)
        
        # Enregistrer les modifications dans un nouveau fichier
        output_file = f"{os.path.splitext(excel_file)[0]}_with_os.xlsx"
        df.to_excel(output_file, index=False)
        print(f"Fichier mis à jour enregistré sous: {output_file}")
        
        # Option pour mettre à jour le fichier d'origine
        update_original = input("Voulez-vous mettre à jour le fichier d'origine? (o/n): ").lower()
        if update_original == 'o' or update_original == 'oui':
            df.to_excel(excel_file, index=False)
            print(f"Fichier d'origine mis à jour: {excel_file}")
        
    except Exception as e:
        print(f"Erreur lors du traitement: {e}")
        
if __name__ == "__main__":
    main()