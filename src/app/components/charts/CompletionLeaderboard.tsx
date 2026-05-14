/**
 * Nombre del fichero: CompletionLeaderboard.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';

interface LeaderboardEntry {
  name: string;
  avatar: string;
  gamesOwned: number;
  avgCompletion: number; // percentage
}

interface Props {
  data?: LeaderboardEntry[];
}

const DEFAULT_DATA: LeaderboardEntry[] = [
  { name: 'LunaStar', avatar: '🌙', gamesOwned: 300, avgCompletion: 85 },
  { name: 'SarahPro', avatar: '🎯', gamesOwned: 210, avgCompletion: 72 },
  { name: 'Yo', avatar: '👤', gamesOwned: 150, avgCompletion: 55 },
  { name: 'AlexGamer', avatar: '🎮', gamesOwned: 120, avgCompletion: 45 },
  { name: 'RyuStreet', avatar: '🥊', gamesOwned: 80, avgCompletion: 60 },
  { name: 'MikeTheTank', avatar: '🛡️', gamesOwned: 45, avgCompletion: 30 },
];

const BAR_COLORS = ['#8b5cf6', '#a78bfa', '#3b82f6', '#60a5fa', '#ec4899', '#f472b6'];

/**
 * Función: CustomTooltip
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CustomTooltip. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-bold mb-1">{d?.avatar} {d?.name}</p>
      <p className="text-blue-400">📚 {d?.gamesOwned} juegos en biblioteca</p>
      <p className="text-emerald-400">🏆 {d?.avgCompletion}% logros desbloqueados</p>
      <div className="mt-2 pt-2 border-t border-slate-800">
        <p className="text-slate-400">
          {d?.gamesOwned > 200 && d?.avgCompletion < 50 ? '⚡ Acumulador' :
           d?.gamesOwned < 100 && d?.avgCompletion > 60 ? '🎖️ Completista' :
           '⚖️ Equilibrado'}
        </p>
      </div>
    </div>
  );
};

/**
 * Función: CompletionLeaderboard
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CompletionLeaderboard. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
export function CompletionLeaderboard({ data = DEFAULT_DATA }: Props) {
  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🏆</span> Leaderboard de Completismo
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Barras + Línea</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">Barras = juegos en biblioteca · Línea = % medio de logros desbloqueados. ¿Acumulador o completista?</p>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 'auto']}
            />
            <XAxis
              xAxisId="completion"
              type="number"
              orientation="top"
              stroke="#10b981"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              hide
            />
            <YAxis
              dataKey="name"
              type="category"
              width={90}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload }: any) => {
                const entry = data.find(d => d.name === payload.value);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={-5} y={0} dy={4} textAnchor="end" fill="#e2e8f0" fontSize={11} fontWeight={600}>
                      {entry?.avatar} {payload.value}
                    </text>
                  </g>
                );
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.15 }} />
            <Legend
              verticalAlign="top"
              height={30}
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
            />
            <Bar
              dataKey="gamesOwned"
              name="Juegos en Biblioteca"
              radius={[0, 8, 8, 0]}
              barSize={18}
              animationDuration={1500}
            >
              {data.map((_, index) => (
                <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.8} />
              ))}
            </Bar>
            <Line
              dataKey="avgCompletion"
              name="% Logros"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
              activeDot={{ r: 7, fill: '#34d399' }}
              animationDuration={2000}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Mini legend for archetypes */}
      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
        <span className="text-[10px] text-slate-500 flex items-center gap-1">⚡ <span className="text-slate-400">Acumulador</span> = muchos juegos, pocos logros</span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">🎖️ <span className="text-slate-400">Completista</span> = pocos juegos, muchos logros</span>
        <span className="text-[10px] text-slate-500 flex items-center gap-1">⚖️ <span className="text-slate-400">Equilibrado</span></span>
      </div>
    </div>
  );
}
