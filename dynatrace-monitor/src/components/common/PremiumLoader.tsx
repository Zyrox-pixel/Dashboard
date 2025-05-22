import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

interface PremiumLoaderProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'orbit';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

const PremiumLoader: React.FC<PremiumLoaderProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  className = ''
}) => {
  const { isDarkTheme } = useTheme();
  
  // Configuration des tailles
  const sizeConfig = {
    sm: { container: 'w-8 h-8', element: 'w-2 h-2', text: 'text-sm' },
    md: { container: 'w-12 h-12', element: 'w-3 h-3', text: 'text-base' },
    lg: { container: 'w-16 h-16', element: 'w-4 h-4', text: 'text-lg' },
    xl: { container: 'w-24 h-24', element: 'w-5 h-5', text: 'text-xl' }
  };
  
  const currentSize = sizeConfig[size];
  
  // Variantes de loaders
  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`relative ${currentSize.container}`}>
            {/* Anneau principal */}
            <motion.div
              className={`absolute inset-0 rounded-full border-4 ${
                isDarkTheme 
                  ? 'border-slate-700 border-t-indigo-500' 
                  : 'border-slate-200 border-t-indigo-600'
              }`}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* Anneau secondaire */}
            <motion.div
              className={`absolute inset-2 rounded-full border-2 ${
                isDarkTheme 
                  ? 'border-transparent border-r-purple-500' 
                  : 'border-transparent border-r-purple-600'
              }`}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        );
        
      case 'dots':
        return (
          <div className={`flex gap-1.5 ${currentSize.container} items-center justify-center`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`${currentSize.element} rounded-full ${
                  isDarkTheme 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                }`}
                animate={{
                  y: [-10, 0, -10],
                  scale: [0.8, 1, 0.8]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        );
        
      case 'pulse':
        return (
          <div className={`relative ${currentSize.container} flex items-center justify-center`}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-full ${
                  isDarkTheme 
                    ? 'bg-indigo-500' 
                    : 'bg-indigo-600'
                }`}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeOut"
                }}
              />
            ))}
            <div className={`relative ${currentSize.element} rounded-full ${
              isDarkTheme 
                ? 'bg-gradient-to-r from-indigo-400 to-purple-400' 
                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`} />
          </div>
        );
        
      case 'wave':
        return (
          <div className={`flex gap-1 ${currentSize.container} items-center justify-center`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className={`w-1 ${
                  isDarkTheme 
                    ? 'bg-gradient-to-t from-indigo-500 to-purple-500' 
                    : 'bg-gradient-to-t from-indigo-600 to-purple-600'
                } rounded-full`}
                animate={{
                  height: ['20%', '100%', '20%']
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        );
        
      case 'orbit':
        return (
          <div className={`relative ${currentSize.container}`}>
            {/* Centre */}
            <div className={`absolute inset-1/3 rounded-full ${
              isDarkTheme 
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600'
            }`} />
            {/* Orbites */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <div 
                  className={`absolute ${currentSize.element} rounded-full ${
                    isDarkTheme 
                      ? ['bg-blue-400', 'bg-purple-400', 'bg-pink-400'][i]
                      : ['bg-blue-500', 'bg-purple-500', 'bg-pink-500'][i]
                  }`}
                  style={{
                    top: '50%',
                    left: i === 0 ? '0%' : i === 1 ? '100%' : '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </motion.div>
            ))}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {renderLoader()}
      </motion.div>
      
      {text && (
        <motion.p
          className={`${currentSize.text} font-medium ${
            isDarkTheme ? 'text-slate-300' : 'text-slate-600'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

export default PremiumLoader;