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

export const getCommonGames = (steamIds: string[]) =>
  api.post("/api/steam/common-games", { steamIds });

// --- Gaming Sessions ---
export const createGamingSession = (payload: {
  game: { appId?: number; appid?: number; name: string; headerImage?: string };
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  scheduledAt: string; // ISO string
  participants: { steamId: string; username: string; avatar: string }[];
  notes?: string;
  notifyFriends?: boolean;
}) => api.post("/api/sessions", payload);

export const getMyGamingSessions = () => api.get("/api/sessions/mine");

export const respondToGamingSession = (
  id: string,
  response: "accepted" | "declined",
) => api.patch(`/api/sessions/${id}/respond`, { response });

export const cancelGamingSession = (id: string) =>
  api.patch(`/api/sessions/${id}/cancel`);

export const leaveGamingSession = (id: string) =>
  api.patch(`/api/sessions/${id}/leave`);

// --- Notifications ---
export const getNotifications = (params?: { unread?: boolean; limit?: number }) =>
  api.get("/api/notifications", { params });

export const markNotificationRead = (id: string) =>
  api.patch(`/api/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  api.patch("/api/notifications/read-all");

export const createReport = (payload: {
  targetId: string;
  targetType: 'list' | 'comment' | 'user';
  reason: string;
  description?: string;
}) => api.post('/api/reports', payload);

// --- Market Tracking (Wishlist + Price Alerts) ---
export const getWishlist = (params?: { live?: boolean }) =>
  api.get('/api/market/wishlist', { params });

export const addWishlistItem = (payload: {
  steamAppId?: string;
  gameId?: string;
  title: string;
  thumb?: string;
}) => api.post('/api/market/wishlist', payload);

export const removeWishlistItem = (id: string) =>
  api.delete(`/api/market/wishlist/${id}`);

export const getPriceAlerts = (params?: { live?: boolean }) =>
  api.get('/api/market/alerts', { params });

export const createPriceAlert = (payload: {
  steamAppId?: string;
  gameId?: string;
  title: string;
  thumb?: string;
  targetPrice: number;
}) => api.post('/api/market/alerts', payload);

export const updatePriceAlert = (
  id: string,
  payload: { targetPrice?: number; enabled?: boolean },
) => api.patch(`/api/market/alerts/${id}`, payload);

export const deletePriceAlert = (id: string) =>
  api.delete(`/api/market/alerts/${id}`);

export default api;