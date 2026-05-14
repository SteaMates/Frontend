/**
 * Nombre del fichero: GenreBreakdown.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Gamepad2 } from 'lucide-react';

interface GenreData {
  name: string;
  hours: number;
  games: number;
  color: string;
}

interface Props {
  data?: GenreData[];
}

/**
 * Función: renderActiveShape
 * Descripción: Función auxiliar de propósito general especializada en render active shape.
 * Contiene lógica específica para transformar datos, realizar cálculos o
 * conectar diferentes partes del sistema según los requisitos del módulo.
 */
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke={fill}
        strokeWidth={2}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 1}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">
        {payload.name}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        {payload.hours}h · {(percent * 100).toFixed(0)}%
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#64748b" fontSize={10}>
        {payload.games} juegos
      </text>
    </g>
  );
};

/**
 * Función: GenreBreakdown
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * GenreBreakdown. Este elemento encapsula la lógica de presentación, gestiona
 * su propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function GenreBreakdown({ data }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Gamepad2 size={18} className="text-violet-400" /> Géneros Favoritos
          </h3>
        </div>
        <div className="h-[250px] flex items-center justify-center">
          <div className="text-center">
            <Gamepad2 size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sin datos de géneros</p>
            <p className="text-xs text-slate-600 mt-1">Juega algunos juegos para ver tu distribución</p>
          </div>
        </div>
      </div>
    );
  }

  const totalHours = data.reduce((s, g) => s + g.hours, 0);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Gamepad2 size={18} className="text-violet-400" /> Géneros Favoritos
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
          {totalHours.toLocaleString()}h total
        </span>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              dataKey="hours"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={index === activeIndex ? 1 : 0.7} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
        {data.map((g, i) => (
          <div
            key={g.name}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors ${i === activeIndex ? 'bg-slate-800' : 'hover:bg-slate-800/50'
              }`}
            onMouseEnter={() => setActiveIndex(i)}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
            <span className="text-[11px] text-slate-400 truncate flex-1">{g.name}</span>
            <span className="text-[10px] text-slate-600 font-medium">{((g.hours / totalHours) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
