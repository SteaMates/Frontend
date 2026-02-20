import { useState, useEffect } from "react";
import { User, Clock, Trophy, Wallet, Settings, LogOut, Loader2, Gamepad2 } from "lucide-react";
import { Link, useNavigate } from "react-router";
import api from "@/lib/api";
import { toast } from "sonner";

interface SteamProfile {
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  realName: string;
  status: number;
  gameExtraInfo: string | null;
}

interface SteamGame {
  appId: number;
  name: string;
  playtime: number;
  icon: string;
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Offline', color: 'bg-slate-500' },
  1: { label: 'Online', color: 'bg-green-500' },
  2: { label: 'Ocupado', color: 'bg-red-500' },
  3: { label: 'Ausente', color: 'bg-yellow-500' },
  4: { label: 'Durmiendo', color: 'bg-yellow-600' },
  5: { label: 'Trade', color: 'bg-cyan-500' },
  6: { label: 'Jugando', color: 'bg-blue-500' },
};

export function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SteamProfile | null>(null);
  const [games, setGames] = useState<SteamGame[]>([]);
  const [totalGames, setTotalGames] = useState(0);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const steamId = user?.steamId || localStorage.getItem('steamId');

  useEffect(() => {
    if (!steamId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, gamesRes] = await Promise.all([
          api.get(`/api/steam/profile/${steamId}`).catch(() => null),
          api.get(`/api/steam/recent/${steamId}`).catch(() => null),
        ]);

        if (profileRes?.data) {
          setProfile(profileRes.data);
        }
        if (gamesRes?.data) {
          setGames(gamesRes.data.games || []);
          setTotalGames(gamesRes.data.totalCount || 0);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [steamId]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('steamId');
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  if (!steamId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Gamepad2 size={64} className="text-slate-600" />
        <h2 className="text-2xl font-bold text-white">No has iniciado sesión</h2>
        <p className="text-slate-400">Inicia sesión con Steam para ver tu perfil</p>
        <Link to="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
          Iniciar Sesión con Steam
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={48} className="text-blue-500 animate-spin" />
      </div>
    );
  }

  const displayName = profile?.username || user?.username || 'Usuario';
  const avatarUrl = profile?.avatar || user?.avatar || '';
  const statusInfo = STATUS_MAP[profile?.status ?? 0] || STATUS_MAP[0];
  const totalHours = games.reduce((acc, g) => acc + (g.playtimeForever || g.playtime || 0), 0);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="w-32 h-32 rounded-full border-4 border-slate-800 overflow-hidden shadow-xl bg-slate-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><User size={48} className="text-slate-500" /></div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold text-white mb-1">{displayName}</h1>
            {profile?.realName && <p className="text-slate-400 mb-1">{profile.realName}</p>}
            <p className="text-slate-500 mb-4 text-sm font-mono">Steam ID: {steamId}</p>
            
            <div className="flex items-center justify-center md:justify-start gap-4">
              <span className={`${statusInfo.color.replace('bg-', 'bg-')}/30 text-slate-200 px-3 py-1 rounded-full text-xs font-bold border border-slate-700 flex items-center gap-2`}>
                <span className={`w-2 h-2 ${statusInfo.color} rounded-full`}></span>
                {profile?.gameExtraInfo ? `Jugando ${profile.gameExtraInfo}` : statusInfo.label}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {profile?.profileUrl && (
              <a href={profile.profileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <Settings size={24} />
              </a>
            )}
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Horas Recientes</p>
            <p className="text-2xl font-bold text-white">{Math.round(totalHours / 60)}h</p>
          </div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-400 rounded-lg">
            <Gamepad2 size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Juegos Recientes</p>
            <p className="text-2xl font-bold text-white">{totalGames}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-lg">
            <Trophy size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-sm">Estado</p>
            <p className="text-2xl font-bold text-white">{statusInfo.label}</p>
          </div>
        </div>
      </div>

      {/* Recent Games */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-6">Juegos Recientes</h3>
        {games.length > 0 ? (
          <div className="space-y-4">
            {games.map((game) => (
              <div key={game.appId} className="flex items-center gap-4 p-3 hover:bg-slate-800 rounded-xl transition-colors group">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                  <img 
                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/capsule_184x69.jpg`} 
                    alt={game.name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => { (e.target as HTMLImageElement).src = game.icon; }}
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{game.name}</h4>
                  <p className="text-sm text-slate-500">
                    {Math.round((game.playtimeForever || game.playtime) / 60)} horas totales
                    {game.playtime2Weeks ? ` · ${Math.round(game.playtime2Weeks / 60)}h últimas 2 semanas` : ''}
                  </p>
                </div>
                <a 
                  href={`https://store.steampowered.com/app/${game.appId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Ver en Steam
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No se pudieron cargar los juegos recientes. Verifica que tu perfil de Steam sea público.</p>
        )}
      </div>
    </div>
  );
}
