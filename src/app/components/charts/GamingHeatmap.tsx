/**
 * Nombre del fichero: GamingHeatmap.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState, useMemo } from 'react';
import { Flame } from 'lucide-react';

interface HeatmapData {
  date: string;
  hours: number;
}

interface Props {
  data?: HeatmapData[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/**
 * Función: getColor
 * Descripción: Función encargada de consultar y obtener los datos de color. Procesa los
 * parámetros de entrada requeridos, realiza la llamada pertinente y devuelve la
 * información estructurada para que la aplicación pueda utilizarla.
 */
function getColor(hours: number): string {
  if (hours === 0) return '#1e293b';
  if (hours < 1) return '#0f3d2e';
  if (hours < 3) return '#10b981';
  if (hours < 6) return '#34d399';
  return '#6ee7b7';
}

/**
 * Función: GamingHeatmap
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * GamingHeatmap. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function GamingHeatmap({ data }: Props) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; hours: number; x: number; y: number } | null>(null);

  const hasData = data && data.length > 0;

  const { weeks, monthLabels, totalHours, activeDays, longestStreak, currentStreak } = useMemo(() => {
    if (!hasData) {
      return { weeks: [], monthLabels: [], totalHours: 0, activeDays: 0, longestStreak: 0, currentStreak: 0 };
    }

    const weeks: { date: string; hours: number }[][] = [];
    let currentWeek: { date: string; hours: number }[] = [];

    const firstDay = new Date(data[0].date).getDay();
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({ date: '', hours: -1 });
    }

    data.forEach((d) => {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push({ date: '', hours: -1 });
      weeks.push(currentWeek);
    }

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const validDay = week.find(d => d.date);
      if (validDay) {
        const month = new Date(validDay.date).getMonth();
        if (month !== lastMonth) {
          monthLabels.push({ label: MONTHS[month], col: wi });
          lastMonth = month;
        }
      }
    });

    const totalHours = data.reduce((s, d) => s + d.hours, 0);
    const activeDays = data.filter(d => d.hours > 0).length;

    let longest = 0, current = 0, streak = 0;
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].hours > 0) {
        streak++;
        if (i === data.length - 1 || (i < data.length - 1 && current === streak - 1)) current = streak;
      } else {
        longest = Math.max(longest, streak);
        streak = 0;
      }
    }
    longest = Math.max(longest, streak);

    return { weeks, monthLabels, totalHours: Math.round(totalHours), activeDays, longestStreak: longest, currentStreak: current };
  }, [data, hasData]);

  if (!hasData) {
    return (
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Flame size={18} className="text-emerald-400" /> Actividad de Juego
          </h3>
        </div>
        <div className="h-[200px] flex items-center justify-center">
          <div className="text-center">
            <Flame size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No hay datos de actividad disponibles</p>
            <p className="text-xs text-slate-600 mt-1">Steam no proporciona historial diario de juego</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Flame size={18} className="text-emerald-400" /> Actividad de Juego
        </h3>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span>Último año</span>
          <div className="flex items-center gap-1">
            <span>Menos</span>
            {[0, 0.5, 2, 4, 8].map((h, i) => (
              <span key={i} className="w-2.5 h-2.5 rounded-sm" style={{ background: getColor(h) }} />
            ))}
            <span>Más</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 relative">
        <div className="flex ml-8 mb-1">
          {monthLabels.map((m, i) => (
            <span
              key={i}
              className="text-[10px] text-slate-500 absolute"
              style={{ left: `${m.col * 14 + 32}px` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        <div className="flex gap-0.5 mt-5 ml-8">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="w-[11px] h-[11px] rounded-sm cursor-pointer transition-all hover:ring-1 hover:ring-white/40"
                  style={{ background: day.hours < 0 ? 'transparent' : getColor(day.hours) }}
                  onMouseEnter={(e) => {
                    if (day.date) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDay({ date: day.date, hours: day.hours, x: rect.left, y: rect.top });
                    }
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="absolute left-0 top-5 flex flex-col gap-0.5">
          {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d, i) => (
            <span key={i} className="text-[9px] text-slate-600 h-[11px] flex items-center w-7 justify-end pr-1.5">
              {i % 2 === 1 ? d : ''}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
        {[
          { label: 'Horas Totales', value: `${totalHours.toLocaleString()}h`, color: 'text-emerald-400' },
          { label: 'Días Activos', value: `${activeDays}/${data.length}`, color: 'text-blue-400' },
          { label: 'Racha Actual', value: `${currentStreak}d`, color: 'text-amber-400' },
          { label: 'Racha Máxima', value: `${longestStreak}d`, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {hoveredDay && (
        <div
          className="fixed z-50 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs pointer-events-none"
          style={{ left: hoveredDay.x - 40, top: hoveredDay.y - 50 }}
        >
          <p className="text-white font-medium">{hoveredDay.hours}h jugadas</p>
          <p className="text-slate-400">{new Date(hoveredDay.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      )}
    </div>
  );
}
