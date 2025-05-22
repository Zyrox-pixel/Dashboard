import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { Menu, Shield, ChevronRight, Sparkles, Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { isDarkTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Effet pour suivre le scroll et mettre à jour l'état
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effet pour mettre à jour la date seulement
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);


  // Formatte la date dans un format jour/mois/année
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`h-20 px-5 sm:px-8 flex items-center justify-between sticky top-0 z-20 transition-all duration-500 
        ${scrolled ? 'shadow-2xl' : 'shadow-lg'} 
        ${isDarkTheme
          ? `bg-gradient-to-r from-slate-900/95 via-slate-900/97 to-slate-800/95 backdrop-blur-xl border-b 
             ${scrolled ? 'border-indigo-900/40' : 'border-slate-700/30'}`
          : `bg-gradient-to-r from-white/95 via-white/97 to-slate-50/95 backdrop-blur-xl border-b 
             ${scrolled ? 'border-indigo-200/50' : 'border-slate-200/30'}`
        }`}
    >
      {/* Élément décoratif - ligne supérieure animée */}
      <motion.div 
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r 
          ${isDarkTheme
            ? 'from-transparent via-indigo-600 to-transparent'
            : 'from-transparent via-indigo-400 to-transparent'
          } z-30`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
      
      {/* Effet de particules animées en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-32 h-32 rounded-full ${
              isDarkTheme ? 'bg-indigo-500/5' : 'bg-indigo-400/3'
            }`}
            initial={{ 
              x: Math.random() * 100 - 50, 
              y: -50,
              scale: 0 
            }}
            animate={{ 
              x: [
                Math.random() * 100 - 50,
                Math.random() * 100 - 50,
                Math.random() * 100 - 50
              ],
              y: [-50, 50, 150],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              delay: i * 3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Partie gauche - Titre avec design moderne et animations */}
      <div className="flex items-center relative z-10">
        {/* Logo animé pour une expérience haut de gamme */}
        <motion.div 
          className={`hidden md:flex items-center justify-center rounded-full 
                       ${isDarkTheme ? 'bg-gradient-to-br from-indigo-900/40 to-purple-900/40' : 'bg-gradient-to-br from-indigo-100 to-purple-100'}
                       mr-4 p-2.5 border ${isDarkTheme ? 'border-indigo-600/50' : 'border-indigo-300/70'} backdrop-blur-sm shadow-lg`}
          whileHover={{ scale: 1.1, rotate: 180 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Shield className={`${isDarkTheme ? 'text-indigo-400' : 'text-indigo-600'}`} size={20} />
        </motion.div>
      
        {/* Bouton mobile pour ouvrir le menu */}
        <motion.button 
          className={`lg:hidden mr-4 p-2.5 rounded-full transition-all duration-300 shadow-lg
                     ${isDarkTheme
                       ? 'text-slate-400 hover:text-indigo-300 hover:bg-indigo-900/50 border border-slate-700/50'
                       : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-100/70 border border-slate-200/70'
                     }`}
          aria-label="Ouvrir le menu"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Menu size={20} />
        </motion.button>
      
        {/* Titre et sous-titre avec animation au chargement */}
        <div className="flex flex-col">
          {subtitle ? (
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <motion.h1 
                  className={`font-bold text-xl sm:text-2xl ${
                    isDarkTheme 
                      ? 'text-transparent bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text' 
                      : 'text-slate-800'
                  } tracking-tight`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {title}
                </motion.h1>
                <motion.div 
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <ChevronRight size={16} className={`mx-1 ${isDarkTheme ? 'text-indigo-500' : 'text-indigo-400'}`} />
                  <span className={`font-medium text-base sm:text-lg ${
                    isDarkTheme 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400' 
                      : 'text-indigo-600'
                  }`}>{subtitle}</span>
                </motion.div>
              </div>
              <motion.p 
                className={`text-xs mt-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="font-semibold flex items-center gap-1">
                  <Activity size={12} className={isDarkTheme ? 'text-green-400' : 'text-green-600'} />
                  SEC06
                </span>
                <span className="h-1 w-1 rounded-full bg-gradient-to-r from-green-400 to-blue-400 animate-pulse"></span>
                <span className="flex items-center gap-1">
                  {formatDate(currentTime)}
                </span>
              </motion.p>
            </div>
          ) : (
            <div>
              <motion.h1 
                className={`font-bold text-xl sm:text-2xl ${
                  isDarkTheme 
                    ? 'text-transparent bg-gradient-to-r from-white via-indigo-200 to-white bg-clip-text' 
                    : 'text-slate-800'
                } tracking-tight`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {title}
              </motion.h1>
              <motion.p 
                className={`text-xs mt-1 ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="font-semibold flex items-center gap-1">
                  <Activity size={12} className={isDarkTheme ? 'text-green-400' : 'text-green-600'} />
                  SEC06
                </span>
                <span className="h-1 w-1 rounded-full bg-gradient-to-r from-green-400 to-blue-400 animate-pulse"></span>
                <span className="flex items-center gap-1">
                  {formatDate(currentTime)}
                </span>
              </motion.p>
            </div>
          )}
        </div>
      </div>

      {/* Partie droite - Actions et statut */}
      <div className="flex items-center gap-4 relative z-10">
        
        {/* Badge BETA avec effet premium amélioré */}
        <motion.a
          href="mailto:Rayane.Bennasr@externe.bnpparibas.com"
          className={`relative flex items-center text-xs px-4 py-2 rounded-full overflow-hidden ${
            isDarkTheme
              ? 'bg-gradient-to-r from-indigo-900/70 via-purple-900/70 to-pink-900/70 text-white border border-indigo-600/50 shadow-lg shadow-indigo-900/30'
              : 'bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-indigo-800 border border-indigo-300/50 shadow-lg shadow-indigo-200/30'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          {/* Effet de brillance animé */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${
                isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)'
              } 50%, transparent 60%)`,
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
          />
          
          <Sparkles size={14} className={`mr-1.5 ${isDarkTheme ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <span className="font-bold mr-1.5 relative z-10">BETA</span>
          <span className={`${isDarkTheme ? 'text-indigo-200' : 'text-indigo-700'} font-medium relative z-10`}>
            Feedback
          </span>
        </motion.a>
      </div>
    </motion.header>
  );
};

export default Header;