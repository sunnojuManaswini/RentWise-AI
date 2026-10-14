import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Bed, Bath, IndianRupee, User, X, Building2, Home } from 'lucide-react';
import axios from 'axios';

export default function UnitsPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [floors, setFloors] = useState([]);

  const [form, setForm] = useState({
    floor_id: '',
    unit_number: '',
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 1100,
    monthly_rent: 15000,
    maintenance_charge: 1500,
    security_deposit: 30000,
    rent_due_day: 5
  });

  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    fetchUnits();
    if (isOwner) fetchFloors();
  }, []);

  const fetchUnits = async () => {
    try {
      const res = await axios.get('/api/units');
      if (res.data.success) setUnits(res.data.units);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFloors = async () => {
    try {
      // Fetch floors via properties tree
      const pRes = await axios.get('/api/properties');
      if (!pRes.data.success) return;
      const allFloors = [];
      for (const prop of pRes.data.properties) {
        try {
          const tRes = await axios.get(`/api/properties/${prop.id}/tree`);
          if (tRes.data.success) {
            const property = tRes.data.property;
            for (const bldg of (property.buildings || [])) {
              for (const floor of (bldg.floors || [])) {
                allFloors.push({
                  id: floor.id,
                  label: `${prop.name} › ${bldg.name} › ${floor.name}`
                });
              }
            }
          }
        } catch {}
      }
      setFloors(allFloors);
    } catch (e) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/units', form);
      if (res.data.success) {
        setShowAddModal(false);
        setForm({
          floor_id: '', unit_number: '', bedrooms: 2, bathrooms: 2,
          area_sqft: 1100, monthly_rent: 15000, maintenance_charge: 1500,
          security_deposit: 30000, rent_due_day: 5
        });
        fetchUnits();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create unit');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Units Management</span>
          </h1>
          <p className="text-xs text-slate-400">View unit specs, rent rates, security deposits, and occupant mapping</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading units...</div>
      ) : units.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <Home className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Units Found</div>
          <p className="text-xs text-slate-500">
            {isOwner ? 'Add a property and building first, then create units here.' : 'No unit currently assigned to your account.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((u) => (
            <div key={u.id} className="glass-card p-5 rounded-2xl space-y-3 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {u.unit_number}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  u.status === 'OCCUPIED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {u.status}
                </span>
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{u.property_name} • {u.building_name} ({u.floor_name})</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Bed className="w-3 h-3 text-slate-500" />
                  <span>{u.bedrooms} BHK</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-3 h-3 text-slate-500" />
                  <span>{u.bathrooms} Bath</span>
                </div>
                <div className="text-[10px] text-slate-500">{u.area_sqft} sqft</div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Monthly Rent</span>
                  <span className="font-bold text-emerald-400">₹{Number(u.monthly_rent).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Deposit</span>
                  <span className="font-bold text-indigo-300">₹{Number(u.security_deposit).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {u.tenant_name ? (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-300 font-semibold">{u.tenant_name}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{u.tenant_phone || u.tenant_email}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-500 italic">
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>Unoccupied — No tenant assigned</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Unit</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Select Floor *</label>
                <select
                  required
                  value={form.floor_id}
                  onChange={(e) => setForm({ ...form, floor_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Choose Property › Building › Floor --</option>
                  {floors.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                {floors.length === 0 && (
                  <p className="text-amber-400 text-[11px] mt-1">⚠ Add a property and building first via Properties page → View Tree.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Unit Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit 301"
                    value={form.unit_number}
                    onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Rent Due Day</label>
                  <input
                    type="number"
                    min={1} max={28}
                    value={form.rent_due_day}
                    onChange={(e) => setForm({ ...form, rent_due_day: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Bedrooms</label>
                  <input type="number" min={1} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Bathrooms</label>
                  <input type="number" min={1} value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Monthly Rent (₹) *</label>
                  <input type="number" required value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white" />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Maintenance (₹)</label>
                  <input type="number" value={form.maintenance_charge} onChange={(e) => setForm({ ...form, maintenance_charge: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white" />
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Security Deposit (₹)</label>
                <input type="number" value={form.security_deposit} onChange={(e) => setForm({ ...form, security_deposit: Number(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white" />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Create Unit
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
