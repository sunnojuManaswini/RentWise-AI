import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Bot, Send, User, Sparkles, RefreshCw, ShieldCheck, HelpCircle } from 'lucide-react';
import axios from 'axios';

export default function AiAssistantPage() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ASSISTANT',
        text: 'Hello! I am your RentWise AI Assistant. I have authorized access to your rental agreements, rent obligations, payments, maintenance history, and security deposit records.\n\nAsk me anything in English, Telugu (తెలుగు), or Hindi (हिंदी)!'
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || loading) return;

    const userMsg = { id: Date.now(), sender: 'USER', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/chat', {
        conversation_id: conversationId,
        text: queryText,
        language
      });

      if (res.data.success) {
        setConversationId(res.data.conversation_id);
        const botMsg = {
          id: res.data.reply.id,
          sender: 'ASSISTANT',
          text: res.data.reply.text
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now(), sender: 'ASSISTANT', text: 'Sorry, I encountered an issue retrieving your rental context.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    { label: 'When is my rent due?', lang: 'en' },
    { label: 'Did I pay November rent?', lang: 'en' },
    { label: 'నా అద్దె ఎప్పుడు చెల్లించాలి?', lang: 'te' },
    { label: 'मुझे किराया कब देना है?', lang: 'hi' },
    { label: 'What is my notice period?', lang: 'en' },
    { label: 'Show maintenance tickets', lang: 'en' },
    { label: 'Security deposit refund details?', lang: 'en' }
  ];

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col glass-panel rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>RentWise AI Assistant</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> RAG Auth Scoped
              </span>
            </h1>
            <p className="text-xs text-slate-400">Context-aware assistant for your authorized rental records</p>
          </div>
        </div>
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q.label)}
            className="px-3 py-1 rounded-full bg-slate-800/80 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 text-xs whitespace-nowrap transition border border-slate-700/60"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-950/20">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-[85%] ${m.sender === 'USER' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                m.sender === 'USER' ? 'bg-indigo-600 text-white' : 'gradient-brand text-white shadow-md'
              }`}
            >
              {m.sender === 'USER' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                m.sender === 'USER'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-lg'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Analyzing authorized properties & agreement documents...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI about your rent due, payment receipts, notice period, maintenance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
