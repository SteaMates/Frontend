/**
 * Nombre del fichero: UltimateRadar.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { Hexagon, Info } from 'lucide-react';
import { useState } from 'react';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  color: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

interface PlayerRadar {
  name: string;
  color: string;
  avatar: string;
  // Raw values for archetype calculation
  rawVolume: number;
  rawDedication: number;
  rawProfitability: number; // inverted: lower cost = higher score
  rawPerfectionism: number;
  rawLoyalty: number;
  // Scores 1-10 (normalized within group)
  volume: number;       // Library size
  dedication: number;   // Total hours
  profitability: number; // Cost per hour (inverted)
  perfectionism: number; // Achievement completion rate
  loyalty: number;       // % hours in top game
}

interface Props {
  players: PlayerRadar[];
}

const AXIS_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  'Volumen': { label: 'Volumen', description: 'Tamaño de la biblioteca', icon: '📚' },
  'Dedicación': { label: 'Dedicación', description: 'Horas totales jugadas', icon: '⏰' },
  'Rentabilidad': { label: 'Rentabilidad', description: 'Menor coste por hora', icon: '💰' },
  'Perfeccionismo': { label: 'Perfeccionismo', description: 'Tasa de logros completados', icon: '🏆' },
  'Fidelidad': { label: 'Fidelidad', description: 'Horas concentradas en su top 1', icon: '❤️' },
};

/**
 * Función: getArchetype
 * Descripción: Función encargada de consultar y obtener los datos de archetype. Procesa los
 * parámetros de entrada requeridos, realiza la llamada pertinente y devuelve la
 * información estructurada para que la aplicación pueda utilizarla.
 */
function getArchetype(player: PlayerRadar): { name: string; emoji: string; description: string } {
  const scores = {
    volume: player.volume,
    dedication: player.dedication,
    profitability: player.profitability,
    perfectionism: player.perfectionism,
    loyalty: player.loyalty,
  };
  
  const max = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
  
  switch (max[0]) {
    case 'volume':
      return { name: 'El Coleccionista', emoji: '📚', description: 'Compra más de lo que juega' };
    case 'dedication':
      return { name: 'El No-Life', emoji: '🎮', description: 'Vive dentro de Steam' };
    case 'profitability':
      return { name: 'El Ahorrador', emoji: '💰', description: 'Exprime cada céntimo' };
    case 'perfectionism':
      return { name: 'El Tryhard', emoji: '🏆', description: 'No deja logro sin desbloquear' };
    case 'loyalty':
      return { name: 'El Monotemático', emoji: '❤️', description: 'Tiene su juego favorito y lo demás sobra' };
    default:
      return { name: 'El Equilibrado', emoji: '⚖️', description: 'Un poco de todo' };
  }
}

/**
 * Función: UltimateRadar
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * UltimateRadar. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function UltimateRadar({ players }: Props) {
  const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);

  // Build radar data
  const radarData = [
    { axis: 'Volumen', ...Object.fromEntries(players.map(p => [p.name, p.volume])) },
    { axis: 'Dedicación', ...Object.fromEntries(players.map(p => [p.name, p.dedication])) },
    { axis: 'Rentabilidad', ...Object.fromEntries(players.map(p => [p.name, p.profitability])) },
    { axis: 'Perfeccionismo', ...Object.fromEntries(players.map(p => [p.name, p.perfectionism])) },
    { axis: 'Fidelidad', ...Object.fromEntries(players.map(p => [p.name, p.loyalty])) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-violet-900/30 via-fuchsia-900/20 to-pink-900/30 border border-violet-500/20 rounded-3xl p-6 flex items-center gap-4">
        <div className="bg-violet-500/20 p-3 rounded-2xl">
          <Hexagon className="text-violet-400 w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Radar Definitivo</h2>
          <p className="text-slate-400 text-sm mt-1">El perfil completo de cada jugador de un solo vistazo — 5 ejes, puntuados del 1 al 10</p>
        </div>
      </div>

      {/* Main Radar Chart */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Hexagon className="text-violet-400" size={20} /> Gráfico de Araña Comparativo
          </h3>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-800 px-2.5 py-1 rounded-lg">
            <Info size={10} /> Puntuación relativa dentro del grupo (1-10)
          </div>
        </div>

        {/* Axis legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(AXIS_LABELS).map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-lg">
              <span>{val.icon}</span>
              <span className="font-semibold text-slate-300">{val.label}:</span>
              <span>{val.description}</span>
            </div>
          ))}
        </div>

        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#334155" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="axis"
                stroke="#94a3b8"
                fontSize={12}
                fontWeight="bold"
                tick={({ x, y, payload }) => {
                  const info = AXIS_LABELS[payload.value];
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight="bold" dy={-4}>
                        {info?.icon} {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                stroke="#475569"
                tick={{ fontSize: 9, fill: '#475569' }}
                tickCount={6}
              />
              {players.map(p => (
                <Radar
                  key={p.name}
                  name={p.name}
                  dataKey={p.name}
                  stroke={p.color}
                  fill={p.color}
                  fillOpacity={highlightedPlayer === null ? 0.15 : highlightedPlayer === p.name ? 0.35 : 0.05}
                  strokeOpacity={highlightedPlayer === null ? 1 : highlightedPlayer === p.name ? 1 : 0.2}
                  strokeWidth={highlightedPlayer === p.name ? 3 : 2}
                  animationDuration={1500}
                />
              ))}
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }}
                onClick={(e: any) => {
                  setHighlightedPlayer(prev => prev === e.value ? null : e.value);
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Archetype Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {players.map((player) => {
          const archetype = getArchetype(player);
          const scores = [
            { axis: 'Volumen', score: player.volume, raw: player.rawVolume.toLocaleString() + ' juegos' },
            { axis: 'Dedicación', score: player.dedication, raw: player.rawDedication.toLocaleString() + 'h' },
            { axis: 'Rentabilidad', score: player.profitability, raw: (1 / (player.rawProfitability || 1)).toFixed(3) + '€/h' },
            { axis: 'Perfeccionismo', score: player.perfectionism, raw: player.rawPerfectionism + '%' },
            { axis: 'Fidelidad', score: player.loyalty, raw: player.rawLoyalty + '%' },
          ];
          const totalScore = scores.reduce((a, b) => a + b.score, 0);
          const avgScore = (totalScore / 5).toFixed(1);

          return (
            <div
              key={player.name}
              className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 hover:border-violet-500/30 transition-all group cursor-default"
              onMouseEnter={() => setHighlightedPlayer(player.name)}
              onMouseLeave={() => setHighlightedPlayer(null)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: player.color + '20' }}>
                    {archetype.emoji}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{player.name}</span>
                    <span className="text-[10px] font-semibold" style={{ color: player.color }}>{archetype.name}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-white">{avgScore}</span>
                  <span className="text-[10px] text-slate-500 block">media</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mb-3 italic">"{archetype.description}"</p>

              {/* Score bars */}
              <div className="space-y-2">
                {scores.map(s => (
                  <div key={s.axis} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-20 truncate">{AXIS_LABELS[s.axis]?.icon} {s.axis}</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(s.score / 10) * 100}%`,
                          backgroundColor: player.color,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-white w-4 text-right">{s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
