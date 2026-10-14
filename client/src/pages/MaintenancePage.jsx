import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, Plus, AlertCircle, Clock, CheckCircle2, Upload, Camera, X } from 'lucide-react';
import axios from 'axios';

export default function MaintenancePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    unit_id: '',
    title: '',
    description: '',
    category: 'PLUMBING',
    priority: 'HIGH'
  });
  const [file, setFile] = useState(null);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    fetchRequests();
    if (user?.role === 'OWNER') fetchUnits();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/maintenance');
      if (res.data.success) {
        setRequests(res.data.maintenance_requests);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await axios.get('/api/units');
      if (res.data.success) setUnits(res.data.units);
    } catch (e) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(form).forEach(k => data.append(k, form[k]));
    if (file) data.append('evidence', file);

    try {
      const res = await axios.post('/api/maintenance', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setShowModal(false);
        setFile(null);
        fetchRequests();
      }
    } catch (e) {
      alert('Failed to report issue');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await axios.patch(`/api/maintenance/${id}/status`, { status });
      if (res.data.success) fetchRequests();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">{p}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <span>Maintenance & Work Orders</span>
          </h1>
          <p className="text-xs text-slate-400">Report repairs, upload photo evidence, and track status lifecycle</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Report Maintenance Issue</span>
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading maintenance tickets...</div>
      ) : requests.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Maintenance Tickets Found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((m) => (
            <div key={m.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {getPriorityBadge(m.priority)}
                  <h3 className="text-sm font-bold text-white">{m.title}</h3>
                  <span className="text-xs text-indigo-400">({m.unit_number})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Reported: {m.reported_date}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    m.status === 'RESOLVED' || m.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {m.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300">{m.description}</p>

              {/* Evidence Photos */}
              {m.evidence_files && m.evidence_files.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  {m.evidence_files.map((ev) => (
                    <a key={ev.id} href={ev.file_url} target="_blank" rel="noreferrer" className="block w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      <img src={ev.file_url} alt={ev.title} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              {/* Status Updater for Owner */}
              {user?.role === 'OWNER' && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Update Ticket Status:</span>
                  {['REPORTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatus(m.id, st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        m.status === st ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Report Maintenance Issue</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {user?.role === 'OWNER' && (
                <div>
                  <label className="text-slate-400 mb-1 block">Select Unit *</label>
                  <select
                    required
                    value={form.unit_id}
                    onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="">-- Choose Unit --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>{u.property_name} - {u.unit_number}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-400 mb-1 block">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bathroom Pipe Leakage"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="APPLIANCE">Appliance</option>
                    <option value="STRUCTURAL">Structural</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Priority Level</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide details about the issue..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Attach Photo Evidence</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-slate-300 text-xs bg-slate-800 border border-slate-700 rounded-xl p-2"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Submit Ticket
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
