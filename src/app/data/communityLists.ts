/**
 * Nombre del fichero: communityLists.ts
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
export type FeedTab = "trending" | "top" | "new" | "mine";

export type ListGame = {
  rank: number;
  title: string;
  description: string;
  price: number;
  oldPrice: number;
  metascore: number;
  metascoreTone: "green" | "blue" | "red";
  year: string;
  image: string;
};

export type ListComment = {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timeAgo: string;
};

export type CommunityList = {
  id: string;
  title: string;
  author: string;
  authorAvatar: string;
  date: string;
  description: string;
  likes: number;
  dislikes: number;
  commentsCount: number;
  gamesCount: number;
  image: string;
  tag: string;
  tagTone: string;
  trending?: boolean;
  newLabel?: boolean;
  mine?: boolean;
  ownerLabel?: boolean;
  topVoted?: boolean;
  topOrder?: number;
  genre: string;
  games: ListGame[];
  comments: ListComment[];
};

export const FEED_TABS: { id: FeedTab; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "top", label: "Más Votadas" },
  { id: "new", label: "Nuevas" },
  { id: "mine", label: "Mis Listas" },
];

export const CATEGORY_CHIPS = [
  "Todas",
  "Acción",
  "Aventura",
  "Rol",
  "Estrategia",
  "Indie",
  "Simulación",
  "Deportes",
  "Carreras",
  "Terror",
] as const;

// Mockup data removed — lists are now fetched from backend (/api/lists)

/**
 * Función: getCommunityListById
 * Descripción: Función encargada de consultar y obtener los datos de community list by id.
 * Procesa los parámetros de entrada requeridos, realiza la llamada pertinente y
 * devuelve la información estructurada para que la aplicación pueda utilizarla.
 */
export function getCommunityListById(id?: string) {
  if (!id) {
    return undefined;
  }

  // Backend now provides lists dynamically
  return undefined;
}
