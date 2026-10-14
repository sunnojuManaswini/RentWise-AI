import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  Building2, Layers, Users, IndianRupee, AlertTriangle, 
  Wrench, Calendar, ArrowUpRight, Sparkles, CheckCircle2, MessageCircle, FileText
} from 'lucide-react';
import axios from 'axios';

export default function Dashboard({ onOpenAi, onOpenWhatsApp }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get('/api/analytics/dashboard');
      if (res.data.success) {
        setData(res.data.analytics);
      }
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
        Loading RentWise Dashboard Analytics...
      </div>
    );
  }

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Header Greeting Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-indigo-500/20 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {isOwner ? '👑 Owner Workspace' : '🔑 Tenant Workspace'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white">
            {t('welcome')}, {user?.full_name}!
          </h1>
          <p className="text-xs text-slate-400">
            {isOwner
              ? 'Here is your real-time rental portfolio & income ledger summary.'
              : 'Here is your current property status, rent obligations, and agreement details.'}
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={onOpenAi}
            className="px-4 py-2.5 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/30 hover:opacity-90 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('askAi')}</span>
          </button>
          <button
            onClick={onOpenWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('shareWhatsApp')}</span>
          </button>
        </div>
      </div>

      {isOwner ? (
        /* OWNER DASHBOARD METRICS */
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{t('totalProperties')}</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white">{data?.total_properties || 0}</div>
              <div className="text-[11px] text-slate-500">{data?.total_buildings || 0} Buildings • {data?.total_units || 0} Units</div>
            </div>

            <div className="glass-card p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Occupancy Rate</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {data?.total_units ? Math.round((data.occupied_units / data.total_units) * 100) : 0}%
              </div>
              <div className="text-[11px] text-slate-500">
                {data?.occupied_units || 0} Occupied • {data?.vacant_units || 0} Vacant
              </div>
            </div>

            <div className="glass-card p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{t('rentCollected')}</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                ₹{Number(data?.rent_collected || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-slate-500">Verified received rent</div>
            </div>

            <div className="glass-card p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{t('outstandingRent')}</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-400">
                ₹{Number(data?.outstanding_rent || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-rose-400/80">Pending tenant balance</div>
            </div>
          </div>

          {/* TWO COLUMN DETAILS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Rent Payments */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Recent Rent Payments</span>
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.recent_payments?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No payment records yet.</p>
                ) : (
                  data?.recent_payments?.map((pmt) => (
                    <div key={pmt.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{pmt.tenant_name} ({pmt.unit_number})</div>
                        <div className="text-[11px] text-slate-400">{pmt.payment_date} via {pmt.payment_method}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-emerald-400">₹{Number(pmt.amount_paid).toLocaleString('en-IN')}</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">{pmt.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming Lease Expirations */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Upcoming Agreement Expirations</span>
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.upcoming_expirations?.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No upcoming lease expirations.</p>
                ) : (
                  data?.upcoming_expirations?.map((ag) => (
                    <div key={ag.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{ag.tenant_name} ({ag.unit_number})</div>
                        <div className="text-[11px] text-slate-400">Expires on: {ag.end_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-indigo-300">₹{Number(ag.monthly_rent).toLocaleString('en-IN')}/mo</div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">{ag.notice_period_days} Days Notice</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* TENANT DASHBOARD METRICS */
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-medium text-slate-400">Assigned Residence</span>
              <div className="text-lg font-extrabold text-white">{data?.property_name || 'N/A'}</div>
              <div className="text-xs font-bold text-indigo-400">{data?.unit_number || 'N/A'}</div>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-medium text-slate-400">Monthly Rent & Maintenance</span>
              <div className="text-xl font-black text-white">
                ₹{Number(data?.monthly_rent || 0).toLocaleString('en-IN')} / mo
              </div>
              <div className="text-xs text-emerald-400 font-semibold">Security Deposit: ₹{Number(data?.security_deposit || 0).toLocaleString('en-IN')}</div>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-2">
              <span className="text-xs font-medium text-slate-400">Current Outstanding Balance</span>
              <div className={`text-xl font-black ${data?.outstanding_amount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₹{Number(data?.outstanding_amount || 0).toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-400">Next due date: {data?.next_due_date || 'N/A'}</div>
            </div>
          </div>

          {/* TENANT RECENT PAYMENTS */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Your Recent Payments</span>
            </h3>
            <div className="space-y-2">
              {data?.recent_payments?.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No payment history recorded yet.</p>
              ) : (
                data?.recent_payments?.map((pmt) => (
                  <div key={pmt.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">Payment for {pmt.period_month}</div>
                      <div className="text-[11px] text-slate-400">{pmt.payment_date} • {pmt.payment_method}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">₹{Number(pmt.amount_paid).toLocaleString('en-IN')}</div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">{pmt.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
