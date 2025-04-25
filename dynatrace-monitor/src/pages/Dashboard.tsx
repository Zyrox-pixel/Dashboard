import React from 'react';
import { Shield, Loader, AlertOctagon, RefreshCw } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ProblemsList from '../components/dashboard/ProblemsList';
import ManagementZoneList from '../components/dashboard/ManagementZoneList';
import ZoneDetails from '../components/dashboard/ZoneDetails';
import { useApp } from '../contexts/AppContext';

const Dashboard: React.FC = () => {
  const { 
    activeProblems,
    vitalForGroupMZs, 
    selectedZone, 
    setSelectedZone,
    activeTab,
    setActiveTab,
    processGroups,
    isLoading,
    error,
    backendConnected,
    refreshData
  } = useApp();
  
  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId);
    setActiveTab('process-groups');
  };
  
  const handleBackClick = () => {
    setSelectedZone(null);
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // Trouver la zone sélectionnée
  const currentZone = vitalForGroupMZs.find(zone => zone.id === selectedZone);
  
  // Afficher un écran de chargement si le chargement initial n'est pas terminé
  if (!isLoading.initialLoadComplete) {
    return (
      <Layout title="Vital for Group">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="w-16 h-16 border-t-4 border-b-4 border-indigo-500 rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-slate-400">Chargement des données...</p>
        </div>
      </Layout>
    );
  }
  
  // Afficher un message d'erreur si le backend n'est pas connecté
  if (!backendConnected) {
    return (
      <Layout title="Vital for Group">
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Le serveur backend n'est pas accessible</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Impossible de se connecter au serveur. Vérifiez que le backend est démarré et que votre connexion est active.
          </p>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // Afficher un message d'erreur générale si nécessaire
  if (error) {
    return (
      <Layout title="Vital for Group">
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
          <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl text-red-600 dark:text-red-400 mb-4">Une erreur est survenue</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">{error}</p>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Réessayer</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // Si aucune MZ n'est trouvée après le chargement
  if (vitalForGroupMZs.length === 0 && !isLoading.vitalForGroupMZs) {
    return (
      <Layout title="Vital for Group">
        <div className="flex flex-col items-center justify-center h-64 p-10 mt-20 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <Shield className="w-16 h-16 text-blue-500 mb-4" />
          <p className="text-xl text-blue-600 dark:text-blue-400 mb-4">Aucune Management Zone trouvée</p>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-center max-w-lg">
            Aucune Management Zone pour Vital for Group n'a été trouvée. Vérifiez votre configuration.
          </p>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
        </div>
      </Layout>
    );
  }
  
  // L'affichage normal commence ici - c'est ce que vous avez déjà
  return (
    <Layout
      title="Vital for Group"
      subtitle={currentZone?.name}
    >
      {isLoading.vitalForGroupMZs || isLoading.problems ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : selectedZone && currentZone ? (
        // Vue détaillée d'une Management Zone
        <ZoneDetails
          zone={currentZone}
          problems={activeProblems.filter(p => p.zone.includes(currentZone.name))}
          processGroups={processGroups}
          activeTab={activeTab}
          onBackClick={handleBackClick}
          onTabChange={handleTabChange}
          isLoading={isLoading.zoneDetails}
        />
      ) : (
        <>
          {/* Bannière d'introduction pour Vital for Group */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <Shield className="text-blue-500 mt-1" size={24} />
              <div>
                <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">Vital for Group</h2>
                <p className="text-slate-600 dark:text-slate-300">
                  Supervision des applications critiques du groupe incluant ACESID, OCSP, WebSSO, et autres services sécurisés.
                </p>
              </div>
            </div>
          </div>
        
          <ProblemsList problems={activeProblems} title="Problèmes actifs sur Vital for Group" />
          <ManagementZoneList zones={vitalForGroupMZs} onZoneClick={handleZoneClick} />
        </>
      )}
    </Layout>
  );
};

export default Dashboard;