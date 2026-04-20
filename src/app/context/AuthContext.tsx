import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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
                };
                setUser(userData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            }
        } catch {
            // If it crashes (token expired or invalid)
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem('steamates_login_notices');
            setUser(null);
        }
    };

    useEffect(() => {
        // 1. Check if we're returning from Steam login (URL has steamId param)
        const params = new URLSearchParams(window.location.search);
        const steamId = params.get('steamId');
        const token = params.get('token');
        const userId = params.get('id');
        const role = params.get('role');
        const status = params.get('status');
        const error = params.get('error');

        if (error === 'user_banned') {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem('steamates_login_notices');
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
                    // Ignore malformed notices and fall back to status-specific notice.
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
            // Steam callback — extract user data from URL params
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
            };
            setUser(userData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            localStorage.setItem(TOKEN_KEY, token); // <-- Guardamos el Token
            const notices = parseLoginNotices();
            if (notices.length > 0) {
                sessionStorage.setItem('steamates_login_notices', JSON.stringify(notices));
            }
            setLoading(false);

            // Clean the URL (remove query params)
            window.history.replaceState({}, '', window.location.pathname);
        }

        // 2. Check localStorage for persisted session
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);
        
        if (storedToken && stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.steamid) {
                    const normalizedUser: User = {
                        ...parsed,
                        role: parsed.role === 'admin' ? 'admin' : 'user',
                        isAdmin: parsed.isAdmin === true || parsed.role === 'admin',
                        status: parsed.status === 'warned' || parsed.status === 'silenced' || parsed.status === 'banned' ? parsed.status : 'active',
                        warningReason: typeof parsed.warningReason === 'string' ? parsed.warningReason : '',
                    };
                    setUser(normalizedUser);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
                }
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }

        // 3. Fallback: verify the token validity with the backend
        const bootstrapAuth = async () => {
            await refreshSession();
            setLoading(false);
        };

        const onFocus = () => {
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

    const logout = async () => {
        try {
            await api.post('/api/auth/logout');
        } catch {
            // ignore
        }
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
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
