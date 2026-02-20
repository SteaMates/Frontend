import { useState, useEffect } from "react";
import { Users, Trophy, Clock, Gamepad2, Check, Loader2, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router";
import api from "@/lib/api";

interface SteamFriend {
  steamId: string;
  username: string;
  avatar: string;
  status: number;
  currentGame: string | null;
  friendSince: number;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'offline', 1: 'online', 2: 'busy', 3: 'away', 4: 'snooze', 5: 'trade', 6: 'playing'
};

export function Friends() {
  const [friends, setFriends] = useState<SteamFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const steamId = user?.steamId || localStorage.getItem('steamId');

  useEffect(() => {
    if (!steamId) {
      setLoading(false);
      return;
    }

    const fetchFriends = async () => {
      try {
        const response = await api.get(`/api/steam/friends/${steamId}`);
        setFriends(response.data.friends || []);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [steamId]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  if (!steamId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Users size={64} className="text-slate-600" />
        <h2 className="text-2xl font-bold text-white">Inicia sesión para ver tus amigos</h2>
        <p className="text-slate-400">Conecta tu cuenta de Steam para ver y organizar sesiones con amigos.</p>
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

  const onlineFriends = friends.filter(f => f.status > 0);
  const offlineFriends = friends.filter(f => f.status === 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Friends List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="text-blue-500" /> Tus Amigos ({friends.length})
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            {onlineFriends.length} online · {offlineFriends.length} offline
          </p>
          
          {friends.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              No se pudieron cargar amigos. Asegúrate de que tu lista de amigos sea pública en Steam.
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {friends.map(friend => (
                <div 
                  key={friend.steamId} 
                  onClick={() => toggleFriend(friend.steamId)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedFriends.includes(friend.steamId) 
                      ? "bg-blue-600/20 border-blue-500/50" 
                      : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800"
                  }`}
                >
                  <div className="relative">
                    <img src={friend.avatar} alt={friend.username} className="w-10 h-10 rounded-full object-cover" />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      friend.status === 0 ? 'bg-slate-500' : 
                      friend.currentGame ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-200 truncate">{friend.username}</h4>
                    <p className="text-xs text-slate-500 truncate">
                      {friend.currentGame ? `Jugando ${friend.currentGame}` : STATUS_LABELS[friend.status] || 'offline'}
                    </p>
                  </div>
                  {selectedFriends.includes(friend.steamId) && (
                    <Check size={18} className="text-blue-400 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
           <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Amigos Online
          </h3>
          <div className="space-y-4">
            {onlineFriends.length === 0 ? (
              <p className="text-slate-500 text-sm text-center">Ningún amigo en línea ahora</p>
            ) : (
              onlineFriends.slice(0, 5).map((friend, index) => (
                <div key={friend.steamId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={friend.avatar} alt="" className="w-6 h-6 rounded-full" />
                    <span className="text-slate-300 truncate">{friend.username}</span>
                  </div>
                  <span className="text-green-400 text-xs flex-shrink-0">
                    {friend.currentGame ? `🎮 ${friend.currentGame}` : 'Online'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Organizer */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-slate-700 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">¿A qué jugamos hoy?</h2>
          <p className="text-slate-300">
            {selectedFriends.length > 0 
              ? `${selectedFriends.length} amigo${selectedFriends.length > 1 ? 's' : ''} seleccionado${selectedFriends.length > 1 ? 's' : ''}`
              : "Selecciona amigos de la lista para organizar una sesión."}
          </p>
        </div>

        {selectedFriends.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Amigos seleccionados</h3>
            <div className="flex flex-wrap gap-3">
              {selectedFriends.map(id => {
                const friend = friends.find(f => f.steamId === id);
                if (!friend) return null;
                return (
                  <div key={id} className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-2">
                    <img src={friend.avatar} alt="" className="w-6 h-6 rounded-full" />
                    <span className="text-sm text-slate-200">{friend.username}</span>
                    <button onClick={() => toggleFriend(id)} className="text-slate-500 hover:text-red-400">×</button>
                  </div>
                );
              })}
            </div>
            <p className="text-sm text-slate-400 mt-4">
              💡 Para encontrar juegos en común, puedes usar el asistente de IA (botón azul abajo a la derecha). 
              Pregúntale por recomendaciones para jugar en grupo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
