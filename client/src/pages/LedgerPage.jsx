import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Plus, IndianRupee, CheckCircle2, AlertCircle, Clock, Upload, Eye, X } from 'lucide-react';
import axios from 'axios';

export default function LedgerPage() {
  const { user } = useAuth();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedObligation, setSelectedObligation] = useState(null);
  const [paymentsModal, setPaymentsModal] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'UPI',
    transaction_id: '',
    notes: ''
  });
  const [receiptFile, setReceiptFile] = useState(null);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const res = await axios.get('/api/ledger');
      if (res.data.success) {
        setLedger(res.data.ledger);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedObligation) return;

    const formData = new FormData();
    formData.append('obligation_id', selectedObligation.id);
    formData.append('amount_paid', paymentForm.amount_paid);
    formData.append('payment_date', paymentForm.payment_date);
    formData.append('payment_method', paymentForm.payment_method);
    formData.append('transaction_id', paymentForm.transaction_id);
    formData.append('notes', paymentForm.notes);
    if (receiptFile) {
      formData.append('receipt', receiptFile);
    }

    try {
      const res = await axios.post('/api/ledger/payments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setSelectedObligation(null);
        setReceiptFile(null);
        fetchLedger();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to record payment');
    }
  };

  const viewPaymentsHistory = async (ob) => {
    setPaymentsModal(ob);
    try {
      const res = await axios.get(`/api/ledger/obligations/${ob.id}/payments`);
      if (res.data.success) {
        setPaymentsList(res.data.payments);
      }
    } catch (e) {}
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PAID</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PARTIAL</span>;
      case 'OVERDUE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">OVERDUE</span>;
      case 'ADVANCE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">ADVANCE</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">PENDING</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span>Rent Ledger & Payment Gateway</span>
          </h1>
          <p className="text-xs text-slate-400">Track monthly rent obligations, partial payments, and receipts</p>
        </div>
      </div>

      {/* Ledger Obligations List */}
      {loading ? (
        <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Loading rent ledger...</div>
      ) : ledger.length === 0 ? (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-2">
          <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="text-sm font-bold text-slate-300">No Rent Obligations Found</div>
        </div>
      ) : (
        <div className="space-y-4">
          {ledger.map((ob) => {
            const progress = Math.min(100, Math.round((ob.total_paid / ob.total_due) * 100));

            return (
              <div key={ob.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-black text-white bg-slate-800 px-3 py-1 rounded-xl">
                      {ob.period_month}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {user?.role === 'OWNER' ? ob.tenant_name : ob.owner_name} ({ob.unit_number})
                      </h3>
                      <p className="text-xs text-slate-400">{ob.property_name} • Due: {ob.due_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(ob.status)}
                    <button
                      onClick={() => viewPaymentsHistory(ob)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                    {ob.remaining_balance > 0 && (
                      <button
                        onClick={() => {
                          setSelectedObligation(ob);
                          setPaymentForm({ ...paymentForm, amount_paid: ob.remaining_balance });
                        }}
                        className="px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-bold shadow-md hover:opacity-90 transition"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress & Amounts Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400">Total Rent & Maintenance</span>
                    <div className="text-base font-extrabold text-white">₹{ob.total_due.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Total Paid</span>
                    <div className="text-base font-extrabold text-emerald-400">₹{ob.total_paid.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400">Remaining Balance</span>
                    <div className={`text-base font-extrabold ${ob.remaining_balance > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      ₹{ob.remaining_balance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-400">Payment Fulfillment</span>
                    <span className="text-indigo-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full gradient-brand rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedObligation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRecordPayment} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Record Rent Payment</h3>
              <button type="button" onClick={() => setSelectedObligation(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div className="font-bold text-white">{selectedObligation.period_month} Rent Obligation</div>
              <div className="text-slate-400">Remaining Due: ₹{selectedObligation.remaining_balance.toLocaleString('en-IN')}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 mb-1 block font-medium">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 mb-1 block">Payment Method</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 mb-1 block">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Transaction Reference / UTR ID</label>
                <input
                  type="text"
                  placeholder="UPI/20261005/998811"
                  value={paymentForm.transaction_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 mb-1 block">Upload Payment Receipt Proof</label>
                <input
                  type="file"
                  onChange={(e) => setReceiptFile(e.target.files[0])}
                  className="w-full text-slate-300 text-xs bg-slate-800 border border-slate-700 rounded-xl p-2"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 rounded-xl gradient-brand text-white font-bold text-xs">
              Confirm & Save Payment
            </button>
          </form>
        </div>
      )}

      {/* Payment History Modal */}
      {paymentsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Payment History ({paymentsModal.period_month})</h3>
              <button onClick={() => setPaymentsModal(null)} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {paymentsList.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No payments recorded for this period yet.</p>
              ) : (
                paymentsList.map(p => (
                  <div key={p.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-emerald-400">₹{Number(p.amount_paid).toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-400">{p.payment_date} • {p.payment_method}</div>
                      {p.transaction_id && <div className="text-[10px] text-slate-500">Ref: {p.transaction_id}</div>}
                    </div>
                    {p.receipt_url && (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-indigo-400 underline text-[11px]">
                        View Receipt
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
