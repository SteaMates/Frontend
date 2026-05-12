import { useEffect, useMemo, useState } from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flame,
  Gamepad2,
  GripVertical,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { CATEGORY_CHIPS, FEED_TABS, FeedTab } from "../data/communityLists";
import api from "../../lib/api";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

type CreateGameOption = {
  id: string;
  title: string;
  year: string;
  price: string;
  score: string;
  image: string;
};

const MAX_LIST_TITLE = 120;
const MAX_LIST_DESCRIPTION = 1000;
const MAX_LIST_CATEGORIES = 10;
const MAX_LIST_GAMES = 50;

export function Lists() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [feedTab, setFeedTab] = useState<FeedTab>("trending");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Real Lists from backend
  const [lists, setLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingMoreLists, setLoadingMoreLists] = useState(false);
  const [listsPage, setListsPage] = useState(1);
  const [listsHasMore, setListsHasMore] = useState(false);
  const [listsLoadError, setListsLoadError] = useState("");

  // Total lists in database
  const [totalDbLists, setTotalDbLists] = useState<number>(0);

  // Steam Game Search
  const [searchGamesOptions, setSearchGamesOptions] = useState<
    CreateGameOption[]
  >([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);

  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategories, setCreateCategories] = useState<string[]>([]);
  const [createCover, setCreateCover] = useState(
    () =>
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
  );
  const [createGameQuery, setCreateGameQuery] = useState("");
  const [createSelectedGames, setCreateSelectedGames] = useState<
    CreateGameOption[]
  >([]);

  const fetchLists = async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreLists(true);
      } else {
        setLoadingLists(true);
      }

      setListsLoadError("");
      const res = await api.get("/api/lists", {
        params: {
          page,
          limit: 12,
        },
      });

      const responseLists = Array.isArray(res.data)
        ? res.data
        : res.data?.lists || [];
      const responsePagination = Array.isArray(res.data)
        ? null
        : res.data?.pagination || null;

      const nextLists = responseLists;
      setLists((prev) => (append ? [...prev, ...nextLists] : nextLists));
      setListsPage(responsePagination?.page || page);
      setListsHasMore(
        responsePagination
          ? responsePagination.page < responsePagination.pages
          : false,
      );

      // Obtenemos el Total de listas real de la Base de Datos
      if (page === 1) {
        setTotalDbLists(responsePagination?.total || responseLists.length);
      }
    } catch (err) {
      console.error("Error fetching lists:", err);
      if (!append) {
        setLists([]);
      }
      setListsHasMore(false);
      setListsLoadError("No se pudieron cargar las listas.");
    } finally {
      setLoadingLists(false);
      setLoadingMoreLists(false);
    }
  };

  useEffect(() => {
    fetchLists(1, false);
  }, []);

  const loadMoreLists = () => {
    if (loadingMoreLists || loadingLists || !listsHasMore) return;
    fetchLists(listsPage + 1, true);
  };

  // LÓGICA DE VOTOS
  const handleVote = async (
    e: React.MouseEvent,
    listId: string,
    action: "like" | "dislike",
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      login();
      return;
    }

    try {
      const res = await api.post(`/api/lists/${listId}/${action}`);
      setLists((prev) =>
        prev.map((list) =>
          list._id === listId
            ? { ...list, likes: res.data.likes, dislikes: res.data.dislikes }
            : list,
        ),
      );
    } catch (err) {
      console.error(`Error procesando ${action}:`, err);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (createGameQuery.trim().length > 2) {
        setIsSearchingGames(true);
        try {
          const res = await api.get(
            `/api/steam/search?term=${encodeURIComponent(createGameQuery)}`,
          );
          const results = res.data.map((item: any) => {
            const appId = item.appId ? item.appId.toString() : null;
            const isFree = item.isFree === true || item.price === 0;
            const priceLabel = isFree
              ? "Gratis"
              : `$${Number(item.price).toFixed(2)}`;

            const image = appId
              ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
              : `https://placehold.co/80x80/1e293b/94a3b8?text=${encodeURIComponent(item.name?.[0] ?? "?")}`;

            return {
              id: appId || item.name,
              title: item.name,
              year: "—",
              price: priceLabel,
              score: "-",
              image,
            };
          });
          setSearchGamesOptions(results);
        } catch (err) {
          console.error("Error searching games:", err);
        } finally {
          setIsSearchingGames(false);
        }
      } else {
        setSearchGamesOptions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [createGameQuery]);

  const createCategoryOptions = useMemo(
    () => CATEGORY_CHIPS.filter((chip) => chip !== "Todas"),
    [],
  );

  const createCoverOptions = useMemo(
    () => [
      {
        id: "cover1",
        title: "Gaming Setup",
        image:
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "cover2",
        title: "Retro Arcade",
        image:
          "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800",
      },
      {
        id: "cover3",
        title: "Abstract Data",
        image:
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800",
      },
    ],
    [],
  );

  const titleChars = createTitle.length;
  const descriptionChars = createDescription.length;
  const canContinueInfo =
    createTitle.trim().length > 0 &&
    createDescription.trim().length > 0 &&
    createCategories.length > 0 &&
    createCover.length > 0;
  const canContinueGames = createSelectedGames.length > 0;

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateStep(1);
    setCreateGameQuery("");
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateListDraft = () => {
    const title = createTitle.trim();
    const description = createDescription.trim();

    if (!title) return "El titulo es obligatorio.";
    if (title.length > MAX_LIST_TITLE) {
      return `El titulo no puede superar ${MAX_LIST_TITLE} caracteres.`;
    }
    if (!description) return "La descripcion es obligatoria.";
    if (description.length > MAX_LIST_DESCRIPTION) {
      return `La descripcion no puede superar ${MAX_LIST_DESCRIPTION} caracteres.`;
    }
    if (createCategories.length === 0) {
      return "Selecciona al menos una categoria.";
    }
    if (createCategories.length > MAX_LIST_CATEGORIES) {
      return `No puedes seleccionar mas de ${MAX_LIST_CATEGORIES} categorias.`;
    }
    if (createSelectedGames.length === 0) {
      return "Selecciona al menos un juego.";
    }
    if (createSelectedGames.length > MAX_LIST_GAMES) {
      return `No puedes seleccionar mas de ${MAX_LIST_GAMES} juegos.`;
    }

    return "";
  };

  const submitList = async () => {
    const validationError = validateListDraft();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: createTitle.trim(),
        description: createDescription.trim(),
        categories: createCategories.map((c) => c.trim()).filter(Boolean),
        coverImage: createCover,
        games: createSelectedGames.map((g, index) => ({
          appId: parseInt(g.id, 10) || index + 1,
          name: g.title,
          imageUrl: g.image,
        })),
      };

      const res = await api.post("/api/lists", payload);
      console.log("List created successfully:", res.data);

      setCreateTitle("");
      setCreateDescription("");
      setCreateSelectedGames([]);
      closeCreateModal();

      fetchLists(1, false);
    } catch (err: any) {
      console.error("Error creating list:", err);
      const errorMessage =
        err.response?.data?.error || err.message || "Unknown error";
      alert(`Error creating list: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addGameToSelection = (game: CreateGameOption) => {
    setCreateSelectedGames((prev) => {
      if (prev.some((item) => item.id === game.id)) {
        return prev;
      }
      return [...prev, game];
    });
  };

  const removeGameFromSelection = (gameId: string) => {
    setCreateSelectedGames((prev) => prev.filter((game) => game.id !== gameId));
  };

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCreateModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCreateModalOpen]);

  const filteredCreateGameOptions = useMemo(() => {
    const selectedIds = new Set(createSelectedGames.map((game) => game.id));
    return searchGamesOptions.filter((game) => !selectedIds.has(game.id));
  }, [searchGamesOptions, createSelectedGames]);

  // CATEGORÍAS SIN GUIÑOS NI ICONOS PARA LA VISTA PREVIA
  const previewCategoryLabel = useMemo(() => {
    if (createCategories.length === 0) return "Sin Categoría";
    const primary = createCategories[0];
    return `${primary}${createCategories.length > 1 ? ` +${createCategories.length - 1}` : ""}`;
  }, [createCategories]);

  const filteredLists = useMemo(() => {
    const q = query.trim().toLowerCase();

    const result = lists.filter((item) => {
      const isMine = user ? user.id === item.author?.steamId : false;

      const matchesTab =
        feedTab === "trending"
          ? true
          : feedTab === "new"
            ? true
            : feedTab === "top"
              ? true
              : isMine;

      const matchesCategory =
        selectedCategory === "Todas" ||
        (item.categories &&
          item.categories.some(
            (c: string) => c.toLowerCase() === selectedCategory.toLowerCase(),
          ));

      const matchesQuery =
        q.length === 0 ||
        item.title.toLowerCase().includes(q) ||
        (item.author?.username || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);

      return matchesTab && matchesCategory && matchesQuery;
    });

    if (feedTab === "new") {
      return result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    if (feedTab === "top" || feedTab === "trending") {
      return result.sort(
        (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0),
      );
    }

    return result;
  }, [lists, feedTab, query, selectedCategory, user]);

  const totalVotesLoaded = lists.reduce(
    (acc, list) =>
      acc + (list.likes?.length || 0) + (list.dislikes?.length || 0),
    0,
  );

  return (
    <div className="pb-20 max-w-[1400px] mx-auto px-4">
      {/* HEADER BANNER ESTILO REDDIT */}
      <div className="relative rounded-[16px] overflow-hidden mb-8 border border-[#1d293d] bg-[#0f172b]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(21,93,252,0.1)_0%,rgba(79,57,246,0.1)_50%,rgba(152,16,250,0.1)_100%)]" />
        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-[32px] sm:text-[42px] font-extrabold text-white mb-2 flex items-center gap-3">
              <TrendingUp className="text-[#51a2ff]" size={36} />
              Listas de la Comunidad
            </h1>
            <p className="text-[#90a1b9] text-[16px] max-w-xl">
              Descubre, comparte y vota las mejores colecciones curadas por
              jugadores de todo el mundo.
            </p>
          </div>
          <button
            onClick={() => {
              if (!user) return login();
              setCreateStep(1);
              setIsCreateModalOpen(true);
            }}
            className="h-12 px-6 rounded-[12px] bg-[#155dfc] hover:bg-[#2b7fff] text-white text-[15px] font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(21,93,252,0.3)] hover:scale-105 shrink-0"
          >
            <Plus size={20} /> Crear Lista
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* COLUMNA PRINCIPAL (FEED) */}
        <div className="flex-1 space-y-6 w-full">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172b] p-3 rounded-[12px] border border-[#1d293d]">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {FEED_TABS.map((tab) => {
                const active = feedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFeedTab(tab.id)}
                    className={`h-9 px-4 rounded-[8px] text-[13px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                      active
                        ? "bg-[rgba(43,127,255,0.15)] text-[#51a2ff]"
                        : "text-[#62748e] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#cad5e2]"
                    }`}
                  >
                    {tab.id === "trending" && <Flame size={16} />}
                    {tab.id === "top" && <Star size={16} />}
                    {tab.id === "new" && <Clock3 size={16} />}
                    {tab.id === "mine" && <Bookmark size={16} />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-[280px] shrink-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#62748e]"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar listas..."
                className="w-full h-9 rounded-[8px] bg-[rgba(2,6,24,0.5)] border border-[#1d293d] pl-9 pr-4 text-[13px] text-white focus:border-[#51a2ff] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* LISTA DE POSTS */}
          <div className="space-y-4">
            {loadingLists ? (
              [...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex bg-[#0f172b] border border-[#1d293d] rounded-[12px] h-[160px] animate-pulse"
                >
                  <div className="w-12 bg-[rgba(255,255,255,0.02)] border-r border-[#1d293d]" />
                  <div className="p-4 flex-1 space-y-3">
                    <div className="h-4 bg-[#1d293d] w-1/3 rounded" />
                    <div className="h-6 bg-[#1d293d] w-3/4 rounded" />
                    <div className="h-16 bg-[#1d293d] w-full rounded" />
                  </div>
                </div>
              ))
            ) : listsLoadError ? (
              <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-10 text-center">
                <p className="text-[#ff8a8c] text-[14px] mb-4">
                  {listsLoadError}
                </p>
                <button
                  onClick={() => fetchLists(1, false)}
                  className="h-9 px-4 rounded-[10px] bg-[#155dfc] text-white text-[13px] font-medium"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredLists.length > 0 ? (
              <AnimatePresence>
                {filteredLists.map((list, idx) => {
                  const hasLiked = user && list.likes?.includes(user.id);
                  const hasDisliked = user && list.dislikes?.includes(user.id);

                  return (
                    <motion.div
                      key={list._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        to={`/lists/${list._id}`}
                        className="block bg-[#0f172b] border border-[#1d293d] rounded-[12px] hover:border-[#314158] transition-colors group overflow-hidden"
                      >
                        <div className="flex">
                          {/* COLUMNA DE VOTOS */}
                          <div className="w-12 sm:w-16 bg-[rgba(15,23,43,0.3)] border-r border-[#1d293d] flex flex-col items-center py-3 gap-1 shrink-0">
                            <button
                              onClick={(e) => handleVote(e, list._id, "like")}
                              className={`transition-colors p-1 rounded ${hasLiked ? "text-[#ff4500] bg-[rgba(255,69,0,0.1)]" : "text-[#62748e] hover:text-[#ff4500] hover:bg-[rgba(255,69,0,0.1)]"}`}
                            >
                              <ArrowBigUp size={24} />
                            </button>
                            <span
                              className={`text-[14px] font-bold ${hasLiked ? "text-[#ff4500]" : hasDisliked ? "text-[#7193ff]" : "text-white"}`}
                            >
                              {(list.likes?.length || 0) -
                                (list.dislikes?.length || 0)}
                            </span>
                            <button
                              onClick={(e) =>
                                handleVote(e, list._id, "dislike")
                              }
                              className={`transition-colors p-1 rounded ${hasDisliked ? "text-[#7193ff] bg-[rgba(113,147,255,0.1)]" : "text-[#62748e] hover:text-[#7193ff] hover:bg-[rgba(113,147,255,0.1)]"}`}
                            >
                              <ArrowBigDown size={24} />
                            </button>
                          </div>

                          {/* CONTENIDO DEL POST */}
                          <div className="p-4 flex-1 flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 min-w-0">
                              {/* AQUÍ ESTÁN LAS CATEGORÍAS CORREGIDAS (SIN L/ Y CON SU NOMBRE REAL) */}
                              <div className="flex items-center gap-2 text-[12px] text-[#62748e] mb-2 flex-wrap">
                                {list.categories &&
                                  list.categories.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {list.categories.map(
                                        (cat: string, i: number) => (
                                          <span
                                            key={i}
                                            className="bg-[rgba(43,127,255,0.1)] text-[#51a2ff] px-2 py-0.5 rounded-[4px] font-bold"
                                          >
                                            {cat}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  )}
                                <span>•</span>
                                <span>
                                  Posteado por{" "}
                                  <span className="text-[#cad5e2] hover:underline">
                                    @{list.author?.username || "Usuario"}
                                  </span>
                                </span>
                                <span>•</span>
                                <span>
                                  {list.createdAt
                                    ? formatDistanceToNow(
                                        new Date(list.createdAt),
                                        { addSuffix: true, locale: es },
                                      )
                                    : ""}
                                </span>
                              </div>

                              <h3 className="text-[18px] sm:text-[20px] text-white font-bold mb-2 leading-tight group-hover:text-[#51a2ff] transition-colors">
                                {list.title}
                              </h3>
                              <p className="text-[14px] text-[#90a1b9] line-clamp-2 mb-4">
                                {list.description}
                              </p>

                              <div className="flex items-center gap-1 text-[#62748e] text-[12px] font-bold">
                                <div className="flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.05)] px-2 py-1.5 rounded-[6px] transition-colors">
                                  <MessageSquare size={16} />{" "}
                                  {list.commentsCount || 0} Comentarios
                                </div>
                                <div className="flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.05)] px-2 py-1.5 rounded-[6px] transition-colors">
                                  <Gamepad2 size={16} />{" "}
                                  {list.games?.length || 0} Juegos
                                </div>
                              </div>
                            </div>

                            {list.coverImage && (
                              <div className="w-full sm:w-[180px] h-[120px] rounded-[8px] overflow-hidden shrink-0 border border-[#1d293d]">
                                <img
                                  src={list.coverImage}
                                  alt="Cover"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-10 text-center">
                <p className="text-[#90a1b9] text-[14px] mb-4">
                  No se encontraron listas en esta sección.
                </p>
                <button
                  onClick={() => {
                    setFeedTab("trending");
                    setSelectedCategory("Todas");
                    setQuery("");
                  }}
                  className="h-9 px-4 rounded-[10px] bg-[#155dfc] text-white text-[13px] font-medium"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            {listsHasMore && (
              <button
                onClick={loadMoreLists}
                disabled={loadingMoreLists}
                className="w-full h-12 rounded-[12px] bg-[rgba(43,127,255,0.1)] text-[#51a2ff] font-bold text-[14px] hover:bg-[rgba(43,127,255,0.2)] transition-colors disabled:opacity-50"
              >
                {loadingMoreLists ? "Cargando..." : "Cargar más listas"}
              </button>
            )}
          </div>
        </div>

        {/* BARRA LATERAL (SIDEBAR) */}
        <div className="hidden lg:block w-[320px] shrink-0 space-y-6">
          <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] overflow-hidden">
            <div className="h-12 bg-[linear-gradient(to_right,#155dfc,#4f39f6)] px-4 flex items-center">
              <h3 className="text-white font-bold text-[14px]">
                Acerca de Listas
              </h3>
            </div>
            <div className="p-4">
              <p className="text-[#90a1b9] text-[13px] mb-4 leading-relaxed">
                El mejor lugar para organizar y descubrir colecciones de juegos.
                Crea tus tops, guías de compra o simplemente muestra tus
                favoritos.
              </p>

              {/* AQUÍ ESTÁN LAS ESTADÍSTICAS GLOBALES */}
              <div className="flex items-center justify-between py-3 border-y border-[#1d293d] mb-4">
                <div className="text-center w-1/2">
                  <div className="text-white font-bold text-[18px]">
                    {totalDbLists > 0 ? totalDbLists : "..."}
                  </div>
                  <div className="text-[#62748e] text-[12px]">
                    Listas (Total DB)
                  </div>
                </div>
                <div className="w-px h-8 bg-[#1d293d]" />
                <div className="text-center w-1/2">
                  <div className="text-white font-bold text-[18px]">
                    {totalVotesLoaded}
                  </div>
                  <div className="text-[#62748e] text-[12px]">
                    Votos (Pág. Actual)
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!user) return login();
                  setCreateStep(1);
                  setIsCreateModalOpen(true);
                }}
                className="w-full h-10 rounded-[8px] bg-[#155dfc] text-white text-[14px] font-bold hover:bg-[#2b7fff] transition-colors"
              >
                Crear Lista
              </button>
            </div>
          </div>

          <div className="bg-[#0f172b] border border-[#1d293d] rounded-[12px] p-4">
            <h3 className="text-white font-bold text-[14px] mb-3">
              Filtrar por Etiqueta
            </h3>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_CHIPS.map((chip) => {
                const active = chip === selectedCategory;
                return (
                  <button
                    key={chip}
                    onClick={() => setSelectedCategory(chip)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                      active
                        ? "bg-[#155dfc] text-white"
                        : "bg-[rgba(255,255,255,0.05)] text-[#90a1b9] hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
                    }`}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(2,6,24,0.78)] backdrop-blur-[2px] px-4 py-8 overflow-y-auto"
          onClick={closeCreateModal}
        >
          <div
            className="mx-auto w-full max-w-[672px] rounded-[16px] border border-[#1e2c46] bg-[#020b22] shadow-[0px_30px_70px_0px_rgba(0,0,0,0.55)] overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 bg-[linear-gradient(90deg,rgba(21,93,252,0.2)_0%,rgba(79,57,246,0.2)_50%,rgba(152,16,250,0.2)_100%)] border-b border-[#1e2c46]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[20px] leading-none font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-[#3cb5ff]" />
                    Crear Nueva Lista
                  </h2>
                  <p className="mt-2 text-[14px] text-[#90a1b9]">
                    Comparte tu coleccion curada con la comunidad
                  </p>
                </div>

                <button
                  type="button"
                  className="h-7 w-7 rounded-full text-[#6f7d94] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors flex items-center justify-center"
                  onClick={closeCreateModal}
                  aria-label="Cerrar modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      createStep === 1
                        ? "bg-[#2b7fff] text-white"
                        : "bg-[#00bc7d] text-white"
                    }`}
                  >
                    {createStep === 1 ? "1" : <Check size={14} />}
                  </span>
                  <span
                    className={`font-medium ${
                      createStep === 1 ? "text-white" : "text-[#62748e]"
                    }`}
                  >
                    Info
                  </span>
                </div>
                <div
                  className={`h-px flex-1 ${
                    createStep >= 2
                      ? "bg-[rgba(0,188,125,0.5)]"
                      : "bg-[#40517b]"
                  }`}
                />
                <div className="flex items-center gap-2">
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      createStep === 2
                        ? "bg-[#2b7fff] text-white"
                        : createStep === 3
                          ? "bg-[#00bc7d] text-white"
                          : "bg-[#253353] text-[#62748e]"
                    }`}
                  >
                    {createStep === 3 ? <Check size={14} /> : "2"}
                  </span>
                  <span
                    className={`font-medium ${
                      createStep === 2 ? "text-white" : "text-[#62748e]"
                    }`}
                  >
                    Juegos
                  </span>
                </div>
                <div
                  className={`h-px flex-1 ${
                    createStep === 3
                      ? "bg-[rgba(0,188,125,0.5)]"
                      : "bg-[#2a3554]"
                  }`}
                />
                <div
                  className={`flex items-center gap-2 ${
                    createStep === 3
                      ? "text-white"
                      : "text-[#5f6f8f] opacity-40"
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                      createStep === 3
                        ? "bg-[#2b7fff] text-white"
                        : "bg-[#253353] text-[#62748e]"
                    }`}
                  >
                    3
                  </span>
                  <span>Vista previa</span>
                </div>
              </div>
            </div>

            {createStep === 1 ? (
              <>
                <div className="px-6 py-6 space-y-6">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[14px]">
                      <label
                        htmlFor="list-title"
                        className="text-[#cad5e2] font-medium"
                      >
                        Titulo de la lista{" "}
                        <span className="text-[#ff5f6d]">*</span>
                      </label>
                      <span className="text-[#62748e] text-[12px]">
                        {titleChars}/80
                      </span>
                    </div>
                    <input
                      id="list-title"
                      value={createTitle}
                      onChange={(event) =>
                        setCreateTitle(event.target.value.slice(0, 80))
                      }
                      placeholder="Ej: Top RPGs de todos los tiempos"
                      className="w-full h-11 rounded-[10px] bg-[#0f1f3b] border border-[#2f405e] px-4 text-[14px] text-[#cad5e2] placeholder:text-[#62748e] focus:outline-none focus:border-[#2b7fff]"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-[14px]">
                      <label
                        htmlFor="list-description"
                        className="text-[#cad5e2] font-medium"
                      >
                        Descripcion
                      </label>
                      <span className="text-[#62748e] text-[12px]">
                        {descriptionChars}/200
                      </span>
                    </div>
                    <textarea
                      id="list-description"
                      value={createDescription}
                      onChange={(event) =>
                        setCreateDescription(event.target.value.slice(0, 200))
                      }
                      placeholder="Cuentale a la comunidad de que va tu lista..."
                      className="w-full h-[96px] rounded-[12px] bg-[#0f1f3b] border border-[#2f405e] px-4 py-3 text-[14px] text-[#cad5e2] placeholder:text-[#62748e] focus:outline-none focus:border-[#2b7fff] resize-none"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] text-[#cad5e2] font-medium">
                      Categoria <span className="text-[#ff5f6d]">*</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {createCategoryOptions.map((option) => {
                        const active = createCategories.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => {
                              setCreateCategories((prev) =>
                                prev.includes(option)
                                  ? prev.filter((c) => c !== option)
                                  : [...prev, option],
                              );
                            }}
                            className={`h-[50px] rounded-[10px] border text-[12px] transition-colors ${
                              active
                                ? "bg-[#1a3770] border-[#2b7fff] text-white"
                                : "bg-[#111f3a] border-[#2f405e] text-[#a7b6cd] hover:text-white"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[14px] text-[#cad5e2] font-medium">
                      Portada
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <label className="relative h-[88px] rounded-[10px] overflow-hidden border border-[#2f405e] hover:border-[#4766a3] transition-colors flex flex-col items-center justify-center cursor-pointer bg-[#0f172a]">
                        <Plus size={20} className="text-[#a7b6cd] mb-1" />
                        <span className="text-[#a7b6cd] text-[12px] font-medium">
                          Subir foto
                        </span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setCreateCover(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {createCoverOptions.map((cover) => {
                        const active = createCover === cover.image;
                        return (
                          <button
                            key={cover.id}
                            type="button"
                            onClick={() => setCreateCover(cover.image)}
                            className={`relative h-[88px] rounded-[10px] overflow-hidden border transition-colors ${
                              active
                                ? "border-[#2b7fff]"
                                : "border-[#2f405e] hover:border-[#4766a3]"
                            }`}
                            aria-label={`Seleccionar portada ${cover.title}`}
                          >
                            <img
                              src={cover.image}
                              alt={cover.title}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(1,8,22,0.85)] to-transparent" />
                            {active && (
                              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-[#2b7fff] flex items-center justify-center text-white">
                                <Check size={12} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-[#1e2c46] bg-[rgba(2,6,24,0.8)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="h-10 w-full sm:w-auto justify-center px-3 rounded-[10px] text-[#a3b3cb] text-[14px] flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={14} /> Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    disabled={!canContinueInfo}
                    className={`h-10 w-full sm:w-auto justify-center px-5 rounded-[14px] text-[14px] font-medium flex items-center gap-2 transition-colors ${
                      canContinueInfo
                        ? "bg-[#155dfc] text-white hover:bg-[#2b7fff]"
                        : "bg-[#1c2f5c] text-[#6c84b3] cursor-not-allowed"
                    }`}
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : createStep === 2 ? (
              <>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <p className="text-[14px] font-medium text-[#cad5e2] mb-2">
                      Tu seleccion ({createSelectedGames.length})
                    </p>
                    <div className="space-y-2 max-h-[192px] overflow-y-auto pr-1">
                      {createSelectedGames.map((game, index) => (
                        <div
                          key={game.id}
                          className="h-[62px] rounded-[14px] border border-[#1d293d] bg-[#0f172b] px-3 flex items-center gap-3"
                        >
                          <GripVertical size={14} className="text-[#45556c]" />
                          <span className="text-[12px] font-bold text-[#45556c] w-5 text-center">
                            #{index + 1}
                          </span>
                          <img
                            src={game.image}
                            alt={game.title}
                            className="h-10 w-10 rounded-[10px] object-cover bg-[#1d293d]"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              if (!t.dataset.fallback) {
                                t.dataset.fallback = "1";
                                t.src = `https://placehold.co/80x80/1e293b/94a3b8?text=${encodeURIComponent(game.title[0] ?? "?")}`;
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-white truncate">
                              {game.title}
                            </p>
                            <p className="text-[10px] text-[#62748e]">
                              {game.year !== "—" && game.year !== "-"
                                ? game.year
                                : ""}
                              {game.year !== "—" && game.year !== "-"
                                ? " · "
                                : ""}
                              {game.price}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeGameFromSelection(game.id)}
                            className="h-6 w-6 rounded-full text-[#62748e] hover:text-white hover:bg-[#1d293d] flex items-center justify-center"
                            aria-label={`Quitar ${game.title}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[14px] font-medium text-[#cad5e2] mb-2">
                      Buscar juegos para anadir
                    </p>
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#62748e]"
                      />
                      <input
                        value={createGameQuery}
                        onChange={(event) =>
                          setCreateGameQuery(event.target.value)
                        }
                        placeholder="Buscar por nombre..."
                        className="w-full h-[42px] rounded-[14px] bg-[#0f172b] border border-[#314158] pl-9 pr-4 text-[14px] text-[#cad5e2] placeholder:text-[#45556c] focus:outline-none focus:border-[#2b7fff]"
                      />
                    </div>

                    <div className="mt-3 space-y-1.5 max-h-[224px] overflow-y-auto pr-1">
                      {filteredCreateGameOptions.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => addGameToSelection(game)}
                          className="w-full h-[62px] rounded-[14px] border border-[rgba(29,41,61,0.5)] bg-[rgba(15,23,43,0.5)] px-3 flex items-center gap-3 text-left hover:border-[#2b7fff] transition-colors"
                        >
                          <img
                            src={game.image}
                            alt={game.title}
                            className="h-10 w-10 rounded-[10px] object-cover bg-[#1d293d]"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              if (!t.dataset.fallback) {
                                t.dataset.fallback = "1";
                                t.src = `https://placehold.co/80x80/1e293b/94a3b8?text=${encodeURIComponent(game.title[0] ?? "?")}`;
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-[#cad5e2] truncate">
                              {game.title}
                            </p>
                            <p className="text-[10px] text-[#62748e]">
                              {game.year} · {game.price} ·{" "}
                              <span className="text-[#51a2ff]">
                                {game.score}
                              </span>
                            </p>
                          </div>
                          <Plus size={16} className="text-[#51a2ff]" />
                        </button>
                      ))}

                      {filteredCreateGameOptions.length === 0 &&
                        createGameQuery.length > 2 && (
                          <div className="h-[62px] rounded-[14px] border border-[rgba(29,41,61,0.5)] bg-[rgba(15,23,43,0.5)] px-4 flex items-center text-[13px] text-[#62748e]">
                            {isSearchingGames
                              ? "Buscando juegos en Steam..."
                              : "No hay resultados o ya están en tu lista."}
                          </div>
                        )}
                      {createGameQuery.length <= 2 && (
                        <div className="h-[62px] rounded-[14px] border border-[rgba(29,41,61,0.5)] bg-[rgba(15,23,43,0.5)] px-4 flex items-center text-[13px] text-[#62748e]">
                          Escribe al menos 3 caracteres para buscar en Steam...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-[#1e2c46] bg-[rgba(2,6,24,0.8)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep(1)}
                    className="h-9 w-full sm:w-auto justify-center px-3 rounded-[10px] text-[#90a1b9] text-[14px] flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={14} /> Atras
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateStep(3)}
                    disabled={!canContinueGames}
                    className={`h-10 w-full sm:w-auto justify-center px-5 rounded-[14px] text-[14px] font-medium flex items-center gap-2 transition-colors ${
                      canContinueGames
                        ? "bg-[#155dfc] text-white hover:bg-[#2b7fff]"
                        : "bg-[#1c2f5c] text-[#6c84b3] cursor-not-allowed"
                    }`}
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 text-[#cad5e2] text-[14px] font-medium mb-3">
                    <Eye size={14} className="text-[#51a2ff]" />
                    Vista previa de tu lista
                  </div>

                  <div className="rounded-[14px] border border-[#1d293d] overflow-hidden bg-[#0f172b]">
                    <div className="relative h-[144px]">
                      <img
                        src={createCover}
                        alt={createTitle || "Portada de lista"}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b] via-[rgba(15,23,43,0.4)] to-transparent" />

                      <span className="absolute top-4 right-3 h-5 rounded-full border border-[rgba(43,127,255,0.2)] bg-[rgba(43,127,255,0.15)] px-[9px] text-[10px] font-medium text-[#51a2ff] flex items-center">
                        {previewCategoryLabel}
                      </span>

                      <div className="absolute left-4 right-4 bottom-3">
                        <span className="h-[19px] rounded-full px-2 bg-[rgba(0,188,125,0.9)] text-white text-[10px] font-bold inline-flex items-center mb-2">
                          TUYA · NUEVA
                        </span>
                        <h3 className="text-white text-[24px] leading-7 font-bold truncate">
                          {createTitle || "Mi nueva lista"}
                        </h3>
                        <p className="text-[11px] text-[#cad5e2]">
                          por <span className="text-[#51a2ff]">Tu</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="space-y-2">
                        {createSelectedGames.map((game, index) => (
                          <div
                            key={game.id}
                            className="h-12 rounded-[10px] border border-[#1d293d] bg-[#0c1529] px-2 flex items-center"
                          >
                            <span className="w-8 text-[12px] font-bold text-[#45556c] text-center">
                              #{index + 1}
                            </span>
                            <img
                              src={game.image}
                              alt={game.title}
                              className="h-8 w-8 rounded-[8px] object-cover"
                            />
                            <span className="ml-3 text-[14px] text-[#cad5e2] flex-1 truncate">
                              {game.title}
                            </span>
                            <span className="text-[10px] text-[#00bc7d] font-medium">
                              {game.score}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-2 border-t border-[#1d293d] flex items-center justify-between">
                        <span className="text-[12px] text-[#62748e]">
                          0 likes · 0 comentarios
                        </span>
                        <span className="h-[17px] rounded-[4px] bg-[#1d293d] px-2 text-[#62748e] text-[10px] font-medium flex items-center">
                          {createSelectedGames.length} juegos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-[#1e2c46] bg-[rgba(2,6,24,0.8)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="h-9 w-full sm:w-auto justify-center px-3 rounded-[10px] text-[#90a1b9] text-[14px] flex items-center gap-2 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={14} /> Atras
                  </button>

                  <button
                    type="button"
                    onClick={submitList}
                    disabled={isSubmitting}
                    className="h-10 w-full sm:w-auto justify-center px-6 rounded-[14px] bg-[#155dfc] text-white text-[14px] font-medium flex items-center gap-2 hover:bg-[#2b7fff] transition-colors disabled:opacity-50"
                  >
                    <Sparkles size={16} />{" "}
                    {isSubmitting ? "Publicando..." : "Publicar Lista"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
