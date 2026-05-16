/**
 * Nombre del fichero: DealCard.tsx
 * Descripción: Fichero fuente de la aplicación SteaMates.
 * Autor: Adrián Artigas Subiras, Adrián Becerril Granada, Pablo Nicolás Fabra Roque, Enrique Baldovin Cotela, Adrián Nasarre
 */
import { ExternalLink, Star } from "lucide-react";
import { Link } from "react-router";

export interface Deal {
  dealID: string;
  title: string;
  storeID: string;
  gameID: string;
  salePrice: string;
  normalPrice: string;
  isOnSale: string;
  savings: string;
  metacriticScore: string;
  steamRatingText: string;
  steamRatingPercent: string;
  steamAppID: string;
  releaseDate: number;
  lastChange: number;
  dealRating: string;
  thumb: string;
}

interface DealCardProps {
  deal: Deal;
}

/**
 * Función: DealCard
 * Descripción: Componente principal de la interfaz o clase estructural que representa a
 * DealCard. Este elemento encapsula la lógica de presentación, gestiona su
 * propio estado interno y coordina la renderización de sus componentes hijos
 * según los datos recibidos.
 */
export function DealCard({ deal }: DealCardProps) {
  const savings = Math.round(parseFloat(deal.savings));
  const hasDiscount = savings > 0;
  const detailPath = `/game/${deal.steamAppID || deal.gameID}`;

  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full text-sm">
      <Link
        to={detailPath}
        state={{ deal }}
        className="block relative aspect-video overflow-hidden bg-slate-800"
      >
        <img
          src={deal.steamAppID ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${deal.steamAppID}/header.jpg` : deal.thumb}
          alt={deal.title}
          draggable="false"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-slate-800"
          loading="lazy"
          onError={(e) => {
            // Si falla la imagen de Steam, cae a la imagen de la API
            const target = e.target as HTMLImageElement;
            if (target.src !== deal.thumb) {
              target.src = deal.thumb;
            }
          }}
        />
        {hasDiscount && (
          <div className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
            -{savings}%
          </div>
        )}
        {deal.metacriticScore && parseInt(deal.metacriticScore) > 0 && (
          <div className="absolute bottom-1 left-1 bg-slate-950/80 backdrop-blur text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Star size={10} fill="currentColor" />
            {deal.metacriticScore}
          </div>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link to={detailPath} state={{ deal }}>
          <h3
            className="font-semibold text-slate-100 line-clamp-1 mb-1 hover:text-blue-400 transition-colors text-sm"
            title={deal.title}
          >
            {deal.title}
          </h3>
        </Link>



        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-[10px] text-slate-500 line-through decoration-slate-500 decoration-1">
                ${deal.normalPrice}
              </span>
            )}
            <span
              className={`text-base font-bold ${hasDiscount ? "text-emerald-400" : "text-slate-200"}`}
            >
              ${deal.salePrice}
            </span>
          </div>

          <a
            href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors z-10"
            title="Ver en tienda"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
