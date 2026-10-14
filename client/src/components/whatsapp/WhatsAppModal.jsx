import React, { useState } from 'react';
import { MessageCircle, X, Copy, Check, Send } from 'lucide-react';
import axios from 'axios';

export default function WhatsAppModal({ isOpen, onClose, initialData = {} }) {
  const [msgType, setMsgType] = useState('MONTHLY_SUMMARY');
  const [data, setData] = useState({
    tenant_name: initialData.tenant_name || 'Rahul Verma',
    property_name: initialData.property_name || 'Green Heights Residency',
    unit_number: initialData.unit_number || 'Unit G01',
    rent_amount: initialData.rent_amount || 15000,
    maintenance_charge: initialData.maintenance_charge || 1500,
    total_due: initialData.total_due || 16500,
    total_paid: initialData.total_paid || 10000,
    remaining_balance: initialData.remaining_balance || 6500,
    due_date: initialData.due_date || '2026-10-05',
    status: initialData.status || 'PARTIAL',
    phone: initialData.phone || '+91 91234 56789'
  });

  const [generatedText, setGeneratedText] = useState('');
  const [waUrl, setWaUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/whatsapp/generate', { type: msgType, data });
      if (res.data.success) {
        setGeneratedText(res.data.text);
        setWaUrl(res.data.whatsapp_url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">WhatsApp Message Generator</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'MONTHLY_SUMMARY', label: 'Rent Summary' },
            { id: 'PENDING_REMINDER', label: 'Due Reminder' },
            { id: 'PAYMENT_CONFIRMATION', label: 'Payment Receipt' },
            { id: 'MAINTENANCE_UPDATE', label: 'Maintenance Ticket' },
            { id: 'DEPOSIT_SETTLEMENT', label: 'Deposit Settlement' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMsgType(t.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                msgType === t.id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-400 mb-1 block font-medium">Tenant Name</label>
            <input
              type="text"
              value={data.tenant_name}
              onChange={(e) => setData({ ...data, tenant_name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 mb-1 block font-medium">Phone Number</label>
            <input
              type="text"
              value={data.phone}
              onChange={(e) => setData({ ...data, phone: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 mb-1 block font-medium">Property & Unit</label>
            <input
              type="text"
              value={`${data.property_name} (${data.unit_number})`}
              onChange={(e) => setData({ ...data, property_name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
          <div>
            <label className="text-slate-400 mb-1 block font-medium">Remaining Balance (₹)</label>
            <input
              type="number"
              value={data.remaining_balance}
              onChange={(e) => setData({ ...data, remaining_balance: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{loading ? 'Formatting...' : 'Generate WhatsApp Text'}</span>
        </button>

        {/* Live Preview */}
        {generatedText && (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Message Preview:</span>
              <button
                onClick={handleCopy}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
              {generatedText}
            </pre>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Share Directly on WhatsApp</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
