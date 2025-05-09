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
  
  // Variables pour suivre les problèmes de chaque source
  const vfgProblemsRef = useRef<any[]>([]);
  const vfeProblemsRef = useRef<any[]>([]);
  const vfgProblems72hRef = useRef<any[]>([]);
  const vfeProblems72hRef = useRef<any[]>([]);

  // Effet pour détecter quand des données VFG sont chargées
  useEffect(() => {
    if (loadingRef.current.vfg === false && vitalForGroupMZs.length > 0) {
      console.log("Détection de chargement de données VFG terminé");
      // Filtrer les problèmes spécifiques à VFG
      const vfgSpecificProblems = activeProblems.filter(p =>
        vitalForGroupMZs.some(zone => p.zone?.includes(zone.name))
      );
      const vfgSpecificProblems72h = problemsLast72h.filter(p =>
        vitalForGroupMZs.some(zone => p.zone?.includes(zone.name))
      );

      // Stocker les problèmes VFG dans les refs
      vfgProblemsRef.current = vfgSpecificProblems;
      vfgProblems72hRef.current = vfgSpecificProblems72h;

      // Agréger les problèmes des deux sources
      const aggregatedActiveMap = new Map();
      const aggregatedProblems72hMap = new Map();

      // Ajouter les problèmes VFG
      vfgProblemsRef.current.forEach(problem => {
        aggregatedActiveMap.set(problem.id, problem);
      });
      vfgProblems72hRef.current.forEach(problem => {
        aggregatedProblems72hMap.set(problem.id, problem);
      });

      // Ajouter les problèmes VFE (existants)
      vfeProblemsRef.current.forEach(problem => {
        aggregatedActiveMap.set(problem.id, problem);
      });
      vfeProblems72hRef.current.forEach(problem => {
        aggregatedProblems72hMap.set(problem.id, problem);
      });

      // Mettre à jour les états
      setAggregatedActiveProblems(Array.from(aggregatedActiveMap.values()));
      setAggregatedProblems72h(Array.from(aggregatedProblems72hMap.values()));
    }
  }, [activeProblems, problemsLast72h, vitalForGroupMZs, loadingRef.current.vfg]);

  // Effet pour détecter quand des données VFE sont chargées
  useEffect(() => {
    if (loadingRef.current.vfe === false && vitalForEntrepriseMZs.length > 0) {
      console.log("Détection de chargement de données VFE terminé");
      // Filtrer les problèmes spécifiques à VFE
      const vfeSpecificProblems = activeProblems.filter(p =>
        vitalForEntrepriseMZs.some(zone => p.zone?.includes(zone.name))
      );
      const vfeSpecificProblems72h = problemsLast72h.filter(p =>
        vitalForEntrepriseMZs.some(zone => p.zone?.includes(zone.name))
      );

      // Stocker les problèmes VFE dans les refs
      vfeProblemsRef.current = vfeSpecificProblems;
      vfeProblems72hRef.current = vfeSpecificProblems72h;

      // Agréger les problèmes des deux sources
      const aggregatedActiveMap = new Map();
      const aggregatedProblems72hMap = new Map();

      // Ajouter les problèmes VFG (existants)
      vfgProblemsRef.current.forEach(problem => {
        aggregatedActiveMap.set(problem.id, problem);
      });
      vfgProblems72hRef.current.forEach(problem => {
        aggregatedProblems72hMap.set(problem.id, problem);
      });

      // Ajouter les problèmes VFE
      vfeProblemsRef.current.forEach(problem => {
        aggregatedActiveMap.set(problem.id, problem);
      });
      vfeProblems72hRef.current.forEach(problem => {
        aggregatedProblems72hMap.set(problem.id, problem);
      });

      // Mettre à jour les états
      setAggregatedActiveProblems(Array.from(aggregatedActiveMap.values()));
      setAggregatedProblems72h(Array.from(aggregatedProblems72hMap.values()));
    }
  }, [activeProblems, problemsLast72h, vitalForEntrepriseMZs, loadingRef.current.vfe]);
  
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