/**
 * Nombre del fichero: RadarSquadChart.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface FriendGenreData {
  name: string;
  color: string;
  data: Record<string, number>;
}

interface Props {
  friends: FriendGenreData[];
}

const GENRE_AXES = ['RPG', 'FPS', 'Supervivencia', 'Roguelike', 'Cooperativo', 'Estrategia', 'Indie'];

// Mock genre affinity data per friend
const DEFAULT_FRIENDS: FriendGenreData[] = [
  { name: 'Yo', color: '#3b82f6', data: { RPG: 85, FPS: 60, Supervivencia: 40, Roguelike: 70, Cooperativo: 90, Estrategia: 55, Indie: 65 } },
  { name: 'AlexGamer', color: '#8b5cf6', data: { RPG: 30, FPS: 95, Supervivencia: 80, Roguelike: 20, Cooperativo: 85, Estrategia: 25, Indie: 15 } },
  { name: 'SarahPro', color: '#ec4899', data: { RPG: 90, FPS: 15, Supervivencia: 30, Roguelike: 75, Cooperativo: 60, Estrategia: 85, Indie: 80 } },
  { name: 'LunaStar', color: '#10b981', data: { RPG: 50, FPS: 10, Supervivencia: 65, Roguelike: 40, Cooperativo: 95, Estrategia: 30, Indie: 95 } },
];

/**
 * Función: RadarSquadChart
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * RadarSquadChart. Este elemento encapsula la lógica de presentación, gestiona
 * su propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function RadarSquadChart({ friends = DEFAULT_FRIENDS }: Props) {
  // Transform data for recharts format
  const radarData = GENRE_AXES.map(genre => {
    const point: Record<string, string | number> = { genre };
    friends.forEach(f => {
      point[f.name] = f.data[genre] || 0;
    });
    return point;
  });

  return (
    <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🧬</span> El ADN Gamer del Escuadrón
        </h3>
        <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded-full">Radar Superpuesto</span>
      </div>
      <p className="text-xs text-slate-500 mb-5">Compara los perfiles de género de tu grupo — las zonas de solapamiento son vuestro siguiente juego.</p>
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
            <PolarGrid stroke="#334155" gridType="polygon" />
            <PolarAngleAxis
              dataKey="genre"
              stroke="#94a3b8"
              fontSize={11}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              stroke="#475569"
              tick={false}
              axisLine={false}
            />
            {friends.map((friend, i) => (
              <Radar
                key={friend.name}
                name={friend.name}
                dataKey={friend.name}
                stroke={friend.color}
                fill={friend.color}
                fillOpacity={0.12}
                strokeWidth={2}
                animationDuration={1200 + i * 300}
              />
            ))}
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 16, fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                color: '#f8fafc',
                borderRadius: '12px',
                fontSize: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
