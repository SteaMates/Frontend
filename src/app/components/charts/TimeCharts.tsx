import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area
} from 'recharts';
import { Clock, Moon, Flame, Crown, Star } from 'lucide-react';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  color: '#f8fafc',
  borderRadius: '12px',
  border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

interface PlayerTime {
  name: string;
  color: string;
  totalHours: number;
  topGame: { name: string; hours: number; percentOfTotal: number };
  // Hours played per time slot (0-23)
  hourlyActivity: number[];
  recentHours: number; // last 15 days
  recentTrend: number[]; // daily hours last 15 days
}

interface Props {
  players: PlayerTime[];
}

const DAY_LABELS = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'];

export function TimeCharts({ players }: Props) {
  // Sort by total hours
  const noLifeData = [...players].sort((a, b) => b.totalHours - a.totalHours);

  // Recent streak area data
  const streakData = DAY_LABELS.map((day, i) => {
    const point: Record<string, any> = { day };
    players.forEach(p => {
      point[p.name] = p.recentTrend[i] || 0;
    });
    return point;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-cyan-900/30 border border-blue-500/20 rounded-3xl p-6 flex items-center gap-4">
        <div className="bg-blue-500/20 p-3 rounded-2xl">
          <Clock className="text-blue-400 w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Factor Tiempo</h2>
          <p className="text-slate-400 text-sm mt-1">Las horas de vuelo — el medidor definitivo de dedicación (o de falta de vida social)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. EL NO LIFE ABSOLUTO */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="text-blue-400" size={20} /> El "No Life" Absoluto
              </h3>
              <p className="text-xs text-slate-500 mt-1">Total histórico de horas registradas en Steam</p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              <Crown size={12} className="text-amber-400" />
              <span className="text-[10px] font-bold text-blue-400">{noLifeData[0]?.name}</span>
            </div>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={noLifeData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v.toLocaleString()} horas`]}
                />
                <Bar dataKey="totalHours" name="Horas Totales" radius={[8, 8, 0, 0]} animationDuration={1200}>
                  {noLifeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={i === 0 ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Fun stat */}
          {noLifeData[0] && (
            <div className="mt-3 bg-slate-800/40 rounded-xl p-3 text-center">
              <span className="text-xs text-slate-500">
                {noLifeData[0].name} lleva <span className="text-white font-bold">{Math.round(noLifeData[0].totalHours / 24)} días</span> completos jugando
                ({(noLifeData[0].totalHours / 8760).toFixed(1)} años)
              </span>
            </div>
          )}
        </div>

        {/* 2. OBSESIÓN MONOTEMÁTICA */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <Star className="text-amber-400" size={20} /> Obsesión Monotemática
          </h3>
          <p className="text-xs text-slate-500 mb-5">El Top 1 de cada jugador y su % sobre el total de horas</p>

          <div className="space-y-4">
            {players.map((player, i) => (
              <div key={player.name} className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ backgroundColor: player.color + '20', color: player.color }}>
                      {player.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-white">{player.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{player.totalHours.toLocaleString()}h totales</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-xs font-semibold text-slate-300">{player.topGame.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">({player.topGame.percentOfTotal}%)</span>
                        <span className="text-xs font-black" style={{ color: player.color }}>{player.topGame.hours.toLocaleString()}h</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${player.topGame.percentOfTotal}%`,
                          background: `linear-gradient(90deg, ${player.color}, ${player.color}66)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-600">0%</span>
                      <span className="text-[10px] font-bold" style={{ color: player.color }}>{player.topGame.percentOfTotal}% del total</span>
                      <span className="text-[10px] text-slate-600">100%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3. EL VAMPIRO NOCTURNO */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <Moon className="text-indigo-400" size={20} /> El Vampiro Nocturno
          </h3>
          <p className="text-xs text-slate-500 mb-5">Mapa de calor: ¿a qué horas juega cada uno?</p>

          {/* Custom heatmap */}
          <div className="space-y-3">
            {players.map((player) => (
              <div key={player.name} className="group">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }} />
                  <span className="text-xs font-semibold text-slate-300 w-20 truncate">{player.name}</span>
                </div>
                <div className="flex gap-[2px]">
                  {player.hourlyActivity.map((activity, hour) => {
                    const intensity = Math.min(activity / Math.max(...player.hourlyActivity), 1);
                    const isNight = hour >= 0 && hour < 7;
                    return (
                      <div
                        key={hour}
                        className="flex-1 h-7 rounded-sm relative group/cell cursor-default"
                        style={{
                          backgroundColor: intensity > 0
                            ? `color-mix(in srgb, ${player.color} ${Math.round(intensity * 100)}%, #0f172a)`
                            : '#1e293b',
                          opacity: intensity > 0 ? 0.3 + intensity * 0.7 : 0.3,
                        }}
                        title={`${String(hour).padStart(2, '0')}:00 — ${activity}h`}
                      >
                        {isNight && intensity > 0.5 && (
                          <Moon size={6} className="absolute top-0.5 left-1/2 -translate-x-1/2 text-white/60" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* Hour labels */}
            <div className="flex gap-[2px] mt-1">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="flex-1 text-center text-[7px] text-slate-600">
                  {i % 4 === 0 ? `${String(i).padStart(2, '0')}` : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Night owl badge */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
            {players
              .map(p => ({
                name: p.name,
                color: p.color,
                nightScore: p.hourlyActivity.slice(0, 6).reduce((a, b) => a + b, 0),
              }))
              .sort((a, b) => b.nightScore - a.nightScore)
              .slice(0, 1)
              .map(p => (
                <div key={p.name} className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
                  <Moon size={10} className="text-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-400">
                    🧛 Vampiro: {p.name}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* 4. RACHA ÚLTIMOS 15 DÍAS */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Flame className="text-orange-400" size={20} /> Racha: Últimos 15 Días
              </h3>
              <p className="text-xs text-slate-500 mt-1">¿Quién está más enganchado ahora mismo?</p>
            </div>
          </div>

          {/* Summary cards */}
          <div className="flex flex-wrap gap-2 my-4">
            {[...players].sort((a, b) => b.recentHours - a.recentHours).map((p, i) => (
              <div key={p.name} className="flex items-center gap-2 bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-700/30">
                {i === 0 && <Flame size={12} className="text-orange-400" />}
                <span className="text-xs font-semibold text-white">{p.name}</span>
                <span className="text-xs font-black" style={{ color: p.color }}>{p.recentHours}h</span>
              </div>
            ))}
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={streakData}>
                <defs>
                  {players.map(p => (
                    <linearGradient key={p.name} id={`streak-${p.name.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={p.color} stopOpacity={0.6} />
                      <stop offset="95%" stopColor={p.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}h`} />
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <Tooltip contentStyle={tooltipStyle} />
                {players.map(p => (
                  <Area
                    key={p.name}
                    type="monotone"
                    dataKey={p.name}
                    stroke={p.color}
                    fillOpacity={1}
                    fill={`url(#streak-${p.name.replace(/\s/g,'')})`}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}