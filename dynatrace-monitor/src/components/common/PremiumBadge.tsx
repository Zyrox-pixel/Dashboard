import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface PremiumBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  pulse?: boolean;
  glow?: boolean;
  className?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  pulse = false,
  glow = false,
  className = ''
}) => {
  const { isDarkTheme } = useTheme();
  
  // Configuration des tailles
  const sizeConfig = {
    xs: { padding: 'px-1.5 py-0.5', text: 'text-xs', icon: 10 },
    sm: { padding: 'px-2 py-0.5', text: 'text-sm', icon: 12 },
    md: { padding: 'px-3 py-1', text: 'text-base', icon: 14 },
    lg: { padding: 'px-4 py-1.5', text: 'text-lg', icon: 16 }
  };
  
  const currentSize = sizeConfig[size];
  
  // Styles selon la variante
  const getVariantStyles = () => {
    const baseStyles = `${currentSize.padding} ${currentSize.text} font-semibold rounded-full inline-flex items-center gap-1.5 transition-all duration-300`;
    
    switch (variant) {
      case 'success':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
            : 'bg-green-100 text-green-700 border border-green-300/50'
        }`;
        
      case 'warning':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
            : 'bg-amber-100 text-amber-700 border border-amber-300/50'
        }`;
        
      case 'danger':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-red-900/50 text-red-300 border border-red-700/50'
            : 'bg-red-100 text-red-700 border border-red-300/50'
        }`;
        
      case 'info':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
            : 'bg-blue-100 text-blue-700 border border-blue-300/50'
        }`;
        
      case 'gradient':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-indigo-900/50 via-purple-900/50 to-pink-900/50 text-white border border-indigo-600/50'
            : 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-indigo-800 border border-indigo-300/50'
        }`;
        
      default:
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
            : 'bg-slate-100 text-slate-700 border border-slate-300/50'
        }`;
    }
  };
  
  // Couleur du glow selon la variante
  const getGlowColor = () => {
    switch (variant) {
      case 'success': return isDarkTheme ? 'rgba(34, 197, 94, 0.4)' : 'rgba(34, 197, 94, 0.3)';
      case 'warning': return isDarkTheme ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.3)';
      case 'danger': return isDarkTheme ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)';
      case 'info': return isDarkTheme ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)';
      case 'gradient': return isDarkTheme ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.3)';
      default: return isDarkTheme ? 'rgba(148, 163, 184, 0.4)' : 'rgba(148, 163, 184, 0.3)';
    }
  };
  
  return (
    <motion.span
      className={`${getVariantStyles()} ${className} relative`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.05 }}
    >
      {/* Effet de glow */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-full blur-md"
          style={{ backgroundColor: getGlowColor() }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Effet de pulse */}
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ 
            backgroundColor: getGlowColor(),
            opacity: 0.3
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Contenu */}
      <span className="relative z-10 flex items-center gap-1">
        {icon && (
          <motion.span
            initial={{ rotate: -180 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {React.cloneElement(icon as React.ReactElement, { 
              size: currentSize.icon 
            })}
          </motion.span>
        )}
        {children}
      </span>
      
      {/* Effet de brillance pour la variante gradient */}
      {variant === 'gradient' && (
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `linear-gradient(105deg, transparent 40%, ${
              isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)'
            } 50%, transparent 60%)`,
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </motion.span>
  );
};

export default PremiumBadge;