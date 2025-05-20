# Configuration de mzadmin pour l'onglet Hosts

Pour que l'onglet Hosts fonctionne correctement, il est nécessaire de configurer une variable `mzadmin` dans le fichier de configuration du backend. Cette variable doit contenir le nom exact d'une Management Zone Dynatrace qui regroupe les hosts à afficher.

## 1. Configuration du backend

Dans le fichier `config.py` du backend, ajouter la configuration suivante :

```python
# Configuration de la Management Zone pour l'onglet Hosts
MZ_ADMIN = os.environ.get('MZ_ADMIN', 'NomDeLaManagementZone')
```

## 2. Route API pour récupérer la configuration

Ajouter la route suivante dans `app.py` pour permettre au frontend de récupérer la configuration :

```python
@app.route('/api/mz-admin', methods=['GET'])
def get_mz_admin():
    """Récupère la Management Zone configurée pour l'onglet Hosts"""
    try:
        from config import MZ_ADMIN
        return jsonify({
            'mzadmin': MZ_ADMIN
        })
    except (ImportError, AttributeError):
        return jsonify({
            'mzadmin': '',
            'error': 'Configuration MZ_ADMIN non trouvée dans le fichier config.py'
        }), 500
```

## 3. Configuration via fichier .of ou .env

Pour configurer la valeur de `MZ_ADMIN`, vous pouvez :

1. Définir directement la valeur dans `config.py`
2. Utiliser une variable d'environnement `MZ_ADMIN`
3. Créer un fichier `.of` contenant la configuration

### Exemple de configuration via fichier .of

Créer un fichier `.of` à la racine du projet avec le contenu suivant :

```
MZ_ADMIN=NomDeLaManagementZone
```

Puis modifier `config.py` pour lire ce fichier :

```python
import os

# Lire les variables depuis le fichier .of s'il existe
def read_of_file():
    config = {}
    of_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.of')
    
    if os.path.exists(of_path):
        with open(of_path, 'r') as f:
            for line in f:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    config[key] = value
    
    return config

# Charger les variables depuis .of
of_config = read_of_file()

# Configuration de la Management Zone pour l'onglet Hosts
MZ_ADMIN = of_config.get('MZ_ADMIN', os.environ.get('MZ_ADMIN', 'NomDeLaManagementZone'))
```

## 4. Testez la configuration

Assurez-vous que la Management Zone existe dans Dynatrace et qu'elle contient bien les hosts à afficher.

Après avoir configuré et redémarré le backend, accédez à l'URL suivante pour vérifier que la configuration est correctement exposée :

```
http://localhost:5000/api/mz-admin
```

Vous devriez voir une réponse JSON contenant la valeur de `mzadmin`.