import { useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import api from '@/lib/api';
import { toast } from "sonner";
import { Gamepad2, Loader2 } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Handle Steam callback redirect
  useEffect(() => {
    const steamId = searchParams.get('steamId');
    const username = searchParams.get('username');
    const avatar = searchParams.get('avatar');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Error al autenticarse con Steam. Inténtalo de nuevo.');
      return;
    }

    if (steamId && username) {
      // Save user data from Steam callback
      const userData = {
        steamId,
        username,
        avatar: avatar || '',
        profileUrl: searchParams.get('profileUrl') || '',
      };
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('steamId', steamId);
      toast.success(`¡Bienvenido, ${username}!`);

      // Try to validate session with backend (cookies must be set by backend)
      if (import.meta.env.VITE_API_URL) {
        api.get('/api/auth/me')
          .then((res) => {
            // If backend reports authenticated, proceed normally
            if (res.data?.authenticated) {
              navigate('/');
            } else {
              // Session not present on backend — likely cookie/CORS issue
              toast.error('No se pudo establecer la sesión en el servidor. Revisa CORS y las cookies.');
              navigate('/');
            }
          })
          .catch((err) => {
            console.warn('Error validating session with backend:', err);
            toast.error('Error al conectar con el backend. Asegura VITE_API_URL y CLIENT_URL.');
            navigate('/');
          });
      } else {
        // No backend URL configured — just continue
        navigate('/');
      }
    }
  }, [searchParams, navigate]);

  const handleSteamLogin = () => {
    setIsLoading(true);
    // Redirect to backend Steam auth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/auth/steam`;
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="mb-8 relative z-10 flex justify-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 transform rotate-3">
             <Gamepad2 size={40} className="text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2 relative z-10">SteaMates</h1>
        <p className="text-slate-400 mb-8 relative z-10">
          Tu compañero definitivo para Steam. Descubre ofertas, comparte listas y juega con amigos.
        </p>

        <button 
          onClick={handleSteamLogin}
          disabled={isLoading}
          className="w-full bg-[#171a21] hover:bg-[#2a475e] text-[#c5c3c0] hover:text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 border border-[#2a475e] group relative z-10 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" 
              alt="Steam Logo" 
              className="w-6 h-6 group-hover:scale-110 transition-transform" 
            />
          )}
          <span>{isLoading ? 'Conectando con Steam...' : 'Iniciar Sesión con Steam'}</span>
        </button>
        
        <p className="mt-6 text-xs text-slate-500 relative z-10">
          Al iniciar sesión, serás redirigido a Steam para autenticarte de forma segura mediante OpenID. No almacenamos tu contraseña.
        </p>
      </div>
    </div>
  );
}
