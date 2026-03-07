import { useState, useRef, useEffect } from 'react';
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { Send, Bot, User, Loader2, ChevronLeft, Trash } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

export function AIAssistant() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem('ifdc_ai_chat');
        return saved ? JSON.parse(saved) : [{ id: '1', role: 'ai', content: 'Hello! I am the IFDC AI Assistant. I have live access to our drone, office, and R&D asset databases. How can I help you today?' }];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        localStorage.setItem('ifdc_ai_chat', JSON.stringify(messages));
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('http://localhost:8000/api/ai/chat', { message: trimmed });
            const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', content: res.data.response };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate response. Please ensure API keys are configured.");
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', content: 'Error: Could not connect to AI service.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-full h-full min-h-[calc(100vh-4.5rem)] overflow-hidden bg-black/[0.96] border-t border-white/10 shadow-inner">

            {/* LAYER 1: Background Robot */}
            <div className="absolute inset-0 z-0 w-full h-full pointer-events-auto">
                <SplineScene
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* LAYER 2: Visual Effects */}
            <Spotlight
                className="absolute z-10 -top-40 left-0 md:left-60 md:-top-20 pointer-events-none"
                fill="white"
            />



            {/* LAYER 3: Chat Overlay */}
            <div className="absolute top-0 right-0 h-full w-full md:w-[400px] z-20 flex flex-col bg-black/85 md:bg-black/60 backdrop-blur-xl md:border-l border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] p-4 md:p-6 text-white pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between pb-6 border-b border-white/10 shrink-0">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-violet-500">
                            IFDC AI Assistant
                        </h1>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Systems Online & Context Active
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('ifdc_ai_chat');
                            setMessages([{ id: Date.now().toString(), role: 'ai', content: 'Hello! I am the IFDC AI Assistant. I have live access to our drone, office, and R&D asset databases. How can I help you today?' }]);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                        title="Clear Chat History"
                    >
                        <Trash className="w-4 h-4" />
                    </button>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto space-y-4 py-6 pr-2 -mr-2 custom-scrollbar">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-lg border ${msg.role === 'ai'
                                    ? 'bg-gradient-to-br from-cyan-900 to-blue-900 border-cyan-500/30 text-cyan-400'
                                    : 'bg-gradient-to-br from-violet-900 to-fuchsia-900 border-violet-500/30 text-violet-400'
                                    }`}>
                                    {msg.role === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </div>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-md ${msg.role === 'user'
                                    ? 'bg-white/[0.08] border border-white/10 text-slate-100 rounded-tr-none'
                                    : 'bg-black/40 border border-cyan-500/20 text-slate-200 rounded-tl-none'
                                    }`}>
                                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                                </div>
                            </motion.div>
                        ))}
                        {isLoading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-3 flex-row"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-900 to-blue-900 border border-cyan-500/30 text-cyan-400 shadow-lg">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="max-w-[85%] rounded-2xl bg-black/40 border border-cyan-500/20 rounded-tl-none px-4 py-3 flex items-center gap-2 text-slate-400 text-[13px] font-medium">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Analyzing Live Database...
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="pt-5 mt-2 border-t border-white/10 shrink-0">
                    <form onSubmit={handleSend} className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            disabled={isLoading}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-4 pr-12 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/40 focus:bg-white/[0.06] focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 text-slate-900 transition-all hover:bg-cyan-400 focus:outline-none disabled:opacity-50 disabled:hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
                        >
                            <Send className="h-4 w-4 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
