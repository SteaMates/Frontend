/**
 * Nombre del fichero: EconomyCharts.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, ShoppingBag, Gift, TrendingDown, Crown, Wallet, PiggyBank } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#1e293b',
  borderRadius: '12px',
  border: '1px solid #334155',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

interface PlayerEconomy {
  name: string;
  color: string;
  avatar: string;
  moneySpent: number;       // € total estimated
  totalHours: number;
  costPerHour: number;      // € per hour
  backlogPercent: number;   // % games with 0h
  gamesOwned: number;
  gamesPlayed: number;
  f2pHours: number;         // hours in F2P games
  f2pTopGame: string;
  accountValueFull: number; // € full price
  accountValueLow: number;  // € historical low
}

interface Props {
  players: PlayerEconomy[];
}

/**
 * Función: EconomyCharts
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * EconomyCharts. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function EconomyCharts({ players }: Props) {
  // Sort by cost per hour (worst investor first, best last)
  const rentabilityData = [...players]
    .sort((a, b) => b.costPerHour - a.costPerHour)
    .map((p, i) => ({
      name: p.name,
      costPerHour: p.costPerHour,
      fill: p.color,
      hours: p.totalHours,
      spent: p.moneySpent,
    }));

  // Best investor
  const bestInvestor = rentabilityData[rentabilityData.length - 1];

  // F2P ranking
  const f2pData = [...players]
    .sort((a, b) => b.f2pHours - a.f2pHours)
    .map(p => ({
      name: p.name,
      hours: p.f2pHours,
      topGame: p.f2pTopGame,
      fill: p.color,
    }));

  // Savings ranking (total money saved)
  const savingsData = [...players]
    .sort((a, b) => (b.accountValueFull - b.accountValueLow) - (a.accountValueFull - a.accountValueLow))
    .map(p => ({
      name: p.name,
      saved: p.accountValueFull - p.accountValueLow,
      savingsPercent: ((1 - p.accountValueLow / p.accountValueFull) * 100).toFixed(0),
      fill: p.color,
    }));

  // Best saver
  const bestSaver = savingsData[0];

  // Account value data
  const accountValueData = players.map(p => ({
    name: p.name,
    'Precio Base': p.accountValueFull,
    'Mínimo Histórico': p.accountValueLow,
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-emerald-900/30 via-green-900/20 to-teal-900/30 border border-emerald-500/20 rounded-3xl p-6 flex items-center gap-4">
        <div className="bg-emerald-500/20 p-3 rounded-2xl">
          <Wallet className="text-emerald-400 w-7 h-7" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Factor Económico</h2>
          <p className="text-slate-400 text-sm mt-1">La cartera y la rentabilidad — ¿quién aprovecha mejor cada euro?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 1. RENTABILIDAD MÁXIMA */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingDown className="text-emerald-400" size={20} /> Rentabilidad Máxima
              </h3>
              <p className="text-xs text-slate-500 mt-1">Coste por hora jugada (€/h) — menor = mejor inversor</p>
            </div>
            {bestInvestor && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-emerald-400">{bestInvestor.name}</span>
              </div>
            )}
          </div>
          <div className="w-full flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={rentabilityData} 
                layout="vertical"
                margin={{ top: 0, bottom: 0, left: 0, right: 20 }}
                barCategoryGap="30%"
                barGap={0}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(2)}€`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  width={85}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={0}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number, _name: string, props: any) => [
                    <span key="v">
                      <strong>{value.toFixed(3)}€/h</strong>
                      <br />
                      <span className="text-slate-400 text-[10px]">{props.payload.spent}€ / {props.payload.hours}h</span>
                    </span>,
                    'Coste'
                  ]}
                />
                <Bar dataKey="costPerHour" name="€/hora" radius={[0, 8, 8, 0]} animationDuration={1200}>
                  {rentabilityData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} fillOpacity={index === rentabilityData.length - 1 ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. DIÓGENES DIGITAL */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <ShoppingBag className="text-orange-400" size={20} /> El "Diógenes Digital"
          </h3>
          <p className="text-xs text-slate-500 mb-4">El backlog de la vergüenza — % de juegos con 0 horas</p>

          <div className="grid grid-cols-2 gap-4">
            {players.map((player, i) => {
              const played = 100 - player.backlogPercent;
              const data = [
                { name: 'Jugados', value: played },
                { name: 'Sin tocar', value: player.backlogPercent },
              ];
              return (
                <div key={player.name} className="flex flex-col items-center bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
                  <div className="h-[120px] w-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={50}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill={player.color} />
                          <Cell fill="#1e293b" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center -mt-2">
                    <p className="text-lg font-black text-white">{player.backlogPercent}%</p>
                    <p className="text-xs font-semibold" style={{ color: player.color }}>{player.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {Math.round(player.gamesOwned * player.backlogPercent / 100)} de {player.gamesOwned} sin abrir
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 3. EL MÁS AHORRADOR */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-start mb-1">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PiggyBank className="text-emerald-400" size={20} /> El Más Ahorrador
              </h3>
              <p className="text-xs text-slate-500 mt-1">Dinero ahorrado comprando en ofertas (€)</p>
            </div>
            {bestSaver && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold text-emerald-400">{bestSaver.name}</span>
              </div>
            )}
          </div>
          <div className="space-y-3 mt-5">
            {savingsData.map((player, i) => {
              const maxSaved = savingsData[0].saved;
              return (
                <div key={player.name} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                        i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-semibold text-white">{player.name}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">Descuento promedio: {player.savingsPercent}%</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{player.saved.toLocaleString()}€</span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-500 to-emerald-400"
                      style={{
                        width: `${(player.saved / maxSaved) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. VALOR TOTAL DE LA CUENTA */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
            <DollarSign className="text-green-400" size={20} /> Valor Total de la Cuenta
          </h3>
          <p className="text-xs text-slate-500 mb-4">Precio base vs mínimo histórico (€)</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountValueData} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [`${v.toLocaleString()}€`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Precio Base" fill="#64748b" radius={[6, 6, 0, 0]} animationDuration={1200} />
                <Bar dataKey="Mínimo Histórico" fill="#10b981" radius={[6, 6, 0, 0]} animationDuration={1200} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Savings summary */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-800">
            {players.map(p => (
              <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}: ahorro de <span className="text-emerald-400 font-bold">{((1 - p.accountValueLow / p.accountValueFull) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}