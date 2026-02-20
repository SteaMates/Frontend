import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Filter, ArrowUpDown } from "lucide-react";
import { DealCard, Deal } from "../components/market/DealCard";
import { toast } from "sonner";

export function Market() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [maxPrice, setMaxPrice] = useState("50");
  const [sortBy, setSortBy] = useState("Deal Rating");

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const params: any = {
        storeID: "1", // Steam
        upperPrice: maxPrice,
        pageSize: 60, // Limit results
      };
      
      if (searchTerm) {
        params.title = searchTerm;
      }
      
      if (sortBy === "Price") {
        params.sortBy = "Price";
      } else if (sortBy === "Savings") {
        params.sortBy = "Savings";
      } else if (sortBy === "Deal Rating") {
        params.sortBy = "Deal Rating";
      } else if (sortBy === "Release") {
        params.sortBy = "Release";
      }

      const response = await axios.get("https://www.cheapshark.com/api/1.0/deals", {
        params
      });
      setDeals(response.data);
    } catch (error) {
      console.error("Error fetching deals:", error);
      toast.error("Error al cargar las ofertas. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDeals();
    }, 500); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, maxPrice, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Mercado de Steam</h2>
          <p className="text-slate-400">Las mejores ofertas en tiempo real de CheapShark</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar juego..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
            <Filter size={18} className="text-slate-500" />
            <span className="text-sm text-slate-400 whitespace-nowrap">Max: ${maxPrice}</span>
            <input 
              type="range" 
              min="0" 
              max="60" 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-24 accent-blue-500 cursor-pointer"
            />
          </div>
          
          <div className="relative">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2 text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer w-full"
            >
              <option value="Deal Rating">Mejor Valorados</option>
              <option value="Savings">Mayor Ahorro</option>
              <option value="Price">Menor Precio</option>
              <option value="Release">Lanzamiento</option>
            </select>
            <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-900 h-64 rounded-xl animate-pulse border border-slate-800"></div>
          ))}
        </div>
      ) : (
        <>
          {deals.length > 0 ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {deals.map((deal) => (
                <DealCard key={deal.dealID} deal={deal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <p className="text-xl">No se encontraron ofertas con estos criterios.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
