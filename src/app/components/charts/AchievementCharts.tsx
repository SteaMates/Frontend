/**
 * Nombre del fichero: AchievementCharts.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  Tooltip, ResponsiveContainer,
  Cell, RadialBarChart, RadialBar, Legend
} from 'recharts';
import { Trophy, Star, Medal, Crown, Gem, Shield, Sparkles } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  color: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

interface RarestAchievement {
  name: string;
  game: string;
  globalPercent: number; // % of Steam players who have it
}

interface PlayerAchievements {
  name: string;
  color: string;
  completionRate: number;    // avg % achievements unlocked
  perfectGames: number;      // games at 100%
  totalGamesPlayed: number;
  totalAchievements: number;
  rarestAchievement: RarestAchievement;
}

interface Props {
  players: PlayerAchievements[];
}

/**
 * Función: AchievementCharts
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * AchievementCharts. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
export function AchievementCharts({ players }: Props) {
  const completionData = [...players]
    .sort((a, b) => b.completionRate - a.completionRate)
    .map(p => ({ ...p, fill: p.color }));

  const perfectData = [...players]
    .sort((a, b) => b.perfectGames - a.perfectGames);

  const rarestData = [...players]
    .sort((a, b) => a.rarestAchievement.globalPercent - b.rarestAchievement.globalPercent);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-orange-900/30 border border-amber-500/20 rounded-3xl p-6 flex items-center gap-4">
        <div className="bg-amber-500/20 p-3 rounded-2xl">
          <Trophy className="text-amber-400 w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">El Sudor y los Logros</h2>
          <p className="text-slate-400 text-sm mt-1">El "Tryhardismo" — tener muchos juegos no significa ser bueno, ni terminarlos</p>
        </div>
      </div>

      {/* Row 1: Completion Rate + Perfect Games */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. TASA MEDIA DE FINALIZACIÓN */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Medal className="text-amber-400" size={20} /> Tasa de Finalización
              </h3>
              <p className="text-xs text-slate-500 mt-1">% medio de logros desbloqueados por juego empezado</p>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
              <Crown size={12} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400">{completionData[0]?.name}</span>
            </div>
          </div>

          <div className="h-[320px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="95%" barSize={18} data={completionData}>
                <RadialBar
                  label={{ position: 'insideStart', fill: '#fff', fontSize: 10, fontWeight: 'bold' }}
                  background={{ fill: '#1e293b' }}
                  dataKey="completionRate"
                  cornerRadius={10}
                >
                  {completionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </RadialBar>
                <Legend
                  iconSize={8}
                  layout="vertical"
                  verticalAlign="middle"
                  wrapperStyle={{ right: -10, fontSize: '11px' }}
                  formatter={(value, entry: any) => {
                    const player = completionData.find(p => p.name === value);
                    return `${value} (${player?.completionRate}%)`;
                  }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Completado']} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. EL SALÓN DE LA FAMA - JUEGOS PERFECTOS */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <Sparkles className="text-yellow-400" size={20} /> Salón de la Fama
          </h3>
          <p className="text-xs text-slate-500 mb-5">Juegos completados al 100% de logros</p>

          <div className="space-y-4">
            {perfectData.map((player, i) => (
              <div key={player.name} className="group relative">
                <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30 hover:border-amber-500/30 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black ${
                        i === 0 ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-lg shadow-amber-500/20' :
                        i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-black' :
                        i === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {i === 0 ? '👑' : i + 1}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">{player.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500">{player.totalAchievements} logros totales</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-amber-400" />
                        <span className="text-2xl font-black" style={{ color: player.color }}>{player.perfectGames}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">perfectos de {player.totalGamesPlayed}</span>
                    </div>
                  </div>
                  {/* Perfect rate bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(player.perfectGames / player.totalGamesPlayed) * 100}%`,
                          background: `linear-gradient(90deg, ${player.color}, #fbbf24)`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 mt-0.5 block text-right">
                      {((player.perfectGames / player.totalGamesPlayed) * 100).toFixed(1)}% perfeccionados
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Rarest Achievement */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Gem className="text-purple-400" size={20} /> El Cazatrofeos — Rareza Máxima
        </h3>
        <p className="text-xs text-slate-500 mb-6">El logro más raro que ha conseguido cada miembro del grupo</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rarestData.map((player, i) => {
            const rarityLevel = player.rarestAchievement.globalPercent < 0.5
              ? { label: 'ULTRA RARO', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: 'shadow-red-500/10' }
              : player.rarestAchievement.globalPercent < 2
              ? { label: 'MUY RARO', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-500/10' }
              : player.rarestAchievement.globalPercent < 5
              ? { label: 'RARO', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: 'shadow-blue-500/10' }
              : { label: 'UNCOMMON', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' };

            return (
              <div
                key={player.name}
                className={`relative bg-slate-800/50 rounded-2xl p-5 border ${rarityLevel.border} hover:shadow-xl ${rarityLevel.glow} transition-all group overflow-hidden`}
              >
                {/* Rarity glow effect */}
                {player.rarestAchievement.globalPercent < 1 && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none" />
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: player.color + '20', color: player.color }}>
                      {player.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-white">{player.name}</span>
                  </div>
                  <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full ${rarityLevel.bg} ${rarityLevel.color} ${rarityLevel.border} border`}>
                    {rarityLevel.label}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className={rarityLevel.color} />
                    <span className="text-sm font-semibold text-white">{player.rarestAchievement.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">{player.rarestAchievement.game}</span>
                </div>

                {/* Rarity bar */}
                <div className="bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max(player.rarestAchievement.globalPercent, 0.5)}%`,
                      background: player.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className={`text-xs font-black ${rarityLevel.color}`}>
                    {player.rarestAchievement.globalPercent}%
                  </span>
                  <span className="text-[9px] text-slate-600">de jugadores globales</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}