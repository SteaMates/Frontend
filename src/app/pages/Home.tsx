import { Link } from "react-router";
import { TrendingUp, Users, Zap } from "lucide-react";

export function Home() {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-2">Bienvenido a SteaMates</h1>
          <p className="text-slate-400 max-w-xl text-lg">
            Descubre ofertas, organiza tus juegos con amigos y obtén recomendaciones personalizadas basadas en lo que realmente juegas.
          </p>
          <div className="mt-6 flex gap-4">
            <Link to="/market" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Ver Ofertas
            </Link>
            <Link to="/lists" className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors">
              Explorar Listas
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
          <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <Zap size={24} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Ofertas en Tiempo Real</h3>
          <p className="text-slate-400 mb-4">Monitoriza precios de CheapShark y encuentra mínimos históricos.</p>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-colors group">
          <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Comunidad y Amigos</h3>
          <p className="text-slate-400 mb-4">Crea listas colaboratiivas, vota y decide qué jugar con tu grupo.</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-emerald-500/50 transition-colors group">
          <div className="bg-emerald-500/10 w-12 h-12 rounded-lg flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Recomendaciones IA</h3>
          <p className="text-slate-400 mb-4">Descubre juegos basados en tu historial real de Steam y gustos.</p>
        </div>
      </div>
    </div>
  );
}
