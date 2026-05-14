/**
 * Nombre del fichero: collapsible.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/**
 * Función: Collapsible
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * Collapsible. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * Función: CollapsibleTrigger
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CollapsibleTrigger. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

/**
 * Función: CollapsibleContent
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * CollapsibleContent. Este elemento encapsula la lógica de presentación,
 * gestiona su propio estado interno y coordina la renderización de sus
 * componentes hijos según los datos recibidos.
 */
function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
