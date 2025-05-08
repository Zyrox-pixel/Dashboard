import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, RefreshCw, Filter, CalendarRange, Shield, BarChart } from 'lucide-react';
import ProblemsList from './ProblemsList';
import { Problem } from '../../api/types';
import { useApp } from '../../contexts/AppContext';

interface UnifiedProblemsViewProps {
  /** Titre principal de la vue */
  title: string;
  /** Variante du dashboard (vfg, vfe ou combined) */
  variant: 'vfg' | 'vfe' | 'combined';
  /** Problèmes combinés pour la vue unifiée (optionnel) */
  allProblems?: Problem[];
  /** Problèmes récents (72h) combinés pour la vue unifiée (optionnel) */
  allRecent72hProblems?: Problem[];
}

/**
 * Composant de vue unifiée des problèmes combinant problèmes actifs et récents (72h)
 * dans une interface à onglets moderne et interactive
 */
const UnifiedProblemsView: React.FC<UnifiedProblemsViewProps> = ({ 
  title, 
  variant, 
  allProblems, 
  allRecent72hProblems 
}) => {
  const navigate = useNavigate();
  const { activeProblems, problemsLast72h, isLoading, refreshData } = useApp();
  
  // État local pour l'onglet actif (actifs ou récents)
  const [activeTab, setActiveTab] = useState<'active' | 'recent'>('active');
  
  // Marqueur pour le rafraîchissement manuel
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  
  // Problèmes à afficher selon l'onglet actif et la variante
  const problemsToDisplay = activeTab === 'active' 
    ? (variant === 'combined' ? allProblems : activeProblems) 
    : (variant === 'combined' ? allRecent72hProblems : problemsLast72h);
  
  // Gérer le changement d'onglet
  const handleTabChange = (tab: 'active' | 'recent') => {
    setActiveTab(tab);
  };
  
  // Gérer le rafraîchissement manuel des données
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (variant === 'combined') {
        // Pour la vue combinée, rafraîchir les deux types de problèmes
        await refreshData('vfg', activeTab === 'active');
        await refreshData('vfe', activeTab === 'active');
      } else {
        // Pour les vues spécifiques, comportement normal
        await refreshData(variant, activeTab === 'active');
      }
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Délai minimum pour éviter des rafraîchissements trop rapides
    }
  };
  
  // Retour au tableau de bord
  const handleBackClick = () => {
    if (variant === 'combined') {
      // Pour la vue combinée, retourner à la page d'accueil
      navigate('/');
    } else {
      // Pour les vues spécifiques, comportement normal
      navigate(`/${variant}`);
    }
  };
  
  // Classes CSS pour les onglets
  const getTabClasses = (tab: 'active' | 'recent') => {
    const isActive = activeTab === tab;
    
    return `px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
      isActive 
        ? 'bg-slate-800 text-white border-t border-l border-r border-slate-700' 
        : 'bg-slate-900 text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 border-b border-slate-700'
    } flex items-center gap-2`;
  };
  
  // Déterminer les couleurs d'accentuation en fonction de la variante
  const accentColor = variant === 'vfg' ? 'blue' : 'amber';
  
  // Constantes CSS pour l'accentuation des couleurs
  const cssVariant = {
    text: `text-${accentColor}-500`,
    bg: `bg-${accentColor}-500`,
    border: `border-${accentColor}-700`,
    bgLight: `bg-${accentColor}-500/10`,
    bgDark: `bg-${accentColor}-900/20`,
    hoverBg: `hover:bg-${accentColor}-700`,
    icon: activeTab === 'active' ? <AlertTriangle className="text-red-500" size={24} /> : <Clock className="text-amber-500" size={24} />
  };
  
  return (
    <div className="space-y-6">
      {/* En-tête avec titre et bouton retour */}
      <div className="flex items-center justify-between">
        <button 
          onClick={handleBackClick}
          className="mb-2 flex items-center gap-2 px-4 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Shield size={18} />
          <span>Retour au tableau de bord</span>
        </button>
        
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading.problems}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${cssVariant.bg} text-white ${cssVariant.hoverBg} 
            disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Rafraîchir</span>
        </button>
      </div>
      
      {/* Bannière principale avec statistiques */}
      <div className={`p-5 ${cssVariant.bgDark} border ${cssVariant.border} rounded-lg mb-6`}>
        <div className="flex flex-wrap md:flex-nowrap items-start gap-4">
          {cssVariant.icon}
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Problèmes {activeTab === 'active' ? 'Actifs' : 'des 72 dernières heures'}
            </h2>
            <p className="text-slate-300">
              {activeTab === 'active' 
                ? "Suivi en temps réel des incidents et anomalies actuellement actifs"
                : "Historique consolidé de tous les incidents survenus durant les 72 dernières heures"}
            </p>
          </div>
          <div className="ml-auto flex flex-col items-end">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={14} />
              <span>Dernière actualisation: {lastRefreshTime.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-center h-10 px-4 rounded-lg bg-slate-800 font-bold mt-2 text-white">
              {problemsToDisplay?.length || 0} problème{(problemsToDisplay?.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation par onglets */}
      <div className="border-b border-slate-700 mb-4">
        <div className="flex space-x-1">
          <button 
            onClick={() => handleTabChange('active')} 
            className={getTabClasses('active')}
          >
            <AlertTriangle size={16} className="text-red-500" />
            <span>Problèmes actifs</span>
            {activeProblems?.length > 0 && (
              <span className="ml-2 bg-red-900/60 text-red-200 rounded-full px-2 py-0.5 text-xs">
                {activeProblems.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => handleTabChange('recent')} 
            className={getTabClasses('recent')}
          >
            <Clock size={16} className="text-amber-500" />
            <span>Récents (72h)</span>
            {problemsLast72h?.length > 0 && (
              <span className="ml-2 bg-amber-900/60 text-amber-200 rounded-full px-2 py-0.5 text-xs">
                {problemsLast72h.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Contenu de l'onglet actif */}
      <div className="mt-6">
        {isLoading.problems ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-slate-400">Chargement des problèmes...</span>
          </div>
        ) : (
          <ProblemsList 
            problems={problemsToDisplay || []} 
            title={activeTab === 'active' ? "Tous les problèmes actifs" : "Tous les problèmes des 72 dernières heures"}
            showRefreshButton={true}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default UnifiedProblemsView;