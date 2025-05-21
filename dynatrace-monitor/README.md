# PRODSEC Monitor - Dashboard Dynatrace

Dashboard de monitoring pour les applications PRODSEC utilisant Dynatrace.

## Configuration

### Configuration du Backend

L'onglet Hosts nécessite que la variable `mzadmin` soit configurée dans le backend. Cette variable définit quelle Management Zone sera utilisée pour afficher les hosts.

**Important** : La configuration se fait dans le fichier `.of` du backend. Consultez le fichier `backend/README_MZADMIN.md` pour les instructions détaillées de configuration.

## Sections du Dashboard

Le dashboard est organisé en plusieurs sections :

### Applications
- Vital for Group
- Vital for Enterprise

### Domain
- Detection CTL
- Security Encryption

### Inventory
- Hosts : Affiche tous les hosts de la Management Zone définie par `REACT_APP_MZADMIN`

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.