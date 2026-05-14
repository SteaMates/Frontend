/**
 * Nombre del fichero: CommunityDashboard.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { TrendingUp, Users, ListChecks, Gamepad2, Crown, Flame, MessageSquare } from 'lucide-react';

// ---- Time period types ----
type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all';

// ---- Trending data by time period ----
const TRENDING_DATA = {
  day: [
    { rank: 1, name: 'Ofertas Flash HOY', author: 'DealHunter', views: [45, 67, 89, 112, 145, 178, 234], totalViews: 870, change: '+420%', hot: true },
    { rank: 2, name: 'Nuevos lanzamientos Feb', author: 'GameNews', views: [34, 56, 78, 95, 112, 134, 189], totalViews: 698, change: '+278%', hot: true },
    { rank: 3, name: 'Multiplayer Arena', author: 'CompetitiveGG', views: [89, 95, 102, 110, 118, 125, 145], totalViews: 784, change: '+62%', hot: true },
    { rank: 4, name: 'Juegos Cozy', author: 'ChillGamer', views: [23, 34, 45, 56, 67, 78, 98], totalViews: 401, change: '+326%', hot: false },
    { rank: 5, name: 'Terror Psicológico', author: 'HorrorFan', views: [12, 23, 34, 45, 56, 67, 89], totalViews: 326, change: '+641%', hot: true },
  ],
  week: [
    { rank: 1, name: 'Indie gems 2025', author: 'CuratedIndie', views: [12, 34, 56, 89, 145, 210, 320], totalViews: 866, change: '+184%', hot: true },
    { rank: 2, name: 'Co-op para el finde', author: 'SquadLeader', views: [80, 95, 110, 105, 130, 148, 156], totalViews: 824, change: '+42%', hot: true },
    { rank: 3, name: 'Ofertas Flash Febrero', author: 'DealBot', views: [200, 180, 160, 140, 120, 110, 95], totalViews: 1005, change: '-12%', hot: false },
    { rank: 4, name: 'Top RPGs de 2024', author: 'GamerPro99', views: [50, 55, 60, 62, 70, 78, 85], totalViews: 460, change: '+28%', hot: false },
    { rank: 5, name: 'Survival Horror 101', author: 'DarkSoulsLover', views: [20, 25, 40, 65, 90, 88, 92], totalViews: 420, change: '+95%', hot: true },
  ],
  month: [
    { rank: 1, name: 'Mejores RPGs 2025', author: 'RPGMaster', views: [120, 145, 178, 201, 234, 267, 312], totalViews: 3456, change: '+67%', hot: true },
    { rank: 2, name: 'Juegos con Gold', author: 'ValueGamer', views: [156, 178, 189, 201, 212, 223, 245], totalViews: 2890, change: '+45%', hot: true },
    { rank: 3, name: 'AAA Imprescindibles', author: 'CoreGaming', views: [234, 223, 212, 201, 195, 189, 178], totalViews: 2678, change: '-8%', hot: false },
    { rank: 4, name: 'Simuladores realistas', author: 'SimEnthusiast', views: [67, 78, 89, 95, 102, 110, 123], totalViews: 1823, change: '+52%', hot: false },
    { rank: 5, name: 'Party Games Local', author: 'CoouchCoop', views: [45, 56, 67, 78, 89, 98, 112], totalViews: 1567, change: '+89%', hot: true },
  ],
  year: [
    { rank: 1, name: 'GOTY 2024 Completo', author: 'AwardsTracker', views: [450, 467, 489, 512, 534, 556, 589], totalViews: 28945, change: '+23%', hot: true },
    { rank: 2, name: 'Lo mejor del año', author: 'BestOfGaming', views: [389, 401, 412, 423, 445, 467, 489], totalViews: 25678, change: '+18%', hot: false },
    { rank: 3, name: 'Clásicos Atemporales', author: 'RetroLegend', views: [312, 334, 345, 356, 367, 378, 398], totalViews: 21234, change: '+15%', hot: false },
    { rank: 4, name: 'Colección Estrategia', author: '4XMaster', views: [234, 245, 256, 267, 278, 289, 301], totalViews: 18456, change: '+21%', hot: false },
    { rank: 5, name: 'Aventuras Épicas', author: 'QuestSeeker', views: [189, 201, 212, 223, 234, 245, 267], totalViews: 16890, change: '+28%', hot: true },
  ],
  all: [
    { rank: 1, name: 'Los Mejores Juegos de la Historia', author: 'LegendCollector', views: [8900, 9012, 9234, 9456, 9678, 9890, 10234], totalViews: 187456, change: '+8%', hot: false },
    { rank: 2, name: 'Esenciales para PC Gamer', author: 'PCMasterRace', views: [7800, 7956, 8123, 8267, 8412, 8556, 8734], totalViews: 156892, change: '+12%', hot: false },
    { rank: 3, name: 'RPGs que Marcaron Época', author: 'RPGHistorian', views: [6700, 6834, 6945, 7089, 7201, 7345, 7489], totalViews: 134567, change: '+11%', hot: false },
    { rank: 4, name: 'Co-op Inolvidables', author: 'FriendlyGaming', views: [5600, 5712, 5834, 5945, 6078, 6189, 6312], totalViews: 112345, change: '+13%', hot: false },
    { rank: 5, name: 'Joyas Indie Ocultas', author: 'IndieExplorer', views: [4500, 4612, 4723, 4845, 4956, 5067, 5189], totalViews: 98765, change: '+15%', hot: true },
  ],
};

// ---- Category data by time period ----
const CATEGORIES_DATA = {
  day: [
    { name: 'Ofertas / Económicos', count: 8, color: '#f59e0b' },
    { name: 'Co-op / Multijugador', count: 6, color: '#3b82f6' },
    { name: 'Indie', count: 5, color: '#10b981' },
    { name: 'Terror / Survival', count: 4, color: '#ef4444' },
    { name: 'RPG', count: 3, color: '#8b5cf6' },
    { name: 'Estrategia', count: 2, color: '#06b6d4' },
    { name: 'Retro / Clásicos', count: 2, color: '#ec4899' },
    { name: 'Simulación', count: 1, color: '#84cc16' },
  ],
  week: [
    { name: 'RPG', count: 34, color: '#8b5cf6' },
    { name: 'Co-op / Multijugador', count: 28, color: '#3b82f6' },
    { name: 'Indie', count: 25, color: '#10b981' },
    { name: 'Ofertas / Económicos', count: 22, color: '#f59e0b' },
    { name: 'Terror / Survival', count: 18, color: '#ef4444' },
    { name: 'Estrategia', count: 15, color: '#06b6d4' },
    { name: 'Retro / Clásicos', count: 12, color: '#ec4899' },
    { name: 'Simulación', count: 9, color: '#84cc16' },
  ],
  month: [
    { name: 'RPG', count: 156, color: '#8b5cf6' },
    { name: 'Co-op / Multijugador', count: 134, color: '#3b82f6' },
    { name: 'Indie', count: 112, color: '#10b981' },
    { name: 'Ofertas / Económicos', count: 98, color: '#f59e0b' },
    { name: 'Terror / Survival', count: 87, color: '#ef4444' },
    { name: 'Estrategia', count: 76, color: '#06b6d4' },
    { name: 'Retro / Clásicos', count: 54, color: '#ec4899' },
    { name: 'Simulación', count: 43, color: '#84cc16' },
  ],
  year: [
    { name: 'RPG', count: 1789, color: '#8b5cf6' },
    { name: 'Co-op / Multijugador', count: 1567, color: '#3b82f6' },
    { name: 'Indie', count: 1345, color: '#10b981' },
    { name: 'Ofertas / Económicos', count: 1123, color: '#f59e0b' },
    { name: 'Terror / Survival', count: 989, color: '#ef4444' },
    { name: 'Estrategia', count: 876, color: '#06b6d4' },
    { name: 'Retro / Clásicos', count: 654, color: '#ec4899' },
    { name: 'Simulación', count: 534, color: '#84cc16' },
  ],
  all: [
    { name: 'RPG', count: 8945, color: '#8b5cf6' },
    { name: 'Co-op / Multijugador', count: 7823, color: '#3b82f6' },
    { name: 'Indie', count: 6712, color: '#10b981' },
    { name: 'Ofertas / Económicos', count: 5689, color: '#f59e0b' },
    { name: 'Estrategia', count: 4567, color: '#06b6d4' },
    { name: 'Terror / Survival', count: 4234, color: '#ef4444' },
    { name: 'Retro / Clásicos', count: 3456, color: '#ec4899' },
    { name: 'Simulación', count: 2789, color: '#84cc16' },
  ],
};

// ---- Activity data by time period ----
const ACTIVITY_DATA = {
  day: [
    { label: '00h-03h', listas: 0, votos: 12, comments: 3 },
    { label: '03h-06h', listas: 0, votos: 5, comments: 1 },
    { label: '06h-09h', listas: 1, votos: 23, comments: 8 },
    { label: '09h-12h', listas: 2, votos: 67, comments: 23 },
    { label: '12h-15h', listas: 3, votos: 134, comments: 45 },
    { label: '15h-18h', listas: 4, votos: 189, comments: 67 },
    { label: '18h-21h', listas: 5, votos: 256, comments: 89 },
    { label: '21h-00h', listas: 3, votos: 198, comments: 56 },
  ],
  week: [
    { label: 'Lun', listas: 3, votos: 89, comments: 34 },
    { label: 'Mar', listas: 5, votos: 124, comments: 56 },
    { label: 'Mié', listas: 4, votos: 156, comments: 67 },
    { label: 'Jue', listas: 7, votos: 201, comments: 89 },
    { label: 'Vie', listas: 12, votos: 345, comments: 134 },
    { label: 'Sáb', listas: 9, votos: 278, comments: 112 },
    { label: 'Dom', listas: 6, votos: 198, comments: 78 },
  ],
  month: [
    { label: 'Sem 1', listas: 18, votos: 456, comments: 234 },
    { label: 'Sem 2', listas: 24, votos: 589, comments: 312 },
    { label: 'Sem 3', listas: 31, votos: 712, comments: 389 },
    { label: 'Sem 4', listas: 28, votos: 645, comments: 298 },
  ],
  year: [
    { label: 'Ene', listas: 67, votos: 1456, comments: 789 },
    { label: 'Feb', listas: 89, votos: 1789, comments: 934 },
    { label: 'Mar', listas: 102, votos: 2134, comments: 1045 },
    { label: 'Abr', listas: 95, votos: 1967, comments: 923 },
    { label: 'May', listas: 112, votos: 2345, comments: 1123 },
    { label: 'Jun', listas: 124, votos: 2567, comments: 1234 },
    { label: 'Jul', listas: 134, votos: 2789, comments: 1345 },
    { label: 'Ago', listas: 118, votos: 2456, comments: 1189 },
    { label: 'Sep', listas: 145, votos: 3012, comments: 1456 },
    { label: 'Oct', listas: 156, votos: 3234, comments: 1567 },
    { label: 'Nov', listas: 142, votos: 2967, comments: 1434 },
    { label: 'Dic', listas: 178, votos: 3678, comments: 1789 },
  ],
};

// Mini sparkline component
/**
 * Función: MiniSparkline
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * MiniSparkline. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
function MiniSparkline({ data, color, positive }: { data: number[]; color: string; positive: boolean }) {
  const points = data.map((v, i) => ({ x: i, y: v }));
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Función: ActivityTooltip
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * ActivityTooltip. Este elemento encapsula la lógica de presentación, gestiona
 * su propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
const ActivityTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="text-white font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/**
 * Función: CommunityDashboard
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CommunityDashboard. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
export function CommunityDashboard() {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [categoryPeriod, setCategoryPeriod] = useState<TimePeriod>('week');
  const [activityPeriod, setActivityPeriod] = useState<TimePeriod>('week');

  const currentData = TRENDING_DATA[timePeriod];
  const currentCategories = CATEGORIES_DATA[categoryPeriod];
  const currentActivityData = ACTIVITY_DATA[activityPeriod];
  const maxCount = Math.max(...currentCategories.map(c => c.count));

  /**
                 * Función: getPeriodLabel
         * Descripción: Función encargada de consultar y obtener los datos de period label.
         * Procesa los parámetros de entrada requeridos, realiza la llamada
         * pertinente y devuelve la información estructurada para que la aplicación
         * pueda utilizarla.
                 */
    const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta Semana';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      case 'all': return 'Todos los Tiempos';
    }
  };

  /**
                 * Función: getPeriodSpan
         * Descripción: Función encargada de consultar y obtener los datos de period span.
         * Procesa los parámetros de entrada requeridos, realiza la llamada
         * pertinente y devuelve la información estructurada para que la aplicación
         * pueda utilizarla.
                 */
    const getPeriodSpan = (period: TimePeriod) => {
    switch (period) {
      case 'day': return '24h';
      case 'week': return '7 días';
      case 'month': return '30 días';
      case 'year': return '365 días';
      case 'all': return 'Histórico';
    }
  };

  /**
                 * Función: getActivityDescription
         * Descripción: Función encargada de consultar y obtener los datos de activity
         * description. Procesa los parámetros de entrada requeridos, realiza la
         * llamada pertinente y devuelve la información estructurada para que la
         * aplicación pueda utilizarla.
                 */
    const getActivityDescription = (period: TimePeriod) => {
    switch (period) {
      case 'day': return 'Actividad de las últimas 24 horas por tramo horario.';
      case 'week': return 'Nuevas listas creadas, votos emitidos y comentarios publicados por día.';
      case 'month': return 'Resumen de actividad semanal durante el mes.';
      case 'year': return 'Actividad mensual durante todo el año.';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: ListChecks, label: 'Listas Totales', value: '43.8K', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { icon: TrendingUp, label: 'Votos Totales', value: '1.2M', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { icon: MessageSquare, label: 'Comentarios', value: '487K', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { icon: Gamepad2, label: 'Juegos Catalogados', value: '18.2K', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
          { icon: Users, label: 'Contribuidores', value: '12.4K', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border rounded-2xl p-4 backdrop-blur`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Two column layout: Trending + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Trending Lists - takes 3 cols */}
        <div className="lg:col-span-3 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame size={18} className="text-orange-400" /> Trending {getPeriodLabel(timePeriod)}
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Top 5</span>
          </div>

          {/* Time period selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['day', 'week', 'month', 'year', 'all'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  timePeriod === period
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-3 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-600">
              <span>#</span>
              <span>Lista</span>
              <span className="text-right">{getPeriodSpan(timePeriod)}</span>
              <span className="text-right">Views</span>
              <span className="text-right">Cambio</span>
            </div>

            {currentData.map((list) => {
              // Medal colors for top 3
              /**
                                                                 * Función: getMedalColor
                                 * Descripción: Función encargada de consultar y obtener los datos de medal
                                 * color. Procesa los parámetros de entrada requeridos, realiza
                                 * la llamada pertinente y devuelve la información estructurada
                                 * para que la aplicación pueda utilizarla.
                                                                 */
                const getMedalColor = (rank: number) => {
                if (rank === 1) return 'text-amber-400'; // Gold
                if (rank === 2) return 'text-slate-300'; // Silver
                if (rank === 3) return 'text-orange-600'; // Bronze
                return 'text-slate-600';
              };

              return (
              <div
                key={list.rank}
                className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-3 items-center px-3 py-2.5 rounded-xl hover:bg-slate-800/50 transition-colors group cursor-pointer"
              >
                <span className={`text-sm font-bold ${getMedalColor(list.rank)}`}>
                  {list.rank <= 3 ? <Crown size={16} className={`inline ${getMedalColor(list.rank)}`} /> : list.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                    {list.name}
                    {list.hot && <span className="ml-1.5 text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">HOT</span>}
                  </p>
                  <p className="text-[11px] text-slate-500">por {list.author}</p>
                </div>
                <div className="flex justify-end">
                  <MiniSparkline
                    data={list.views}
                    color={list.change.startsWith('+') ? '#10b981' : '#ef4444'}
                    positive={list.change.startsWith('+')}
                  />
                </div>
                <p className="text-xs text-slate-400 text-right font-medium">{list.totalViews.toLocaleString()}</p>
                <p className={`text-xs font-bold text-right ${list.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {list.change}
                </p>
              </div>
            )})}
          </div>
        </div>

        {/* Categories - takes 2 cols */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Gamepad2 size={18} className="text-cyan-400" /> Categorías Populares
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{currentCategories.length} categorías</span>
          </div>

          {/* Category period selector */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(['day', 'week', 'month', 'year', 'all'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setCategoryPeriod(period)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                  categoryPeriod === period
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                }`}
              >
                {getPeriodLabel(period)}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {currentCategories.map(cat => (
              <div
                key={cat.name}
                className="group cursor-pointer"
                onMouseEnter={() => setHoveredCategory(cat.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium transition-colors ${hoveredCategory === cat.name ? 'text-white' : 'text-slate-400'}`}>
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">{cat.count} listas</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(cat.count / maxCount) * 100}%`,
                      background: cat.color,
                      opacity: hoveredCategory && hoveredCategory !== cat.name ? 0.3 : 1,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Actividad de la Comunidad
          </h3>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">{getPeriodSpan(activityPeriod)}</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">{getActivityDescription(activityPeriod)}</p>

        {/* Activity period selector */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(['day', 'week', 'month', 'year'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setActivityPeriod(period)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all ${
                activityPeriod === period
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {getPeriodLabel(period)}
            </button>
          ))}
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentActivityData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<ActivityTooltip />} cursor={{ fill: '#334155', opacity: 0.15 }} />
              <Bar dataKey="listas" name="Nuevas Listas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} fillOpacity={0.85} />
              <Bar dataKey="votos" name="Votos" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={14} fillOpacity={0.85} />
              <Bar dataKey="comments" name="Comentarios" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-800">
          {[
            { color: '#3b82f6', label: 'Nuevas Listas' },
            { color: '#8b5cf6', label: 'Votos' },
            { color: '#10b981', label: 'Comentarios' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
              <span className="text-[11px] text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}