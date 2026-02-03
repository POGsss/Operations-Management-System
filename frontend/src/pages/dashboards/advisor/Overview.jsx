import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiUsers, HiDocumentText, HiChip, HiCurrencyDollar, HiClipboardList, HiCheckCircle, HiDocument, HiClock } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Overview = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    estimates: { pending: 0, approved: 0, total: 0 },
    invoices: { total: 0, paid: 0, pending: 0, revenue: 0 },
    jobs: { total: 0, inProgress: 0 }
  });
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [recentEstimates, setRecentEstimates] = useState([]);

  useEffect(() => {
    if (session?.access_token) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [customersRes, estimatesRes, invoicesRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE}/api/customers`, { headers }),
        fetch(`${API_BASE}/api/estimates`, { headers }),
        fetch(`${API_BASE}/api/billing/invoices`, { headers }),
        fetch(`${API_BASE}/api/jobs`, { headers })
      ]);

      // Process customers
      if (customersRes.ok) {
        const customers = await customersRes.json();
        setStats(prev => ({ ...prev, customers: customers.length }));
        setRecentCustomers(customers.slice(0, 5));
      }

      // Process estimates
      if (estimatesRes.ok) {
        const estimates = await estimatesRes.json();
        const pending = estimates.filter(e => e.status === 'pending').length;
        const approved = estimates.filter(e => e.status === 'approved').length;
        setStats(prev => ({
          ...prev,
          estimates: { pending, approved, total: estimates.length }
        }));
        setRecentEstimates(estimates.filter(e => e.status === 'pending').slice(0, 5));
      }

      // Process invoices
      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const paid = invoices.filter(i => i.status === 'paid').length;
        const pending = invoices.filter(i => i.status === 'pending' || i.status === 'sent').length;
        const revenue = invoices
          .filter(i => i.status === 'paid')
          .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0);
        setStats(prev => ({
          ...prev,
          invoices: { total: invoices.length, paid, pending, revenue }
        }));
      }

      // Process jobs
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        const jobs = data.jobOrders || data || [];
        const inProgress = jobs.filter(j => j.status === 'in_progress').length;
        setStats(prev => ({
          ...prev,
          jobs: { total: jobs.length, inProgress }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Welcome, {user?.full_name}</h1>
        <p className="text-gray-600">Service advisor overview</p>
      </div>
      
      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={stats.customers}
          icon={<HiUsers className="w-6 h-6" />}
        />
        <MetricCard
          title="Active Estimates"
          value={stats.estimates.pending}
          icon={<HiDocumentText className="w-6 h-6" />}
        />
        <MetricCard
          title="Jobs In Progress"
          value={stats.jobs.inProgress}
          icon={<HiChip className="w-6 h-6" />}
        />
        <MetricCard
          title="Revenue (Paid)"
          value={formatCurrency(stats.invoices.revenue)}
          icon={<HiCurrencyDollar className="w-6 h-6" />}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Estimates"
          value={stats.estimates.total}
          icon={<HiClipboardList className="w-6 h-6" />}
        />
        <MetricCard
          title="Approved Estimates"
          value={stats.estimates.approved}
          icon={<HiCheckCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Total Invoices"
          value={stats.invoices.total}
          icon={<HiDocument className="w-6 h-6" />}
        />
        <MetricCard
          title="Pending Invoices"
          value={stats.invoices.pending}
          icon={<HiClock className="w-6 h-6" />}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Recent Customers</h3>
          {recentCustomers.length > 0 ? (
            <div className="space-y-4">
              {recentCustomers.map((customer, index) => (
                <div key={customer.id || index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-black">{customer.name}</p>
                    <p className="text-xs text-gray-600">{customer.email || customer.phone}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No customers yet</p>
          )}
        </div>

        {/* Pending Estimates */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Pending Estimates</h3>
          {recentEstimates.length > 0 ? (
            <div className="space-y-4">
              {recentEstimates.map((estimate, index) => (
                <div key={estimate.id || index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-black">
                      {estimate.estimate_number || `EST-${estimate.id?.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-600">{estimate.customer_name || 'Unknown customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-black">{formatCurrency(estimate.total_amount)}</p>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      {estimate.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No pending estimates</p>
          )}
        </div>
      </div>

      {/* Invoice Status Summary */}
      <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Invoice Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{stats.invoices.paid}</p>
            <p className="text-sm text-gray-600">Paid</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-3xl font-bold text-yellow-600">{stats.invoices.pending}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{stats.invoices.total}</p>
            <p className="text-sm text-gray-600">Total Invoices</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-black">{formatCurrency(stats.invoices.revenue)}</p>
            <p className="text-sm text-gray-600">Total Collected</p>
          </div>
        </div>
        {/* Progress bar */}
        {stats.invoices.total > 0 && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Collection Progress</span>
              <span className="font-semibold">
                {((stats.invoices.paid / stats.invoices.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${(stats.invoices.paid / stats.invoices.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
