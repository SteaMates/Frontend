/**
 * Nombre del fichero: DivergingBarChart.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

interface OfferVote {
  name: string;
  upvotes: number;
  downvotes: number; // stored as negative
  netScore: number;
}

interface Props {
  data?: OfferVote[];
}

const DEFAULT_DATA: OfferVote[] = [
  { name: 'Baldur\'s Gate 3 -40%', upvotes: 342, downvotes: -18, netScore: 324 },
  { name: 'Cyberpunk 2077 -65%', upvotes: 289, downvotes: -45, netScore: 244 },
  { name: 'Elden Ring -30%', upvotes: 256, downvotes: -22, netScore: 234 },
  { name: 'Starfield -50%', upvotes: 124, downvotes: -186, netScore: -62 },
  { name: 'Stardew Valley -25%', upvotes: 198, downvotes: -8, netScore: 190 },
  { name: 'No Man\'s Sky -70%', upvotes: 167, downvotes: -89, netScore: 78 },
  { name: 'The Day Before -80%', upvotes: 12, downvotes: -298, netScore: -286 },
  { name: 'Palworld -35%', upvotes: 201, downvotes: -67, netScore: 134 },
];

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
  const total = d?.upvotes + Math.abs(d?.downvotes || 0);
  const positiveRatio = total > 0 ? Math.round((d?.upvotes / total) * 100) : 0;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs max-w-[200px]">
      <p className="text-white font-bold text-sm mb-2">{d?.name}</p>
      <div className="space-y-1">
        <p className="text-emerald-400">👍 {d?.upvotes} upvotes</p>
        <p className="text-red-400">👎 {Math.abs(d?.downvotes || 0)} downvotes</p>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${positiveRatio}%` }}></div>
          </div>
          <span className="text-slate-400">{positiveRatio}%</span>
        </div>
        <p className="text-slate-500 mt-1 italic">
          {positiveRatio > 80 ? '✅ Oferta recomendada' :
           positiveRatio > 50 ? '⚠️ Opiniones mixtas' :
           '🚫 La comunidad advierte'}
        </p>
      </div>
    </div>
  );
};

/**
 * Función: DivergingBarChartComponent
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * DivergingBarChartComponent. Este elemento encapsula la lógica de
 * presentación, gestiona su propio estado interno y coordina la renderización
 * de sus componentes hijos según los datos recibidos.
 */
export function DivergingBarChartComponent({ data = DEFAULT_DATA }: Props) {
  // Sort by net score descending
  const sorted = [...data].sort((a, b) => b.netScore - a.netScore);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🌡️</span> Termómetro de Ofertas
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Barras Divergentes</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Verde a la derecha = upvotes · Rojo a la izquierda = downvotes. Si la barra roja domina, la comunidad te está avisando.
      </p>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v > 0 ? `+${v}` : `${v}`}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={140}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={({ x, y, payload }: any) => (
                <text x={x} y={y} dy={4} textAnchor="end" fill="#e2e8f0" fontSize={10}>
                  {payload.value?.length > 20 ? payload.value.slice(0, 20) + '…' : payload.value}
                </text>
              )}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.1 }} />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={2} />

            {/* Downvotes (negative, red) */}
            <Bar dataKey="downvotes" name="Downvotes" stackId="votes" barSize={20} radius={[8, 0, 0, 8]} animationDuration={1200}>
              {sorted.map((entry, index) => (
                <Cell key={`down-${index}`} fill="#ef4444" fillOpacity={0.7 + Math.min(Math.abs(entry.downvotes) / 300, 0.3)} />
              ))}
            </Bar>

            {/* Upvotes (positive, green) */}
            <Bar dataKey="upvotes" name="Upvotes" stackId="votes" barSize={20} radius={[0, 8, 8, 0]} animationDuration={1500}>
              {sorted.map((entry, index) => (
                <Cell key={`up-${index}`} fill="#10b981" fillOpacity={0.7 + Math.min(entry.upvotes / 400, 0.3)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
