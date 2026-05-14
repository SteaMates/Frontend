/**
 * Nombre del fichero: RentabilityScatter.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

interface GamePoint {
  name: string;
  pricePaid: number;   // €
  hoursPlayed: number;
  costPerHour?: number;
}

interface Props {
  data?: GamePoint[];
}

const DEFAULT_DATA: GamePoint[] = [
  { name: 'Dota 2', pricePaid: 0, hoursPlayed: 1583 },
  { name: 'Counter-Strike 2', pricePaid: 0, hoursPlayed: 2000 },
  { name: 'Terraria', pricePaid: 9.99, hoursPlayed: 750 },
  { name: 'Stardew Valley', pricePaid: 13.99, hoursPlayed: 250 },
  { name: 'GTA V', pricePaid: 29.99, hoursPlayed: 533 },
  { name: 'The Witcher 3', pricePaid: 39.99, hoursPlayed: 180 },
  { name: 'Baldur\'s Gate 3', pricePaid: 59.99, hoursPlayed: 120 },
  { name: 'Cyberpunk 2077', pricePaid: 59.99, hoursPlayed: 85 },
  { name: 'Elden Ring', pricePaid: 49.99, hoursPlayed: 200 },
  { name: 'Starfield', pricePaid: 69.99, hoursPlayed: 12 },
  { name: 'Project Zomboid', pricePaid: 14.99, hoursPlayed: 200 },
  { name: 'Rust', pricePaid: 39.99, hoursPlayed: 45 },
  { name: 'TF2', pricePaid: 0, hoursPlayed: 467 },
  { name: 'Valheim', pricePaid: 19.99, hoursPlayed: 95 },
  { name: 'Hades', pricePaid: 24.99, hoursPlayed: 60 },
  { name: 'It Takes Two', pricePaid: 39.99, hoursPlayed: 8 },
  { name: 'Anthem', pricePaid: 59.99, hoursPlayed: 3 },
  { name: 'Marvel\'s Avengers', pricePaid: 49.99, hoursPlayed: 5 },
].map(g => ({ ...g, costPerHour: g.hoursPlayed > 0 ? +(g.pricePaid / g.hoursPlayed).toFixed(2) : 0 }));

/**
 * Función: getPointColor
 * Descripción: Función encargada de consultar y obtener los datos de point color. Procesa
 * los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
const getPointColor = (pricePaid: number, hoursPlayed: number) => {
  if (pricePaid === 0) return '#10b981'; // Free
  const ratio = hoursPlayed / Math.max(pricePaid, 1);
  if (ratio > 10) return '#10b981';  // Excellent value
  if (ratio > 3) return '#3b82f6';   // Good value
  if (ratio > 1) return '#f59e0b';   // Fair
  return '#ef4444';                   // Poor value
};

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
  const ratio = d?.hoursPlayed / Math.max(d?.pricePaid, 0.01);
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 shadow-2xl text-xs max-w-[220px]">
      <p className="text-white font-bold text-sm mb-2">{d?.name}</p>
      <div className="space-y-1">
        <p className="text-slate-300">💰 Pagado: <span className="text-white font-medium">{d?.pricePaid === 0 ? 'Gratis' : `${d?.pricePaid}€`}</span></p>
        <p className="text-slate-300">⏱️ Jugado: <span className="text-white font-medium">{d?.hoursPlayed}h</span></p>
        {d?.pricePaid > 0 && (
          <p className="text-slate-300">📊 Coste/hora: <span className="text-white font-medium">{d?.costPerHour}€/h</span></p>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800">
        <p className={`font-bold ${
          ratio > 10 ? 'text-emerald-400' : ratio > 3 ? 'text-blue-400' : ratio > 1 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {d?.pricePaid === 0 ? '🎁 Juego gratuito' :
           ratio > 10 ? '🏆 Inversión épica' :
           ratio > 3 ? '✅ Buena compra' :
           ratio > 1 ? '⚠️ Aceptable' :
           '💸 Compra impulsiva'}
        </p>
      </div>
    </div>
  );
};

/**
 * Función: RentabilityScatter
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * RentabilityScatter. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
export function RentabilityScatter({ data = DEFAULT_DATA }: Props) {
  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">💎</span> Análisis de Rentabilidad Personal
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Dispersión</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">
        Eje X = precio pagado · Eje Y = horas jugadas. Arriba-izquierda = mejores inversiones. Abajo-derecha = compras impulsivas.
      </p>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="pricePaid"
              name="Precio pagado"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="€"
              label={{ value: 'Precio pagado (€)', position: 'bottom', fill: '#64748b', fontSize: 10, offset: 0 }}
            />
            <YAxis
              type="number"
              dataKey="hoursPlayed"
              name="Horas jugadas"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="h"
              label={{ value: 'Horas jugadas ↑', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, offset: 10 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#475569' }} />

            {/* Reference diagonal line for "1€ = 1h" ratio */}
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 70, y: 70 }]}
              stroke="#475569"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: '1€ = 1h', fill: '#64748b', fontSize: 9, position: 'end' }}
            />

            <Scatter
              data={data}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getPointColor(entry.pricePaid, entry.hoursPlayed)}
                  fillOpacity={0.85}
                  r={6}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800">
        <span className="text-[10px] flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-slate-400">Épica (gratis o ratio &gt;10)</span>
        </span>
        <span className="text-[10px] flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span className="text-slate-400">Buena (ratio 3-10)</span>
        </span>
        <span className="text-[10px] flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className="text-slate-400">Aceptable (ratio 1-3)</span>
        </span>
        <span className="text-[10px] flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-400">Impulsiva (ratio &lt;1)</span>
        </span>
      </div>
    </div>
  );
}
