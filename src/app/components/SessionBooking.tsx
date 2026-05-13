import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  Check,
  Bell,
  Gamepad2,
  ArrowLeft,
  PartyPopper,
  Loader2,
  RotateCcw,
  User,
  Trash2,
  Ban,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { createGamingSession } from "../../lib/api";

export interface SessionFriend {
  steamId: string;
  username: string;
  avatar: string;
  status: number;
  participantStatus?: "invited" | "accepted" | "declined";
}

export interface SessionGame {
  appid: number;
  name: string;
  headerImage?: string;
}

export interface ScheduledSession {
  id: string;
  game: SessionGame;
  date: string;
  time: string;
  friends: SessionFriend[];
  confirmed: boolean;
  myParticipantStatus?: "invited" | "accepted" | "declined";
  isHost?: boolean;
  host?: {
    username: string;
    avatar: string;
  };
}

interface Props {
  game: SessionGame;
  selectedFriends: SessionFriend[];
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  existingSessions: ScheduledSession[];
}

const HOURS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "00:00",
];

const DAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function buildScheduledAt(dateStr: string, timeStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return localDate.toISOString();
}

export function SessionBooking({
  game,
  selectedFriends,
  onClose,
  onConfirm,
  existingSessions,
}: Props) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<"date" | "time" | "confirm">("date");
  const [notifyFriends, setNotifyFriends] = useState(true);
  const [saving, setSaving] = useState(false);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: {
      date: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isPast: boolean;
      dateStr: string;
    }[] = [];

    const prevMonthLast = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isPast: true,
        dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(currentYear, currentMonth, d);
      const isToday = dateObj.toDateString() === today.toDateString();
      const isPast =
        dateObj <
        new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: d,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
        isToday,
        isPast,
        dateStr,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        date: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        dateStr: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const hasSessionOnDate = (dateStr: string) => {
    return existingSessions.some((s) => s.date === dateStr);
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateSelect = (dateStr: string, isPast: boolean) => {
    if (isPast) return;
    setSelectedDate(dateStr);
    setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Selecciona una fecha y hora para continuar.");
      return;
    }
    if (selectedFriends.length === 0) {
      toast.error("Selecciona al menos un amigo para crear la sesión.");
      return;
    }

    const scheduledAt = buildScheduledAt(selectedDate, selectedTime);
    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error("La fecha u hora seleccionada no es valida.");
      return;
    }
    if (scheduledDate.getTime() < Date.now() - 5 * 60 * 1000) {
      toast.error("Selecciona una fecha y hora futuras.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        game: {
          appid: game.appid,
          name: game.name,
          headerImage:
            game.headerImage ||
            `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        },
        date: selectedDate,
        time: selectedTime,
        scheduledAt,
        participants: selectedFriends.map((friend) => ({
          steamId: friend.steamId,
          username: friend.username,
          avatar: friend.avatar,
        })),
        notes: "",
        notifyFriends,
      };

      await createGamingSession(payload);
      await onConfirm();

      toast.success(
        `Sesión programada: ${game.name} el ${formatDateDisplay(selectedDate)} a las ${selectedTime}`,
        { duration: 5000 },
      );

      onClose();
    } catch (error: any) {
      console.error("Error creating gaming session:", error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.error;
      if (status === 409) {
        toast.error(
          msg ||
          "Ya tienes una sesión programada a esa hora. Elige otro horario.",
          { duration: 6000 },
        );
      } else {
        toast.error(msg || "No se pudo crear la sesión.");
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = DAYS_ES[(date.getDay() + 6) % 7];
    return `${dayName} ${d} de ${MONTHS_ES[m - 1]}`;
  };

  const gameImage =
    game.headerImage ||
    `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="relative p-5 pb-4 border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-purple-900/30" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== "date" && (
                <button
                  onClick={() => setStep(step === "confirm" ? "time" : "date")}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  disabled={saving}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar size={20} className="text-blue-400" />
                  Reservar Sesión
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {step === "date" && "Elige una fecha"}
                  {step === "time" && "Elige una hora"}
                  {step === "confirm" && "Confirma la sesión"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={saving}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative flex items-center gap-3 mt-4 bg-slate-800/60 rounded-xl p-3">
            <img
              src={gameImage}
              alt={game.name}
              className="w-16 h-10 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/150x100?text=Game";
              }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {game.name}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Users size={10} />
                <span>Tú + {selectedFriends.length} amigos</span>
              </div>
            </div>

            <div className="flex -space-x-2">
              {selectedFriends.slice(0, 3).map((f) => (
                <img
                  key={f.steamId}
                  src={f.avatar}
                  alt={f.username}
                  className="w-7 h-7 rounded-full border-2 border-slate-800 object-cover"
                  title={f.username}
                />
              ))}
              {selectedFriends.length > 3 && (
                <div className="w-7 h-7 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-[9px] text-slate-300 font-bold">
                  +{selectedFriends.length - 3}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center justify-center gap-2 mt-4">
            {["date", "time", "confirm"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s
                    ? "bg-blue-600 text-white scale-110"
                    : ["date", "time", "confirm"].indexOf(step) > i
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-500"
                    }`}
                >
                  {["date", "time", "confirm"].indexOf(step) > i ? (
                    <Check size={12} />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-0.5 rounded-full transition-colors ${["date", "time", "confirm"].indexOf(step) > i
                      ? "bg-emerald-600"
                      : "bg-slate-800"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5">
          {step === "date" && (
            <div className="animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  disabled={saving}
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 className="text-sm font-bold text-white">
                  {MONTHS_ES[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  disabled={saving}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_ES.map((day) => (
                  <div
                    key={day}
                    className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isSelected = selectedDate === day.dateStr;
                  const hasSession = hasSessionOnDate(day.dateStr);

                  return (
                    <button
                      key={i}
                      onClick={() => handleDateSelect(day.dateStr, day.isPast)}
                      disabled={day.isPast || saving}
                      className={`relative h-10 rounded-xl text-sm font-medium transition-all duration-200 ${isSelected
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30 scale-105"
                        : day.isToday
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30"
                          : day.isPast
                            ? "text-slate-700 cursor-not-allowed"
                            : day.isCurrentMonth
                              ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                              : "text-slate-600 hover:bg-slate-800/50"
                        }`}
                    >
                      {day.date}
                      {day.isToday && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />
                      )}
                      {hasSession && !isSelected && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "time" && selectedDate && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <p className="text-sm text-slate-400 mb-4">
                📅{" "}
                <span className="text-white font-medium">
                  {formatDateDisplay(selectedDate)}
                </span>{" "}
                — ¿A qué hora?
              </p>

              <div className="grid grid-cols-4 gap-2">
                {HOURS.map((time) => {
                  const isSelected = selectedTime === time;

                  return (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      disabled={saving}
                      className={`py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isSelected
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30 scale-105"
                        : "bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50 hover:border-slate-600"
                        }`}
                    >
                      <Clock size={12} className="inline mr-1 opacity-50" />
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "confirm" && selectedDate && selectedTime && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-5">
              <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={gameImage}
                    alt={game.name}
                    className="w-24 h-14 rounded-xl object-cover shadow-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white">
                      {game.name}
                    </h3>
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-sm text-slate-300 flex items-center gap-2">
                        <Calendar size={14} className="text-blue-400" />
                        {formatDateDisplay(selectedDate)}
                      </span>
                      <span className="text-sm text-slate-300 flex items-center gap-2">
                        <Clock size={14} className="text-purple-400" />
                        {selectedTime}h
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Participantes ({selectedFriends.length + 1})
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      Yo
                    </div>
                    <span className="text-sm text-white font-medium flex-1">
                      Tú
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Organizador
                    </span>
                  </div>

                  {selectedFriends.map((f) => (
                    <div
                      key={f.steamId}
                      className="flex items-center gap-3 bg-slate-800/40 rounded-xl p-2.5"
                    >
                      <img
                        src={f.avatar}
                        alt={f.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-sm text-slate-300 flex-1">
                        {f.username}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${f.status > 0
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-slate-700/50 text-slate-500 border-slate-600/30"
                          }`}
                      >
                        {f.status > 0 ? "Online" : "Offline"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-800/40 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-amber-400" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      Notificar amigos
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Envía una invitación visual a todos los participantes
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setNotifyFriends(!notifyFriends)}
                  disabled={saving}
                  className={`w-11 h-6 rounded-full transition-colors relative ${notifyFriends ? "bg-blue-600" : "bg-slate-700"
                    }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifyFriends ? "left-6" : "left-1"
                      }`}
                  />
                </button>
              </div>

              <button
                onClick={handleConfirm}
                disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Gamepad2 size={18} />
                    Confirmar Sesión
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UpcomingSessions({
  sessions,
  onRemove,
  onLeave,
  onRespond,
  currentUserSteamId,
}: {
  sessions: ScheduledSession[];
  onRemove: (id: string) => void;
  onLeave?: (id: string) => void;
  onRespond?: (id: string, status: "accepted" | "declined") => void | Promise<void>;
  currentUserSteamId?: string;
}) {
  const [showSessions, setShowSessions] = useState(true);

  if (sessions.length === 0) return null;

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = DAYS_ES[(date.getDay() + 6) % 7];
    return `${dayName} ${d} ${MONTHS_ES[m - 1].slice(0, 3)}`;
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <PartyPopper className="text-amber-500" size={16} />
          Sesiones donde participas ({sessions.length})
        </h3>
        <button
          onClick={() => setShowSessions(!showSessions)}
          className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
        >
          {showSessions ? (
            <>
              <ChevronRight size={14} className="rotate-90 transition-transform" />
              Ocultar lista
            </>
          ) : (
            <>
              <ChevronRight size={14} className="transition-transform" />
              Ver lista
            </>
          )}
        </button>
      </div>

      {showSessions && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {sessions.map((session) => (
          <div
            key={session.id}
            id={`session-${session.id}`}
            className="relative flex flex-col gap-3 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 transition-all duration-700"
          >
            {/* Botón eliminar / abandonar / cancelar, contextual */}
            <button
              onClick={() => {
                if (session.isHost) {
                  if (window.confirm(`¿Cancelar la sesión de ${session.game.name}? Se notificará a todos los participantes.`)) {
                    onRemove(session.id);
                  }
                } else {
                  const msg = session.myParticipantStatus === "declined"
                    ? `¿Eliminar esta sesión de tu lista?`
                    : `¿Abandonar la sesión de ${session.game.name}?`;
                  if (window.confirm(msg) && onLeave) {
                    onLeave(session.id);
                  }
                }
              }}
              className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all z-10"
              title={session.isHost ? "Cancelar sesión" : session.myParticipantStatus === "declined" ? "Eliminar de mi lista" : "Abandonar sesión"}
            >
              {session.isHost ? <Ban size={14} /> : session.myParticipantStatus === "declined" ? <Trash2 size={14} /> : <LogOut size={14} />}
            </button>

            {/* Header de la sesión */}
            <div className="flex items-start gap-4">
              <img
                src={
                  session.game.headerImage ||
                  `https://cdn.cloudflare.steamstatic.com/steam/apps/${session.game.appid}/header.jpg`
                }
                alt={session.game.name}
                className="w-20 h-12 rounded-lg object-cover shadow-md mt-1"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">
                  {session.game.name}
                </h4>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={11} className="text-blue-400" />
                      {formatDate(session.date)}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={11} className="text-purple-400" />
                      {session.time}
                    </span>
                  </div>

                  {!session.isHost && session.host && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Host:</span>
                      <div className="flex items-center gap-1 bg-slate-900/40 px-1.5 py-0.5 rounded-full border border-slate-700/30">
                        <img src={session.host.avatar} className="w-3.5 h-3.5 rounded-full" />
                        <span className="text-[10px] text-slate-300 font-medium">{session.host.username}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones para quien es invitado */}
              {!session.isHost && (
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {session.myParticipantStatus === "invited" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onRespond?.(session.id, "accepted")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all hover:scale-105 shadow-lg shadow-emerald-900/20"
                        title="Aceptar invitación"
                      >
                        <Check size={12} /> Aceptar
                      </button>
                      <button
                        onClick={() => onRespond?.(session.id, "declined")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                        title="Rechazar invitación"
                      >
                        <X size={12} /> Rechazar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-2 group/rsvp">
                      <div
                        className={`text-[10px] px-2.5 py-1.5 rounded-full border font-bold flex items-center gap-1 whitespace-nowrap shadow-sm ${session.myParticipantStatus === "accepted"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}
                      >
                        {session.myParticipantStatus === "accepted" ? (
                          <><Check size={12} /> Confirmada</>
                        ) : (
                          <><X size={12} /> Rechazada</>
                        )}
                      </div>

                      <button
                        onClick={() => onRespond?.(session.id, session.myParticipantStatus === "accepted" ? "declined" : "accepted")}
                        className="opacity-0 group-hover/rsvp:opacity-100 flex items-center gap-1 px-2 py-1 bg-slate-700/80 hover:bg-slate-600 text-[10px] text-slate-200 hover:text-white rounded-md border border-slate-600/50 transition-all whitespace-nowrap"
                        title="Hacer clic para cambiar tu respuesta"
                      >
                        <RotateCcw size={10} />
                        <span>Cambiar a {session.myParticipantStatus === "accepted" ? "Rechazar" : "Aceptar"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Listado de participantes visible para todos */}
            <div className="mt-2 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Participantes ({session.friends.length})
                </p>
                {!session.isHost && (
                  <span className="text-[9px] text-slate-600 font-medium">Host: {session.host?.username}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {session.friends.map((f) => (
                  <div key={f.steamId} className="flex items-center justify-between bg-slate-900/30 rounded-lg p-2 border border-slate-800/30">
                    <div className="flex items-center gap-2">
                      <img src={f.avatar} alt={f.username} className="w-5 h-5 rounded-full border border-slate-700" />
                      <span className="text-[11px] font-medium text-slate-300 truncate max-w-[80px]">{f.username}</span>
                    </div>

                    {f.participantStatus === "accepted" ? (
                      <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <Check size={10} />
                      </span>
                    ) : f.participantStatus === "declined" ? (
                      <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                        <X size={10} />
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-500/70 font-bold uppercase tracking-tighter">
                        Sin Confirmar
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
</div>
  );
}