import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, X, Send, Sparkles, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function AssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const steamId = user?.steamId || localStorage.getItem('steamId') || null;
  const username = user?.username || 'Gamer';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1', role: 'assistant', text: steamId
        ? `¡Hola ${username}! Soy SteaMate AI 🎮 Tengo acceso a tu biblioteca de Steam, tus juegos más jugados y tu lista de amigos. Pregúntame lo que quieras:\n\n• "¿Qué debería jugar hoy?"\n• "Recomiéndame algo como mi juego favorito"\n• "¿Qué juegos tengo en común con mis amigos?"\n• "¿Qué están jugando mis amigos?"`
        : '¡Hola! Soy SteaMate AI. Inicia sesión con Steam para que pueda ver tu biblioteca y darte recomendaciones personalizadas. Mientras tanto, pregúntame lo que quieras sobre juegos.'
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post('/api/chat/message', {
        message: userText,
        sessionId,
        userId: steamId || 'anonymous',
        steamId: steamId,
      });

      const { response: aiText, sessionId: newSessionId } = response.data;

      if (newSessionId) {
        setSessionId(newSessionId);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: aiText,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.response?.data?.hint || 'Error al conectar con el servidor. Asegúrate de que el backend esté ejecutándose.';
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `⚠️ ${errorMsg}`,
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white p-4 rounded-full shadow-lg shadow-blue-500/30 transition-all hover:scale-110 group"
      >
        <Bot size={28} className="group-hover:animate-bounce" />
        <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-slate-900"></span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              className="fixed bottom-20 right-6 md:bottom-28 md:right-10 w-[90vw] md:w-[400px] h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">SteaMate AI</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                        }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1 text-xs text-blue-400 font-bold uppercase tracking-wider">
                          <Bot size={12} /> SteaMate AI
                        </div>
                      )}
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-2xl text-sm bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-900 border-t border-slate-700">
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 focus-within:border-blue-500 transition-colors">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={isLoading ? "Esperando respuesta..." : "Pídeme una recomendación..."}
                    disabled={isLoading}
                    className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="text-blue-500 hover:text-blue-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
