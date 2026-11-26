
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Syllabus } from '../types';
import { chatWithAI } from '../services/gemini';

interface ChatBotProps {
    currentSyllabus?: Syllabus | null;
}

const ChatBot: React.FC<ChatBotProps> = ({ currentSyllabus }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: input,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' as const : 'model' as const,
                parts: [{ text: m.content }]
            }));

            const aiResponse = await chatWithAI(input, history, currentSyllabus || undefined);

            const assistantMessage: ChatMessage = {
                role: 'ai',
                content: aiResponse,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error("Chat error:", error);
            let displayMsg = error.message || "Failed to connect";
            
            if (displayMsg.includes("throttled")) {
                displayMsg = "⚠️ **Heavy Traffic**: Google has temporarily blocked this key. Please wait 1-2 minutes for the quota to reset.";
            } else if (displayMsg.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(displayMsg);
                    displayMsg = parsed.error?.message || parsed.message || "API error occurred";
                } catch (e) {}
            }

            const errorMessage: ChatMessage = {
                role: 'ai',
                content: displayMsg,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className={`mb-4 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-300 transition-all origin-bottom-right ${
                    isExpanded 
                        ? 'w-[90vw] md:w-[50vw] h-[85vh]' 
                        : 'w-[350px] md:w-[400px] h-[500px]'
                }`}>
                    {/* Header */}
                    <div className="bg-indigo-600 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <i className="fas fa-robot text-sm"></i>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold">Study Assistant</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                    <span className="text-[10px] text-indigo-100 font-medium tracking-wide uppercase">AI Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="w-8 h-8 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                                title={isExpanded ? "Collapse" : "Expand to half screen"}
                            >
                                <i className={`fas ${isExpanded ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 hover:bg-white/10 rounded-lg transition-colors flex items-center justify-center"
                                title="Close chat"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-200 rounded-2xl flex items-center justify-center">
                                    <i className="fas fa-comments text-3xl"></i>
                                </div>
                                <div>
                                    <p className="text-slate-800 font-bold mb-1">Hi there!</p>
                                    <p className="text-slate-500 text-xs">I'm your AI tutor. Ask me anything about your syllabus or studies.</p>
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
                                    }`}>
                                    <p className="whitespace-pre-wrap">{m.content}</p>
                                    <p className={`text-[10px] mt-1.5 ${m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                                        {m.timestamp}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type your question..."
                                className="w-full pl-6 pr-12 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-600/20 transition-all"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1.5 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100"
                            >
                                <i className="fas fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bubble Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-indigo-600'
                    }`}
            >
                <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'} text-2xl`}></i>
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>
        </div>
    );
};

export default ChatBot;
