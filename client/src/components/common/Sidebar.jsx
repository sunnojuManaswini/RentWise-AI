import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, Building2, Layers, Users, BookOpen, 
  FileText, ShieldCheck, Wrench, Camera, FolderArchive, Bot, Settings 
} from 'lucide-react';

export default function Sidebar() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const isOwner = user?.role === 'OWNER';

  const navItems = [
    { path: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { path: '/properties', label: t('properties'), icon: Building2 },
    { path: '/units', label: t('units'), icon: Layers },
    ...(isOwner ? [{ path: '/tenants', label: t('tenants'), icon: Users }] : []),
    { path: '/ledger', label: t('rentLedger'), icon: BookOpen },
    { path: '/agreements', label: t('agreements'), icon: FileText },
    { path: '/deposit', label: t('securityDeposit'), icon: ShieldCheck },
    { path: '/maintenance', label: t('maintenance'), icon: Wrench },
    { path: '/evidence', label: t('evidenceLocker'), icon: Camera },
    { path: '/documents', label: t('documents'), icon: FolderArchive },
    { path: '/ai-assistant', label: t('aiAssistant'), icon: Bot, highlight: true },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Main Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? item.highlight
                        ? 'gradient-brand text-white shadow-lg shadow-indigo-500/30 font-semibold'
                        : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                      : item.highlight
                        ? 'text-indigo-400 hover:bg-indigo-500/10'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Role Footer Banner */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
            isOwner ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isOwner ? 'OW' : 'TN'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">{user?.full_name}</div>
            <div className="text-[10px] text-slate-400">{isOwner ? t('ownerRole') : t('tenantRole')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
