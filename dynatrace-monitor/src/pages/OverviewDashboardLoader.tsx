import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, Clock, Server, Database, BarChart } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useApp } from '../contexts/AppContext';
import OverviewDashboard from './OverviewDashboard';

/**
 * Composant de chargement spécifique pour la Vue d'Ensemble
 * Ce composant précharge les données pour VFG et VFE
 */
const OverviewDashboardLoader: React.FC = () => {
  const { 
    refreshData, 
    activeProblems,
    problemsLast72h,
    vitalForGroupMZs,
    vitalForEntrepriseMZs,
    isLoading
  } = useApp();
  
  // État pour suivre le dernier rafraîchissement
  const [lastRefreshTime, setLastRefreshTime] = useState(new Date());
  
  // État pour suivre les problèmes agrégés
  const [aggregatedActiveProblems, setAggregatedActiveProblems] = useState<any[]>([]);
  const [aggregatedProblems72h, setAggregatedProblems72h] = useState<any[]>([]);
  
  // Référence pour suivre les chargements
  const loadingRef = useRef({
    vfg: false,
    vfe: false
  });
  
  // Référence pour suivre si l'initialisation a été effectuée
  const initialLoadDoneRef = useRef(false);
  
  // Effet pour charger les données initiales une seule fois
  useEffect(() => {
    const loadInitialData = async () => {
      if (!initialLoadDoneRef.current) {
        console.log("Chargement initial des données pour la Vue d'ensemble");
        
        // Marquer les deux types comme en cours de chargement
        loadingRef.current = { vfg: true, vfe: true };
        
        try {
          // Charger les données VFG
          await refreshData('vfg', false);
          loadingRef.current.vfg = false;
          
          // Puis charger les données VFE
          await refreshData('vfe', false);
          loadingRef.current.vfe = false;
          
          setLastRefreshTime(new Date());
          initialLoadDoneRef.current = true;
        } catch (error) {
          console.error("Erreur lors du chargement initial des données:", error);
          loadingRef.current = { vfg: false, vfe: false };
        }
      }
    };
    
    loadInitialData();
  }, [refreshData]);
  
  // Effet pour surveiller les changements dans les problèmes actifs
  useEffect(() => {
    // Fusionner les problèmes des deux types
    // Utiliser une Map pour éviter les doublons par ID
    const problemsMap = new Map();
    
    activeProblems.forEach(problem => {
      problemsMap.set(problem.id, problem);
    });
    
    setAggregatedActiveProblems(Array.from(problemsMap.values()));
  }, [activeProblems]);
  
  // Effet pour surveiller les changements dans les problèmes des 72 dernières heures
  useEffect(() => {
    // Fusionner les problèmes des deux types
    // Utiliser une Map pour éviter les doublons par ID
    const problemsMap = new Map();
    
    problemsLast72h.forEach(problem => {
      problemsMap.set(problem.id, problem);
    });
    
    setAggregatedProblems72h(Array.from(problemsMap.values()));
  }, [problemsLast72h]);
  
  // Fonction de rafraîchissement manuel qui charge à la fois VFG et VFE
  const handleRefresh = async () => {
    console.log("Rafraîchissement manuel des données pour la Vue d'ensemble");
    
    // Marquer les deux types comme en cours de chargement
    loadingRef.current = { vfg: true, vfe: true };
    
    try {
      // Charger d'abord les données VFG
      await refreshData('vfg', false);
      loadingRef.current.vfg = false;
      
      // Puis charger les données VFE
      await refreshData('vfe', false);
      loadingRef.current.vfe = false;
      
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des données:", error);
      loadingRef.current = { vfg: false, vfe: false };
    }
  };
  
  return (
    <OverviewDashboard 
      aggregatedActiveProblems={aggregatedActiveProblems}
      aggregatedProblems72h={aggregatedProblems72h}
      onRefresh={handleRefresh}
      lastRefreshTime={lastRefreshTime}
    />
  );
};

export default OverviewDashboardLoader;