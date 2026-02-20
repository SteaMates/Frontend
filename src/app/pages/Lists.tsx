import { useState } from "react";
import { Link } from "react-router";
import { Plus, Heart, MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";

// Mock data for lists
const INITIAL_LISTS = [
  {
    id: "1",
    title: "Top RPGs de 2024",
    description: "Los mejores juegos de rol que he jugado este año. ¡Imprescindibles!",
    author: "GamerPro99",
    likes: 124,
    comments: 45,
    gamesCount: 12,
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3"
  },
  {
    id: "2",
    title: "Joyas Ocultas por menos de 5€",
    description: "Juegos increíbles que cuestan menos que un café. Aprovechad las ofertas.",
    author: "IndieHunter",
    likes: 89,
    comments: 12,
    gamesCount: 8,
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3"
  },
  {
    id: "3",
    title: "Co-op para jugar con amigos",
    description: "Lista definitiva para no discutir qué jugar el fin de semana.",
    author: "SquadLeader",
    likes: 256,
    comments: 78,
    gamesCount: 20,
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2671&ixlib=rb-4.0.3"
  }
];

export function Lists() {
  const [lists, setLists] = useState(INITIAL_LISTS);

  const handleCreateList = () => {
    toast.info("Funcionalidad de crear lista próximamente");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Listas de la Comunidad</h2>
          <p className="text-slate-400">Descubre colecciones curadas por otros jugadores</p>
        </div>
        <button 
          onClick={handleCreateList}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          <Plus size={20} />
          Crear Lista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <Link to={`/lists/${list.id}`} key={list.id} className="group">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              <div className="h-48 overflow-hidden relative">
                <img 
                  src={list.image} 
                  alt={list.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80"></div>
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{list.title}</h3>
                  <p className="text-sm text-slate-300">por <span className="text-blue-400">{list.author}</span></p>
                </div>
              </div>
              
              <div className="p-4 flex flex-col flex-1">
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{list.description}</p>
                
                <div className="mt-auto flex items-center justify-between text-slate-500 text-sm pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 hover:text-red-400 transition-colors cursor-pointer">
                      <Heart size={16} /> {list.likes}
                    </span>
                    <span className="flex items-center gap-1 hover:text-blue-400 transition-colors cursor-pointer">
                      <MessageSquare size={16} /> {list.comments}
                    </span>
                  </div>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded">
                    {list.gamesCount} juegos
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
