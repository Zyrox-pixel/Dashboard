/**
 * Utilitaires pour les micro-interactions et animations
 * Permet d'ajouter des effets visuels et sonores avancés
 */

/**
 * Fonction vide pour les effets sonores - remplace les fonctions originales qui utilisaient audio.play()
 * @param type - Type d'effet sonore (non utilisé)
 */
export const playSoundEffect = (type: 'click' | 'hover' | 'success' | 'error' | 'notification' = 'click') => {
  // Ne fait rien - suppression des effets sonores
};

/**
 * Ajoute un effet de ripple à un élément
 * @param element - L'élément auquel ajouter l'effet
 * @param event - L'événement de clic
 */
export const addRippleEffect = (element: HTMLElement, event: MouseEvent) => {
  const circle = document.createElement('span');
  const diameter = Math.max(element.clientWidth, element.clientHeight);
  
  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - element.getBoundingClientRect().left - diameter / 2}px`;
  circle.style.top = `${event.clientY - element.getBoundingClientRect().top - diameter / 2}px`;
  
  circle.classList.add('ripple');
  
  const ripple = element.querySelector('.ripple');
  if (ripple) {
    ripple.remove();
  }
  
  element.appendChild(circle);
  
  // Nettoyer après l'animation
  setTimeout(() => {
    if (circle.parentElement) {
      circle.parentElement.removeChild(circle);
    }
  }, 600);
};

/**
 * Ajoute effet de glitch sur un élément
 * @param element - L'élément HTML à animer
 */
export const addGlitchEffect = (element: HTMLElement) => {
  element.classList.add('animate-glitch');
  
  // Supprimer la classe après la fin de l'animation
  setTimeout(() => {
    element.classList.remove('animate-glitch');
  }, 500);
};

/**
 * Ajoute des particules flottantes à un conteneur
 * @param container - Le conteneur où ajouter les particules
 * @param count - Le nombre de particules à ajouter
 * @param type - Le type de particules (style de couleur)
 */
export const addFloatingParticles = (
  container: HTMLElement, 
  count: number = 10, 
  type: 'primary' | 'cyan' | 'emerald' = 'primary'
) => {
  // Nettoyer les particules existantes
  container.querySelectorAll('.particle').forEach(particle => particle.remove());
  
  // Ajouter les nouvelles particules
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    
    // Ajouter les classes de base et spécifiques au type
    particle.classList.add('particle');
    if (type === 'cyan') particle.classList.add('particle-cyan');
    if (type === 'emerald') particle.classList.add('particle-emerald');
    
    // Positionner aléatoirement
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.left = `${Math.random() * 100}%`;
    
    // Décaler l'animation pour chaque particule
    particle.style.animationDelay = `${Math.random() * 5}s`;
    
    container.appendChild(particle);
  }
};

/**
 * Initialise les observateurs d'animation pour les éléments avec chargement progressif
 */
export const initAnimationObservers = () => {
  // Vérifier si IntersectionObserver est disponible
  if (!('IntersectionObserver' in window)) return;
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  // Observer pour les éléments à charger progressivement
  const staggeredObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Ajouter un délai basé sur l'index pour l'effet séquentiel
        setTimeout(() => {
          entry.target.classList.add('staggered-item-visible');
        }, index * 100);
        
        staggeredObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observer les cartes et éléments qui doivent apparaître progressivement
  document.querySelectorAll('.staggered-item').forEach((item) => {
    staggeredObserver.observe(item);
  });
};

/**
 * Crée une notification animée temporaire
 * @param message - Le message à afficher
 * @param type - Le type de notification
 * @param duration - La durée d'affichage en ms
 */
export const showNotification = (
  message: string, 
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  duration: number = 3000
) => {
  // Créer le conteneur de notifications s'il n'existe pas
  let notificationsContainer = document.getElementById('notifications-container');
  
  if (!notificationsContainer) {
    notificationsContainer = document.createElement('div');
    notificationsContainer.id = 'notifications-container';
    notificationsContainer.className = 'fixed top-4 right-4 z-50 w-72 space-y-2 pointer-events-none';
    document.body.appendChild(notificationsContainer);
  }
  
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = `notification-item pointer-events-auto rounded-lg p-3 shadow-lg ${
    type === 'success' ? 'bg-emerald-900/80 border border-emerald-700/50 text-emerald-100' :
    type === 'error' ? 'bg-red-900/80 border border-red-700/50 text-red-100' :
    type === 'warning' ? 'bg-amber-900/80 border border-amber-700/50 text-amber-100' :
    'bg-indigo-900/80 border border-indigo-700/50 text-indigo-100'
  } backdrop-blur-md`;
  
  notification.innerHTML = message;
  
  // Ajouter la notification au conteneur
  notificationsContainer.appendChild(notification);
  
  // Retrait du son de notification
  // playSoundEffect('notification');
  
  // Supprimer la notification après la durée spécifiée
  setTimeout(() => {
    notification.classList.add('notification-item-exiting');
    
    // Supprimer l'élément après la fin de l'animation
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 300);
  }, duration);
};

// Initialiser les animations au chargement de la page
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initAnimationObservers();
  });
}