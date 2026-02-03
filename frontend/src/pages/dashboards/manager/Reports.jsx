import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiChip, HiCheckCircle, HiClock, HiChartBar, HiCurrencyDollar, HiDocument, HiCube, HiExclamationCircle, HiClipboardList, HiUserGroup } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Reports = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('jobs');
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (session?.access_token) {
      fetchReportData();
    }
  }, [session, activeReport, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const params = `?startDate=${dateRange.start}&endDate=${dateRange.end}`;

      let endpoint = '';
      switch (activeReport) {
        case 'jobs':
          endpoint = '/api/reports/jobs/summary';
          break;
        case 'inventory':
          endpoint = '/api/reports/inventory/value';
          break;
        case 'performance':
          endpoint = '/api/reports/performance/summary';
          break;
        case 'sales':
          endpoint = '/api/reports/sales/summary';
          break;
        default:
          endpoint = '/api/reports/jobs/summary';
      }

      const res = await fetch(`${API_BASE}${endpoint}${params}`, { headers });
      if (res.ok) {
        setReportData(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const params = `?startDate=${dateRange.start}&endDate=${dateRange.end}`;
      
      const res = await fetch(`${API_BASE}/api/reports/export/${type}${params}`, { headers });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const reportTypes = [
    { id: 'jobs', label: 'Job Orders', icon: '🔧' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'performance', label: 'Performance', icon: '📊' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Reports</h1>
          <p className="text-gray-600">Branch analytics and reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={() => handleExport(activeReport)}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 flex items-center gap-2"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setActiveReport(type.id)}
            className={`p-4 rounded-lg border-2 transition-all ${
              activeReport === type.id
                ? 'border-black bg-black text-white'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <span className="text-2xl">{type.icon}</span>
            <p className="mt-2 font-medium">{type.label}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {/* Jobs Report */}
          {activeReport === 'jobs' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Jobs" value={reportData.total_jobs || 0} icon={<HiChip className="w-6 h-6" />} />
                <MetricCard title="Completed" value={reportData.completed_jobs || 0} icon={<HiCheckCircle className="w-6 h-6" />} />
                <MetricCard title="In Progress" value={reportData.in_progress_jobs || 0} icon={<HiClock className="w-6 h-6" />} />
                <MetricCard title="Completion Rate" value={`${(reportData.completion_rate || 0).toFixed(1)}%`} icon={<HiChartBar className="w-6 h-6" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Jobs by Status</h3>
                  <div className="space-y-3">
                    {reportData.by_status?.map((status, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="capitalize">{status.status?.replace('_', ' ') || 'Unknown'}</span>
                        <span className="font-semibold">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Jobs by Priority</h3>
                  <div className="space-y-3">
                    {reportData.by_priority?.map((p, idx) => {
                      const colors = {
                        high: 'bg-red-100 text-red-800',
                        medium: 'bg-yellow-100 text-yellow-800',
                        low: 'bg-green-100 text-green-800'
                      };
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className={`px-2 py-1 rounded text-sm capitalize ${colors[p.priority] || 'bg-gray-100'}`}>
                            {p.priority || 'Normal'}
                          </span>
                          <span className="font-semibold">{p.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Report */}
          {activeReport === 'sales' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Revenue" value={formatCurrency(reportData.total_revenue)} icon={<HiCurrencyDollar className="w-6 h-6" />} />
                <MetricCard title="Total Invoices" value={reportData.total_invoices || 0} icon={<HiDocument className="w-6 h-6" />} />
                <MetricCard title="Paid Invoices" value={reportData.paid_invoices || 0} icon={<HiCheckCircle className="w-6 h-6" />} />
                <MetricCard title="Avg Invoice" value={formatCurrency(reportData.avg_invoice_value)} icon={<HiChartBar className="w-6 h-6" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Revenue Breakdown</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Labor</span>
                      <span className="font-semibold">{formatCurrency(reportData.labor_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Parts</span>
                      <span className="font-semibold">{formatCurrency(reportData.parts_revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other</span>
                      <span className="font-semibold">{formatCurrency(reportData.other_revenue)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border border-gray-200 lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Collection Status</h3>
                  <div className="flex items-center gap-8">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${reportData.total_invoices > 0
                              ? (reportData.paid_invoices / reportData.total_invoices) * 100
                              : 0}%`
                          }}
                        ></div>
                      </div>
                      <div className="mt-2 flex justify-between text-sm text-gray-600">
                        <span>Collected</span>
                        <span>Outstanding</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold">
                        {reportData.total_invoices > 0
                          ? ((reportData.paid_invoices / reportData.total_invoices) * 100).toFixed(1)
                          : 0}%
                      </p>
                      <p className="text-sm text-gray-600">Collection Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventory Report */}
          {activeReport === 'inventory' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Items" value={reportData.total_items || 0} icon={<HiCube className="w-6 h-6" />} />
                <MetricCard title="Total Value" value={formatCurrency(reportData.total_value)} icon={<HiCurrencyDollar className="w-6 h-6" />} />
                <MetricCard title="Low Stock Items" value={reportData.low_stock_count || 0} icon={<HiExclamationCircle className="w-6 h-6" />} />
                <MetricCard title="Categories" value={reportData.categories?.length || 0} icon={<HiClipboardList className="w-6 h-6" />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Value by Category</h3>
                  {reportData.categories?.length > 0 ? (
                    <div className="space-y-3">
                      {reportData.categories.slice(0, 8).map((cat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                          <span className="capitalize">{cat.category || 'Uncategorized'}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{cat.item_count} items</span>
                            <span className="font-semibold">{formatCurrency(cat.total_value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No category data</p>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Low Stock Alert</h3>
                  {reportData.low_stock?.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {reportData.low_stock.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-600 font-semibold">{item.quantity} left</p>
                            <p className="text-sm text-gray-500">Min: {item.min_stock}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-green-600">
                      <span className="text-4xl">✓</span>
                      <p className="mt-2">All items are well stocked</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Performance Report */}
          {activeReport === 'performance' && reportData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Hours" value={`${(reportData.total_hours || 0).toFixed(1)}h`} icon={<HiClock className="w-6 h-6" />} />
                <MetricCard title="Billable Hours" value={`${(reportData.billable_hours || 0).toFixed(1)}h`} icon={<HiCurrencyDollar className="w-6 h-6" />} />
                <MetricCard title="Active Staff" value={reportData.active_mechanics || 0} icon={<HiUserGroup className="w-6 h-6" />} />
                <MetricCard title="Labor Revenue" value={formatCurrency(reportData.labor_revenue)} icon={<HiCurrencyDollar className="w-6 h-6" />} />
              </div>

              <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Staff Performance</h3>
                {reportData.by_mechanic?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Staff Member</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Total Hours</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Billable</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Jobs</th>
                          <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Efficiency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.by_mechanic.map((staff, idx) => {
                          const efficiency = staff.total_hours > 0
                            ? (staff.billable_hours / staff.total_hours) * 100
                            : 0;
                          return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    {(staff.mechanic_name || 'U')[0].toUpperCase()}
                                  </div>
                                  <span className="font-medium">{staff.mechanic_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">{(staff.total_hours || 0).toFixed(1)}h</td>
                              <td className="py-3 px-2 text-right">{(staff.billable_hours || 0).toFixed(1)}h</td>
                              <td className="py-3 px-2 text-right">{staff.jobs_worked || 0}</td>
                              <td className="py-3 px-2 text-right">
                                <span className={`px-2 py-1 rounded text-sm ${
                                  efficiency >= 80 ? 'bg-green-100 text-green-800' :
                                  efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {efficiency.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No performance data for selected period</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
