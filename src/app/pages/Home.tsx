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

function genreTag(genre: string) {
  const value = genre.toLowerCase();
  if (value.includes("rpg")) return "RPG";
  if (value.includes("co-op") || value.includes("accion")) return "COOP";
  if (value.includes("indie") || value.includes("ofertas")) return "IND";
  return "TOP";
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
            params: { storeID: "1", pageSize: 8, sortBy: "Deal Rating" },
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
      setVisibleTrendingCount(window.innerWidth < 768 ? 4 : 8);
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
        setPopularLists([]);
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
          api
            .get(`/api/steam/games/${user.steamid}`)
            .catch(() => ({ data: { games: [], totalCount: 0 } })),
          api
            .get(`/api/steam/friends/${user.steamid}`)
            .catch(() => ({ data: { friends: [] } })),
        ]);

        const games = gamesRes.data?.games || [];
        const totalGames = gamesRes.data?.totalCount || games.length;
        const totalHours = Math.round(
          games.reduce((acc: number, g: any) => acc + (g.playtime || 0), 0) /
            60,
        );
        const friendList = friendsRes.data?.friends || [];

        setStats({
          totalHours,
          totalGames,
          totalFriends: friendList.length,
          estimatedAchievements: Math.max(0, Math.round(totalGames * 9.6)),
        });

        const onlineFriends = friendList
          .filter((f: any) => f.status > 0)
          .slice(0, 3);
        setFriends(onlineFriends);
      } catch (e) {
        console.error("Error fetching user data:", e);
      }
    };
    fetchUserData();
  }, [user]);

  const activityFeed = useMemo(() => {
    return friends.slice(0, 3).map((friend, index) => ({
      key: `${friend.username}-${index}`,
      steamId: friend.steamId,
      username: friend.username,
      avatar: friend.avatar,
      actionText: friend.currentGame
        ? `esta jugando ${friend.currentGame}`
        : "esta online",
      time: index === 0 ? "Ahora" : index === 1 ? "Hace 15 min" : "Hace 2h",
      online: friend.status > 0,
    }));
  }, [friends]);

  return (
    <div className="h-full flex flex-col gap-8 pb-8">
      <section className="relative h-[560px] rounded-[16px] overflow-hidden border border-[#1d293d] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020618] via-[rgba(2,6,24,0.9)] to-[rgba(2,6,24,0.6)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020618] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 w-72 h-72 rounded-full bg-[rgba(43,127,255,0.1)] blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-56 h-56 rounded-full bg-[rgba(173,70,255,0.08)] blur-[80px]" />

        <div className="relative h-full px-8 pt-20 pb-6 flex flex-col justify-between">
          <div className="max-w-[680px]">
            <p className="text-[#51a2ff] text-[14px] font-medium flex items-center gap-1.5">
              <Sparkles size={14} /> Hola de nuevo,{" "}
              {user?.personaname ?? "Gamer"}
            </p>

            <h1 className="mt-3 text-[48px] leading-[60px] font-bold text-white">
              Todo tu universo
              <br />
              <span className="bg-gradient-to-r from-[#51a2ff] to-[#c27aff] bg-clip-text text-transparent">
                Steam en un lugar
              </span>
            </h1>

            <p className="mt-4 text-[#90a1b9] text-[18px] leading-[29px] max-w-[520px]">
              Ofertas, amigos, estadisticas y listas comunitarias. Organiza tu
              vida gaming sin complicaciones.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link
                to="/friends"
                className="h-[42px] rounded-[14px] bg-[#155dfc] px-5 text-[14px] font-medium text-white inline-flex items-center gap-2"
              >
                <Users size={16} /> Centro Social
              </Link>
              <Link
                to="/market"
                className="h-[42px] rounded-[14px] border border-[#314158] bg-[#1d293d] px-5 text-[14px] font-medium text-white inline-flex items-center gap-2"
              >
                <Zap size={16} /> Ver Ofertas
              </Link>
            </div>
          </div>

          <div className="border-t border-[rgba(29,41,61,0.6)] pt-6 flex flex-wrap items-center gap-7">
            <div className="flex items-center gap-2.5">
              <Clock3 size={16} className="text-[#51a2ff]" />
              <div>
                <p className="text-white text-[14px] font-bold leading-5">
                  {stats.totalHours.toLocaleString()}
                </p>
                <p className="text-[#62748e] text-[10px] uppercase tracking-[0.5px]">
                  Horas jugadas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Gamepad2 size={16} className="text-[#00d492]" />
              <div>
                <p className="text-white text-[14px] font-bold leading-5">
                  {stats.totalGames.toLocaleString()}
                </p>
                <p className="text-[#62748e] text-[10px] uppercase tracking-[0.5px]">
                  Juegos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Trophy size={16} className="text-[#c27aff]" />
              <div>
                <p className="text-white text-[14px] font-bold leading-5">
                  {stats.estimatedAchievements.toLocaleString()}
                </p>
                <p className="text-[#62748e] text-[10px] uppercase tracking-[0.5px]">
                  Logros
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Users size={16} className="text-[#ff8904]" />
              <div>
                <p className="text-white text-[14px] font-bold leading-5">
                  {stats.totalFriends.toLocaleString()}
                </p>
                <p className="text-[#62748e] text-[10px] uppercase tracking-[0.5px]">
                  Amigos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_446px] gap-6">
        <article className="rounded-[16px] border border-[#1d293d] bg-[rgba(15,23,43,0.8)] p-[21px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-[16px] font-bold inline-flex items-center gap-2">
              <Flame size={18} className="text-[#ff8904]" /> En tendencia
            </h2>
            <Link
              to="/market"
              className="text-[#62748e] text-[11px] inline-flex items-center gap-1"
            >
              Ver mas <ArrowRight size={12} />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {trending.slice(0, visibleTrendingCount).map((deal) => {
              const discount = Math.round(Number.parseFloat(deal.savings));
              return (
                <Link
                  key={deal.dealID}
                  to={`/game/${deal.steamAppID || deal.dealID}`}
                  state={{ deal }}
                  className="h-[92px] rounded-[14px] px-2.5 py-2.5 flex gap-3 hover:bg-[#1d293d]/35 transition-colors"
                >
                  <div className="w-32 h-[70px] rounded-[10px] border border-[#314158] bg-[#1d293d] overflow-hidden shrink-0">
                    <img
                      src={deal.thumb}
                      alt={deal.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
                    <p className="text-[#e2e8f0] text-[13px] leading-4 font-medium truncate">
                      {deal.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="h-[19px] rounded-[4px] bg-[rgba(0,188,125,0.1)] px-1.5 text-[10px] font-bold text-[#00d492] inline-flex items-center">
                        -{discount}%
                      </span>
                      <span className="text-[#90a1b9] text-[12px]">
                        {Number.parseFloat(deal.salePrice).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[16px] border border-[#1d293d] bg-[rgba(15,23,43,0.8)] p-[21px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[16px] font-bold inline-flex items-center gap-2">
                <Users size={18} className="text-[#a684ff]" /> Amigos
              </h2>
              <Link
                to="/friends"
                className="text-[#62748e] text-[11px] inline-flex items-center gap-1"
              >
                Ir al grupo <ArrowRight size={12} />
              </Link>
            </div>

            <div className="mt-4 space-y-1">
              {!user ? (
                <div className="rounded-[14px] border border-[#314158] bg-[#1d293d]/30 p-4">
                  <p className="text-[12px] text-white font-medium">
                    Inicia sesion para ver la actividad real de tus amigos.
                  </p>
                  <p className="mt-1 text-[11px] text-[#90a1b9]">
                    Conecta tu cuenta de Steam y veras quienes estan online y que estan jugando ahora.
                  </p>
                  <Link
                    to="/login"
                    className="mt-3 h-8 rounded-[10px] bg-[#155dfc] px-3 text-[11px] font-medium text-white inline-flex items-center gap-1"
                  >
                    Iniciar sesion <ArrowRight size={12} />
                  </Link>
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="rounded-[14px] border border-[#314158] bg-[#1d293d]/30 p-4">
                  <p className="text-[12px] text-white font-medium">
                    No hay amigos conectados ahora mismo.
                  </p>
                  <p className="mt-1 text-[11px] text-[#90a1b9]">
                    Vuelve mas tarde o entra en el Centro Social para revisar tu lista completa.
                  </p>
                </div>
              ) : (
                activityFeed.map((item) => (
                  <div
                    key={item.key}
                    className="h-12 rounded-[14px] px-2 flex items-center gap-3"
                  >
                    <div className="relative w-8 h-8 shrink-0">
                      <UserProfileLink
                        steamId={item.steamId}
                        username={item.username}
                        avatar={item.avatar}
                        variant="avatar"
                        avatarClassName="w-8 h-8 rounded-full border border-[#314158] object-cover"
                      />
                      {item.online && (
                        <span className="absolute -right-0.5 -bottom-0.5 w-[10px] h-[10px] rounded-full border-2 border-[#0f172b] bg-[#00c950]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white truncate">
                        <UserProfileLink
                          steamId={item.steamId}
                          username={item.username}
                          variant="name"
                          nameClassName="text-white hover:text-[#7cb8ff]"
                        />{" "}
                        <span>{item.actionText}</span>
                      </p>
                      <p className="text-[10px] text-[#45556c]">{item.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[16px] border border-[#1d293d] bg-[rgba(15,23,43,0.8)] p-[21px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1)]">
            <div className="flex items-center justify-between">
              <h2 className="text-white text-[16px] font-bold inline-flex items-center gap-2">
                <Star size={18} className="text-[#fdc700]" /> Listas populares
              </h2>
              <Link
                to="/lists"
                className="text-[#62748e] text-[11px] inline-flex items-center gap-1"
              >
                Explorar <ArrowRight size={12} />
              </Link>
            </div>

            <div className="mt-4 space-y-1.5">
              {loadingPopularLists ? (
                <div className="rounded-[14px] border border-[#314158] bg-[#1d293d]/30 p-4">
                  <p className="text-[12px] text-[#90a1b9]">Cargando listas populares...</p>
                </div>
              ) : popularLists.length === 0 ? (
                <div className="rounded-[14px] border border-[#314158] bg-[#1d293d]/30 p-4">
                  <p className="text-[12px] text-white font-medium">
                    Aun no hay listas populares.
                  </p>
                  <p className="mt-1 text-[11px] text-[#90a1b9]">
                    Cuando la comunidad empiece a votar, aqui veras las listas con mas likes.
                  </p>
                </div>
              ) : (
                popularLists.map((list) => (
                  <Link
                    key={list._id}
                    to={`/lists/${list._id}`}
                    className="h-[51px] rounded-[14px] px-3 flex items-center gap-3 hover:bg-[#1d293d]/35 transition-colors"
                  >
                    <span className="h-7 min-w-7 rounded-[8px] bg-[#1d293d] px-2 text-[10px] text-[#90a1b9] inline-flex items-center justify-center">
                      {genreTag(list.categories?.[0] || "General")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[#e2e8f0] text-[12px] leading-4 truncate">
                        {list.title}
                      </p>
                      <p className="text-[#45556c] text-[10px]">
                        por {list.author?.username || "Usuario"}
                      </p>
                    </div>
                    <div className="text-[#62748e] text-[10px] inline-flex items-center gap-1">
                      <TrendingUp size={11} /> {list.likes?.length || 0}
                    </div>
                    <ArrowRight size={14} className="text-[#62748e]" />
                  </Link>
                ))
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/market"
          className="h-[103px] rounded-[14px] border border-[#1d293d] bg-[rgba(43,127,255,0.05)] p-[21px] flex flex-col justify-between"
        >
          <div className="inline-flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(29,41,61,0.5)] inline-flex items-center justify-center">
              <Wallet size={18} className="text-[#51a2ff]" />
            </span>
            <h3 className="text-white text-[14px] font-bold">
              Ofertas en Tiempo Real
            </h3>
          </div>
          <p className="text-[#62748e] text-[12px]">
            Minimos historicos y alertas de precio.
          </p>
        </Link>

        <Link
          to="/friends"
          className="h-[103px] rounded-[14px] border border-[#1d293d] bg-[rgba(173,70,255,0.05)] p-[21px] flex flex-col justify-between"
        >
          <div className="inline-flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(29,41,61,0.5)] inline-flex items-center justify-center">
              <Users size={18} className="text-[#c27aff]" />
            </span>
            <h3 className="text-white text-[14px] font-bold">
              Comunidad y Amigos
            </h3>
          </div>
          <p className="text-[#62748e] text-[12px]">
            Listas colaborativas, sesiones y comparativas.
          </p>
        </Link>

        <Link
          to="/profile"
          className="h-[103px] rounded-[14px] border border-[#1d293d] bg-[rgba(0,188,125,0.05)] p-[21px] flex flex-col justify-between"
        >
          <div className="inline-flex items-center gap-3">
            <span className="w-[34px] h-[34px] rounded-[10px] bg-[rgba(29,41,61,0.5)] inline-flex items-center justify-center">
              <TrendingUp size={18} className="text-[#00d492]" />
            </span>
            <h3 className="text-white text-[14px] font-bold">
              Analitica Personal
            </h3>
          </div>
          <p className="text-[#62748e] text-[12px]">
            Estadisticas, rentabilidad y tendencias.
          </p>
        </Link>
      </section>
    </div>
  );
}
