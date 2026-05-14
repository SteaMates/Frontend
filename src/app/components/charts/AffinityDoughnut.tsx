/**
 * Nombre del fichero: AffinityDoughnut.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState } from 'react';

interface GenreTime {
  name: string;
  value: number;
}

interface Props {
  userA?: { name: string; data: GenreTime[] };
  userB?: { name: string; data: GenreTime[] };
}

const GENRE_COLORS: Record<string, string> = {
  RPG: '#8b5cf6',
  FPS: '#ef4444',
  Estrategia: '#3b82f6',
  Indie: '#10b981',
  Simulación: '#f59e0b',
  Cooperativo: '#ec4899',
  Acción: '#f97316',
  Carreras: '#06b6d4',
  Terror: '#6366f1',
  MOBA: '#84cc16',
};

const DEFAULT_USER_A = {
  name: 'Yo',
  data: [
    { name: 'RPG', value: 420 },
    { name: 'FPS', value: 310 },
    { name: 'Estrategia', value: 180 },
    { name: 'Indie', value: 150 },
    { name: 'Cooperativo', value: 240 },
  ],
};

const DEFAULT_USER_B = {
  name: 'SarahPro',
  data: [
    { name: 'RPG', value: 500 },
    { name: 'Estrategia', value: 380 },
    { name: 'Indie', value: 290 },
    { name: 'Cooperativo', value: 120 },
    { name: 'Simulación', value: 90 },
  ],
};

/**
 * Función: getColor
 * Descripción: Función encargada de consultar y obtener los datos de color. Procesa los
 * parámetros de entrada requeridos, realiza la llamada pertinente y devuelve la
 * información estructurada para que la aplicación pueda utilizarla.
 */
const getColor = (name: string) => GENRE_COLORS[name] || '#64748b';

/**
 * Función: CustomTooltip
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CustomTooltip. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.payload.fill || d.color }}></div>
        <span className="text-white font-bold">{d.name}</span>
      </div>
      <p className="text-slate-300">{d.value} horas jugadas</p>
    </div>
  );
};

/**
 * Función: AffinityDoughnut
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * AffinityDoughnut. Este elemento encapsula la lógica de presentación, gestiona
 * su propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function AffinityDoughnut({ userA = DEFAULT_USER_A, userB = DEFAULT_USER_B }: Props) {
  const [activeRing, setActiveRing] = useState<'inner' | 'outer' | null>(null);

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🔗</span> Afinidad de Tiempo de Juego
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Anillos Concéntricos</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Anillo interior = <span className="text-blue-400">{userA.name}</span> · Anillo exterior = <span className="text-pink-400">{userB.name}</span> — colores alineados por género.
      </p>

      <div className="h-[320px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* Inner ring - User A */}
            <Pie
              data={userA.data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              onMouseEnter={() => setActiveRing('inner')}
              onMouseLeave={() => setActiveRing(null)}
              animationDuration={1200}
              stroke="transparent"
            >
              {userA.data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={getColor(entry.name)}
                  fillOpacity={activeRing === 'outer' ? 0.3 : 0.9}
                  className="transition-opacity duration-300"
                />
              ))}
            </Pie>

            {/* Outer ring - User B */}
            <Pie
              data={userB.data}
              cx="50%"
              cy="50%"
              innerRadius={90}
              outerRadius={125}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              onMouseEnter={() => setActiveRing('outer')}
              onMouseLeave={() => setActiveRing(null)}
              animationDuration={1500}
              stroke="transparent"
            >
              {userB.data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={getColor(entry.name)}
                  fillOpacity={activeRing === 'inner' ? 0.3 : 0.9}
                  className="transition-opacity duration-300"
                />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xl font-bold text-white">
              {activeRing === 'inner' ? userA.name : activeRing === 'outer' ? userB.name : 'VS'}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {activeRing ? 'Tiempo por género' : 'Comparativa'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
