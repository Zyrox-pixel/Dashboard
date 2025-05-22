import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  badgeColor?: string;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  variant?: 'default' | 'pills' | 'underline' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  rightContent?: React.ReactNode;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default',
  size = 'md',
  rightContent
}) => {
  const { isDarkTheme } = useTheme();
  
  // Configuration des tailles
  const sizeConfig = {
    sm: { padding: 'px-3 py-2', text: 'text-sm', icon: 14, badge: 'text-xs px-1.5 py-0.5' },
    md: { padding: 'px-4 py-3', text: 'text-sm', icon: 16, badge: 'text-xs px-2 py-0.5' },
    lg: { padding: 'px-6 py-4', text: 'text-base', icon: 18, badge: 'text-sm px-2.5 py-1' }
  };
  
  const currentSize = sizeConfig[size];
  
  // Styles selon la variante
  const getTabStyles = (isActive: boolean) => {
    const baseStyles = `${currentSize.padding} ${currentSize.text} font-medium transition-colors duration-200 cursor-pointer select-none`;
    
    switch (variant) {
      case 'pills':
        return `${baseStyles} rounded-lg ${
          isActive
            ? isDarkTheme
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/30'
              : 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-lg shadow-indigo-200/50'
            : isDarkTheme
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`;
        
      case 'underline':
        return `${baseStyles} border-b-2 ${
          isActive
            ? isDarkTheme
              ? 'border-indigo-500 text-white'
              : 'border-indigo-600 text-slate-900'
            : isDarkTheme
              ? 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
        }`;
        
      case 'gradient':
        return `${baseStyles} rounded-t-xl ${
          isActive
            ? isDarkTheme
              ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-white border-t-2 border-x-2 border-indigo-500'
              : 'bg-gradient-to-b from-white to-slate-50 text-slate-900 border-t-2 border-x-2 border-indigo-400 shadow-sm'
            : isDarkTheme
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`;
        
      default:
        return `${baseStyles} rounded-t-lg ${
          isActive
            ? isDarkTheme
              ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700'
              : 'bg-white text-slate-900 border-t border-l border-r border-slate-200 shadow-sm'
            : isDarkTheme
              ? 'bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 border-b border-slate-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-200'
        }`;
    }
  };
  
  // Container styles selon la variante
  const getContainerStyles = () => {
    const baseStyles = 'flex items-center';
    
    switch (variant) {
      case 'pills':
        return `${baseStyles} gap-2 p-1 rounded-lg ${
          isDarkTheme ? 'bg-slate-900/50 backdrop-blur-sm' : 'bg-slate-100/80 backdrop-blur-sm'
        }`;
      case 'underline':
        return `${baseStyles} gap-0 border-b ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`;
      case 'gradient':
        return `${baseStyles} gap-1`;
      default:
        return `${baseStyles} gap-1 border-b ${
          isDarkTheme ? 'border-slate-700' : 'border-slate-200'
        }`;
    }
  };
  
  return (
    <div className={`${className}`}>
      <div className={getContainerStyles()}>
        <LayoutGroup>
          <div className="flex items-center gap-1">
            {tabs.map((tab, index) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`${getTabStyles(activeTab === tab.id)} flex items-center gap-2 relative group`}
                  style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                >
                  
                  {/* Indicateur actif pour certaines variantes */}
                  {activeTab === tab.id && variant === 'pills' && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  {/* Icône sans animation */}
                  {tab.icon && (
                    <div>
                      {React.cloneElement(tab.icon as React.ReactElement, { 
                        size: currentSize.icon 
                      })}
                    </div>
                  )}
                  
                  {/* Label */}
                  <span className="relative z-10">{tab.label}</span>
                  
                  {/* Badge animé */}
                  <AnimatePresence>
                    {tab.badge !== undefined && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={`${currentSize.badge} rounded-full font-semibold ${
                          tab.badgeColor
                            ? tab.badgeColor
                            : activeTab === tab.id
                              ? isDarkTheme
                                ? 'bg-indigo-900/60 text-indigo-200'
                                : 'bg-indigo-100 text-indigo-700'
                              : isDarkTheme
                                ? 'bg-slate-700 text-slate-300'
                                : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  
                  {/* Indicateur actif pour variante underline */}
                  {activeTab === tab.id && variant === 'underline' && (
                    <motion.div
                      layoutId="activeUnderline"
                      className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                        isDarkTheme ? 'bg-indigo-500' : 'bg-indigo-600'
                      }`}
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
                
                {/* Effet de lueur pour l'onglet actif */}
                {activeTab === tab.id && (
                  <motion.div
                    className={`absolute inset-0 rounded-lg pointer-events-none ${
                      variant === 'pills' ? 'opacity-30' : 'opacity-0'
                    }`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: variant === 'pills' ? 0.3 : 0 }}
                    style={{
                      background: `radial-gradient(circle at center, ${
                        isDarkTheme ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'
                      }, transparent 70%)`
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </LayoutGroup>
        
        {/* Contenu à droite (comme le bouton Export CSV) */}
        {rightContent && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="ml-auto"
          >
            {rightContent}
          </motion.div>
        )}
      </div>
      
      {/* Ligne décorative animée sous les onglets */}
      {variant === 'gradient' && (
        <motion.div
          className={`h-px ${isDarkTheme ? 'bg-slate-700' : 'bg-slate-200'}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        />
      )}
    </div>
  );
};

export default TabNavigation;