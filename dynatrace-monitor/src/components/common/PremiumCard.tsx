import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface PremiumCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'neumorphic' | 'holographic';
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
  delay?: number;
}

const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  variant = 'default',
  hover = true,
  onClick,
  padding = 'md',
  className = '',
  animate = true,
  delay = 0
}) => {
  const { isDarkTheme } = useTheme();
  
  // Configuration du padding
  const paddingConfig = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const currentPadding = paddingConfig[padding];
  
  // Styles selon la variante
  const getVariantStyles = () => {
    const baseStyles = `${currentPadding} rounded-xl transition-all duration-300 relative overflow-hidden`;
    
    switch (variant) {
      case 'glass':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 shadow-xl'
            : 'bg-white/30 backdrop-blur-xl border border-slate-200/50 shadow-xl'
        }`;
        
      case 'gradient':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 border border-slate-700/50 shadow-xl'
            : 'bg-gradient-to-br from-white/90 via-slate-50/80 to-white/90 border border-slate-200/50 shadow-xl'
        }`;
        
      case 'neumorphic':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-slate-900 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]'
            : 'bg-slate-100 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.1),inset_-2px_-2px_5px_rgba(255,255,255,0.8)]'
        }`;
        
      case 'holographic':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 backdrop-blur-xl border border-indigo-700/30'
            : 'bg-gradient-to-br from-indigo-100/40 via-purple-100/40 to-pink-100/40 backdrop-blur-xl border border-indigo-300/30'
        }`;
        
      default:
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 shadow-lg'
            : 'bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg'
        }`;
    }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        delay,
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  
  const hoverVariants = hover ? {
    hover: {
      y: -5,
      scale: 1.02,
      transition: { duration: 0.3 }
    }
  } : {};
  
  return (
    <motion.div
      className={`${getVariantStyles()} ${onClick ? 'cursor-pointer' : ''} ${className} group`}
      onClick={onClick}
      variants={cardVariants}
      initial={animate ? "hidden" : false}
      animate={animate ? "visible" : false}
      whileHover={hover ? "hover" : undefined}
      {...hoverVariants}
    >
      {/* Effet de fond animé pour certaines variantes */}
      {(variant === 'gradient' || variant === 'holographic') && (
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: variant === 'holographic' ? [
              'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 80%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)'
            ] : [
              'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)'
            ]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      )}
      
      {/* Effet de brillance au hover */}
      {hover && (
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 30%, ${
              isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)'
            } 50%, transparent 70%)`,
          }}
          initial={{ x: '-100%', y: '-100%' }}
          whileHover={{ x: '100%', y: '100%' }}
          transition={{ duration: 0.8 }}
        />
      )}
      
      {/* Effet holographique spécial */}
      {variant === 'holographic' && (
        <div className="absolute inset-0 opacity-50 mix-blend-overlay pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 2px,
                  ${isDarkTheme ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)'} 2px,
                  ${isDarkTheme ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)'} 4px
                )
              `
            }}
          />
        </div>
      )}
      
      {/* Contenu de la carte */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Bordure animée pour les cartes glass */}
      {variant === 'glass' && hover && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${
              isDarkTheme ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)'
            }, transparent)`,
            opacity: 0
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
};

export default PremiumCard;