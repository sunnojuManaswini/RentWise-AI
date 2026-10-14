import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Bell, Globe, LogOut, User, Sparkles, MessageCircle } from 'lucide-react';
import axios from 'axios';

export default function Navbar({ onOpenAi, onOpenWhatsApp }) {
  const { user, logout } = useAuth();
  const { language, changeLanguage, t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (e) {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="sticky top-0 z-30 h-16 glass-panel border-b border-slate-800 px-4 md:px-6 flex items-center justify-between">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold gradient-text tracking-wide">{t('appTitle')}</h1>
          <p className="text-xs text-slate-400 hidden sm:block">{t('tagline')}</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Language Selector */}
        <div className="relative flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
          <Globe className="w-4 h-4 text-slate-400 ml-2 mr-1" />
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium py-1 px-1 focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-slate-800 text-slate-200">English 🇬🇧</option>
            <option value="te" className="bg-slate-800 text-slate-200">తెలుగు 🇮🇳</option>
            <option value="hi" className="bg-slate-800 text-slate-200">हिंदी 🇮🇳</option>
          </select>
        </div>

        {/* Quick AI Trigger */}
        <button
          onClick={onOpenAi}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-accent text-white text-xs font-semibold shadow-md hover:opacity-90 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('askAi')}</span>
        </button>

        {/* WhatsApp Share Launcher */}
        <button
          onClick={onOpenWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">WhatsApp</span>
        </button>

        {/* Notifications Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Notifications</span>
                <span className="text-[10px] text-slate-400">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto mt-2 space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 text-xs">
                      <div className="font-semibold text-indigo-400">{n.title}</div>
                      <div className="text-slate-300 text-[11px] mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold text-slate-200">{user.full_name}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                user.role === 'OWNER' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {user.role}
              </span>
            </div>
            <button
              onClick={logout}
              title="Log Out"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
