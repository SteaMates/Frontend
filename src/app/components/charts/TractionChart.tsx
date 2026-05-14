/**
 * Nombre del fichero: TractionChart.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface TractionData {
  day: string;
  views: number;
  interactions: number;
}

interface Props {
  data?: TractionData[];
  listName?: string;
}

const DEFAULT_DATA: TractionData[] = [
  { day: 'Lun', views: 45, interactions: 12 },
  { day: 'Mar', views: 78, interactions: 28 },
  { day: 'Mié', views: 124, interactions: 45 },
  { day: 'Jue', views: 210, interactions: 89 },
  { day: 'Vie', views: 340, interactions: 156 },
  { day: 'Sáb', views: 280, interactions: 120 },
  { day: 'Dom', views: 195, interactions: 85 },
];

/**
 * Función: CustomTooltip
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CustomTooltip. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const views = payload.find((p: any) => p.dataKey === 'views')?.value || 0;
  const interactions = payload.find((p: any) => p.dataKey === 'interactions')?.value || 0;
  const rate = views > 0 ? Math.round((interactions / views) * 100) : 0;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-bold mb-2">{label}</p>
      <p className="text-cyan-400">👁️ {views} visualizaciones</p>
      <p className="text-purple-400">💾 {interactions} guardados / interacciones</p>
      <div className="mt-2 pt-2 border-t border-slate-800">
        <p className="text-slate-400">Tasa de conversión: <span className="text-white font-bold">{rate}%</span></p>
      </div>
    </div>
  );
};

/**
 * Función: TractionChart
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * TractionChart. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function TractionChart({ data = DEFAULT_DATA, listName = 'Top RPGs de 2024' }: Props) {
  const totalViews = data.reduce((sum, d) => sum + d.views, 0);
  const totalInteractions = data.reduce((sum, d) => sum + d.interactions, 0);
  const conversionRate = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📈</span> Tracción de la Publicación
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Área Chart</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Rendimiento de "<span className="text-cyan-400">{listName}</span>" en los últimos 7 días.
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
          <p className="text-lg font-bold text-white">{totalViews.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Views</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
          <p className="text-lg font-bold text-white">{totalInteractions.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Interacciones</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50">
          <p className="text-lg font-bold text-white">{conversionRate}%</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conversión</p>
        </div>
      </div>

      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tractionViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tractionInteractions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={30} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="views"
              name="Visualizaciones"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#tractionViews)"
              animationDuration={1200}
            />
            <Area
              type="monotone"
              dataKey="interactions"
              name="Guardados/Interacciones"
              stroke="#a855f7"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#tractionInteractions)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
