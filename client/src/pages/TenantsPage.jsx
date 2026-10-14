import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Calendar, Phone, Mail, FileText, X, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [tenantUsers, setTenantUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [formData, setFormData] = useState({
    user_id: '',
    unit_id: '',
    move_in_date: new Date().toISOString().slice(0, 10),
    monthly_rent: 15000,
    security_deposit: 30000,
    notice_period_days: 30
  });

  useEffect(() => {
    fetchTenants();
    fetchDropdowns();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await axios.get('/api/tenants');
      if (res.data.success) {
        setTenants(res.data.tenants);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const uRes = await axios.get('/api/units');
      if (uRes.data.success) setUnits(uRes.data.units);

      const tRes = await axios.get('/api/auth/tenants-list');
      if (tRes.data.success) setTenantUsers(tRes.data.tenants);
    } catch (e) {}
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/tenants/assign', formData);
      if (res.data.success) {
        setShowAssignModal(false);
        fetchTenants();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to assign tenant');
    }
  };

  const handleMoveOut = async (tenantId) => {
    if (!window.confirm('Are you sure you want to mark this tenant as Moved Out?')) return;
    try {
      const res = await axios.post('/api/tenants/move-out', { tenant_id: tenantId });
      if (res.data.success) {
        fetchTenants();
      }
    } catch (e) {
      alert('Failed to process move out');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Tenant Roster & Assignments</span>
          </h1>
          <p className="text-xs text-slate-400">Manage tenant profiles, lease dates, and onboarding</p>
        </div>

        {user?.role === 'OWNER' && (
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign New Tenant</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading tenants...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenants.map((t) => (
            <div key={t.id} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{t.tenant_name}</h3>
                  <p className="text-xs text-indigo-400 font-semibold">{t.property_name} • {t.unit_number}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  t.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {t.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.tenant_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{t.tenant_email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Moved In: {t.move_in_date || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Agreement End: {t.agreement_end || 'N/A'}</span>
                </div>
              </div>

              {user?.role === 'OWNER' && t.status === 'ACTIVE' && (
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => handleMoveOut(t.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition"
                  >
                    Move Out Settlement
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAssign} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Assign Tenant to Unit</h3>
              <button type="button" onClick={() => setShowAssignModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Select Tenant Account *</label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Choose Tenant User --</option>
                  {tenantUsers.map(tu => (
                    <option key={tu.id} value={tu.id}>{tu.full_name} ({tu.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Select Target Unit *</label>
                <select
                  required
                  value={formData.unit_id}
                  onChange={(e) => {
                    const u = units.find(unit => unit.id === e.target.value);
                    setFormData({
                      ...formData,
                      unit_id: e.target.value,
                      monthly_rent: u ? u.monthly_rent : formData.monthly_rent,
                      security_deposit: u ? u.security_deposit : formData.security_deposit
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Choose Vacant Unit --</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.property_name} - {unit.unit_number}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Confirm Tenant Assignment
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
