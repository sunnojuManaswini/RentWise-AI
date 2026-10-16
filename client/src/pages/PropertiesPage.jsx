import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, MapPin, Bed, Bath, Maximize2, Layers, X, Check } from 'lucide-react';
import axios from 'axios';
const API_BASE = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '') + '/api';

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPropertyTree, setSelectedPropertyTree] = useState(null);

  const [formData, setFormData] = useState({
    name: '', property_type: 'APARTMENT', house_flat_no: '', block: '', street: '',
    road: '', locality: '', city: '', state: '', country: 'India', pin_code: '',
    bedrooms: 2, bathrooms: 2, area_sqft: 1200, parking_available: true, elevator_available: true
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await axios.get(`${API_BASE}/properties`);
      if (res.data.success) {
        setProperties(res.data.properties);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
     const res = await axios.post(`${API_BASE}/properties`, formData);
      if (res.data.success) {
        setShowAddModal(false);
        fetchProperties();
        setFormData({
          name: '', property_type: 'APARTMENT', house_flat_no: '', block: '', street: '',
          road: '', locality: '', city: '', state: '', country: 'India', pin_code: '',
          bedrooms: 2, bathrooms: 2, area_sqft: 1200, parking_available: true, elevator_available: true
        });
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to create property');
    }
  };

  const loadTree = async (propId) => {
    try {
      const res = await axios.get(`${API_BASE}/properties/${propId}/tree`);
      if (res.data.success) {
        setSelectedPropertyTree(res.data.property);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Properties Portfolio</span>
          </h1>
          <p className="text-xs text-slate-400">Manage real estate assets, buildings, and location hierarchy</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </button>
        )}
      </div>

      {/* Property Cards List */}
      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Properties Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isOwner ? 'Add your first property to organize buildings, floors, and units.' : 'You currently have no assigned property records.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => (
            <div key={prop.id} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                    {prop.property_type}
                  </span>
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{prop.city}, {prop.state}</span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white">{prop.name}</h3>
                <p className="text-xs text-slate-400">
                  {[prop.house_flat_no, prop.block, prop.street, prop.locality].filter(Boolean).join(', ')}
                </p>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{prop.bedrooms} BHK</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{prop.bathrooms} Bath</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{prop.area_sqft} sqft</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
                <div className="text-slate-400">
                  <span className="font-bold text-white">{prop.total_units || 0}</span> Units ({prop.occupied_units || 0} Occupied)
                </div>
                <button
                  onClick={() => loadTree(prop.id)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold flex items-center gap-1 transition"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>View Tree</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Property</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyderabad Green Heights"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Property Type</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="APARTMENT">Apartment</option>
                    <option value="INDEPENDENT_HOUSE">Independent House</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="VILLA">Villa</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Locality</label>
                  <input
                    type="text"
                    placeholder="Banjara Hills"
                    value={formData.locality}
                    onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Hyderabad"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Telangana"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Save Property
            </button>
          </form>
        </div>
      )}

      {/* Property Hierarchy Tree Modal */}
      {selectedPropertyTree && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedPropertyTree.name}</h3>
                <p className="text-xs text-slate-400">{selectedPropertyTree.city}, {selectedPropertyTree.state}</p>
              </div>
              <button onClick={() => setSelectedPropertyTree(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tree hierarchy viewer */}
            <div className="space-y-4">
              {selectedPropertyTree.buildings?.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="font-bold text-xs text-indigo-400">🏢 Building: {b.name}</div>
                  <div className="pl-4 space-y-2 border-l border-slate-800">
                    {b.floors?.map((f) => (
                      <div key={f.id} className="space-y-1">
                        <div className="text-[11px] font-semibold text-slate-300">📌 {f.name}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-4">
                          {f.units?.map((u) => (
                            <div key={u.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                              <div className="font-bold text-white">{u.unit_number}</div>
                              <div className="text-[10px] text-slate-400">₹{Number(u.monthly_rent).toLocaleString('en-IN')}/mo</div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                u.status === 'OCCUPIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                              }`}>
                                {u.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
