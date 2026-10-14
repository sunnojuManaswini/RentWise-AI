import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Calculator, IndianRupee, CheckCircle2, AlertTriangle, Plus, X } from 'lucide-react';
import axios from 'axios';

export default function DepositPage() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tenantsList, setTenantsList] = useState([]);

  const [form, setForm] = useState({
    unit_id: '',
    tenant_id: '',
    original_deposit: 30000,
    wall_repair_deduction: 3000,
    outstanding_rent_deduction: 0,
    other_deductions: 2000,
    deduction_reasons: 'Wall paint touchup (₹3,000) and deep cleaning fee (₹2,000)',
    settlement_status: 'PENDING'
  });

  useEffect(() => {
    fetchSettlements();
    if (user?.role === 'OWNER') fetchTenants();
  }, []);

  const fetchSettlements = async () => {
    try {
      const res = await axios.get('/api/deposits');
      if (res.data.success) {
        setSettlements(res.data.settlements);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await axios.get('/api/tenants');
      if (res.data.success) setTenantsList(res.data.tenants);
    } catch (e) {}
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/deposits/settle', form);
      if (res.data.success) {
        setShowModal(false);
        fetchSettlements();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to process settlement');
    }
  };

  const totalDeductions = Number(form.wall_repair_deduction || 0) + Number(form.outstanding_rent_deduction || 0) + Number(form.other_deductions || 0);
  const calculatedRefund = Math.max(0, Number(form.original_deposit || 0) - totalDeductions);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Security Deposit & Move-out Settlement</span>
          </h1>
          <p className="text-xs text-slate-400">Calculate deposit deductions, wall repairs, rent arrears, and final refund</p>
        </div>

        {user?.role === 'OWNER' && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <Calculator className="w-4 h-4" />
            <span>New Move-Out Settlement</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading deposit records...</div>
      ) : settlements.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Move-out Settlements Recorded</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settlements.map((s) => (
            <div key={s.id} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {user?.role === 'OWNER' ? s.tenant_name : s.owner_name} ({s.unit_number})
                  </h3>
                  <p className="text-xs text-indigo-400 font-semibold">{s.property_name}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  s.settlement_status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {s.settlement_status}
                </span>
              </div>

              {/* Deposit Calculations */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-500 block">Original Deposit</span>
                  <span className="font-bold text-white">₹{Number(s.original_deposit).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Deductions</span>
                  <span className="font-bold text-rose-400">
                    -₹{(Number(s.wall_repair_deduction) + Number(s.outstanding_rent_deduction) + Number(s.other_deductions)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Final Refundable Amount:</span>
                <span className="text-base font-black text-emerald-400">
                  ₹{Number(s.final_refund_amount).toLocaleString('en-IN')}
                </span>
              </div>

              {s.deduction_reasons && (
                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <strong className="text-slate-300">Deduction Reasons:</strong> {s.deduction_reasons}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Move-out Settlement Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSettle} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Move-Out Settlement Calculator</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Select Tenant *</label>
                <select
                  required
                  value={form.tenant_id}
                  onChange={(e) => {
                    const t = tenantsList.find(item => item.id === e.target.value);
                    setForm({
                      ...form,
                      tenant_id: e.target.value,
                      unit_id: t ? t.unit_id : '',
                      original_deposit: t ? t.security_deposit : form.original_deposit
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Choose Tenant --</option>
                  {tenantsList.map(t => (
                    <option key={t.id} value={t.id}>{t.tenant_name} ({t.unit_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Original Security Deposit (₹)</label>
                <input
                  type="number"
                  required
                  value={form.original_deposit}
                  onChange={(e) => setForm({ ...form, original_deposit: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 mb-1 block">Wall Repair (₹)</label>
                  <input
                    type="number"
                    value={form.wall_repair_deduction}
                    onChange={(e) => setForm({ ...form, wall_repair_deduction: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Rent Arrears (₹)</label>
                  <input
                    type="number"
                    value={form.outstanding_rent_deduction}
                    onChange={(e) => setForm({ ...form, outstanding_rent_deduction: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Cleaning/Other (₹)</label>
                  <input
                    type="number"
                    value={form.other_deductions}
                    onChange={(e) => setForm({ ...form, other_deductions: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              {/* Automatic Refund Calculation Summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Total Deductions:</span>
                  <span className="font-bold text-rose-400">-₹{totalDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-white font-bold border-t border-slate-800 pt-1">
                  <span>Calculated Net Refund:</span>
                  <span className="text-emerald-400">₹{calculatedRefund.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Deduction Reasons & Breakdown</label>
                <textarea
                  rows={2}
                  value={form.deduction_reasons}
                  onChange={(e) => setForm({ ...form, deduction_reasons: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Confirm Move-Out Settlement
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
