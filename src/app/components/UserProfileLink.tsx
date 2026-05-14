/**
 * Nombre del fichero: UserProfileLink.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { useNavigate } from 'react-router';

interface UserProfileLinkProps {
  steamId?: string;
  username: string;
  avatar?: string;
  variant?: 'avatar' | 'name' | 'both' | 'badge';
  className?: string;
  avatarClassName?: string;
  nameClassName?: string;
  disabled?: boolean;
  onProfileOpen?: () => void;
}

/**
 * Función: UserProfileLink
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * UserProfileLink. Este elemento encapsula la lógica de presentación, gestiona
 * su propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function UserProfileLink({
  steamId,
  username,
  avatar,
  variant = 'name',
  className = '',
  avatarClassName = 'w-8 h-8',
  nameClassName = '',
  disabled = false,
  onProfileOpen,
}: UserProfileLinkProps) {
  const navigate = useNavigate();

  /**
                 * Función: handleClick
         * Descripción: Manejador de eventos (handler) diseñado para responder a la acción de
         * click. Captura la interacción del usuario o del sistema, valida el
         * contexto de ejecución y dispara las actualizaciones de estado necesarias
         * en la aplicación.
                 */
    const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (steamId) {
      navigate(`/profile/${steamId}`);
    }
    onProfileOpen?.();
  };

  const isClickable = !disabled && Boolean(steamId);

  if (variant === 'avatar') {
    return (
      <span
        onClick={handleClick}
        className={`inline-flex rounded-full overflow-hidden ${
          isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        } ${avatarClassName} ${className}`}
        title={isClickable ? `Ver perfil de ${username}` : undefined}
      >
        <img
          src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
          alt={username}
          className="w-full h-full object-cover"
        />
      </span>
    );
  }

  if (variant === 'name') {
    return (
      <span
        onClick={handleClick}
        className={`${
          isClickable
            ? 'cursor-pointer text-[#51a2ff] hover:text-[#7cb8ff] no-underline transition-colors'
            : 'text-white'
        } ${nameClassName} ${className}`}
        title={isClickable ? `Ver perfil de ${username}` : undefined}
      >
        {username}
      </span>
    );
  }

  if (variant === 'both') {
    return (
      <span
        onClick={handleClick}
        className={`inline-flex items-center gap-2 ${
          isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
        } ${className}`}
        title={isClickable ? `Ver perfil de ${username}` : undefined}
      >
        {avatar && (
          <img
            src={avatar}
            alt={username}
            className={`rounded-full object-cover ${avatarClassName}`}
          />
        )}
        <span
          className={`${
            isClickable
              ? 'text-[#51a2ff] hover:text-[#7cb8ff] no-underline'
              : 'text-white'
          } ${nameClassName}`}
        >
          {username}
        </span>
      </span>
    );
  }

  if (variant === 'badge') {
    return (
      <span
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1d293d] border border-[#314158] ${
          isClickable ? 'cursor-pointer hover:border-[#51a2ff] transition-colors' : ''
        } ${className}`}
        title={isClickable ? `Ver perfil de ${username}` : undefined}
      >
        {avatar && (
          <img
            src={avatar}
            alt={username}
            className={`rounded-full object-cover ${avatarClassName}`}
          />
        )}
        <span className="text-sm text-white font-medium">{username}</span>
      </span>
    );
  }

  return null;
}
