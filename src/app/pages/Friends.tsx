import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router";
import api from "../../lib/api";
import { Search, Gamepad2, ShieldAlert, CheckCircle2, ChevronRight, AlertCircle, HelpCircle, Clock } from "lucide-react";

interface UserProfile {
  _id: string;
  username: string;
  avatar: string;
  steamId: string;
}

interface SteamFriend {
  _id: string;
  steamId: string;
  username: string;
  avatar: string;
  status: number;
  currentGame: string;
  friendSince: number;
}

interface CommonGame {
  appid: number;
  name: string;
  headerImage: string;
  owners: number;
}

interface Session {
  _id: string;
  game: {
    appId: string;
    name: string;
    headerImage: string;
  };
  date: string;
  time: string;
  duration: number;
  players: {
    user: UserProfile;
    status: "pending" | "accepted" | "declined";
    _id: string;
  }[];
  createdBy: UserProfile;
  createdAt: string;
  status?: string;
  isPast?: boolean;
}

export function Friends() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [friends, setFriends] = useState<SteamFriend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [commonGames, setCommonGames] = useState<CommonGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [findingGames, setFindingGames] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (user?.steamid) {
      loadFriends();
      loadSessions();
    }
  }, [user]);

  // LOGICA PARA HACER SCROLL Y HIGHLIGHT A LA SESIÓN
  useEffect(() => {
    if (!loadingSessions && sessions.length > 0 && location.hash.startsWith("#session-")) {
      const sessionId = location.hash.replace("#session-", "");
      setTimeout(() => {
        const element = document.getElementById(`session-${sessionId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("border-[#51a2ff]", "shadow-[0_0_15px_rgba(81,162,255,0.3)]");
          setTimeout(() => {
            element.classList.remove("border-[#51a2ff]", "shadow-[0_0_15px_rgba(81,162,255,0.3)]");
          }, 4000);
        }
      }, 800);
    }
  }, [loadingSessions, sessions, location.hash]);

  const loadSessions = async () => {
    try {
      setLoadingSessions(true);
      const res = await api.get("/api/sessions/my-sessions");
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/steam/friends/${user?.steamid}`);
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error("Error loading friends:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (steamId: string) => {
    setSelectedFriends((prev) => {
      if (prev.includes(steamId)) {
        return prev.filter((id) => id !== steamId);
      }
      if (prev.length >= 5) {
        return prev; // Max 5 friends
      }
      return [...prev, steamId];
    });
  };

  const findCommonGames = async () => {
    if (selectedFriends.length === 0 || !user?.steamid) return;

    try {
      setFindingGames(true);
      const allIds = [user.steamid, ...selectedFriends];
      const res = await api.post("/api/steam/common-games", {
        steamIds: allIds,
      });
      setCommonGames(res.data.games || []);
    } catch (err) {
      console.error("Error finding games:", err);
    } finally {
      setFindingGames(false);
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 1:
        return "bg-emerald-500"; // Online
      case 3:
      case 4:
        return "bg-yellow-500"; // Away/Snooze
      default:
        return "bg-slate-500"; // Offline
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 1:
        return "Online";
      case 3:
      case 4:
        return "Ausente";
      default:
        return "Offline";
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full">
          <Gamepad2 size={48} className="mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Inicia sesión para ver tus amigos
          </h2>
          <p className="text-slate-400 mb-6">
            Conecta tu cuenta de Steam para ver a qué están jugando tus amigos y encontrar juegos en común.
          </p>
          <button
            onClick={login}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
          >
            Conectar con Steam
          </button>
        </div>
      </div>
    );
  }

  // Dividir las sesiones en activas e historial
  const now = new Date();
  const activeSessions = sessions.filter(s => {
    const sessionDate = new Date(`${s.date}T${s.time}`);
    return sessionDate > now;
  });
  const pastSessions = sessions.filter(s => {
    const sessionDate = new Date(`${s.date}T${s.time}`);
    return sessionDate <= now;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Amigos y Sesiones</h1>
          <p className="text-slate-400 mt-2">
            Encuentra juegos en común para el modo multijugador y organiza partidas.
          </p>
        </div>
      </section>

      {/* SESSIONS SECTION */}
      <section className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-blue-500" />
          Mis Sesiones Programadas
        </h2>

        {loadingSessions ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-slate-900 animate-pulse rounded-2xl border border-slate-800" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400">
              No tienes sesiones de juego programadas. Selecciona amigos y encuentra un juego en común para organizar una.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Próximas sesiones */}
            {activeSessions.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeSessions.map((session) => (
                  <SessionCard key={session._id} session={session} isPast={false} />
                ))}
              </div>
            )}

            {/* Historial de sesiones */}
            {pastSessions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-t border-slate-800 pt-6">
                  Historial de sesiones
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale-[0.5]">
                  {pastSessions.map((session) => (
                    <SessionCard key={session._id} session={session} isPast={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-800">
        {/* Lado Izquierdo: Lista de Amigos */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[600px]">
            <h2 className="text-lg font-bold text-white mb-4">Tus Amigos ({friends.length})</h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar amigo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {loading ? (
                <div className="text-center py-8 text-slate-500">Cargando amigos...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No se encontraron amigos.</div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend.steamId}
                    onClick={() => toggleFriend(friend.steamId)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedFriends.includes(friend.steamId)
                        ? "bg-blue-600/20 border border-blue-500/50"
                        : "bg-slate-950/50 border border-slate-800/50 hover:bg-slate-800"
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatar}
                        alt={friend.username}
                        className="w-10 h-10 rounded-full"
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${getStatusColor(
                          friend.status,
                        )}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {friend.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {friend.currentGame ? (
                          <span className="text-blue-400">{friend.currentGame}</span>
                        ) : (
                          getStatusText(friend.status)
                        )}
                      </p>
                    </div>
                    {selectedFriends.includes(friend.steamId) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Intersección de Juegos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[600px] flex flex-col">
            {selectedFriends.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Gamepad2 className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Modo Multijugador</h3>
                <p className="text-slate-400 max-w-md">
                  Selecciona hasta 5 amigos de la lista para descubrir qué juegos tienen en común en sus bibliotecas de Steam.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-white">Buscando coincidencias</h2>
                    <p className="text-sm text-slate-400">
                      Tú + {selectedFriends.length} amigo{selectedFriends.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={findCommonGames}
                    disabled={findingGames}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {findingGames ? "Analizando bibliotecas..." : "Encontrar Juegos"}
                  </button>
                </div>

                <div className="flex-1">
                  {findingGames ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p>Cruzando datos de bibliotecas...</p>
                    </div>
                  ) : commonGames.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {commonGames.map((game) => (
                        <div
                          key={game.appid}
                          className="group relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all flex flex-col"
                        >
                          <div className="aspect-[4/2] w-full overflow-hidden">
                            <img
                              src={game.headerImage}
                              alt={game.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-bold text-white mb-1 line-clamp-1" title={game.name}>
                              {game.name}
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                              {game.owners} jugadores lo tienen
                            </p>

                            <div className="mt-auto flex items-center gap-2">
                              <Link
                                to={`/game/${game.appid}`}
                                className="flex-1 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                              >
                                Ver Detalle
                              </Link>

                              <Link
                                to={`/game/${game.appid}?bookSession=true&friends=${selectedFriends.join(",")}`}
                                className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                              >
                                Programar Sesión
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-center">
                      <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                      <p>Pulsa en "Encontrar Juegos" para ver los resultados.</p>
                      <p className="text-sm mt-2">
                        Si ya lo hiciste y no hay resultados, asegúrate de que todos tienen la biblioteca pública.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ session, isPast }: { session: Session; isPast: boolean }) {
  const allPlayers = [session.createdBy, ...session.players.map(p => p.user)];
  // Remove duplicates just in case
  const uniquePlayers = allPlayers.filter((v, i, a) => a.findIndex(t => (t._id === v._id)) === i);

  return (
    <div
      id={`session-${session._id}`}
      className={`transition-all duration-1000 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col hover:border-slate-700 ${isPast ? 'opacity-70' : ''}`}
    >
      <div className="relative h-24 overflow-hidden">
        <img
          src={session.game.headerImage}
          alt={session.game.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
          <h3 className="text-white font-bold text-lg truncate max-w-[200px]" title={session.game.name}>
            {session.game.name}
          </h3>
          <span className="bg-slate-800/80 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md border border-slate-700">
            {session.duration} min
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-slate-300 text-sm mb-4">
          <Clock size={16} className="text-blue-500" />
          <span className="font-semibold">{session.date}</span>
          <span className="text-slate-500">•</span>
          <span className="font-semibold">{session.time}</span>
        </div>

        <div className="mt-auto">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Jugadores ({uniquePlayers.length})</p>
          <div className="flex -space-x-2">
            {uniquePlayers.map((player, idx) => {
              // Find status
              let status = "accepted"; // creator is always accepted
              if (player._id !== session.createdBy._id) {
                const playerRef = session.players.find(p => p.user._id === player._id);
                if (playerRef) status = playerRef.status;
              }

              let statusColor = "ring-slate-700";
              if (status === "accepted") statusColor = "ring-green-500/50";
              if (status === "pending") statusColor = "ring-amber-500/50";
              if (status === "declined") statusColor = "ring-red-500/50";

              return (
                <div key={player._id} className="relative group/avatar" style={{ zIndex: 10 - idx }}>
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className={`w-8 h-8 rounded-full ring-2 ${statusColor} bg-slate-800 object-cover`}
                    title={`${player.username} - ${status}`}
                  />
                  {status === "pending" && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <HelpCircle size={8} className="text-slate-900" />
                    </div>
                  )}
                  {status === "declined" && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                      <AlertCircle size={8} className="text-slate-900" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}