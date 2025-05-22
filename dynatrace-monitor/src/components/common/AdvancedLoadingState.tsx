import React, { useState, useEffect } from 'react';
import { Server, Monitor, Database, Cpu, HardDrive, Network, Shield } from 'lucide-react';

interface AdvancedLoadingStateProps {
  title?: string;
  type?: 'hosts' | 'services' | 'problems' | 'general';
  duration?: number; // durée estimée en secondes
  // Nouvelles props pour les vraies données
  currentPhase?: string;
  progress?: number;
  terminalLogs?: string[];
}

const AdvancedLoadingState: React.FC<AdvancedLoadingStateProps> = ({ 
  title = "Chargement des données", 
  type = "general",
  duration = 45,
  currentPhase = "Initialisation...",
  progress: externalProgress,
  terminalLogs: externalLogs
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');

  // Messages spécifiques selon le type
  const getStepsAndMessages = () => {
    switch(type) {
      case 'hosts':
        return {
          steps: [
            { label: "Connexion au serveur Dynatrace", duration: 3 },
            { label: "Authentification et validation MZ", duration: 2 },
            { label: "Scanning des hôtes disponibles", duration: 15 },
            { label: "Collecte des métriques système", duration: 20 },
            { label: "Finalisation et mise en cache", duration: 5 }
          ],
          terminalMessages: [
            "> Initialisation de la connexion Dynatrace...",
            "> Validation de la Management Zone configurée...", 
            "> Scan des hôtes en cours... [████████████████████████████████████████] 100%",
            "> Récupération des métriques CPU et RAM...",
            "> Collecte des informations système d'exploitation...",
            "> Analyse des configurations réseau...",
            "> Indexation des données pour l'affichage...",
            "> Optimisation du cache local...",
            "> Préparation de l'interface utilisateur...",
            "> Chargement terminé avec succès ✓"
          ]
        };
      case 'services':
        return {
          steps: [
            { label: "Connexion aux services", duration: 2 },
            { label: "Énumération des applications", duration: 8 },
            { label: "Collecte des métriques", duration: 10 },
            { label: "Finalisation", duration: 3 }
          ],
          terminalMessages: [
            "> Connexion aux services Dynatrace...",
            "> Énumération des applications en cours...",
            "> Collecte des métriques de performance...",
            "> Finalisation des données ✓"
          ]
        };
      default:
        return {
          steps: [
            { label: "Initialisation", duration: 5 },
            { label: "Chargement des données", duration: 15 },
            { label: "Traitement", duration: 10 },
            { label: "Finalisation", duration: 3 }
          ],
          terminalMessages: [
            "> Initialisation du système...",
            "> Chargement des données...",
            "> Traitement en cours...",
            "> Finalisation ✓"
          ]
        };
    }
  };

  const { steps, terminalMessages } = getStepsAndMessages();

  // Utiliser les logs externes si disponibles, sinon utiliser la simulation
  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) {
      setTerminalLines(externalLogs.slice(-8));
    }
  }, [externalLogs]);

  // Animation du terminal (seulement si pas de logs externes)
  useEffect(() => {
    if (externalLogs && externalLogs.length > 0) return;
    
    const interval = setInterval(() => {
      const messageIndex = Math.floor((progress / 100) * terminalMessages.length);
      if (messageIndex < terminalMessages.length && messageIndex >= 0) {
        const message = terminalMessages[messageIndex];
        if (message !== currentMessage) {
          setCurrentMessage(message);
          setTerminalLines(prev => {
            const newLines = [...prev, message];
            // Garder seulement les 6 dernières lignes
            return newLines.slice(-6);
          });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [progress, terminalMessages, currentMessage, externalLogs]);

  // Utiliser le progress externe si disponible, sinon utiliser la simulation
  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
      // Calculer l'étape actuelle basée sur le progress externe
      const stepIndex = Math.floor((externalProgress / 100) * steps.length);
      setCurrentStep(Math.min(stepIndex, steps.length - 1));
      return;
    }

    // Simulation du progress basé sur les étapes (fallback)
    const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 0.1;
      
      // Calculer l'étape actuelle
      let cumulativeDuration = 0;
      for (let i = 0; i < steps.length; i++) {
        cumulativeDuration += steps[i].duration;
        if (elapsed <= cumulativeDuration) {
          setCurrentStep(i);
          break;
        }
      }

      // Calculer le pourcentage global
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(progressPercent);

      if (progressPercent >= 100) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [steps, externalProgress]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header avec icône animée */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
            <div className="relative bg-slate-800 p-4 rounded-full border border-blue-500/30">
              {type === 'hosts' ? (
                <Server className="w-8 h-8 text-blue-400 animate-pulse" />
              ) : (
                <Database className="w-8 h-8 text-blue-400 animate-pulse" />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400">{currentPhase}</p>
        </div>

        {/* Terminal simulé */}
        <div className="bg-black/80 rounded-lg border border-green-500/30 mb-6 overflow-hidden">
          <div className="bg-slate-800 px-4 py-2 border-b border-green-500/30 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-green-400 text-sm font-mono ml-2">dynatrace-monitor@terminal</span>
          </div>
          <div className="p-4 font-mono text-sm min-h-[200px]">
            {terminalLines.map((line, index) => (
              <div key={index} className="mb-1">
                <span className="text-green-400">{line}</span>
                {index === terminalLines.length - 1 && (
                  <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
                )}
              </div>
            ))}
            {terminalLines.length === 0 && !externalLogs && (
              <div className="text-green-400">
                {"> Initialisation du système..."}
                <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse"></span>
              </div>
            )}
            {/* Curseur clignotant à la fin */}
            {terminalLines.length > 0 && (
              <div className="text-green-400 mt-1">
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse"></span>
              </div>
            )}
          </div>
        </div>

        {/* Barre de progression avec étapes */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-medium">Progression globale</span>
            <span className="text-blue-400 font-mono">{Math.round(progress)}%</span>
          </div>
          
          {/* Barre de progression principale */}
          <div className="w-full bg-slate-700 rounded-full h-3 mb-6 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>

          {/* Étapes détaillées */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${index < currentStep 
                    ? 'bg-green-500 border-green-500' 
                    : index === currentStep 
                      ? 'border-blue-500 bg-blue-500/20' 
                      : 'border-slate-600'
                  }`}>
                  {index < currentStep ? (
                    <span className="text-white text-xs">✓</span>
                  ) : index === currentStep ? (
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  ) : (
                    <span className="text-slate-500 text-xs">{index + 1}</span>
                  )}
                </div>
                <span className={`text-sm ${
                  index <= currentStep ? 'text-white' : 'text-slate-500'
                }`}>
                  {step.label}
                </span>
                {index === currentStep && (
                  <div className="flex-1 ml-4">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Icônes système animées */}
          <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-slate-700/50">
            <div className="text-slate-400 animate-pulse">
              <Monitor size={20} />
            </div>
            <div className="text-slate-400 animate-pulse" style={{animationDelay: '0.2s'}}>
              <Cpu size={20} />
            </div>
            <div className="text-slate-400 animate-pulse" style={{animationDelay: '0.4s'}}>
              <HardDrive size={20} />
            </div>
            <div className="text-slate-400 animate-pulse" style={{animationDelay: '0.6s'}}>
              <Network size={20} />
            </div>
            <div className="text-slate-400 animate-pulse" style={{animationDelay: '0.8s'}}>
              <Shield size={20} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedLoadingState;