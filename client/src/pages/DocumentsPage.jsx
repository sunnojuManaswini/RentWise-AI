import React, { useState, useEffect } from 'react';
import { FolderArchive, Upload, Download, Trash2, FileText, Search, Plus, X } from 'lucide-react';
import axios from 'axios';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ title: '', doc_type: 'RECEIPT' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await axios.get('/api/documents');
      if (res.data.success) {
        setDocuments(res.data.documents);
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
    data.append('doc_type', form.doc_type);
    data.append('file', file);

    try {
      const res = await axios.post('/api/documents/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setShowModal(false);
        setFile(null);
        fetchDocs();
      }
    } catch (e) {
      alert('Failed to upload document');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`/api/documents/${id}`);
      fetchDocs();
    } catch (e) {}
  };

  const filtered = documents.filter(d =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.doc_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-indigo-400" />
            <span>Document Repository</span>
          </h1>
          <p className="text-xs text-slate-400">Categorized vault for agreements, receipts, bills, and payment proofs</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Filter documents by title or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading documents...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <FolderArchive className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Documents Found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="glass-card p-5 rounded-2xl space-y-3 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                    {doc.doc_type}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : ''}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white leading-snug">{doc.title}</h3>
                <div className="text-[10px] text-slate-400">Uploaded by: {doc.uploaded_by}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Upload Document</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October Maintenance Bill"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Document Type</label>
                <select
                  value={form.doc_type}
                  onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="AGREEMENT">Agreement</option>
                  <option value="RECEIPT">Rent Receipt</option>
                  <option value="PAYMENT_PROOF">Payment Proof</option>
                  <option value="BILL">Utility Bill</option>
                  <option value="PHOTO">Photo</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Select File *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-slate-300 text-xs bg-slate-800 border border-slate-700 rounded-xl p-2"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Save to Repository
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
