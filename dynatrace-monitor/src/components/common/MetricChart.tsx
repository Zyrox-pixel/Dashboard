import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricHistory } from '../../api/types';

/**
 * Props pour le composant MetricChart
 */
interface MetricChartProps {
  history: MetricHistory[];
  color?: string;
  unit?: string;
  label?: string;
  height?: number;
  domain?: [number, number];
}

/**
 * Composant optimisé pour afficher un graphique de métrique temporelle
 * Utilise recharts avec des optimisations de performance
 */
const MetricChart: React.FC<MetricChartProps> = ({
  history,
  color = "red",
  unit = "%",
  label = "Valeur",
  height = 120,
  domain = [0, 100]
}) => {
  // Formater les données avec useMemo pour éviter les recalculs inutiles
  const formattedData = useMemo(() => {
    return history.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      value: point.value,
      // Ajouter la date pour le tooltip
      date: new Date(point.timestamp).toLocaleDateString(),
    }));
  }, [history]);

  // Échantillonner les données pour les graphiques de grande taille
  const sampledData = useMemo(() => {
    // Si moins de 24 points, utiliser toutes les données
    if (formattedData.length <= 24) return formattedData;
    
    // Sinon, prendre environ un point par heure (24 points)
    const step = Math.ceil(formattedData.length / 24);
    return formattedData.filter((_, i) => i % step === 0);
  }, [formattedData]);

  // Calculer des statistiques pour l'affichage
  const stats = useMemo(() => {
    if (history.length === 0) return { avg: 0, max: 0, min: 0 };
    
    const values = history.map(h => h.value);
    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      max: Math.round(Math.max(...values)),
      min: Math.round(Math.min(...values))
    };
  }, [history]);

  // Si pas de données, afficher un message
  if (history.length === 0) {
    return (
      <div className={`h-${height} flex items-center justify-center text-slate-500`}>
        Aucune donnée disponible
      </div>
    );
  }

  // Couleurs pour le graphique selon le thème
  const colorPalette = {
    red: {
      main: 'rgb(239, 68, 68)',
      gradient: ['rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.2)']
    },
    green: {
      main: 'rgb(34, 197, 94)',
      gradient: ['rgba(34, 197, 94, 0.8)', 'rgba(34, 197, 94, 0.2)']
    },
    blue: {
      main: 'rgb(59, 130, 246)',
      gradient: ['rgba(59, 130, 246, 0.8)', 'rgba(59, 130, 246, 0.2)']
    },
    yellow: {
      main: 'rgb(234, 179, 8)',
      gradient: ['rgba(234, 179, 8, 0.8)', 'rgba(234, 179, 8, 0.2)']
    },
    purple: {
      main: 'rgb(168, 85, 247)',
      gradient: ['rgba(168, 85, 247, 0.8)', 'rgba(168, 85, 247, 0.2)']
    }
  };

  // Utiliser la couleur spécifiée ou la couleur par défaut
  const chartColor = colorPalette[color as keyof typeof colorPalette] || colorPalette.red;

  return (
    <div>
      <div className="text-xs text-slate-500 mb-2 flex justify-between">
        <span>Min: {stats.min}{unit}</span>
        <span>Moy: {stats.avg}{unit}</span>
        <span>Max: {stats.max}{unit}</span>
      </div>
      <div style={{ height: `${height}px`, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampledData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor.gradient[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={chartColor.gradient[1]} stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10 }} 
              tickFormatter={(value) => value.split(':')[0] + 'h'} 
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              domain={domain} 
              allowDecimals={false}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip 
              formatter={(value: number) => [`${value}${unit}`, label]}
              labelFormatter={(time) => {
                const dataPoint = sampledData.find(d => d.time === time);
                return dataPoint ? `${dataPoint.date} à ${time}` : time;
              }}
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: '1px solid rgba(51, 65, 85, 0.5)' 
              }}
              itemStyle={{ color: chartColor.main }}
              labelStyle={{ color: 'white' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={chartColor.main} 
              fillOpacity={1} 
              fill={`url(#gradient-${color})`}
              isAnimationActive={false} // Désactiver l'animation pour améliorer les performances
              dot={false}
              activeDot={{ r: 4, stroke: chartColor.main, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricChart;