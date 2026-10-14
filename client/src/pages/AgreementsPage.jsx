import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Calendar, ShieldCheck, Clock, Download, Plus, X, Sparkles } from 'lucide-react';
import axios from 'axios';

export default function AgreementsPage() {
  const { user } = useAuth();
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTerms, setSelectedTerms] = useState(null);

  const [formData, setFormData] = useState({
    unit_id: '',
    tenant_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    monthly_rent: 15000,
    security_deposit: 30000,
    notice_period_days: 30,
    agreement_text: ''
  });
  const [file, setFile] = useState(null);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    fetchAgreements();
    fetchUnits();
  }, []);

  const fetchAgreements = async () => {
    try {
      const res = await axios.get('/api/agreements');
      if (res.data.success) {
        setAgreements(res.data.agreements);
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

  const handleUpload = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (file) data.append('document', file);

    try {
      const res = await axios.post('/api/agreements/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setShowUploadModal(false);
        setFile(null);
        fetchAgreements();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to upload agreement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Rental Agreements & AI Document Understanding</span>
          </h1>
          <p className="text-xs text-slate-400">Store lease agreements and extract key terms automatically</p>
        </div>

        {user?.role === 'OWNER' && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:opacity-90 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Agreement Document</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading agreements...</div>
      ) : agreements.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Rental Agreements Recorded</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agreements.map((ag) => {
            const terms = typeof ag.extracted_terms_json === 'string'
              ? JSON.parse(ag.extracted_terms_json || '{}')
              : (ag.extracted_terms_json || {});

            return (
              <div key={ag.id} className="glass-card p-5 rounded-2xl space-y-4 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {user?.role === 'OWNER' ? ag.tenant_name : ag.owner_name}
                    </h3>
                    <p className="text-xs text-indigo-400 font-semibold">{ag.property_name} ({ag.unit_number})</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    ag.agreement_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {ag.agreement_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Monthly Rent</span>
                    <span className="font-bold text-emerald-400">₹{Number(ag.monthly_rent).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Security Deposit</span>
                    <span className="font-bold text-indigo-300">₹{Number(ag.security_deposit).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Start Date</span>
                    <span className="text-slate-300">{ag.start_date}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">End Date</span>
                    <span className="text-slate-300">{ag.end_date}</span>
                  </div>
                </div>

                {/* AI Extracted Highlights */}
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Extracted Key Clauses</span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>• Notice Period: <strong className="text-white">{ag.notice_period_days} Days</strong></div>
                    {terms.pet_policy && <div>• Pet Policy: {terms.pet_policy}</div>}
                    {terms.maintenance_rules && <div>• Maintenance: {terms.maintenance_rules}</div>}
                  </div>
                </div>

                {ag.document_url && (
                  <a
                    href={ag.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original Contract File</span>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Agreement Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleUpload} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Upload Agreement PDF</h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block">Select Unit *</label>
                <select
                  required
                  value={formData.unit_id}
                  onChange={(e) => {
                    const u = units.find(unit => unit.id === e.target.value);
                    setFormData({
                      ...formData,
                      unit_id: e.target.value,
                      tenant_id: u ? u.tenant_mapping_id : ''
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="">-- Choose Unit --</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.property_name} - {u.unit_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Select Agreement File (PDF/DOCX) *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-slate-300 text-xs bg-slate-800 border border-slate-700 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Paste Contract Text for AI Term Extraction</label>
                <textarea
                  rows={3}
                  placeholder="Paste agreement text here for AI clause extraction..."
                  value={formData.agreement_text}
                  onChange={(e) => setFormData({ ...formData, agreement_text: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Upload & Extract Agreement Terms
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
