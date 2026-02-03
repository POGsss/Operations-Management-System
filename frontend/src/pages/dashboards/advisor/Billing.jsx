import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiPlus,
  HiPencil,
  HiX,
  HiDocumentText,
  HiCheck,
  HiClock,
  HiCash,
  HiCreditCard,
  HiSearch,
  HiEye,
  HiPaperAirplane,
  HiRefresh,
  HiExclamation,
  HiBan,
  HiReceiptRefund,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500' },
  refunded: { label: 'Refunded', color: 'bg-orange-100 text-orange-700' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

const Billing = () => {
  const { session, user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('invoices');

  // Data state
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);

  // Form state
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: '', job_order_id: '',
    customer_name: '', customer_email: '', customer_phone: '', customer_address: '',
    vehicle_info: '', due_date: '', tax_rate: '0.08', notes: '', terms: ''
  });
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '', amount: '', payment_method: 'cash', payment_date: '', reference_number: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, limit: 15 });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/billing/invoices?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments
  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_URL}/billing/payments?limit=50`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [customersRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/customers`, { headers: { Authorization: `Bearer ${session?.access_token}` } }),
        fetch(`${API_URL}/jobs?status=COMPLETED`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      ]);
      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobOrders || []);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchInvoices();
      fetchPayments();
      fetchReferenceData();
    }
  }, [session, statusFilter, currentPage]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    const collected = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    const outstanding = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
    const todayPayments = payments
      .filter(p => p.payment_date === new Date().toISOString().split('T')[0])
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    return { total, collected, outstanding, todayPayments };
  }, [invoices, payments]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(term) ||
      inv.customer_name?.toLowerCase().includes(term) ||
      inv.customer?.full_name?.toLowerCase().includes(term)
    );
  }, [invoices, searchTerm]);

  // View invoice detail
  const viewInvoiceDetails = async (invoice) => {
    try {
      const res = await fetch(`${API_URL}/billing/invoices/${invoice.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      const data = await res.json();
      setDetailInvoice(data.invoice);
      setShowDetailModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Open create invoice from job
  const openCreateFromJob = async (jobId) => {
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/billing/invoices/from-job/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ tax_rate: 0.08, due_days: 30 })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Invoice created from job order!');
      fetchInvoices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Send invoice
  const handleSendInvoice = async (invoice) => {
    try {
      const res = await fetch(`${API_URL}/billing/invoices/${invoice.id}/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Invoice sent!');
      fetchInvoices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Cancel invoice
  const handleCancelInvoice = async (invoice) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      const res = await fetch(`${API_URL}/billing/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Invoice cancelled.');
      fetchInvoices();
      if (showDetailModal) setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Open payment modal
  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      invoice_id: invoice.id,
      amount: invoice.balance_due?.toString() || '',
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  // Record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/billing/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount)
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Payment recorded!');
      setShowPaymentModal(false);
      fetchInvoices();
      fetchPayments();
      if (showDetailModal) {
        viewInvoiceDetails({ id: paymentForm.invoice_id });
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—';

  if (loading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Billing</h1>
          <p className="text-gray-600">Manage invoices and payments</p>
        </div>
        <div className="flex space-x-2">
          <select
            onChange={(e) => { if (e.target.value) openCreateFromJob(e.target.value); e.target.value = ''; }}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Create Invoice from Job...</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>
                {job.customer?.full_name || 'Unknown'} - {job.vehicle_plate || job.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Invoiced" value={formatCurrency(stats.total)} icon={<HiDocumentText />} />
        <MetricCard title="Collected" value={formatCurrency(stats.collected)} icon={<HiCheck />} />
        <MetricCard title="Outstanding" value={formatCurrency(stats.outstanding)} icon={<HiClock />} />
        <MetricCard title="Today's Payments" value={formatCurrency(stats.todayPayments)} icon={<HiCash />} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'invoices', label: 'Invoices' },
            { id: 'payments', label: 'Recent Payments' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <HiSearch className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <button onClick={fetchInvoices} className="p-2 hover:bg-gray-100 rounded-lg">
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map(invoice => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
                    <td className="px-4 py-3">
                      <div>{invoice.customer_name || invoice.customer?.full_name || '—'}</div>
                      {invoice.vehicle_info && <div className="text-xs text-gray-500">{invoice.vehicle_info}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDate(invoice.invoice_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(invoice.total_amount)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${parseFloat(invoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(invoice.balance_due)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[invoice.status]?.color}`}>
                        {STATUS_CONFIG[invoice.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => viewInvoiceDetails(invoice)} className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <HiEye className="w-4 h-4 text-gray-600" />
                        </button>
                        {invoice.status === 'draft' && (
                          <button onClick={() => handleSendInvoice(invoice)} className="p-2 hover:bg-blue-50 rounded-lg" title="Send">
                            <HiPaperAirplane className="w-4 h-4 text-blue-600" />
                          </button>
                        )}
                        {['sent', 'partial', 'overdue'].includes(invoice.status) && parseFloat(invoice.balance_due) > 0 && (
                          <button onClick={() => openPaymentModal(invoice)} className="p-2 hover:bg-green-50 rounded-lg" title="Record Payment">
                            <HiCash className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        {!['paid', 'cancelled', 'refunded'].includes(invoice.status) && parseFloat(invoice.amount_paid) === 0 && (
                          <button onClick={() => handleCancelInvoice(invoice)} className="p-2 hover:bg-red-50 rounded-lg" title="Cancel">
                            <HiBan className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No invoices found</td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                <div className="flex space-x-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{payment.payment_number}</td>
                  <td className="px-4 py-3">{payment.invoice?.invoice_number || '—'}</td>
                  <td className="px-4 py-3">{payment.invoice?.customer_name || '—'}</td>
                  <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                  <td className="px-4 py-3 capitalize">
                    <span className="flex items-center">
                      <HiCreditCard className="w-4 h-4 mr-1 text-gray-400" />
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(payment.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.received_by_user?.full_name || '—'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetailModal && detailInvoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-black">{detailInvoice.invoice_number}</h2>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-1 ${STATUS_CONFIG[detailInvoice.status]?.color}`}>
                  {STATUS_CONFIG[detailInvoice.status]?.label}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Customer & Invoice Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Bill To</h4>
                    <p className="text-gray-800">{detailInvoice.customer_name}</p>
                    {detailInvoice.customer_email && <p className="text-sm text-gray-600">{detailInvoice.customer_email}</p>}
                    {detailInvoice.customer_phone && <p className="text-sm text-gray-600">{detailInvoice.customer_phone}</p>}
                    {detailInvoice.customer_address && <p className="text-sm text-gray-600">{detailInvoice.customer_address}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Invoice Date: <span className="text-gray-800">{formatDate(detailInvoice.invoice_date)}</span></p>
                    <p className="text-sm text-gray-600">Due Date: <span className="text-gray-800">{formatDate(detailInvoice.due_date)}</span></p>
                    {detailInvoice.vehicle_info && <p className="text-sm text-gray-600 mt-2">Vehicle: <span className="text-gray-800">{detailInvoice.vehicle_info}</span></p>}
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="font-medium mb-2">Items</h4>
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(detailInvoice.items || []).map(item => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${item.item_type === 'labor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {item.item_type}
                            </span>
                            {item.name}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Labor:</span><span>{formatCurrency(detailInvoice.labor_total)}</span></div>
                    <div className="flex justify-between"><span>Parts:</span><span>{formatCurrency(detailInvoice.parts_total)}</span></div>
                    {parseFloat(detailInvoice.discount_amount) > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{formatCurrency(detailInvoice.discount_amount)}</span></div>}
                    <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>{formatCurrency(detailInvoice.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Tax ({(parseFloat(detailInvoice.tax_rate || 0) * 100).toFixed(1)}%):</span><span>{formatCurrency(detailInvoice.tax_amount)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total:</span><span>{formatCurrency(detailInvoice.total_amount)}</span></div>
                    <div className="flex justify-between text-green-600"><span>Paid:</span><span>{formatCurrency(detailInvoice.amount_paid)}</span></div>
                    <div className={`flex justify-between font-bold ${parseFloat(detailInvoice.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      <span>Balance Due:</span><span>{formatCurrency(detailInvoice.balance_due)}</span>
                    </div>
                  </div>
                </div>

                {/* Payments */}
                {detailInvoice.payments && detailInvoice.payments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Payment History</h4>
                    <div className="space-y-2">
                      {detailInvoice.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm bg-green-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{p.payment_number}</span>
                            <span className="mx-2 text-gray-600">•</span>
                            <span className="capitalize">{p.payment_method.replace('_', ' ')}</span>
                            {p.reference_number && <span className="ml-2 text-gray-500">Ref: {p.reference_number}</span>}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
                            <span className="text-gray-500">{formatDate(p.payment_date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t bg-white flex-shrink-0">
              {detailInvoice.status === 'draft' && (
                <button onClick={() => { handleSendInvoice(detailInvoice); setShowDetailModal(false); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
                  Send Invoice
                </button>
              )}
              {['sent', 'partial', 'overdue'].includes(detailInvoice.status) && parseFloat(detailInvoice.balance_due) > 0 && (
                <button onClick={() => { openPaymentModal(detailInvoice); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium">
                  Record Payment
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">Record Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Invoice: <span className="font-medium text-gray-800">{selectedInvoice.invoice_number}</span></p>
                <p className="text-sm text-gray-600">Customer: <span className="font-medium text-gray-800">{selectedInvoice.customer_name || selectedInvoice.customer?.full_name}</span></p>
                <p className="text-sm text-gray-600">Balance Due: <span className="font-medium text-red-600">{formatCurrency(selectedInvoice.balance_due)}</span></p>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    max={parseFloat(selectedInvoice.balance_due)}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    required
                  >
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    placeholder="Check #, Auth code, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    rows={2}
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
