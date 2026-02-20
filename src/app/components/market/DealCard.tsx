import { ExternalLink, Star } from "lucide-react";

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

export function DealCard({ deal }: DealCardProps) {
  const savings = Math.round(parseFloat(deal.savings));
  
  return (
    <div className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 flex flex-col h-full">
      <div className="relative aspect-video overflow-hidden bg-slate-800">
        <img 
          src={deal.thumb} 
          alt={deal.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
          -{savings}%
        </div>
        {deal.metacriticScore && parseInt(deal.metacriticScore) > 0 && (
           <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur text-yellow-400 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
             <Star size={12} fill="currentColor" />
             {deal.metacriticScore}
           </div>
        )}
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-100 line-clamp-1 mb-1" title={deal.title}>
          {deal.title}
        </h3>
        
        <div className="flex items-center gap-2 mb-4">
           <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
             Rating: {deal.dealRating}/10
           </span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 line-through decoration-slate-500 decoration-1">
              ${deal.normalPrice}
            </span>
            <span className="text-xl font-bold text-emerald-400">
              ${deal.salePrice}
            </span>
          </div>
          
          <a 
            href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="Ver en tienda"
          >
            <ExternalLink size={20} />
          </a>
        </div>
      </div>
    </div>
  );
}
