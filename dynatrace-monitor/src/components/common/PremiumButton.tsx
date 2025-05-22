import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface PremiumButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const PremiumButton: React.FC<PremiumButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  className = '',
  type = 'button'
}) => {
  const { isDarkTheme } = useTheme();
  
  // Configuration des tailles
  const sizeConfig = {
    sm: { padding: 'px-3 py-1.5', text: 'text-sm', icon: 14 },
    md: { padding: 'px-4 py-2', text: 'text-base', icon: 16 },
    lg: { padding: 'px-6 py-3', text: 'text-lg', icon: 18 }
  };
  
  const currentSize = sizeConfig[size];
  
  // Styles selon la variante
  const getVariantStyles = () => {
    const baseStyles = `${currentSize.padding} ${currentSize.text} font-medium rounded-lg transition-all duration-300 relative overflow-hidden`;
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 shadow-lg shadow-indigo-900/30'
            : 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white hover:from-indigo-600 hover:to-indigo-500 shadow-lg shadow-indigo-200/50'
        }`;
        
      case 'secondary':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
        }`;
        
      case 'success':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg shadow-green-900/30'
            : 'bg-gradient-to-r from-green-500 to-green-400 text-white hover:from-green-600 hover:to-green-500 shadow-lg shadow-green-200/50'
        }`;
        
      case 'danger':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-900/30'
            : 'bg-gradient-to-r from-red-500 to-red-400 text-white hover:from-red-600 hover:to-red-500 shadow-lg shadow-red-200/50'
        }`;
        
      case 'warning':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600 shadow-lg shadow-amber-900/30'
            : 'bg-gradient-to-r from-amber-500 to-amber-400 text-white hover:from-amber-600 hover:to-amber-500 shadow-lg shadow-amber-200/50'
        }`;
        
      case 'gradient':
        return `${baseStyles} ${
          isDarkTheme
            ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-lg shadow-purple-900/30'
            : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-200/50'
        }`;
        
      default:
        return baseStyles;
    }
  };
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${getVariantStyles()} ${fullWidth ? 'w-full' : ''} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className} flex items-center justify-center gap-2 group`}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
    >
      {/* Effet de brillance au hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${
            isDarkTheme ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)'
          } 50%, transparent 60%)`,
        }}
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
      
      {/* Contenu du bouton */}
      <div className="relative z-10 flex items-center gap-2">
        {loading ? (
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {React.cloneElement(icon as React.ReactElement, { 
                  size: currentSize.icon 
                })}
              </motion.div>
            )}
            
            <span>{children}</span>
            
            {icon && iconPosition === 'right' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {React.cloneElement(icon as React.ReactElement, { 
                  size: currentSize.icon 
                })}
              </motion.div>
            )}
          </>
        )}
      </div>
      
      {/* Effet de ripple au clic */}
      <motion.span
        className="absolute inset-0 rounded-lg"
        initial={{ scale: 0, opacity: 0.5 }}
        whileTap={{
          scale: 2,
          opacity: 0,
          transition: { duration: 0.5 }
        }}
        style={{
          background: `radial-gradient(circle, ${
            isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'
          } 0%, transparent 70%)`
        }}
      />
    </motion.button>
  );
};

export default PremiumButton;