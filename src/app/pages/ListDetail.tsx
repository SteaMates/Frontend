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
} from "lucide-react";
import { Link, Navigate, useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
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
  parentId?: string; // Por si lo añades al backend en el futuro
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

const MAX_COMMENT_LENGTH = 1000;

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

  // Estado para las respuestas/hilos
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de que quieres borrar esta lista?"))
      return;
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
          api.get(`/api/lists/${id}/comments`, {
            params: { page: 1, limit: 20 },
          }),
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
            : false,
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
      setList((prev) =>
        prev
          ? { ...prev, likes: res.data.likes, dislikes: res.data.dislikes }
          : prev,
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDislike = async () => {
    if (!user) return login();
    try {
      const res = await api.post(`/api/lists/${id}/dislike`);
      setList((prev) =>
        prev
          ? { ...prev, likes: res.data.likes, dislikes: res.data.dislikes }
          : prev,
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyClick = (comment: CommentData) => {
    setReplyingTo(comment);
    // Auto-completamos con el @usuario para crear un hilo visual
    if (!newComment.includes(`@${comment.author.username}`)) {
      setNewComment(`@${comment.author.username} ` + newComment);
    }
    setTimeout(() => {
      commentInputRef.current?.focus();
      // Movemos el cursor al final del texto
      const length = commentInputRef.current?.value.length || 0;
      commentInputRef.current?.setSelectionRange(length, length);
    }, 10);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return login();
    const trimmedComment = newComment.trim();
    if (!trimmedComment) return;
    if (trimmedComment.length > MAX_COMMENT_LENGTH) {
      alert(`El comentario no puede superar ${MAX_COMMENT_LENGTH} caracteres.`);
      return;
    }

    try {
      const payload: any = { content: trimmedComment };
      // Si en el backend en el futuro añades parentId al modelo, esto funcionará automáticamente
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
      const errorMessage =
        error?.response?.data?.error || error?.message || "Unknown error";
      alert(`Error al comentar: ${errorMessage}`);
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
          : false,
      );
    } catch (err) {
      console.error("Error loading more comments:", err);
    } finally {
      setCommentsLoadingMore(false);
    }
  };

  // Helper visual para resaltar menciones como @Usuario
  const renderCommentContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span
          key={i}
          className="text-[#51a2ff] font-bold bg-[rgba(43,127,255,0.1)] px-1 rounded-[4px]"
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  if (loading) {
    return <div className="text-white text-center py-20">Cargando...</div>;
  }

  if (error || !list) {
    return <Navigate to="/lists" replace />;
  }

  return (
    <div className="pb-20 max-w-[1400px] mx-auto px-4">
      <Link
        to="/lists"
        className="inline-flex items-center gap-2 text-[#90a1b9] hover:text-white text-[15px] font-medium"
      >
        <ArrowLeft size={18} /> Volver a Listas
      </Link>

      <article className="mt-6 rounded-[16px] border border-[#1d293d] bg-[#0f172b] overflow-hidden shadow-2xl">
        {/* CABECERA (Reducida y compacta) */}
        <header className="relative h-[140px] sm:h-[180px] bg-[#1d293d]">
          <img
            src={
              list.coverImage ||
              "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070"
            }
            alt={list.title}
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b] via-[rgba(15,23,43,0.5)] to-transparent" />

          <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {list.categories &&
                  list.categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="bg-[rgba(43,127,255,0.2)] border border-[rgba(43,127,255,0.3)] text-[#51a2ff] px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider"
                    >
                      {cat}
                    </span>
                  ))}
              </div>
              <h1 className="text-white text-[24px] sm:text-[32px] leading-tight font-bold">
                {list.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] sm:text-[14px]">
                <UserProfileLink
                  steamId={list.author?.steamId || list.author?._id}
                  username={list.author?.username || "Unknown"}
                  avatar={list.author?.avatar}
                  variant="both"
                  avatarClassName="w-6 h-6 rounded-full border border-[#45556c] bg-[#314158]"
                  nameClassName="text-[#cad5e2] hover:text-white font-medium"
                />
                <span className="text-[#62748e]">•</span>
                <span className="text-[#62748e]">
                  {formatDistanceToNow(new Date(list.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </div>

            {/* Votos (Compactos) */}
            <div className="h-10 rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-[rgba(2,6,24,0.6)] backdrop-blur-md px-1.5 flex items-center gap-1 w-fit">
              <button
                onClick={handleLike}
                className={`h-7 px-3 rounded-[6px] flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[13px] font-bold ${list.likes?.includes(user?.id || "") ? "text-[#00d492]" : "text-[#a3b3cb]"}`}
              >
                <ThumbsUp size={14} /> {list.likes?.length || 0}
              </button>
              <div className="w-px h-4 bg-[#314158]" />
              <button
                onClick={handleDislike}
                className={`h-7 px-3 rounded-[6px] flex items-center gap-1.5 hover:bg-[rgba(255,255,255,0.1)] transition-colors text-[13px] font-bold ${list.dislikes?.includes(user?.id || "") ? "text-[#ff6467]" : "text-[#a3b3cb]"}`}
              >
                <ThumbsDown size={14} /> {list.dislikes?.length || 0}
              </button>
            </div>
          </div>
        </header>

        {/* DESCRIPCIÓN Y ACCIONES (Bajo la cabecera) */}
        <section className="px-4 sm:px-8 py-5 border-b border-[#1d293d] bg-[#0f172b]">
          <p className="text-[#cad5e2] text-[15px] leading-[26px] whitespace-pre-wrap max-w-4xl">
            {list.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[#1d293d] pt-4">
            {user && user.id !== String(list.author?._id) && (
              <ReportButton
                targetId={list._id}
                targetType="list"
                buttonLabel="Reportar lista"
                buttonClassName="inline-flex items-center gap-1.5 text-[#62748e] text-[13px] font-medium hover:text-[#ff8a8c] transition-colors"
              />
            )}
            {user && user.id === String(list.author?._id) && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-[#ff6467] text-[13px] font-medium hover:text-[#ff8a8c] transition-colors"
              >
                <Trash2 size={16} /> Borrar lista
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("¡Enlace copiado al portapapeles!");
              }}
              className="inline-flex items-center gap-1.5 text-[#62748e] text-[13px] font-medium hover:text-white transition-colors"
            >
              <Share2 size={16} /> Compartir
            </button>
          </div>
        </section>

        {/* LAYOUT DIVIDIDO (IZQ: Juegos | DER: Chat/Comentarios) */}
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#1d293d]">
          {/* COLUMNA IZQUIERDA: JUEGOS */}
          <section className="flex-1 bg-[rgba(2,6,24,0.3)] p-4 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-7 h-7 rounded-[8px] bg-[#155dfc] inline-flex items-center justify-center text-white text-[12px] font-bold">
                {list.games.length}
              </span>
              <h2 className="text-white text-[18px] font-bold">
                Juegos en esta colección
              </h2>
            </div>

            <div className="space-y-3">
              {list.games.map((game, index) => {
                const steamCdnUrl = game.appId
                  ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.appId}/header.jpg`
                  : null;
                const initialImageUrl =
                  game.imageUrl ||
                  game.image ||
                  steamCdnUrl ||
                  `https://placehold.co/200x100/1d293d/94a3b8?text=${encodeURIComponent(game.name || "?")}`;

                return (
                  <Link
                    to={`/game/${game.appId}`}
                    key={game._id}
                    className="rounded-[12px] border border-[#1d293d] bg-[#0f172b] p-3 flex items-center gap-4 hover:border-[#314158] transition-colors group cursor-pointer"
                  >
                    <div className="text-[#314158] text-[20px] font-bold w-8 text-center shrink-0 group-hover:text-[#51a2ff] transition-colors">
                      #{index + 1}
                    </div>
                    <div className="relative w-[120px] sm:w-[160px] h-[75px] rounded-[8px] overflow-hidden bg-[#1d293d] shrink-0">
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
                      <h3 className="text-white text-[16px] font-bold truncate group-hover:text-[#51a2ff] transition-colors">
                        {game.name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* COLUMNA DERECHA: CHAT / COMENTARIOS */}
          <section className="w-full lg:w-[420px] xl:w-[480px] bg-[#0b1221] flex flex-col shrink-0 lg:h-[800px]">
            {/* Header del Chat */}
            <div className="p-4 border-b border-[#1d293d] bg-[#0f172b] flex items-center gap-2 shrink-0">
              <MessageSquare size={18} className="text-[#51a2ff]" />
              <h2 className="text-white text-[16px] font-bold">
                Chat de la lista ({commentsTotal || comments.length})
              </h2>
            </div>

            {/* Feed de Comentarios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-[#1d293d] scrollbar-track-transparent">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 group">
                  <UserProfileLink
                    steamId={comment.author?.steamId || comment.author?._id}
                    username={comment.author?.username || "Unknown"}
                    avatar={comment.author?.avatar}
                    variant="avatar"
                    avatarClassName="w-8 h-8 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0 bg-[#1d293d]"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="rounded-[12px] rounded-tl-[4px] bg-[rgba(29,41,61,0.5)] px-3 py-2 border border-[#1d293d]">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <UserProfileLink
                          steamId={
                            comment.author?.steamId || comment.author?._id
                          }
                          username={comment.author?.username || "Unknown"}
                          variant="name"
                          nameClassName="text-white text-[13px] font-bold truncate"
                        />
                        <span className="text-[#62748e] text-[10px] whitespace-nowrap">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </span>
                      </div>
                      <p className="text-[#cad5e2] text-[13px] leading-[18px] break-words whitespace-pre-wrap">
                        {renderCommentContent(comment.content)}
                      </p>
                    </div>

                    {/* Botones bajo el comentario (Responder / Reportar) */}
                    <div className="flex items-center gap-3 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleReplyClick(comment)}
                        className="text-[11px] text-[#62748e] hover:text-[#51a2ff] font-medium flex items-center gap-1"
                      >
                        <Reply size={12} /> Responder
                      </button>
                      {user && user.id !== String(comment.author?._id) && (
                        <ReportButton
                          targetId={comment._id}
                          targetType="comment"
                          buttonLabel="Reportar"
                          buttonClassName="inline-flex items-center gap-1 text-[#62748e] text-[11px] font-medium hover:text-[#ff8a8c]"
                        />
                      )}
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
                    className="px-4 py-2 rounded-[8px] bg-[rgba(43,127,255,0.1)] text-[#51a2ff] text-[12px] font-bold hover:bg-[rgba(43,127,255,0.2)] transition-colors disabled:opacity-50"
                  >
                    {commentsLoadingMore
                      ? "Cargando..."
                      : "Cargar mensajes anteriores"}
                  </button>
                </div>
              )}
            </div>

            {/* Input de Comentarios (Fijo abajo) */}
            <div className="p-4 border-t border-[#1d293d] bg-[#0f172b] shrink-0">
              {!user ? (
                <div className="text-center py-4 bg-[rgba(2,6,24,0.5)] rounded-[10px] border border-[#1d293d]">
                  <Lock size={20} className="text-[#62748e] mx-auto mb-2" />
                  <p className="text-[#90a1b9] text-[13px] mb-3">
                    Inicia sesión para chatear
                  </p>
                  <button
                    onClick={login}
                    className="h-8 px-4 rounded-[8px] bg-[#155dfc] text-white text-[12px] font-bold"
                  >
                    Conectar Steam
                  </button>
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between bg-[rgba(43,127,255,0.1)] border border-[rgba(43,127,255,0.2)] rounded-[6px] px-3 py-1.5">
                      <span className="text-[12px] text-[#51a2ff] flex items-center gap-1.5">
                        <Reply size={14} /> Respondiendo a{" "}
                        <span className="font-bold">
                          @{replyingTo.author.username}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="text-[#51a2ff] hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <form onSubmit={handlePostComment} className="flex gap-3">
                    <img
                      src={user.avatarfull}
                      alt={user.personaname}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#1d293d] shrink-0 mt-0.5"
                    />
                    <div className="flex-1 flex flex-col gap-2">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="w-full rounded-[10px] border border-[#1d293d] bg-[rgba(2,6,24,0.5)] px-3 py-2 text-white text-[13px] placeholder-[#62748e] focus:outline-none focus:border-[#51a2ff] resize-none h-16"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!newComment.trim()}
                          className="h-8 px-5 rounded-[8px] bg-[#155dfc] text-white text-[13px] font-bold disabled:opacity-50 hover:bg-[#2b7fff] transition-colors"
                        >
                          Enviar
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
    </div>
  );
}
