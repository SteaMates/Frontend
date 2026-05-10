import {
  ArrowLeft,
  Lock,
  MessageSquare,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Link, Navigate, useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ReportButton } from "../components/ReportButton";
import { UserProfileLink } from "../components/UserProfileLink";

interface Game {
  appId: string | number;
  name: string;
  imageUrl?: string;
  image?: string;
  _id: string;
}

interface CommentData {
  _id: string;
  content: string;
  author: {
    _id: string;
    steamId?: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
}

interface List {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  author: {
    _id: string;
    steamId?: string;
    username: string;
    avatar: string;
  };
  games: Game[];
  likes: string[];
  dislikes: string[];
  createdAt: string;
}

export function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [list, setList] = useState<List | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar esta lista?")) return;
    try {
      await api.delete(`/api/lists/${id}`);
      navigate("/lists");
    } catch (err) {
      console.error("Error deleting list:", err);
      alert("Hubo un error al borrar la lista");
    }
  };

  useEffect(() => {
    const fetchListAndComments = async () => {
      try {
        const [listRes, commentsRes] = await Promise.all([
          api.get(`/api/lists/${id}`),
          api.get(`/api/lists/${id}/comments`, { params: { page: 1, limit: 12 } })
        ]);
        setList(listRes.data);

        // Handle both paginated and array responses
        const commentsList = Array.isArray(commentsRes.data)
          ? commentsRes.data
          : commentsRes.data?.comments || [];
        const commentsPagination = Array.isArray(commentsRes.data)
          ? null
          : commentsRes.data?.pagination || null;

        setComments(commentsList);
        setCommentsPage(commentsPagination?.page || 1);
        setCommentsTotal(commentsPagination?.total || commentsList.length);
        setCommentsHasMore(
          commentsPagination
            ? commentsPagination.page < commentsPagination.pages
            : false
        );
      } catch (err) {
        console.error("Error fetching list data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchListAndComments();
    }
  }, [id]);

  const handleLike = async () => {
    if (!user) return login();
    try {
      const res = await api.post(`/api/lists/${id}/like`);
      setList(prev => prev ? { ...prev, likes: res.data.likes, dislikes: res.data.dislikes } : prev);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async () => {
    if (!user) return login();
    try {
      const res = await api.post(`/api/lists/${id}/dislike`);
      setList(prev => prev ? { ...prev, likes: res.data.likes, dislikes: res.data.dislikes } : prev);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return login();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/api/lists/${id}/comments`, { content: newComment });
      setComments([res.data, ...comments]);
      setCommentsTotal((prev) => prev + 1);
      setNewComment("");
    } catch (err) {
      console.error(err);
      const error = err as any;
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      alert(`Error creating comment: ${errorMessage}`);
    }
  };

  const loadMoreComments = async () => {
    if (!id || commentsLoadingMore || loading || !commentsHasMore) return;

    try {
      setCommentsLoadingMore(true);
      const nextPage = commentsPage + 1;
      const response = await api.get(`/api/lists/${id}/comments`, {
        params: { page: nextPage, limit: 12 },
      });

      // Handle both paginated and array responses
      const nextComments = Array.isArray(response.data)
        ? response.data
        : response.data?.comments || [];
      const responsePagination = Array.isArray(response.data)
        ? null
        : response.data?.pagination || null;

      setComments((prev) => [...prev, ...nextComments]);
      setCommentsPage(responsePagination?.page || nextPage);
      setCommentsTotal(responsePagination?.total || commentsTotal);
      setCommentsHasMore(
        responsePagination
          ? responsePagination.page < responsePagination.pages
          : false
      );
    } catch (err) {
      console.error("Error loading more comments:", err);
    } finally {
      setCommentsLoadingMore(false);
    }
  };

  if (loading) {
    return <div className="text-white text-center py-20">Cargando...</div>;
  }

  if (error || !list) {
    return <Navigate to="/lists" replace />;
  }

  return (
    <div className="pb-20">
      <Link
        to="/lists"
        className="inline-flex items-center gap-2 text-[#90a1b9] hover:text-white text-[16px]"
      >
        <ArrowLeft size={20} /> Volver a Listas
      </Link>

      <article className="mt-6 rounded-2xl border border-[#1d293d] bg-[#0f172b] overflow-hidden shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <header className="relative h-[220px] sm:h-[256px] bg-[#1d293d]">
          <img
            src={list.coverImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070"}
            alt={list.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b] to-transparent" />

          <div className="absolute inset-x-4 bottom-4 sm:inset-x-10 sm:bottom-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h1 className="text-white text-[26px] sm:text-[36px] leading-[32px] sm:leading-[40px] font-bold">
                {list.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] sm:text-[16px]">
                <UserProfileLink
                  steamId={list.author?.steamId || list.author?._id}
                  username={list.author?.username || 'Unknown'}
                  avatar={list.author?.avatar}
                  variant="both"
                  avatarClassName="w-8 h-8 rounded-full border border-[#45556c] bg-[#314158]"
                  nameClassName="text-white"
                />
                <span className="text-[#62748e]">•</span>
                <span className="text-[#cad5e2]">
                  {formatDistanceToNow(new Date(list.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </div>

            <div className="h-auto sm:h-[54px] rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[rgba(2,6,24,0.5)] px-3 py-2 sm:py-0 flex flex-wrap items-center gap-3 w-full sm:w-fit">
              <button
                onClick={handleLike}
                className={`h-9 rounded-[10px] px-3 flex items-center gap-2 hover:bg-[#1d293d] transition-colors text-[16px] font-bold ${list.likes?.includes(user?.id || '') ? 'text-[#00d492]' : 'text-[#62748e]'}`}
              >
                <ThumbsUp size={18} /> {list.likes?.length || 0}
              </button>
              <div className="w-px h-6 bg-[#314158]" />
              <button
                onClick={handleDislike}
                className={`h-9 rounded-[10px] px-3 flex items-center gap-2 hover:bg-[#1d293d] transition-colors text-[16px] font-bold ${list.dislikes?.includes(user?.id || '') ? 'text-[#ff6467]' : 'text-[#62748e]'}`}
              >
                <ThumbsDown size={18} /> {list.dislikes?.length || 0}
              </button>
            </div>
          </div>
        </header>

        <section className="border-b border-[#1d293d] px-4 sm:px-6 md:px-10 py-8 sm:py-10">
          <p className="text-[#cad5e2] text-[18px] leading-[29px] whitespace-pre-wrap">
            {list.description}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-[#90a1b9] text-[16px]"
              >
                <MessageSquare size={20} /> {commentsTotal || comments.length} Comentarios
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {user && user.id !== String(list.author?._id) && (
                <ReportButton
                  targetId={list._id}
                  targetType="list"
                  buttonLabel="Reportar lista"
                  buttonClassName="inline-flex items-center gap-2 text-[#90a1b9] text-[16px] hover:text-[#ff8a8c] transition-colors"
                />
              )}
              {user && user.id === String(list.author?._id) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 text-[#ff6467] text-[16px] hover:text-[#ff8a8c] transition-colors"
                >
                  <Trash2 size={20} /> Borrar lista
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("¡Enlace copiado al portapapeles!");
                }}
                className="inline-flex items-center gap-2 text-[#90a1b9] text-[16px] hover:text-white transition-colors"
              >
                <Share2 size={20} /> Compartir
              </button>
            </div>
          </div>
        </section>

        <section className="bg-[rgba(2,6,24,0.3)] px-4 sm:px-6 md:px-10 py-8 sm:py-10">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-8 h-8 rounded-[10px] bg-[#4f39f6] inline-flex items-center justify-center text-white text-[14px] font-bold">
              {list.games.length}
            </span>
            <h2 className="text-white text-[20px] leading-7 font-bold">
              Juegos en esta colección
            </h2>
          </div>

          <div className="space-y-4">
            {list.games.map((game, index) => {
              const steamCdnUrl = game.appId
                ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`
                : null;

              const initialImageUrl = game.imageUrl || game.image || steamCdnUrl || `https://placehold.co/200x100/1d293d/94a3b8?text=${encodeURIComponent(game.name || "?")}`;

              return (
                <Link
                  to={`/game/${game.appId}`}
                  key={game._id}
                  className="rounded-[14px] border border-[#1d293d] bg-[#0f172b] p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-[#314158] transition-colors block cursor-pointer group"
                >
                  <div className="text-[#314158] text-[24px] leading-8 font-bold w-10 text-center shrink-0 group-hover:text-[#51a2ff] transition-colors">
                    #{index + 1}
                  </div>
                  <div className="relative w-full sm:w-[192px] h-[118px] rounded-[10px] overflow-hidden bg-[#1d293d] shrink-0 shadow-inner">
                    <img
                      src={initialImageUrl}
                      alt={game.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (!target.dataset.failed) {
                          target.dataset.failed = "true";
                          target.src = `https://placehold.co/400x200/1d293d/94a3b8?text=${encodeURIComponent(game.name || "Juego")}`;
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white text-[20px] leading-7 font-bold truncate group-hover:text-[#51a2ff] transition-colors">
                      {game.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="border-t border-[#1d293d] px-4 sm:px-6 md:px-10 py-8 sm:py-10">
          <h2 className="text-white text-[20px] leading-7 font-bold mb-6">
            Comentarios ({commentsTotal || comments.length})
          </h2>

          {!user ? (
            <div className="rounded-[14px] border border-[#1d293d] bg-[rgba(2,6,24,0.5)] p-6 text-center">
              <Lock size={32} className="text-[#62748e] mx-auto" />
              <p className="mt-3 text-[#90a1b9] text-[16px] leading-6">
                Debes iniciar sesión para comentar
              </p>
              <button
                type="button"
                onClick={login}
                className="mt-4 h-9 rounded-[10px] bg-[#4f39f6] px-4 text-white text-[14px] font-medium"
              >
                Iniciar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handlePostComment} className="flex flex-col sm:flex-row gap-4 mb-8">
              <img
                src={user.avatarfull}
                alt={user.personaname}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0"
              />
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="w-full rounded-[10px] border border-[#1d293d] bg-[rgba(2,6,24,0.5)] px-4 py-3 text-white placeholder-[#62748e] focus:outline-none focus:border-[#4f39f6] resize-none h-24"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="mt-3 h-9 rounded-[10px] bg-[#4f39f6] px-6 text-white text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4330d3] transition-colors"
                >
                  Comentar
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 space-y-6">
            {comments.map((comment) => (
              <div key={comment._id} className="flex items-start gap-4">
                <UserProfileLink
                  steamId={comment.author?.steamId || comment.author?._id}
                  username={comment.author?.username || 'Unknown'}
                  avatar={comment.author?.avatar}
                  variant="avatar"
                  avatarClassName="w-10 h-10 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0 bg-[#1d293d]"
                />

                <div className="min-w-0 flex-1">
                  <div className="rounded-tl-[2px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[14px] bg-[rgba(29,41,61,0.5)] px-4 py-3 border border-[#1d293d]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserProfileLink
                          steamId={comment.author?.steamId || comment.author?._id}
                          username={comment.author?.username || 'Unknown'}
                          variant="name"
                          nameClassName="text-white text-[16px] leading-6 font-bold truncate"
                        />
                        {user && user.id !== String(comment.author?._id) && (
                          <ReportButton
                            targetId={comment._id}
                            targetType="comment"
                            buttonLabel="Reportar"
                            buttonClassName="inline-flex items-center gap-1 text-[#90a1b9] text-[12px] hover:text-[#ff8a8c] transition-colors"
                          />
                        )}
                      </div>
                      <span className="text-[#62748e] text-[12px] leading-4 whitespace-nowrap">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-[#cad5e2] text-[14px] leading-5 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {commentsHasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMoreComments}
                  disabled={commentsLoadingMore}
                  className="px-5 py-2.5 rounded-[10px] bg-[#155dfc] text-white text-[14px] font-medium hover:bg-[#1d66ff] transition-colors disabled:opacity-60"
                >
                  {commentsLoadingMore ? "Cargando..." : "Cargar más comentarios"}
                </button>
              </div>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}