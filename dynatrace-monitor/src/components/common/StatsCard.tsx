import React, { useState, useEffect, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  /** Titre de la carte */
  title: string;
  /** Valeur principale à afficher */
  value: string | number;
  /** Sous-titre ou description */
  subtitle?: string;
  /** Pourcentage de changement (positif ou négatif) */
  change?: number;
  /** Période de comparaison pour le changement */
  period?: string;
  /** Icône à afficher (component Lucide) */
  icon?: LucideIcon;
  /** Couleur d'accentuation (primary, success, warning, error) */
  accentColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Style de design (default, 3d, glass, neu, holo) */
  design?: 'default' | '3d' | 'glass' | 'neu' | 'holo';
  /** Classes CSS additionnelles */
  className?: string;
  /** Animation à appliquer pour la valeur */
  animation?: 'none' | 'count' | 'pulse' | 'fade';
  /** Url de lien lors du clic sur la carte */
  linkTo?: string;
  /** Taille de la carte (sm, md, lg) */
  size?: 'sm' | 'md' | 'lg';
  /** Effet de particules d'arrière-plan */
  particles?: boolean;
}

/**
 * Carte de statistiques avancée et immersive avec effets visuels futuristes
 * pour afficher des métriques et données importantes.
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  change,
  period = '24h',
  icon: Icon,
  accentColor = 'primary',
  design = 'default',
  className = '',
  animation = 'none',
  linkTo,
  size = 'md',
  particles = false
}) => {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Effet de montage avec délai pour les animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Effet d'animation du compteur
  useEffect(() => {
    if (animation === 'count' && typeof value === 'number') {
      const targetValue = value;
      const startValue = 0;
      const duration = 2000; // ms
      const frameRate = 1000 / 60; // 60fps
      const totalFrames = Math.round(duration / frameRate);
      const valueIncrement = (targetValue - startValue) / totalFrames;

      let currentFrame = 0;
      const counter = setInterval(() => {
        currentFrame++;
        const newValue = Math.round(startValue + valueIncrement * currentFrame);
        
        if (currentFrame >= totalFrames) {
          clearInterval(counter);
          setCurrentValue(targetValue);
        } else {
          setCurrentValue(newValue);
        }
      }, frameRate);
      
      return () => clearInterval(counter);
    }
  }, [animation, value]);
  
  // Effet pour gérer le mouvement 3D
  useEffect(() => {
    if (!cardRef.current || design !== '3d') return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top;  // y position within the element
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      
      // Mise à jour des coordonnées pour les effets de particules
      setCoordinates({ x, y });
    };
    
    const handleMouseLeave = () => {
      if (!cardRef.current) return;
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    };
    
    const card = cardRef.current;
    
    if (isHovered) {
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      if (card) {
        card.removeEventListener('mousemove', handleMouseMove);
        card.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isHovered, design]);
  
  // Effet sonore lors du survol
  const playHoverSound = () => {
    try {
      const audio = new Audio('data:audio/mp3;base64,SUQzAwAAAAAAJlRQRTEAAAAcAAAAU291bmRKYXkuY29tIFNvdW5kIEVmZmVjdHMA//uQxAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAADAAAGhgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr///////////////////////////////////////////8AAAA8TEFNRTMuMTAwAZYAAAAAAAAAABSAJAJAQgAAgAAAA+alYY0KAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAEAQBn/AAAgAAFfoAAATQArkVYjmZcGbFDcJ0PslgdkdIQMlEdJF69ILCjvO58y6kbJA1EOLbZifTwJUh4kDZ/QOAyQI5XycI5JLLbaDQ8vZ1nJUmj/+5LEAwPAAAGkAAAAIAAANIAAAAQRomdkdndrbC443W+DFMbiIZNfjVIjIIdKPSKRTzarddvpB0//Sg6p6YLn0ilMzmz1I9KWtfrRagk//1CpBwRlyRVQuXGn//pB0eGgRmwRmL0aC3///8rCDg8CMZDNFhQNS3/////8iCQVhAZm2RmImInTu7//////KGaLDQzUYzcoYk6u//////JEiQNS5oZoMG4hQlS//////+SGCwNS6QzRYUDUtBu7u7u7u//+7LEAwPAAAGkAAAAIAAANIAAAATu7u7szMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM//uwxAAD/AAAGkAAAAIAAANIAAAASzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM');
      audio.volume = 0.05;
      audio.play();
    } catch (e) {
      console.log('Sound effect not supported');
    }
  };
  
  // Déterminer les classes CSS basées sur l'accentuation
  const getAccentClasses = () => {
    switch (accentColor) {
      case 'success':
        return {
          icon: 'text-emerald-400',
          badge: 'bg-emerald-900/20 text-emerald-300 border-emerald-600/30',
          gradient: 'from-emerald-600/10 to-emerald-900/5',
          text: 'text-emerald-400',
          borderAccent: 'border-emerald-600/30',
          glow: 'rgba(0, 255, 170, 0.5)',
          glowIntense: 'rgba(0, 255, 170, 0.8)'
        };
      case 'warning':
        return {
          icon: 'text-amber-400',
          badge: 'bg-amber-900/20 text-amber-300 border-amber-600/30',
          gradient: 'from-amber-600/10 to-amber-900/5',
          text: 'text-amber-400',
          borderAccent: 'border-amber-600/30',
          glow: 'rgba(255, 165, 0, 0.5)',
          glowIntense: 'rgba(255, 165, 0, 0.8)'
        };
      case 'error':
        return {
          icon: 'text-red-400',
          badge: 'bg-red-900/20 text-red-300 border-red-600/30',
          gradient: 'from-red-600/10 to-red-900/5',
          text: 'text-red-400',
          borderAccent: 'border-red-600/30',
          glow: 'rgba(255, 53, 94, 0.5)',
          glowIntense: 'rgba(255, 53, 94, 0.8)'
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          badge: 'bg-blue-900/20 text-blue-300 border-blue-600/30',
          gradient: 'from-blue-600/10 to-blue-900/5',
          text: 'text-blue-400',
          borderAccent: 'border-blue-600/30',
          glow: 'rgba(0, 158, 255, 0.5)',
          glowIntense: 'rgba(0, 158, 255, 0.8)'
        };
      default:
        return {
          icon: 'text-indigo-400',
          badge: 'bg-indigo-900/20 text-indigo-300 border-indigo-600/30',
          gradient: 'from-indigo-600/10 to-indigo-900/5',
          text: 'text-indigo-400',
          borderAccent: 'border-indigo-600/30',
          glow: 'rgba(125, 39, 255, 0.5)',
          glowIntense: 'rgba(125, 39, 255, 0.8)'
        };
    }
  };
  
  // Déterminer les classes CSS basées sur le style de design
  const getDesignClasses = () => {
    const accentColors = getAccentClasses();
    
    switch (design) {
      case '3d':
        return `bg-gradient-to-br from-[#14152e] via-[#191a3a] to-[#14152e] border border-indigo-900/30 shadow-lg transition-all duration-300 ${accentColors.borderAccent}`;
      case 'glass':
        return `bg-[#14152e]/80 backdrop-blur-xl border border-white/10 shadow-xl transition-all duration-300 ${accentColors.borderAccent}`;
      case 'neu':
        return `bg-[#14152e] border ${accentColors.borderAccent} neu-shadow transition-all duration-300`;
      case 'holo':
        return `relative holo-card border ${accentColors.borderAccent} transition-all duration-300`;
      default:
        return `bg-[#14152e] border border-indigo-900/30 shadow-md hover:shadow-lg transition-all duration-300 ${accentColors.borderAccent}`;
    }
  };
  
  // Déterminer les classes CSS basées sur la taille
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'p-3';
      case 'lg':
        return 'p-6';
      default:
        return 'p-5';
    }
  };
  
  // Récupérer les classes spécifiques
  const accentClasses = getAccentClasses();
  const designClasses = getDesignClasses();
  const sizeClasses = getSizeClasses();
  
  // Valeur à afficher en fonction de l'animation
  const displayValue = animation === 'count' && typeof value === 'number' ? currentValue : value;
  
  // Créer les particules d'arrière-plan
  const renderParticles = () => {
    if (!particles) return null;
    
    return (
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={`particle-${i}`} 
            className={`absolute w-1 h-1 rounded-full ${accentClasses.text}/70`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `glow-float ${3 + Math.random() * 5}s ease-in-out infinite ${Math.random() * 2}s`
            }}
          ></div>
        ))}
      </div>
    );
  };
  
  // Créer un lien conditionnel
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (linkTo) {
      return (
        <a 
          href={linkTo}
          className="block h-full cursor-pointer" 
          onMouseEnter={() => {
            setIsHovered(true);
            playHoverSound();
          }}
          onMouseLeave={() => setIsHovered(false)}
        >
          {children}
        </a>
      );
    }
    
    return (
      <div 
        onMouseEnter={() => {
          setIsHovered(true);
          playHoverSound();
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
    );
  };
  
  return (
    <CardWrapper>
      <div 
        ref={cardRef}
        className={`rounded-xl overflow-hidden ${designClasses} ${sizeClasses} ${className} transform transition-all duration-300 ${isHovered ? 'scale-[1.02]' : 'scale-100'} relative`}
        style={{
          transformStyle: design === '3d' ? 'preserve-3d' : 'flat',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Effet de lueur au survol */}
        {isHovered && (
          <div 
            className="absolute inset-0 -z-10 rounded-xl opacity-70 blur-xl transition-opacity duration-300"
            style={{ 
              background: `radial-gradient(circle at ${coordinates.x}px ${coordinates.y}px, ${accentClasses.glowIntense} 0%, transparent 70%)`,
              opacity: 0.3
            }}
          ></div>
        )}
        
        {/* Effet holographique pour le design holo */}
        {design === 'holo' && (
          <div 
            className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-purple-500/5 opacity-30 mix-blend-overlay pointer-events-none z-0 animate-gradient-shift"
          ></div>
        )}
        
        {/* Particules d'arrière-plan */}
        {renderParticles()}
        
        <div className={`bg-gradient-to-br ${accentClasses.gradient} relative z-10`}>
          <div className="flex justify-between items-start">
            {/* Titre et valeur */}
            <div>
              <h3 className={`font-medium text-sm text-indigo-300 mb-2 ${isMounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                {title}
              </h3>
              
              <div className="flex items-baseline gap-2">
                <span 
                  className={`text-2xl font-bold text-white ${
                    animation === 'pulse' ? 'animate-pulse-cosmic' : 
                    animation === 'fade' ? 'animate-fade-in' : ''
                  } ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all duration-500 delay-100`}
                >
                  {displayValue}
                </span>
                
                {/* Indicateur de changement */}
                {change !== undefined && (
                  <div 
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      change >= 0 
                        ? 'bg-emerald-900/20 text-emerald-300 border border-emerald-700/30' 
                        : 'bg-red-900/20 text-red-300 border border-red-700/30'
                    } ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} transition-all duration-500 delay-200 transform origin-left`}
                  >
                    {change >= 0 ? '+' : ''}{change}%
                  </div>
                )}
              </div>
              
              {/* Sous-titre ou période */}
              {subtitle && (
                <p 
                  className={`text-xs text-indigo-400 mt-1 ${isMounted ? 'opacity-70' : 'opacity-0'} transition-opacity duration-500 delay-300`}
                >
                  {subtitle}
                </p>
              )}
              {!subtitle && change !== undefined && (
                <p 
                  className={`text-xs text-indigo-400 mt-1 ${isMounted ? 'opacity-70' : 'opacity-0'} transition-opacity duration-500 delay-300`}
                >
                  vs. {period} précédentes
                </p>
              )}
            </div>
            
            {/* Icône */}
            {Icon && (
              <div 
                className={`p-3 rounded-xl bg-[#191a3a] border border-indigo-800/50 ${accentClasses.icon} ${
                  isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                } transition-all duration-500 delay-100 transform ${
                  isHovered ? 'shadow-glow' : ''
                }`}
                style={{
                  boxShadow: isHovered ? `0 0 15px ${accentClasses.glow}` : 'none',
                  transform: design === '3d' && isHovered ? 'translateZ(20px)' : 'none'
                }}
              >
                <Icon size={24} className={`${isHovered ? 'animate-pulse-gentle' : ''}`} />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Les styles pour les animations ont été déplacés dans animations.css */}
    </CardWrapper>
  );
};

export default StatsCard;