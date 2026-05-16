/**
 * Nombre del fichero: Home.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import axios from "axios";
import { UserProfileLink } from "../components/UserProfileLink";
import {
  ArrowRight,
  Clock3,
  Flame,
  Gamepad2,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

interface PopularListItem {
  _id: string;
  title: string;
  categories?: string[];
  author?: {
    username?: string;
  };
  likes?: string[];
}

interface TrendingDeal {
  dealID: string;
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  thumb: string;
  steamAppID: string;
}

interface FriendActivity {
  steamId: string;
  username: string;
  avatar: string;
  currentGame: string | null;
  status: number;
}

const HERO_BG =
  "https://www.figma.com/api/mcp/asset/4bcb57fe-a3d3-4f67-a3eb-a29bbb4eeacb";

function formatListCategoryLabel(categories?: string[]) {
  const cleaned = (categories || [])
    .map((category) => category.trim())
    .filter(Boolean);

  if (cleaned.length === 0) return "General";
  if (cleaned.length === 1) return cleaned[0];
  return `${cleaned[0]} +${cleaned.length - 1}`;
}

export function Home() {
  const { user } = useAuth();
  const [trending, setTrending] = useState<TrendingDeal[]>([]);
  const [visibleTrendingCount, setVisibleTrendingCount] = useState(8);
  const [friends, setFriends] = useState<FriendActivity[]>([]);
  const [popularLists, setPopularLists] = useState<PopularListItem[]>([]);
  const [loadingPopularLists, setLoadingPopularLists] = useState(true);
  const [stats, setStats] = useState({
    totalHours: 0,
    totalGames: 0,
    totalFriends: 0,
    estimatedAchievements: 0,
  });

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await axios.get(
          "https://www.cheapshark.com/api/1.0/deals",
          {
            params: { storeID: "1", pageSize: 12, sortBy: "Deal Rating" },
          },
        );
        setTrending(res.data || []);
      } catch (e) {
        console.error("Error fetching trending:", e);
      }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const updateVisibleTrendingCount = () => {
      if (window.innerWidth < 768) setVisibleTrendingCount(4);
      else if (window.innerWidth < 1536) setVisibleTrendingCount(8);
      else setVisibleTrendingCount(12);
    };

    updateVisibleTrendingCount();
    window.addEventListener("resize", updateVisibleTrendingCount);
    return () => window.removeEventListener("resize", updateVisibleTrendingCount);
  }, []);

  useEffect(() => {
    const fetchPopularLists = async () => {
      try {
        setLoadingPopularLists(true);
        const res = await api.get("/api/lists");
        const sortedLists = (res.data || [])
          .sort(
            (a: PopularListItem, b: PopularListItem) =>
              (b.likes?.length || 0) - (a.likes?.length || 0),
          )
          .slice(0, 3);
        setPopularLists(sortedLists);
      } catch (e) {
        console.error("Error fetching popular lists:", e);
      } finally {
        setLoadingPopularLists(false);
      }
    };
    fetchPopularLists();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const [gamesRes, friendsRes] = await Promise.all([
          api.get(`/api/steam/games/${user.steamid}`).catch(() => ({ data: { games: [], totalCount: 0 } })),
          api.get(`/api/steam/friends/${user.steamid}`).catch(() => ({ data: { friends: [] } })),
        ]);

        const games = gamesRes.data?.games || [];
        const totalGames = gamesRes.data?.totalCount || games.length;
        const totalHours = Math.round(games.reduce((acc: number, g: any) => acc + (g.playtime || 0), 0) / 60);
        const friendList = friendsRes.data?.friends || [];

        setStats({
          totalHours,
          totalGames,
          totalFriends: friendList.length,
          estimatedAchievements: Math.max(0, Math.round(totalGames * 9.6)),
        });

        const onlineFriends = friendList.filter((f: any) => f.status > 0).slice(0, 3);
        setFriends(onlineFriends);
      } catch (e) {
        console.error("Error fetching user data:", e);
      }
    };
    fetchUserData();
  }, [user]);

  const activityFeed = useMemo(() => {
    return friends.map((friend, index) => ({
      key: `${friend.username}-${index}`,
      steamId: friend.steamId,
      username: friend.username,
      avatar: friend.avatar,
      actionText: friend.currentGame ? `está jugando ${friend.currentGame}` : "está online",
      time: index === 0 ? "Ahora" : index === 1 ? "Hace 15 min" : "Hace 2h",
      online: friend.status > 0,
    }));
  }, [friends]);

  return (
    <div className="h-full flex flex-col gap-8 pb-8 px-4 md:px-8">
      {/* HERO SECTION */}
      <section className="relative min-h-[520px] sm:min-h-[560px] rounded-[24px] overflow-hidden border border-[#1d293d] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020618] via-[rgba(2,6,24,0.92)] to-[rgba(2,6,24,0.5)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full bg-[rgba(43,127,255,0.12)] blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-[rgba(173,70,255,0.1)] blur-[100px]" />

        <div className="relative h-full px-6 sm:px-10 lg:px-12 pt-20 sm:pt-24 pb-8 flex flex-col justify-between">
          <div className="max-w-[750px]">
            <p className="text-[#51a2ff] text-[14px] sm:text-[16px] font-semibold flex items-center gap-2">
              <Sparkles size={16} /> Hola de nuevo, {user?.personaname ?? "Gamer"}
            </p>

            <h1 className="mt-4 text-[36px] leading-[44px] sm:text-[48px] sm:leading-[58px] lg:text-[56px] lg:leading-[68px] font-black text-white tracking-tight">
              Todo tu universo
              <br />
              <span className="bg-gradient-to-r from-[#51a2ff] to-[#c27aff] bg-clip-text text-transparent">
                Steam en un lugar
              </span>
            </h1>

            <p className="mt-6 text-[#90a1b9] text-[16px] leading-[26px] sm:text-[18px] sm:leading-[30px] lg:text-[20px] lg:leading-[32px] max-w-[580px] font-medium">
              Ofertas, amigos, estadísticas y listas comunitarias. Organiza tu vida gaming sin complicaciones.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/friends" className="h-[48px] w-full sm:w-auto justify-center rounded-[16px] bg-[#155dfc] px-7 text-[15px] font-bold text-white inline-flex items-center gap-2 shadow-lg shadow-[#155dfc]/20 hover:bg-[#2b7fff] transition-all hover:scale-[1.02]">
                <Users size={18} /> Centro Social
              </Link>
              <Link to="/market" className="h-[48px] w-full sm:w-auto justify-center rounded-[16px] border border-[#314158] bg-[#1d293d]/80 backdrop-blur-md px-7 text-[15px] font-bold text-white inline-flex items-center gap-2 hover:bg-[#1d293d] transition-all hover:scale-[1.02]">
                <Zap size={18} /> Ver Ofertas
              </Link>
            </div>
          </div>

          <div className="border-t border-[rgba(29,41,61,0.6)] pt-8 flex flex-wrap items-center gap-6 sm:gap-10">
            {[
              { icon: Clock3, label: "Horas jugadas", value: stats.totalHours.toLocaleString(), color: "#51a2ff" },
              { icon: Gamepad2, label: "Juegos", value: stats.totalGames.toLocaleString(), color: "#00d492" },
              { icon: Trophy, label: "Logros", value: stats.estimatedAchievements.toLocaleString(), color: "#c27aff" },
              { icon: Users, label: "Amigos", value: stats.totalFriends.toLocaleString(), color: "#ff8904" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-white text-[16px] font-black leading-tight">{item.value}</p>
                  <p className="text-[#62748e] text-[11px] font-bold uppercase tracking-[0.8px]">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-8">
        {/* TRENDING GAMES */}
        <article className="rounded-[24px] border border-[#1d293d] bg-[rgba(15,23,43,0.85)] p-[28px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.15)] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-[20px] font-black inline-flex items-center gap-2.5">
              <Flame size={22} className="text-[#ff8904]" /> En tendencia
            </h2>
            <Link to="/market" className="text-[#62748e] text-[13px] font-bold inline-flex items-center gap-1.5 hover:text-[#51a2ff] transition-colors">
              Explorar mercado <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 flex-1">
            {trending.slice(0, visibleTrendingCount).map((deal) => {
              const discount = Math.round(Number.parseFloat(deal.savings));
              return (
                <Link
                  key={deal.dealID}
                  to={`/game/${deal.steamAppID || deal.dealID}`}
                  state={{ deal }}
                  className="group relative h-[108px] rounded-[20px] px-3.5 py-3.5 flex gap-4 bg-[#1d293d]/20 border border-[#1d293d]/50 hover:bg-[#1d293d]/40 hover:border-[#314158] transition-all"
                >
                  <div className="w-28 h-[76px] rounded-[12px] border border-[#314158] bg-[#1d293d] overflow-hidden shrink-0">
                    <img src={deal.thumb} alt={deal.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
                    <p className="text-[#f1f5f9] text-[15px] leading-tight font-bold truncate group-hover:text-[#51a2ff] transition-colors">
                      {deal.title}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="h-[22px] rounded-[6px] bg-[#00d492]/10 border border-[#00d492]/20 px-2 text-[11px] font-black text-[#00d492] inline-flex items-center">
                        -{discount}%
                      </span>
                      <span className="text-[#90a1b9] text-[14px] font-medium">
                        {Number.parseFloat(deal.salePrice).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        {/* SIDEBAR */}
        <div className="space-y-8">
          {/* FRIENDS ACTIVITY */}
          <article className="rounded-[24px] border border-[#1d293d] bg-[rgba(15,23,43,0.85)] p-[28px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-[18px] font-black inline-flex items-center gap-2.5">
                <Users size={20} className="text-[#a684ff]" /> Actividad de amigos
              </h2>
              <Link to="/friends" className="text-[#62748e] text-[12px] font-bold inline-flex items-center gap-1.5 hover:text-[#c27aff] transition-colors">
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-2">
              {!user ? (
                <div className="rounded-[20px] border border-[#314158] bg-[#1d293d]/30 p-5">
                  <p className="text-[14px] text-white font-bold leading-tight">Inicia sesión para ver a tus amigos.</p>
                  <Link to="/login" className="mt-4 h-[38px] rounded-[12px] bg-[#155dfc] px-5 text-[13px] font-black text-white inline-flex items-center gap-2 hover:bg-[#2b7fff] transition-all">
                    Iniciar sesión <ArrowRight size={14} />
                  </Link>
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="rounded-[20px] border border-[#314158] bg-[#1d293d]/30 p-5">
                  <p className="text-[14px] text-white font-bold leading-tight">Silencio total en tu lista.</p>
                  <p className="mt-1.5 text-[12px] text-[#90a1b9]">No hay amigos conectados ahora mismo.</p>
                </div>
              ) : (
                activityFeed.map((item) => (
                  <div key={item.key} className="h-14 rounded-[16px] px-3 flex items-center gap-4 hover:bg-[#1d293d]/30 transition-all group">
                    <div className="relative w-10 h-10 shrink-0">
                      <UserProfileLink
                        steamId={item.steamId}
                        username={item.username}
                        avatar={item.avatar}
                        variant="avatar"
                        avatarClassName="w-10 h-10 rounded-full border border-[#314158] object-cover group-hover:scale-105 transition-transform"
                      />
                      {item.online && <span className="absolute -right-0.5 -bottom-0.5 w-[12px] h-[12px] rounded-full border-[3px] border-[#0f172b] bg-[#00c950]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-white truncate font-medium">
                        <UserProfileLink steamId={item.steamId} username={item.username} variant="name" nameClassName="text-white hover:text-[#7cb8ff] font-bold" />
                        {" "}<span className="text-[#90a1b9] font-normal">{item.actionText}</span>
                      </p>
                      <p className="text-[11px] text-[#45556c] font-medium flex items-center gap-1"><Clock3 size={10} /> {item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          {/* POPULAR LISTS */}
          <article className="rounded-[24px] border border-[#1d293d] bg-[rgba(15,23,43,0.85)] p-[28px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-[18px] font-black inline-flex items-center gap-2.5">
                <Star size={20} className="text-[#fdc700]" /> Listas populares
              </h2>
              <Link to="/lists" className="text-[#62748e] text-[12px] font-bold inline-flex items-center gap-1.5 hover:text-[#fdc700] transition-colors">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-2.5">
              {loadingPopularLists ? (
                <p className="text-[13px] text-[#90a1b9] animate-pulse px-4">Cargando colecciones populares...</p>
              ) : popularLists.length === 0 ? (
                <div className="rounded-[20px] border border-[#314158] bg-[#1d293d]/30 p-5">
                  <p className="text-[14px] text-white font-bold">Sin listas destacadas.</p>
                </div>
              ) : (
                popularLists.map((list) => (
                  <Link
                    key={list._id}
                    to={`/lists/${list._id}`}
                    className="h-[64px] rounded-[18px] px-4 flex items-center gap-4 bg-[#1d293d]/20 border border-[#1d293d]/50 hover:bg-[#1d293d]/40 hover:border-[#314158] transition-all group"
                  >
                    <span className="h-8 min-w-8 rounded-[10px] bg-[#1d293d] px-2 text-[11px] font-black text-[#51a2ff] inline-flex items-center justify-center border border-[#314158]/50">
                      {formatListCategoryLabel(list.categories)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#f1f5f9] text-[14px] leading-tight font-bold truncate group-hover:text-[#51a2ff] transition-colors">{list.title}</p>
                      <p className="text-[#62748e] text-[11px] font-medium mt-0.5">por <span className="text-[#90a1b9]">{list.author?.username || "Usuario"}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="text-[#00d492] text-[12px] font-black inline-flex items-center gap-1"><TrendingUp size={13} /> {list.likes?.length || 0}</div>
                      <ArrowRight size={14} className="text-[#45556c] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      {/* FOOTER SHORTCUTS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { to: "/market", icon: Wallet, title: "Ofertas en Tiempo Real", desc: "Mínimos históricos y alertas de precio.", color: "#51a2ff" },
          { to: "/friends", icon: Users, title: "Comunidad y Amigos", desc: "Listas colaborativas y analítica social.", color: "#c27aff" },
          { to: "/profile", icon: TrendingUp, title: "Analítica Personal", desc: "Estadísticas avanzadas de tu biblioteca.", color: "#00d492" }
        ].map((item, i) => (
          <Link
            key={i}
            to={item.to}
            className="group rounded-[24px] border border-[#1d293d] p-[24px] flex flex-col justify-between hover:border-[currentColor] transition-all shadow-lg"
            style={{ color: item.color, backgroundImage: `linear-gradient(135deg, ${item.color}08, transparent)` }}
          >
            <div className="inline-flex items-center gap-4">
              <span className="w-[42px] h-[42px] rounded-[14px] bg-[#1d293d]/80 border border-[#314158] inline-flex items-center justify-center group-hover:scale-110 transition-transform">
                <item.icon size={22} style={{ color: item.color }} />
              </span>
              <h3 className="text-white text-[16px] font-black">{item.title}</h3>
            </div>
            <p className="text-[#62748e] text-[13px] font-medium mt-4">{item.desc}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
