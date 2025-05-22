import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook personnalisé pour gérer le focus dans la navigation
 * Empêche le focus parasite lors du changement de route
 */
export const useFocusManagement = () => {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Détecter le changement de route
    if (previousPathRef.current !== location.pathname) {
      // Retirer le focus de tous les éléments de navigation
      const navigationLinks = document.querySelectorAll('[data-menu-item]');
      navigationLinks.forEach(link => {
        (link as HTMLElement).blur();
      });

      // Retirer le focus global si nécessaire
      if (document.activeElement instanceof HTMLElement) {
        // Vérifier si l'élément actif est un lien de navigation
        if (document.activeElement.hasAttribute('data-menu-item')) {
          document.activeElement.blur();
        }
      }

      // Mettre à jour la référence du chemin précédent
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  /**
   * Fonction pour gérer le clic sur un élément de navigation
   * Empêche le focus parasite en retirant immédiatement le focus
   */
  const handleNavigationClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    
    // Retirer le focus après le prochain tick
    requestAnimationFrame(() => {
      target.blur();
      
      // S'assurer que tous les autres liens perdent aussi le focus
      const allLinks = document.querySelectorAll('[data-menu-item]');
      allLinks.forEach(link => {
        if (link !== target) {
          (link as HTMLElement).blur();
        }
      });
    });
  };

  /**
   * Fonction pour gérer le mousedown sur un élément de navigation
   * Empêche le comportement de focus par défaut
   */
  const handleNavigationMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    // Empêcher le focus par défaut lors du clic
    event.preventDefault();
  };

  return {
    handleNavigationClick,
    handleNavigationMouseDown
  };
};