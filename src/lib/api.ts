/**
 * Nombre del fichero: api.ts
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import axios from "axios";

// In development, Vite proxy handles /api → backend
// In production, VITE_API_URL points to the backend URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("steamates_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Función: getCommonGames
 * Descripción: Función encargada de consultar y obtener los datos de common games. Procesa
 * los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
export const getCommonGames = (steamIds: string[]) =>
  api.post("/api/steam/common-games", { steamIds });

// --- Gaming Sessions ---
/**
 * Función: createGamingSession
 * Descripción: Función que inicializa o registra un nuevo elemento para gaming session.
 * Recibe los datos base, ejecuta las validaciones de integridad y persiste la
 * nueva entidad en la base de datos o estructura correspondiente.
 */
export const createGamingSession = (payload: {
  game: { appId?: number; appid?: number; name: string; headerImage?: string };
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  scheduledAt: string; // ISO string
  participants: { steamId: string; username: string; avatar: string }[];
  notes?: string;
  notifyFriends?: boolean;
}) => api.post("/api/sessions", payload);

/**
 * Función: getMyGamingSessions
 * Descripción: Función encargada de consultar y obtener los datos de my gaming sessions.
 * Procesa los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
export const getMyGamingSessions = () => api.get("/api/sessions/mine");

/**
 * Función: respondToGamingSession
 * Descripción: Función auxiliar de propósito general especializada en respond to gaming
 * session. Contiene lógica específica para transformar datos, realizar cálculos
 * o conectar diferentes partes del sistema según los requisitos del módulo.
 */
export const respondToGamingSession = (
  id: string,
  response: "accepted" | "declined",
) => api.patch(`/api/sessions/${id}/respond`, { response });

/**
 * Función: cancelGamingSession
 * Descripción: Función de validación o comprobación booleana sobre cel gaming session.
 * Evalúa las condiciones de negocio actuales y devuelve verdadero o falso
 * dependiendo del estado de la entidad solicitada.
 */
export const cancelGamingSession = (id: string) =>
  api.patch(`/api/sessions/${id}/cancel`);

/**
 * Función: leaveGamingSession
 * Descripción: Función auxiliar de propósito general especializada en leave gaming session.
 * Contiene lógica específica para transformar datos, realizar cálculos o
 * conectar diferentes partes del sistema según los requisitos del módulo.
 */
export const leaveGamingSession = (id: string) =>
  api.patch(`/api/sessions/${id}/leave`);

// --- Notifications ---
/**
 * Función: getNotifications
 * Descripción: Función encargada de consultar y obtener los datos de notifications. Procesa
 * los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
export const getNotifications = (params?: { unread?: boolean; limit?: number }) =>
  api.get("/api/notifications", { params });

/**
 * Función: markNotificationRead
 * Descripción: Función auxiliar de propósito general especializada en mark notification
 * read. Contiene lógica específica para transformar datos, realizar cálculos o
 * conectar diferentes partes del sistema según los requisitos del módulo.
 */
export const markNotificationRead = (id: string) =>
  api.patch(`/api/notifications/${id}/read`);

/**
 * Función: markAllNotificationsRead
 * Descripción: Función auxiliar de propósito general especializada en mark all notifications
 * read. Contiene lógica específica para transformar datos, realizar cálculos o
 * conectar diferentes partes del sistema según los requisitos del módulo.
 */
export const markAllNotificationsRead = () =>
  api.patch("/api/notifications/read-all");

/**
 * Función: deleteNotification
 * Descripción: Proceso destructivo para eliminar una notificación específica.
 */
export const deleteNotification = (id: string) =>
  api.delete(`/api/notifications/${id}`);

/**
 * Función: deleteAllNotifications
 * Descripción: Proceso destructivo para eliminar todas las notificaciones del usuario.
 */
export const deleteAllNotifications = () =>
  api.delete("/api/notifications/all");

/**
 * Función: createReport
 * Descripción: Función que inicializa o registra un nuevo elemento para report. Recibe los
 * datos base, ejecuta las validaciones de integridad y persiste la nueva
 * entidad en la base de datos o estructura correspondiente.
 */
export const createReport = (payload: {
  targetId: string;
  targetType: 'list' | 'comment' | 'user';
  reason: string;
  description?: string;
}) => api.post('/api/reports', payload);

// --- Market Tracking (Wishlist + Price Alerts) ---
/**
 * Función: getWishlist
 * Descripción: Función encargada de consultar y obtener los datos de wishlist. Procesa los
 * parámetros de entrada requeridos, realiza la llamada pertinente y devuelve la
 * información estructurada para que la aplicación pueda utilizarla.
 */
export const getWishlist = (params?: { live?: boolean }) =>
  api.get('/api/market/wishlist', { params });

/**
 * Función: addWishlistItem
 * Descripción: Función que inicializa o registra un nuevo elemento para wishlist item.
 * Recibe los datos base, ejecuta las validaciones de integridad y persiste la
 * nueva entidad en la base de datos o estructura correspondiente.
 */
export const addWishlistItem = (payload: {
  steamAppId?: string;
  gameId?: string;
  title: string;
  thumb?: string;
}) => api.post('/api/market/wishlist', payload);

/**
 * Función: removeWishlistItem
 * Descripción: Proceso destructivo para eliminar o descartar de forma segura wishlist item.
 * Verifica los permisos y dependencias antes de proceder a la eliminación
 * física o lógica del recurso en el sistema.
 */
export const removeWishlistItem = (id: string) =>
  api.delete(`/api/market/wishlist/${id}`);

/**
 * Función: getPriceAlerts
 * Descripción: Función encargada de consultar y obtener los datos de price alerts. Procesa
 * los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
export const getPriceAlerts = (params?: { live?: boolean }) =>
  api.get('/api/market/alerts', { params });

/**
 * Función: createPriceAlert
 * Descripción: Función que inicializa o registra un nuevo elemento para price alert. Recibe
 * los datos base, ejecuta las validaciones de integridad y persiste la nueva
 * entidad en la base de datos o estructura correspondiente.
 */
export const createPriceAlert = (payload: {
  steamAppId?: string;
  gameId?: string;
  title: string;
  thumb?: string;
  targetPrice: number;
}) => api.post('/api/market/alerts', payload);

/**
 * Función: updatePriceAlert
 * Descripción: Servicio encargado de actualizar los datos de price alert. Recibe la
 * información modificada, aplica la lógica de negocio correspondiente y
 * sincroniza estos cambios con el almacenamiento persistente o el estado
 * global.
 */
export const updatePriceAlert = (
  id: string,
  payload: { targetPrice?: number; enabled?: boolean },
) => api.patch(`/api/market/alerts/${id}`, payload);

/**
 * Función: deletePriceAlert
 * Descripción: Proceso destructivo para eliminar o descartar de forma segura price alert.
 * Verifica los permisos y dependencias antes de proceder a la eliminación
 * física o lógica del recurso en el sistema.
 */
export const deletePriceAlert = (id: string) =>
  api.delete(`/api/market/alerts/${id}`);

export default api;