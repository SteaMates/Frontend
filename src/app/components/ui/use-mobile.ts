/**
 * Nombre del fichero: use-mobile.ts
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Función: useIsMobile
 * Descripción: Hook personalizado de React que abstrae y gestiona la lógica relacionada con
 * is mobile. Este hook maneja los efectos secundarios, centraliza el estado
 * necesario y expone las propiedades y métodos esenciales para los componentes
 * que lo consuman.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    /**
                         * Función: onChange
             * Descripción: Manejador de eventos (handler) diseñado para responder a la acción de
             * change. Captura la interacción del usuario o del sistema, valida el
             * contexto de ejecución y dispara las actualizaciones de estado
             * necesarias en la aplicación.
                         */
      const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
