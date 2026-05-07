import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import api from '../../lib/api';

export interface User {
    id: string;
    steamid: string;
    personaname: string;
    avatarfull: string;
    profileurl: string;
    role?: 'user' | 'admin';
    isAdmin?: boolean;
    status?: 'active' | 'warned' | 'silenced' | 'banned';
    warningReason?: string;
    notices?: LoginNotice[];
}

type LoginNotice = {
    action: 'warned' | 'silenced';
    reason: string;
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: () => void;
    logout: () => void;
    refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'steamates_user';
const TOKEN_KEY = 'steamates_token';
const LAST_ACTIVITY_KEY = 'steamates_last_activity';

// Tiempo de inactividad antes de cerrar sesión automáticamente (30 minutos).
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// Escribir en localStorage máximo una vez cada 30 s para no saturar en mousemove.
const ACTIVITY_WRITE_THROTTLE = 30 * 1000;

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

/** Borra todos los datos de sesión del almacenamiento local. */
function clearSessionStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.removeItem('steamates_login_notices');
}

/** Devuelve true si la última actividad registrada supera el timeout. */
function isSessionExpiredByInactivity(): boolean {
    const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!raw) return false; // Sin registro → sesión nueva, no caducada
    const lastActivity = parseInt(raw, 10);
    return Date.now() - lastActivity > INACTIVITY_TIMEOUT;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityWrite = useRef<number>(0);
    const userIdRef = useRef<string | undefined>(undefined);
    userIdRef.current = user?.id;

    const refreshSession = async () => {
        if (!localStorage.getItem(TOKEN_KEY)) {
            setUser(null);
            return;
        }

        try {
            const res = await api.get('/api/auth/me');
            if (res.data?.user) {
                const userData: User = {
                    id: res.data.user.id,
                    steamid: res.data.user.steamId,
                    personaname: res.data.user.username,
                    avatarfull: res.data.user.avatar,
                    profileurl: res.data.user.profileUrl || `https://steamcommunity.com/profiles/${res.data.user.steamId}`,
                    role: res.data.user.role === 'admin' ? 'admin' : 'user',
                    isAdmin: res.data.user.role === 'admin' || res.data.user.isAdmin === true,
                    status: res.data.user.status === 'warned' || res.data.user.status === 'silenced' || res.data.user.status === 'banned' ? res.data.user.status : 'active',
                    warningReason: res.data.user.warningReason || '',
                    notices: Array.isArray(res.data.user.notices)
                        ? res.data.user.notices
                            .filter((item: any) => item?.action === 'warned' || item?.action === 'silenced')
                            .map((item: any) => ({
                                action: item.action as 'warned' | 'silenced',
                                reason: typeof item.reason === 'string' ? item.reason : '',
                            }))
                        : [],
                };
                setUser(userData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            }
        } catch {
            // Token expirado o inválido — limpiar sesión
            clearSessionStorage();
            setUser(null);
        }
    };

    const logout = useCallback(async () => {
        if (inactivityTimer.current) {
            clearTimeout(inactivityTimer.current);
            inactivityTimer.current = null;
        }
        try {
            await api.post('/api/auth/logout');
        } catch {
            // ignore
        }
        setUser(null);
        clearSessionStorage();
        window.location.href = '/login';
    }, []);

    // --- Sistema de cierre de sesión por inactividad ---
    useEffect(() => {
        if (!userIdRef.current) return; // Solo activo cuando hay sesión iniciada

        const resetTimer = () => {
            // Persistir timestamp de actividad en localStorage (throttled)
            const now = Date.now();
            if (now - lastActivityWrite.current > ACTIVITY_WRITE_THROTTLE) {
                localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
                lastActivityWrite.current = now;
            }

            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(() => {
                logout();
            }, INACTIVITY_TIMEOUT);
        };

        ACTIVITY_EVENTS.forEach(event =>
            window.addEventListener(event, resetTimer, { passive: true })
        );

        // Iniciar el temporizador nada más arrancar la sesión
        resetTimer();

        return () => {
            ACTIVITY_EVENTS.forEach(event =>
                window.removeEventListener(event, resetTimer)
            );
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
                inactivityTimer.current = null;
            }
        };
    }, [user?.id, logout]);

    useEffect(() => {
        // 1. Comprobar si venimos del login de Steam (URL tiene parámetro steamId)
        const params = new URLSearchParams(window.location.search);
        const steamId = params.get('steamId');
        const token = params.get('token');
        const userId = params.get('id');
        const role = params.get('role');
        const status = params.get('status');
        const error = params.get('error');

        if (error === 'user_banned') {
            clearSessionStorage();
            setUser(null);
            setLoading(false);
            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        const parseLoginNotices = (): LoginNotice[] => {
            const noticesParam = params.get('notices');

            if (noticesParam) {
                try {
                    const parsed = JSON.parse(noticesParam) as Array<Partial<LoginNotice>>;
                    return parsed
                        .filter((item): item is LoginNotice => item?.action === 'warned' || item?.action === 'silenced')
                        .map((item) => ({
                            action: item.action,
                            reason: typeof item.reason === 'string' ? item.reason : '',
                        }));
                } catch {
                    // Ignorar notices malformados, usar fallback por status.
                }
            }

            if (status === 'warned' || status === 'silenced') {
                return [{
                    action: status,
                    reason: params.get('warningReason') || '',
                }];
            }

            return [];
        };

        if (steamId && token) {
            const notices = parseLoginNotices();

            // Steam callback — extraer datos de usuario de los parámetros de URL
            const userData: User = {
                id: userId || '',
                steamid: steamId,
                personaname: params.get('username') || 'Steam User',
                avatarfull: params.get('avatar') || '',
                profileurl: params.get('profileUrl') || `https://steamcommunity.com/profiles/${steamId}`,
                role: role === 'admin' ? 'admin' : 'user',
                isAdmin: role === 'admin' || params.get('isAdmin') === 'true',
                status: status === 'warned' || status === 'silenced' || status === 'banned' ? status : 'active',
                warningReason: params.get('warningReason') || '',
                notices,
            };
            setUser(userData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            localStorage.setItem(TOKEN_KEY, token);
            // Registrar actividad en el momento del login
            localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
            if (notices.length > 0) {
                sessionStorage.setItem('steamates_login_notices', JSON.stringify(notices));
            }
            setLoading(false);

            // Limpiar la URL (quitar query params)
            window.history.replaceState({}, '', window.location.pathname);
        }

        // 2. Comprobar localStorage para sesión persistida
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken && stored) {
            // Comprobar si la sesión expiró por inactividad mientras la app estaba cerrada
            if (isSessionExpiredByInactivity()) {
                clearSessionStorage();
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const parsed = JSON.parse(stored);
                if (parsed.steamid) {
                    const normalizedUser: User = {
                        ...parsed,
                        role: parsed.role === 'admin' ? 'admin' : 'user',
                        isAdmin: parsed.isAdmin === true || parsed.role === 'admin',
                        status: parsed.status === 'warned' || parsed.status === 'silenced' || parsed.status === 'banned' ? parsed.status : 'active',
                        warningReason: typeof parsed.warningReason === 'string' ? parsed.warningReason : '',
                        notices: Array.isArray(parsed.notices)
                            ? parsed.notices
                                .filter((item: any) => item?.action === 'warned' || item?.action === 'silenced')
                                .map((item: any) => ({
                                    action: item.action as 'warned' | 'silenced',
                                    reason: typeof item.reason === 'string' ? item.reason : '',
                                }))
                            : [],
                    };
                    setUser(normalizedUser);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
                }
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        // 3. Fallback: verificar validez del token con el backend
        const bootstrapAuth = async () => {
            if (steamId && token) {
                setLoading(false);
                return;
            }
            await refreshSession();
            setLoading(false);
        };

        const onFocus = () => {
            // Al recuperar el foco también comprobar inactividad
            if (isSessionExpiredByInactivity()) {
                logout();
                return;
            }
            refreshSession();
        };

        window.addEventListener('focus', onFocus);
        bootstrapAuth();

        return () => {
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const login = () => {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        window.location.href = `${backendUrl}/api/auth/steam`;
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
