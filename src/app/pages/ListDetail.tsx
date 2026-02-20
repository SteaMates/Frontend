import { useParams, Link } from "react-router";
import { ArrowLeft, MessageSquare, ThumbsUp, Share2, Plus } from "lucide-react";

// Mock data
const LIST_DATA = {
  id: "1",
  title: "Top RPGs de 2024",
  description: "Los mejores juegos de rol que he jugado este año. ¡Imprescindibles!",
  author: "GamerPro99",
  authorAvatar: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3",
  date: "12 Oct 2024",
  likes: 124,
  comments: 45,
  games: [
    {
      id: "101",
      title: "Baldur's Gate 3",
      image: "https://images.unsplash.com/photo-1627856014759-0852292495e9?auto=format&fit=crop&q=80&w=2560&ixlib=rb-4.0.3",
      price: "$59.99",
      rating: "96",
      releaseDate: "2023",
      description: "Un RPG épico basado en Dungeons & Dragons."
    },
    {
      id: "102",
      title: "Starfield",
      image: "https://images.unsplash.com/photo-1614730341194-75c6074065db?auto=format&fit=crop&q=80&w=2548&ixlib=rb-4.0.3",
      price: "$69.99",
      rating: "85",
      releaseDate: "2023",
      description: "Explora el universo en este RPG de Bethesda."
    },
    {
      id: "103",
      title: "Cyberpunk 2077: Phantom Liberty",
      image: "https://images.unsplash.com/photo-1531297461136-82lw9z1p4s7w?auto=format&fit=crop&q=80&w=2670&ixlib=rb-4.0.3",
      price: "$29.99",
      rating: "89",
      releaseDate: "2023",
      description: "Expansión de espionaje y thriller para Cyberpunk 2077."
    }
  ]
};

export function ListDetail() {
  const { id } = useParams();
  const list = LIST_DATA; // In a real app, fetch based on id

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link to="/lists" className="text-slate-400 hover:text-white flex items-center gap-2 mb-6 transition-colors w-fit">
        <ArrowLeft size={20} /> Volver a Listas
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="relative h-64 bg-slate-800">
           <img 
              src={list.authorAvatar} 
              alt={list.title} 
              className="w-full h-full object-cover opacity-40 blur-sm"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
            <div className="absolute bottom-6 left-6 md:left-10 z-10">
              <h1 className="text-4xl font-bold text-white mb-2">{list.title}</h1>
              <div className="flex items-center gap-4 text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
                    <img src={list.authorAvatar} alt={list.author} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-medium text-white">{list.author}</span>
                </div>
                <span className="text-slate-500">•</span>
                <span>{list.date}</span>
              </div>
            </div>
        </div>
        
        <div className="p-6 md:p-10 border-b border-slate-800">
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">{list.description}</p>
          
          <div className="flex items-center gap-6 mt-6">
            <button className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors">
              <ThumbsUp size={20} /> 
              <span className="font-medium">{list.likes}</span>
            </button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors">
              <MessageSquare size={20} /> 
              <span className="font-medium">{list.comments}</span>
            </button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors ml-auto">
              <Share2 size={20} /> 
              <span className="font-medium">Compartir</span>
            </button>
          </div>
        </div>

        <div className="p-6 md:p-10 bg-slate-950/50">
          <h3 className="text-xl font-bold text-white mb-6">Juegos en esta lista ({list.games.length})</h3>
          
          <div className="space-y-4">
            {list.games.map((game) => (
              <div key={game.id} className="group bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:border-blue-500/30 transition-all">
                <div className="w-full md:w-48 aspect-video rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                  <img src={game.image} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{game.title}</h4>
                      <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded border border-emerald-500/20">
                        {game.rating}/100
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{game.description}</p>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-white font-bold">{game.price}</span>
                    <button className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                      <Plus size={16} /> Añadir a mi lista
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
