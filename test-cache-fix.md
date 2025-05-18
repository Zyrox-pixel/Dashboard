# Test de la correction du cache des problèmes

## Modifications apportées :

1. **DashboardBase.tsx** :
   - Ajout de l'import de `useProblems` depuis `ProblemsContext`
   - Récupération directe des problèmes depuis `ProblemsContext` au lieu de `AppContext`
   - Pour VFG : utilisation de `vfgProblems` et `vfgProblems72h`
   - Pour VFE : utilisation de `vfeProblems` et `vfeProblems72h`
   - Pour Detection et Encryption : filtrage depuis `AppContext` (temporaire)

2. **Mécanisme de cache** :
   - Les problèmes VFG et VFE sont maintenant stockés séparément dans `ProblemsContext`
   - Chaque dashboard récupère uniquement ses propres données
   - Élimination du mélange de cache entre les dashboards

## Comment tester :

1. Naviguer vers l'onglet "Vital for Group"
2. Noter le nombre de problèmes actifs et récents affichés
3. Naviguer vers l'onglet "Vital for Enterprise"
4. Vérifier que les nombres de problèmes sont différents et propres à VFE
5. Revenir à "Vital for Group"
6. Vérifier que les nombres sont restés cohérents avec ceux de l'étape 2

## Résultat attendu :

Chaque dashboard doit maintenant afficher ses propres problèmes sans contamination depuis un autre dashboard.

## Note :

Cette solution corrige le problème de cache en s'assurant que chaque type de dashboard utilise des sources de données séparées dans le ProblemsContext plutôt que des données partagées depuis AppContext.