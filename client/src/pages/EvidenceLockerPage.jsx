import React, { useState, useEffect } from 'react';
import { Camera, Upload, Eye, Image as ImageIcon, FileText, Plus, X } from 'lucide-react';
import axios from 'axios';

export default function EvidenceLockerPage() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [form, setForm] = useState({ title: '', description: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchEvidence();
  }, []);

  const fetchEvidence = async () => {
    try {
      const res = await axios.get('/api/evidence');
      if (res.data.success) {
        setEvidenceList(res.data.evidence);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const data = new FormData();
    data.append('title', form.title);
    data.append('description', form.description);
    data.append('file', file);

    try {
      const res = await axios.post('/api/evidence/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setShowUploadModal(false);
        setFile(null);
        fetchEvidence();
      }
    } catch (e) {
      alert('Failed to upload evidence');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <span>Evidence Locker</span>
          </h1>
          <p className="text-xs text-slate-400">Secure timeline of photos, payment receipts, screenshots, and repair proofs</p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Evidence File</span>
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading Evidence Locker...</div>
      ) : evidenceList.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <Camera className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">Evidence Locker Empty</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {evidenceList.map((item) => (
            <div key={item.id} className="glass-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col justify-between">
              <div className="h-44 bg-slate-950 relative overflow-hidden group">
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-full bg-slate-900/90 text-white hover:bg-indigo-600 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="p-4 space-y-1">
                <h3 className="text-xs font-bold text-white truncate">{item.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">{item.description || 'Uploaded proof item'}</p>
                <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                  <span>By: {item.uploaded_by || 'User'}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add File to Evidence Locker</h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bathroom Leakage Photo"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes about this proof..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Upload File (Image/PDF) *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-slate-300 text-xs bg-slate-800 border border-slate-700 rounded-xl p-2"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Upload Evidence
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
