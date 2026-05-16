/**
 * Nombre del fichero: ListDetail.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import {
  ArrowLeft,
  Lock,
  MessageSquare,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Reply,
  X,
  AlertTriangle
} from "lucide-react";
import { Link, Navigate, useParams, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import api from "../../lib/api";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ReportButton } from "../components/ReportButton";
import { UserProfileLink } from "../components/UserProfileLink";
import { toast } from "sonner";

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
  parentId?: string;
}

interface List {
  _id: string;
  title: string;
  description: string;
  coverImage: string;
  categories: string[];
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

/**
 * Función: ListDetail
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * ListDetail. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function ListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [list, setList] = useState<List | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
  const [commentsTotal, setCommentsTotal] = useState(0);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /**
   * Función: confirmDelete
   * Descripción: Función auxiliar de propósito general especializada en confirm delete.
   */
  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/api/lists/${id}`);
      toast.success("Lista borrada correctamente");
      navigate("/lists");
    } catch (err) {
      console.error("Error deleting list:", err);
      toast.error("Hubo un error al borrar la lista");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  useEffect(() => {
    /**
     * Función: fetchListAndComments
     * Descripción: Operación asíncrona dedicada a recuperar la información de list and comments.
     */
    const fetchListAndComments = async () => {
      try {
        const [listRes, commentsRes] = await Promise.all([
          api.get(`/api/lists/${id}`),
          api.get(`/api/lists/${id}/comments`, { params: { page: 1, limit: 20 } })
        ]);
        setList(listRes.data);

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

  useEffect(() => {
    if (!loading && comments.length > 0 && location.hash.startsWith("#comment-")) {
      const commentId = location.hash.replace("#comment-", "");
      setTimeout(() => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add("ring-2", "ring-[#51a2ff]", "bg-[#51a2ff]/10");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-[#51a2ff]", "bg-[#51a2ff]/10");
          }, 3000);
        }
      }, 500);
    }
  }, [loading, comments, location.hash]);

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

  const handleReplyClick = (comment: CommentData) => {
    setReplyingTo(comment);
    if (!newComment.includes(`@${comment.author.username}`)) {
      setNewComment(`@${comment.author.username} ` + newComment);
    }
    setTimeout(() => {
      commentInputRef.current?.focus();
      const length = commentInputRef.current?.value.length || 0;
      commentInputRef.current?.setSelectionRange(length, length);
    }, 10);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return login();
    if (!newComment.trim()) return;

    try {
      const payload: any = { content: newComment };
      if (replyingTo) {
        payload.parentId = replyingTo._id;
      }

      const res = await api.post(`/api/lists/${id}/comments`, payload);
      setComments([res.data, ...comments]);
      setCommentsTotal((prev) => prev + 1);
      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      const error = err as any;
      const errorMessage = error?.response?.data?.error || error?.message || "Unknown error";
      toast.error(`Error al comentar: ${errorMessage}`);
    }
  };

  const loadMoreComments = async () => {
    if (!id || commentsLoadingMore || loading || !commentsHasMore) return;

    try {
      setCommentsLoadingMore(true);
      const nextPage = commentsPage + 1;
      const response = await api.get(`/api/lists/${id}/comments`, {
        params: { page: nextPage, limit: 20 },
      });

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

  const renderCommentContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-[#51a2ff] font-bold bg-[rgba(43,127,255,0.1)] px-1 rounded-[4px]">{part}</span>
      ) : (
        part
      )
    );
  };

  if (loading) {
    return <div className="text-white text-center py-20 font-black text-xl animate-pulse">Cargando colección...</div>;
  }

  if (error || !list) {
    return <Navigate to="/lists" replace />;
  }

  return (
    <div className="pb-20 px-4 md:px-8">
      <Link
        to="/lists"
        className="inline-flex items-center gap-2 text-[#90a1b9] hover:text-white text-[15px] font-medium transition-colors"
      >
        <ArrowLeft size={18} /> Volver a Listas
      </Link>

      <article className="mt-6 rounded-[24px] border border-[#1d293d] bg-[#0f172b] overflow-hidden shadow-[0px_32px_64px_-12px_rgba(0,0,0,0.5)]">
        <header className="relative h-[200px] sm:h-[260px] bg-[#1d293d]">
          <img
            src={list.coverImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070"}
            alt={list.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b] via-[rgba(15,23,43,0.4)] to-transparent" />

          <div className="absolute inset-x-6 bottom-6 sm:inset-x-10 sm:bottom-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {list.categories && list.categories.map((cat, idx) => (
                  <span key={idx} className="bg-[#155dfc]/20 border border-[#155dfc]/30 text-[#51a2ff] px-2.5 py-1 rounded-[6px] text-[11px] font-black uppercase tracking-widest">
                    {cat}
                  </span>
                ))}
              </div>
              <h1 className="text-white text-[32px] sm:text-[42px] lg:text-[48px] leading-none font-black tracking-tight truncate">
                {list.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[14px] sm:text-[15px]">
                <UserProfileLink
                  steamId={list.author?.steamId || list.author?._id}
                  username={list.author?.username || 'Unknown'}
                  avatar={list.author?.avatar}
                  variant="both"
                  avatarClassName="w-8 h-8 rounded-full border border-[#45556c] bg-[#314158] shadow-lg"
                  nameClassName="text-[#cad5e2] hover:text-[#51a2ff] font-bold transition-colors"
                />
                <span className="text-[#314158] font-bold">/</span>
                <span className="text-[#62748e] font-medium">
                  Publicado {formatDistanceToNow(new Date(list.createdAt), { addSuffix: true, locale: es })}
                </span>
              </div>
            </div>

            <div className="h-12 rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-[rgba(2,6,24,0.7)] backdrop-blur-xl px-2 flex items-center gap-2 w-fit shadow-xl shrink-0">
              <button
                onClick={handleLike}
                className={`h-8 px-4 rounded-[10px] flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] transition-all text-[14px] font-black ${list.likes?.includes(user?.id || '') ? 'text-[#00d492] bg-[#00d492]/10' : 'text-[#a3b3cb]'}`}
              >
                <ThumbsUp size={16} /> {list.likes?.length || 0}
              </button>
              <div className="w-px h-5 bg-[#314158]" />
              <button
                onClick={handleDislike}
                className={`h-8 px-4 rounded-[10px] flex items-center gap-2 hover:bg-[rgba(255,255,255,0.1)] transition-all text-[14px] font-black ${list.dislikes?.includes(user?.id || '') ? 'text-[#ff6467] bg-[#ff6467]/10' : 'text-[#a3b3cb]'}`}
              >
                <ThumbsDown size={16} /> {list.dislikes?.length || 0}
              </button>
            </div>
          </div>
        </header>

        <section className="px-6 sm:px-10 py-8 border-b border-[#1d293d] bg-[#0f172b]">
          <p className="text-[#cad5e2] text-[16px] leading-[28px] whitespace-pre-wrap font-medium">
            {list.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-[#1d293d] pt-6">
            {user && user.id !== String(list.author?._id) && (
              <ReportButton
                targetId={list._id}
                targetType="list"
                buttonLabel="Reportar colección"
                buttonClassName="inline-flex items-center gap-2 text-[#62748e] text-[14px] font-bold hover:text-[#ff8a8c] transition-colors"
              />
            )}
            {user && user.id === String(list.author?._id) && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 text-[#ff6467] text-[14px] font-bold hover:text-[#ff8a8c] transition-colors"
              >
                <Trash2 size={18} /> Borrar lista
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("¡Enlace copiado al portapapeles!");
              }}
              className="inline-flex items-center gap-2 text-[#62748e] text-[14px] font-bold hover:text-white transition-colors"
            >
              <Share2 size={18} /> Compartir enlace
            </button>
          </div>
        </section>

        <div className="flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-[#1d293d]">
          <section className="flex-1 bg-[rgba(2,6,24,0.3)] p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-[12px] bg-[#155dfc] flex items-center justify-center text-white shadow-lg shadow-[#155dfc]/20">
                <span className="text-[14px] font-black">{list.games.length}</span>
              </div>
              <h2 className="text-white text-[22px] font-black tracking-tight">
                Juegos en esta colección
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.games.map((game, index) => {
                const steamCdnUrl = game.appId
                  ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`
                  : null;
                const initialImageUrl = game.imageUrl || game.image || steamCdnUrl || `https://placehold.co/200x100/1d293d/94a3b8?text=${encodeURIComponent(game.name || "?")}`;

                return (
                  <Link
                    to={`/game/${game.appId}`}
                    key={game._id}
                    className="rounded-[18px] border border-[#1d293d] bg-[#0b1221]/60 p-4 flex items-center gap-5 hover:border-[#314158] hover:bg-[#1d293d]/20 transition-all group cursor-pointer"
                  >
                    <div className="text-[#314158] text-[24px] font-black w-10 text-center shrink-0 group-hover:text-[#51a2ff] transition-colors italic">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="relative w-[140px] h-[80px] rounded-[12px] overflow-hidden bg-[#1d293d] shrink-0 border border-[#314158]/50 shadow-lg">
                      <img
                        src={initialImageUrl}
                        alt={game.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                      <h3 className="text-white text-[17px] font-black truncate group-hover:text-[#51a2ff] transition-colors tracking-tight">
                        {game.name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="w-full xl:w-[480px] 2xl:w-[540px] bg-[#0b1221] flex flex-col shrink-0 xl:h-[900px]">
            <div className="p-6 border-b border-[#1d293d] bg-[#0f172b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-[#51a2ff]" />
                <h2 className="text-white text-[18px] font-black tracking-tight">
                  Chat de la comunidad
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-[6px] bg-[#1d293d] text-[#90a1b9] text-[12px] font-black">
                {commentsTotal || comments.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#1d293d] scrollbar-track-transparent">
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  id={`comment-${comment._id}`}
                  className="flex gap-4 group transition-all duration-500 rounded-xl p-2 -mx-2"
                >
                  <UserProfileLink
                    steamId={comment.author?.steamId || comment.author?._id}
                    username={comment.author?.username || 'Unknown'}
                    avatar={comment.author?.avatar}
                    variant="avatar"
                    avatarClassName="w-10 h-10 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0 bg-[#1d293d] shadow-lg group-hover:scale-105 transition-transform"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="rounded-[16px] rounded-tl-[4px] bg-[rgba(29,41,61,0.4)] px-4 py-3 border border-[#1d293d] group-hover:bg-[rgba(29,41,61,0.6)] transition-colors">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <UserProfileLink
                          steamId={comment.author?.steamId || comment.author?._id}
                          username={comment.author?.username || 'Unknown'}
                          variant="name"
                          nameClassName="text-white text-[14px] font-black truncate hover:text-[#51a2ff] transition-colors"
                        />
                        <span className="text-[#62748e] text-[11px] font-bold whitespace-nowrap">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="text-[#cad5e2] text-[14px] leading-[20px] break-words whitespace-pre-wrap font-medium">
                        {renderCommentContent(comment.content)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                      <button
                        onClick={() => handleReplyClick(comment)}
                        className="text-[12px] text-[#62748e] hover:text-[#51a2ff] font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Reply size={14} /> Responder
                      </button>
                      {user && user.id !== String(comment.author?._id) && (
                        <ReportButton
                          targetId={comment._id}
                          targetType="comment"
                          buttonLabel="Reportar"
                          buttonClassName="inline-flex items-center gap-1.5 text-[#62748e] text-[12px] font-bold hover:text-[#ff8a8c] transition-colors"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {commentsHasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={loadMoreComments}
                    disabled={commentsLoadingMore}
                    className="px-6 py-2.5 rounded-[12px] bg-[#155dfc]/10 text-[#51a2ff] text-[13px] font-black hover:bg-[#155dfc]/20 transition-all border border-[#155dfc]/20 disabled:opacity-50"
                  >
                    {commentsLoadingMore ? "Cargando mensajes..." : "Cargar mensajes anteriores"}
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#1d293d] bg-[#0f172b] shrink-0">
              {!user ? (
                <div className="text-center py-6 bg-[rgba(2,6,24,0.5)] rounded-[16px] border border-[#1d293d] backdrop-blur-md">
                  <Lock size={24} className="text-[#62748e] mx-auto mb-3" />
                  <p className="text-[#90a1b9] text-[14px] font-bold mb-4">Inicia sesión para participar</p>
                  <button onClick={login} className="h-10 px-6 rounded-[12px] bg-[#155dfc] text-white text-[13px] font-black shadow-lg shadow-[#155dfc]/20 hover:bg-[#2b7fff] transition-all">
                    Conectar Steam
                  </button>
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div className="mb-3 flex items-center justify-between bg-[#51a2ff]/10 border border-[#51a2ff]/20 rounded-[10px] px-4 py-2 animate-in fade-in slide-in-from-bottom-2">
                      <span className="text-[13px] text-[#51a2ff] flex items-center gap-2 font-medium">
                        <Reply size={16} /> Respondiendo a <span className="font-black">@{replyingTo.author.username}</span>
                      </span>
                      <button type="button" onClick={() => setReplyingTo(null)} className="text-[#51a2ff] hover:text-white transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handlePostComment} className="flex gap-4">
                    <img
                      src={user.avatarfull}
                      alt={user.personaname}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0 mt-1 shadow-lg"
                    />
                    <div className="flex-1 flex flex-col gap-3">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un mensaje para la comunidad..."
                        className="w-full rounded-[14px] border border-[#1d293d] bg-[rgba(2,6,24,0.6)] px-4 py-3 text-white text-[14px] font-medium placeholder-[#62748e] focus:outline-none focus:border-[#51a2ff] focus:ring-1 focus:ring-[#51a2ff] transition-all resize-none h-24"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="h-9 px-6 rounded-[12px] bg-[#155dfc] text-white text-[14px] font-black disabled:opacity-50 hover:bg-[#2b7fff] transition-all shadow-lg shadow-[#155dfc]/10"
                        >
                          Enviar mensaje
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </article>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-[#020617]/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="w-full max-w-sm bg-[#0f172b] border border-[#1d293d] rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white flex items-center gap-2 mb-2">
              <AlertTriangle size={24} className="text-[#ff6467]" /> Borrar Lista
            </h3>
            <p className="text-sm text-[#90a1b9] mb-6">
              ¿Estás seguro de que quieres borrar esta lista? Esta acción no se puede deshacer y todos los comentarios se perderán.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[8px] border border-[#1d293d] hover:bg-[rgba(255,255,255,0.05)] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-[8px] bg-[#ff6467] hover:bg-[#ff8a8c] text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Borrando..." : "Sí, borrar lista"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}