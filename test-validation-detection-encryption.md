# Validation du correctif pour le cache des problèmes sur "Détection CTL" et "Security Encryption"

## Contexte
Nous avons constaté que les pages d'accueil des applications "Détection CTL" et "Security Encryption" affichaient des données incorrectes lorsqu'elles étaient issues du cache. Ce problème se manifestait par:
- Nombre de problèmes actifs et récents à zéro, alors que ce n'était pas correct
- Compteurs erronés dans les Management Zones
- Données correctes uniquement après un refresh manuel

## Correctifs appliqués
1. Ajout de variables d'état dédiées dans `ProblemsContext.tsx`:
   - `detectionProblems` et `detectionProblems72h` pour "Détection CTL"
   - `encryptionProblems` et `encryptionProblems72h` pour "Security Encryption"

2. Création de fonctions de rafraîchissement spécifiques:
   - `refreshDetection()`
   - `refreshEncryption()`

3. Mise à jour de `DashboardBase.tsx` pour utiliser les données spécifiques à chaque application

4. Mise à jour de `UnifiedDashboard.tsx` pour rafraîchir les données appropriées lors du changement de dashboard

## Procédure de validation

### Test pour "Détection CTL"
1. **Étape 1:** Accéder à l'application et naviguer vers "Détection CTL"
   - Vérifier que le nombre de problèmes actifs est correctement affiché
   - Vérifier que le nombre de problèmes récents (72h) est correctement affiché
   - Vérifier que les Management Zones affichent les bons compteurs

2. **Étape 2:** Naviguer vers une autre application (ex: "Vital for Group")
   - Observer que les données sont différentes et correspondent à cette application

3. **Étape 3:** Revenir à "Détection CTL" sans rafraîchir la page
   - Vérifier que les nombres de problèmes actifs et récents correspondent toujours aux données de "Détection CTL"
   - Vérifier que les compteurs des Management Zones sont corrects

### Test pour "Security Encryption"
1. **Étape 1:** Accéder à l'application et naviguer vers "Security Encryption"
   - Vérifier que le nombre de problèmes actifs est correctement affiché
   - Vérifier que le nombre de problèmes récents (72h) est correctement affiché
   - Vérifier que les Management Zones affichent les bons compteurs

2. **Étape 2:** Naviguer vers une autre application (ex: "Vital for Enterprise")
   - Observer que les données sont différentes et correspondent à cette application

3. **Étape 3:** Revenir à "Security Encryption" sans rafraîchir la page
   - Vérifier que les nombres de problèmes actifs et récents correspondent toujours aux données de "Security Encryption"
   - Vérifier que les compteurs des Management Zones sont corrects

### Test de la vue détaillée des problèmes
1. **Étape 1:** Accéder à "Détection CTL" et cliquer sur les problèmes pour voir la vue détaillée
   - Vérifier que les données sont cohérentes avec ce qui était affiché sur la page d'accueil

2. **Étape 2:** Faire de même pour "Security Encryption"
   - Vérifier que les données sont cohérentes avec ce qui était affiché sur la page d'accueil

## Comportement attendu
- Chaque application doit conserver ses propres données dans son propre cache
- Après navigation entre les différentes applications, les données propres à chaque application doivent être correctement affichées
- Il ne devrait plus être nécessaire de rafraîchir manuellement la page pour voir les données correctes

## Notes complémentaires
Si les tests ci-dessus sont réussis, le correctif peut être considéré comme validé. En cas d'échec de l'un des tests, merci de documenter précisément le comportement observé pour permettre des ajustements supplémentaires.
