import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate, Link } from "react-router";
import api from "../../lib/api";
import {
  Shield,
  AlertTriangle,
  Users,
  Flag,
  Eye,
  Trash2,
  MessageSquareOff,
  Ban,
  FileText,
  CheckCircle2,
  Search,
  Home,
  AlertOctagon,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";

type TabType = "moderation" | "users";
type ModerationActionType = "warned" | "silenced" | "banned";

const ADMIN_PAGE_SIZE = 12;

const initialModerationStats = {
  pending: 0,
  resolved: 0,
  dismissed: 0,
  deleted: 0,
  warned: 0,
  active: 0,
  silenced: 0,
  banned: 0,
};

const normalizeStatus = (status?: string) =>
  (status || "").toLowerCase().trim();

const isModerationActionCurrentlyActive = (item: any) => {
  if (!item?.isActive) return false;
  if (!item?.expiresAt) return true;
  return new Date(item.expiresAt).getTime() > Date.now();
};

const getActiveActionSet = (user: any) => {
  const actionSet = new Set<string>();
  const history = Array.isArray(user?.moderationHistory)
    ? user.moderationHistory
    : [];

  for (const item of history) {
    if (!isModerationActionCurrentlyActive(item)) continue;
    const action = normalizeStatus(item?.action);
    if (action) actionSet.add(action);
  }

  const fallbackStatus = normalizeStatus(user?.status);
  if (actionSet.size === 0) {
    if (fallbackStatus === "warned") actionSet.add("warned");
    if (fallbackStatus === "silenced") actionSet.add("silenced");
    if (fallbackStatus === "banned" || fallbackStatus === "suspended")
      actionSet.add("banned");
  }

  return actionSet;
};

const isActionActiveForUser = (user: any, action: ModerationActionType) => {
  const actions = getActiveActionSet(user);
  if (action === "banned")
    return actions.has("banned") || actions.has("suspended");
  return actions.has(action);
};

function PaginationControls({
  pagination,
  onPageChange,
  itemLabel,
}: {
  pagination: { page: number; pages: number; total: number; limit: number };
  onPageChange: (page: number) => void;
  itemLabel: string;
}) {
  if (!pagination.pages || pagination.pages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-slate-800">
      <p className="text-xs text-slate-500">
        Página{" "}
        <span className="text-slate-200 font-medium">{pagination.page}</span> de{" "}
        <span className="text-slate-200 font-medium">{pagination.pages}</span> ·{" "}
        {pagination.total.toLocaleString()} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <ChevronLeft size={16} />
          Anterior
        </button>
        <button
          onClick={() =>
            onPageChange(Math.min(pagination.pages, pagination.page + 1))
          }
          disabled={pagination.page >= pagination.pages}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Siguiente
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("moderation");
  const [stats, setStats] = useState(initialModerationStats);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadOverview = async () => {
    try {
      setLoadingStats(true);
      setLoadError("");
      const response = await api.get("/api/moderation/stats");
      setStats({ ...initialModerationStats, ...(response.data || {}) });
    } catch (error) {
      console.error("Error cargando estadísticas de moderación:", error);
      setLoadError("No se pudieron cargar las estadísticas de moderación.");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user?.isAdmin && user?.role !== "admin") return;
    loadOverview();
  }, [authLoading, user?.isAdmin, user?.role]);

  const tabs = [
    {
      id: "moderation" as TabType,
      name: "Moderación",
      icon: Shield,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      id: "users" as TabType,
      name: "Usuarios",
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-8">
        <div className="text-center py-12">
          <p className="text-slate-400">Comprobando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-8">
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <Shield size={24} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Panel de Administración
              </h1>
              <p className="text-sm text-slate-500">
                Gestión y monitoreo de SteaMates
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <ExportButtons />
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700 w-full sm:w-auto hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Home size={16} />
              <span className="text-sm">Volver al inicio</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                  activeTab === tab.id
                    ? `${tab.bg} border-${tab.color.replace("text-", "")}/30 ${tab.color}`
                    : "bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
                } cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-sm text-red-300">{loadError}</p>
          <button
            onClick={loadOverview}
            className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {loadingStats && !loadError && (
        <div className="text-center py-4">
          <p className="text-slate-400 text-sm">Cargando estadísticas...</p>
        </div>
      )}

      {activeTab === "moderation" && (
        <ModerationPanel stats={stats} onReload={loadOverview} />
      )}
      {activeTab === "users" && (
        <UsersPanel stats={stats} onReload={loadOverview} />
      )}
    </div>
  );
}

function ExportButtons() {
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (
    type: "users" | "reports" | "actions",
    format: "csv" | "xlsx",
  ) => {
    try {
      const res = await api.get("/api/moderation/export", {
        params: { type, format },
        responseType: "blob",
      });
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const filename = `${type}-export.${ext}`;
      const blob = new Blob([res.data], {
        type:
          res.headers["content-type"] ||
          (format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv"),
      });
      downloadBlob(blob, filename);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exportando datos");
    }
  };

  const exportGroups: Array<{
    type: "users" | "reports" | "actions";
    label: string;
  }> = [
    { type: "users", label: "Usuarios" },
    { type: "reports", label: "Reportes" },
    { type: "actions", label: "Sanciones" },
  ];

  return (
    <div className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-2">
      {exportGroups.map((group) => (
        <div
          key={group.type}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/70 px-2 py-1"
        >
          <div className="hidden lg:inline-flex items-center gap-1 text-[12px] font-medium text-slate-300 pr-1">
            <Download size={13} className="text-slate-400" />
            {group.label}
          </div>
          <button
            onClick={() => handleExport(group.type, "csv")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/60 px-2.5 py-1.5 text-[12px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title={`Exportar ${group.label} en CSV`}
          >
            <FileText size={13} className="text-sky-300" />
            CSV
          </button>
          <button
            onClick={() => handleExport(group.type, "xlsx")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/60 px-2.5 py-1.5 text-[12px] font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title={`Exportar ${group.label} en Excel`}
          >
            <FileSpreadsheet size={13} className="text-emerald-300" />
            XLSX
          </button>
        </div>
      ))}
      <div className="sm:hidden w-full" />
    </div>
  );
}

function ModerationPanel({
  stats,
  onReload,
}: {
  stats: any;
  onReload: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "list" | "comment" | "user"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: ADMIN_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const getTargetTypeLabel = (type: string) => {
    if (type === "GameList") return "Lista";
    if (type === "Comment") return "Comentario";
    if (type === "User") return "Usuario";
    return "Contenido";
  };

  const getTargetTypeBg = (type: string) => {
    if (type === "GameList") return "bg-blue-500/10 text-blue-400";
    if (type === "Comment") return "bg-purple-500/10 text-purple-400";
    if (type === "User") return "bg-amber-500/10 text-amber-400";
    return "bg-slate-500/10 text-slate-400";
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.get("/api/moderation/reports", {
        params: {
          page,
          limit: ADMIN_PAGE_SIZE,
          status: filter === "all" ? undefined : filter,
          type: typeFilter === "all" ? undefined : typeFilter,
          search: searchTerm.trim() || undefined,
        },
      });

      setReports(response.data?.reports || []);
      setPagination(
        response.data?.pagination || {
          page,
          pages: 0,
          total: 0,
          limit: ADMIN_PAGE_SIZE,
        },
      );
    } catch (error) {
      console.error("Error cargando reportes:", error);
      setReports([]);
      setPagination({ page, pages: 0, total: 0, limit: ADMIN_PAGE_SIZE });
      setLoadError("No se pudieron cargar los reportes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [page, filter, typeFilter, searchTerm]);

  const handleResolveReport = async (reportId: string) => {
    try {
      setSubmitting(true);
      await api.put(`/api/moderation/reports/${reportId}`, {
        status: "resolved",
      });
      await Promise.all([onReload(), loadReports()]);
    } catch (error) {
      console.error("Error resolviendo reporte:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContent = async (report: any) => {
    if (report.targetType === "User") {
      alert(
        'Los usuarios no se pueden eliminar desde aquí. Ve a la pestaña "Usuarios" para banear o silenciar.',
      );
      return;
    }

    const targetLabel =
      report.targetType === "GameList"
        ? "esta lista"
        : `este ${getTargetTypeLabel(report.targetType).toLowerCase()}`;
    if (
      !window.confirm(
        `¿Estás seguro de que quieres eliminar ${targetLabel}? Esta acción no se puede deshacer y marcará los reportes como resueltos.`,
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      const typeStr = report.targetType === "GameList" ? "list" : "comment";
      const targetId = report.targetId?._id || report.targetId;
      await api.delete(`/api/moderation/content/${typeStr}/${targetId}`);
      if (showReportModal) setShowReportModal(false);
      await Promise.all([onReload(), loadReports()]);
    } catch (error) {
      console.error("Error eliminando contenido:", error);
      alert("Error eliminando contenido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Reportes Pendientes",
            value: stats.pending,
            icon: Flag,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            label: "Resueltos",
            value: stats.resolved,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Contenido Eliminado",
            value: stats.deleted,
            icon: Trash2,
            color: "text-red-400",
            bg: "bg-red-500/10",
          },
          {
            label: "Usuarios Advertidos",
            value: stats.warned,
            icon: AlertCircle,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border border-slate-800 rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Buscar reportes..."
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 whitespace-nowrap">
              Estado:
            </span>
            <select
              value={filter}
              onChange={(e) => {
                setPage(1);
                setFilter(e.target.value as typeof filter);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="resolved">Resueltos</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 whitespace-nowrap">
              Tipo:
            </span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setPage(1);
                setTypeFilter(e.target.value as typeof typeFilter);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="list">Listas</option>
              <option value="comment">Comentarios</option>
              <option value="user">Usuarios</option>
            </select>
          </div>
        </div>

        <div className="mb-3 text-sm text-slate-500">
          {loading ? (
            <span>Cargando reportes...</span>
          ) : (
            <>
              Mostrando{" "}
              <span className="text-white font-medium">{reports.length}</span>{" "}
              de{" "}
              <span className="text-white font-medium">{pagination.total}</span>{" "}
              reporte{pagination.total !== 1 ? "s" : ""}
            </>
          )}
        </div>

        {loadError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-sm text-red-300">{loadError}</p>
            <button
              onClick={loadReports}
              className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="space-y-2">
          {!loading && reports.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-500">
                No se encontraron reportes con los filtros aplicados
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${getTargetTypeBg(report.targetType)}`}
                      >
                        {getTargetTypeLabel(report.targetType)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${report.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}
                      >
                        {report.status === "pending" ? "Pendiente" : "Resuelto"}
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      {report.type}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tipo:{" "}
                      <span className="text-slate-300 font-medium">
                        {report.type}
                      </span>{" "}
                      • Motivo: {report.reason}
                    </p>
                    {report.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 break-words">
                        Descripción: {report.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowReportModal(true);
                      }}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleResolveReport(report._id)}
                      disabled={submitting || report.status === "resolved"}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                      title="Resolver"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    {report.targetType !== "User" && (
                      <button
                        onClick={() => handleDeleteContent(report)}
                        disabled={submitting || report.status === "resolved"}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar Contenido"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <PaginationControls
          pagination={pagination}
          onPageChange={setPage}
          itemLabel="reportes"
        />
      </div>

      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Flag className="text-amber-400" />
                Detalles del Reporte
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div className="flex gap-2 mb-3">
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${getTargetTypeBg(selectedReport.targetType)}`}
                  >
                    {getTargetTypeLabel(selectedReport.targetType)}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${selectedReport.status === "pending" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}
                  >
                    {selectedReport.status === "pending"
                      ? "Pendiente"
                      : "Resuelto"}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-1">
                  Motivo:{" "}
                  <span className="text-white font-medium">
                    {selectedReport.reason}
                  </span>
                </p>
                <p className="text-sm text-slate-400 mb-1">
                  Reportado por:{" "}
                  <span className="text-white font-medium">
                    {selectedReport.reportedBy?.username || "Desconocido"}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  Fecha:{" "}
                  <span className="text-white">
                    {new Date(selectedReport.createdAt).toLocaleString()}
                  </span>
                </p>
                {selectedReport.description && (
                  <div className="mt-3 bg-slate-800 rounded-lg p-3 border border-slate-700">
                    <p className="text-sm text-slate-300 italic whitespace-pre-wrap break-words">
                      "{selectedReport.description}"
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-sm font-bold text-white mb-3">
                  Contenido Reportado
                </h4>
                {!selectedReport.targetId ? (
                  <p className="text-sm text-slate-500 italic">
                    El contenido ya no existe (probablemente fue eliminado).
                  </p>
                ) : (
                  <div className="space-y-2 text-sm text-slate-300">
                    {selectedReport.targetType === "GameList" && (
                      <>
                        <p className="break-words">
                          <strong className="text-slate-400">Título:</strong>{" "}
                          {selectedReport.targetId.title}
                        </p>
                        <p className="break-words whitespace-pre-wrap">
                          <strong className="text-slate-400">
                            Descripción:
                          </strong>{" "}
                          {selectedReport.targetId.description}
                        </p>
                      </>
                    )}
                    {selectedReport.targetType === "Comment" && (
                      <p className="break-words whitespace-pre-wrap">
                        <strong className="text-slate-400">Comentario:</strong>{" "}
                        {selectedReport.targetId.content}
                      </p>
                    )}
                    {selectedReport.targetType === "User" && (
                      <p className="break-words">
                        <strong className="text-slate-400">Usuario:</strong>{" "}
                        {selectedReport.targetId.username}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  handleResolveReport(selectedReport._id);
                  setShowReportModal(false);
                }}
                disabled={submitting || selectedReport.status === "resolved"}
                className="flex-1 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                <CheckCircle2 size={18} />
                Marcar Resuelto
              </button>
              {selectedReport.targetType !== "User" && (
                <button
                  onClick={() => handleDeleteContent(selectedReport)}
                  disabled={submitting || !selectedReport.targetId}
                  className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  <Trash2 size={18} />
                  Eliminar Contenido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersPanel({
  stats,
  onReload,
}: {
  stats: any;
  onReload: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "warned" | "silenced" | "banned"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 0,
    total: 0,
    limit: ADMIN_PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyActions, setHistoryActions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [actionType, setActionType] = useState<ModerationActionType>("warned");
  const [actionMode, setActionMode] = useState<"apply" | "undo">("apply");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.get("/api/moderation/users", {
        params: {
          page,
          limit: ADMIN_PAGE_SIZE,
          status: statusFilter === "all" ? undefined : statusFilter,
          search: searchTerm.trim() || undefined,
        },
      });

      setUsers(response.data?.users || []);
      setPagination(
        response.data?.pagination || {
          page,
          pages: 0,
          total: 0,
          limit: ADMIN_PAGE_SIZE,
        },
      );
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setUsers([]);
      setPagination({ page, pages: 0, total: 0, limit: ADMIN_PAGE_SIZE });
      setLoadError("No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, searchTerm]);

  const handleOpenActionModal = (
    user: any,
    action: ModerationActionType,
    mode: "apply" | "undo" = "apply",
  ) => {
    setSelectedUser(user);
    setActionType(action);
    setActionMode(mode);
    setReason("");
    setDuration("");
    setActionError("");
    setShowActionModal(true);
  };

  const getActionTitle = (user: any, action: ModerationActionType) => {
    if (action === "warned")
      return isActionActiveForUser(user, "warned")
        ? "Quitar advertencia"
        : "Advertir";
    if (action === "silenced")
      return isActionActiveForUser(user, "silenced")
        ? "Quitar silencio"
        : "Silenciar";
    return isActionActiveForUser(user, "banned") ? "Desbanear" : "Banear";
  };

  const handleToggleAction = async (
    user: any,
    action: ModerationActionType,
  ) => {
    try {
      setSubmitting(true);
      if (isActionActiveForUser(user, action)) {
        handleOpenActionModal(user, action, "undo");
        return;
      }
      handleOpenActionModal(user, action, "apply");
    } catch (error) {
      console.error("Error alternando acción de moderación:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryModal = async (user: any) => {
    try {
      setShowHistoryModal(true);
      setHistoryUser(user);
      setHistoryLoading(true);
      setHistoryError("");

      const response = await api.get(`/api/moderation/user/${user._id}`);
      const actions = response.data?.actions || [];
      const sortedActions = [...actions].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setHistoryActions(sortedActions);
    } catch (error) {
      console.error("Error obteniendo historial de moderación:", error);
      setHistoryActions([]);
      setHistoryError("No se pudo cargar el historial de moderación.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const getActionLabel = (action: string) => {
    if (action === "warned") return "Advertencia";
    if (action === "silenced") return "Silencio";
    if (action === "banned" || action === "suspended") return "Baneo";
    return action;
  };

  const getActionBadge = (action: string) => {
    if (action === "warned")
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    if (action === "silenced")
      return "bg-orange-500/10 text-orange-300 border-orange-500/30";
    if (action === "banned" || action === "suspended")
      return "bg-red-500/10 text-red-300 border-red-500/30";
    return "bg-slate-500/10 text-slate-300 border-slate-500/30";
  };

  const getHistoryStateLabel = (item: any) => {
    if (item?.isActive) return "Activa";
    if (item?.revokeReason === "expired") return "Expirada";
    return "Revertida";
  };

  const getHistoryStateBadge = (item: any) => {
    if (item?.isActive) return "bg-emerald-500/10 text-emerald-300";
    if (item?.revokeReason === "expired") return "bg-sky-500/10 text-sky-300";
    return "bg-slate-600/20 text-slate-300";
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportUserHistory = async (user: any, format: "csv" | "xlsx") => {
    try {
      const response = await api.get(
        `/api/moderation/user/${user._id}/export`,
        {
          params: { format },
          responseType: "blob",
        },
      );

      const extension = format === "xlsx" ? "xlsx" : "csv";
      const safeUsername = String(user?.username || user?.steamId || user?._id)
        .trim()
        .replace(/[^a-z0-9-_]+/gi, "_");
      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] ||
          (format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv"),
      });

      downloadBlob(blob, `historial-${safeUsername}.${extension}`);
    } catch (error) {
      console.error("Error exportando historial de usuario:", error);
      alert("Error exportando historial de usuario");
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedUser) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    if (trimmedReason.length < 3) {
      setActionError("El motivo debe tener al menos 3 caracteres.");
      return;
    }
    if (trimmedReason.length > 240) {
      setActionError("El motivo no puede superar 240 caracteres.");
      return;
    }

    try {
      setActionError("");
      setSubmitting(true);
      const payload: any = {
        userId: selectedUser._id,
        action: actionType,
        reason: trimmedReason,
      };

      const needsDuration =
        actionMode === "apply" &&
        (actionType === "silenced" || actionType === "banned");
      if (duration && needsDuration) {
        const parsedDuration = Number(duration);
        if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
          setActionError("La duración debe ser un número entero mayor que 0.");
          return;
        }
        payload.duration = parsedDuration;
      }

      await api.post("/api/moderation/actions", payload);
      setShowActionModal(false);
      await Promise.all([onReload(), loadUsers()]);
    } catch (error) {
      console.error("Error aplicando acción de moderación:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Usuarios Activos",
            value: stats.active,
            icon: Users,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Advertidos",
            value: stats.warned,
            icon: AlertTriangle,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
          },
          {
            label: "Silenciados",
            value: stats.silenced,
            icon: MessageSquareOff,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
          {
            label: "Baneados",
            value: stats.banned,
            icon: Ban,
            color: "text-red-400",
            bg: "bg-red-500/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border border-slate-800 rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400 whitespace-nowrap">
              Estado:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as typeof statusFilter);
              }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="warned">Advertidos</option>
              <option value="silenced">Silenciados</option>
              <option value="banned">Baneados</option>
            </select>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-sm text-red-300">{loadError}</p>
            <button
              onClick={loadUsers}
              className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-500">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-500">
                No se encontraron usuarios con los filtros aplicados
              </p>
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">
                        {user.username}
                      </h4>
                      {isActionActiveForUser(user, "warned") && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-amber-500/10 text-amber-400">
                          Advertido
                        </span>
                      )}
                      {isActionActiveForUser(user, "silenced") && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-orange-500/10 text-orange-400">
                          Silenciado
                        </span>
                      )}
                      {isActionActiveForUser(user, "banned") && (
                        <span className="text-xs px-2 py-1 rounded font-medium bg-red-500/10 text-red-400">
                          Baneado
                        </span>
                      )}
                      {!isActionActiveForUser(user, "warned") &&
                        !isActionActiveForUser(user, "silenced") &&
                        !isActionActiveForUser(user, "banned") && (
                          <span className="text-xs px-2 py-1 rounded font-medium bg-emerald-500/10 text-emerald-400">
                            Activo
                          </span>
                        )}
                      {user.moderationHistory &&
                        user.moderationHistory.length > 0 && (
                          <span className="text-xs px-2 py-1 rounded font-medium bg-red-500/10 text-red-400">
                            {user.moderationHistory.length} acción
                            {user.moderationHistory.length !== 1 ? "es" : ""}
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">
                      SteamID: {user.steamId} • Miembro desde{" "}
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleOpenHistoryModal(user)}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Ver historial"
                    >
                      <FileText size={16} />
                    </button>
                    <button
                      onClick={() => handleExportUserHistory(user, "csv")}
                      className="p-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Descargar historial en CSV"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleExportUserHistory(user, "xlsx")}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Descargar historial en Excel"
                    >
                      <FileSpreadsheet size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAction(user, "warned")}
                      disabled={isActionActiveForUser(user, "banned")}
                      className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100 ${isActionActiveForUser(user, "warned") ? "bg-yellow-500/25 border-yellow-400/40 text-yellow-300" : "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 text-yellow-400"}`}
                      title={getActionTitle(user, "warned")}
                    >
                      <AlertOctagon size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAction(user, "silenced")}
                      disabled={isActionActiveForUser(user, "banned")}
                      className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100 ${isActionActiveForUser(user, "silenced") ? "bg-amber-500/25 border-amber-400/40 text-amber-300" : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400"}`}
                      title={getActionTitle(user, "silenced")}
                    >
                      <MessageSquareOff size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleAction(user, "banned")}
                      title={getActionTitle(user, "banned")}
                      className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer ${isActionActiveForUser(user, "banned") ? "bg-red-500/25 border-red-400/40 text-red-300" : "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"}`}
                    >
                      <Ban size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <PaginationControls
          pagination={pagination}
          onPageChange={setPage}
          itemLabel="usuarios"
        />
      </div>

      {showActionModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-white mb-4">
              {actionMode === "undo" &&
                actionType === "warned" &&
                "Quitar advertencia"}
              {actionMode === "undo" &&
                actionType === "silenced" &&
                "Quitar silencio"}
              {actionMode === "undo" &&
                actionType === "banned" &&
                "Desbanear usuario"}
              {actionMode === "apply" &&
                actionType === "warned" &&
                "Advertir usuario"}
              {actionMode === "apply" &&
                actionType === "silenced" &&
                "Silenciar usuario"}
              {actionMode === "apply" &&
                actionType === "banned" &&
                "Banear usuario"}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-slate-400 block mb-2">
                  Usuario: {selectedUser.username}
                </label>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-sm text-slate-400 block">
                    Motivo *
                  </label>
                  <span className="text-xs text-slate-500">
                    {reason.length}/500
                  </span>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explica la razón de esta acción..."
                  maxLength={500}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>

              {actionMode === "apply" &&
                (actionType === "silenced" || actionType === "banned") && (
                  <div>
                    <label className="text-sm text-slate-400 block mb-2">
                      Duración en días{" "}
                      {actionType === "banned"
                        ? "(dejar vacío para permanente)"
                        : ""}
                    </label>
                    <input
                      type="number"
                      value={duration}
                      min={1}
                      step={1}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue === "") {
                          setDuration("");
                          setActionError("");
                          return;
                        }

                        const parsed = Number(nextValue);
                        if (Number.isInteger(parsed) && parsed > 0) {
                          setDuration(nextValue);
                          setActionError("");
                        }
                      }}
                      placeholder="Ej: 7, 30, etc"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

              {actionError && (
                <p className="text-xs text-red-400">{actionError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowActionModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={submitting || !reason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting
                  ? "Procesando..."
                  : actionMode === "undo" && actionType === "warned"
                    ? "Quitar advertencia"
                    : actionMode === "undo" && actionType === "silenced"
                      ? "Quitar silencio"
                      : actionMode === "undo" && actionType === "banned"
                        ? "Desbanear"
                        : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && historyUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Historial de moderación
                </h3>
                <p className="text-sm text-slate-400">
                  Usuario: {historyUser.username}
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-95 cursor-pointer"
                aria-label="Cerrar historial"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-3">
              {historyLoading && (
                <p className="text-sm text-slate-400">Cargando historial...</p>
              )}
              {!historyLoading && historyError && (
                <p className="text-sm text-red-400">{historyError}</p>
              )}
              {!historyLoading &&
                !historyError &&
                historyActions.length === 0 && (
                  <p className="text-sm text-slate-400">
                    Este usuario no tiene acciones de moderación registradas.
                  </p>
                )}
              {!historyLoading &&
                !historyError &&
                historyActions.map((item) => (
                  <div
                    key={item._id}
                    className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-1 rounded border ${getActionBadge(item.action)}`}
                      >
                        {getActionLabel(item.action)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getHistoryStateBadge(item)}`}
                      >
                        {getHistoryStateLabel(item)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-slate-200 mb-1">
                      Motivo:{" "}
                      <span className="text-slate-300 break-words whitespace-pre-wrap">
                        {item.reason || "Sin motivo"}
                      </span>
                    </div>
                    {item.duration ? (
                      <p className="text-xs text-slate-400 mb-1">
                        Duración: {item.duration} día
                        {item.duration !== 1 ? "s" : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mb-1">
                        Duración: permanente
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Aplicada por: {item.appliedBy?.username || "-"}
                      {item.revokedBy?.username
                        ? ` • Revertida por: ${item.revokedBy.username}`
                        : ""}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
