import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiCurrencyDollar,
  HiTrendingUp,
  HiDocumentText,
  HiRefresh,
  HiDownload,
  HiChartPie,
  HiCollection,
  HiX,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const SalesReports = () => {
  const { session } = useAuth();

  // Data
  const [salesSummary, setSalesSummary] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedBranch, setSelectedBranch] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('summary');

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      if (selectedBranch) params.append('branch_id', selectedBranch);

      const [summaryRes, breakdownRes] = await Promise.all([
        fetch(`${API_URL}/reports/sales/summary?${params}`, { headers }),
        fetch(`${API_URL}/reports/sales/breakdown?${params}`, { headers })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSalesSummary(data);
      }
      if (breakdownRes.ok) {
        const data = await breakdownRes.json();
        setBreakdown(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    }
  }, [session, dateRange, selectedBranch]);

  // Export CSV
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      const res = await fetch(`${API_URL}/reports/export/sales?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_report_${dateRange.start}_${dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-black mb-2">Sales Reports</h1>
          <p className="text-gray-600">Comprehensive sales analytics and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" title="Refresh">
            <HiRefresh className="w-5 h-5" />
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2">
            <HiDownload className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(salesSummary?.totals?.total_revenue)}
          icon={<HiCurrencyDollar />}
        />
        <MetricCard
          title="Amount Collected"
          value={formatCurrency(salesSummary?.totals?.amount_collected)}
          icon={<HiTrendingUp />}
        />
        <MetricCard
          title="Invoice Count"
          value={salesSummary?.totals?.invoice_count?.toString() || '0'}
          icon={<HiDocumentText />}
        />
        <MetricCard
          title="Average Ticket"
          value={formatCurrency(salesSummary?.totals?.average_ticket)}
          icon={<HiChartPie />}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'summary', label: 'Summary' },
            { id: 'breakdown', label: 'Revenue Breakdown' },
            { id: 'daily', label: 'Daily Trend' },
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

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Split */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <h3 className="text-xl font-bold text-black mb-4">Revenue Split</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Labor Revenue</span>
                  <span className="font-semibold">{formatCurrency(salesSummary?.totals?.labor_revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full" 
                    style={{ width: `${(parseFloat(salesSummary?.totals?.labor_revenue || 0) / parseFloat(salesSummary?.totals?.total_revenue || 1) * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Parts Revenue</span>
                  <span className="font-semibold">{formatCurrency(salesSummary?.totals?.parts_revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full" 
                    style={{ width: `${(parseFloat(salesSummary?.totals?.parts_revenue || 0) / parseFloat(salesSummary?.totals?.total_revenue || 1) * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tax Collected</span>
                  <span className="font-semibold">{formatCurrency(salesSummary?.totals?.tax_collected)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-yellow-600 h-3 rounded-full" 
                    style={{ width: `${(parseFloat(salesSummary?.totals?.tax_collected || 0) / parseFloat(salesSummary?.totals?.total_revenue || 1) * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* By Branch */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <h3 className="text-xl font-bold text-black mb-4">Revenue by Branch</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {salesSummary?.byBranch?.map((branch, index) => (
                <div key={index} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium">{branch.branch}</p>
                    <p className="text-sm text-gray-500">{branch.count} invoices</p>
                  </div>
                  <p className="font-bold">{formatCurrency(branch.revenue)}</p>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No data</p>
              )}
            </div>
          </div>

          {/* Collection Status */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200 lg:col-span-2">
            <h3 className="text-xl font-bold text-black mb-4">Collection Status</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{formatCurrency(salesSummary?.totals?.amount_collected)}</p>
                <p className="text-sm text-gray-600 mt-1">Collected</p>
                <p className="text-xs text-green-600 mt-1">
                  {((parseFloat(salesSummary?.totals?.amount_collected || 0) / parseFloat(salesSummary?.totals?.total_revenue || 1)) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{formatCurrency(salesSummary?.totals?.outstanding)}</p>
                <p className="text-sm text-gray-600 mt-1">Outstanding</p>
                <p className="text-xs text-red-600 mt-1">
                  {((parseFloat(salesSummary?.totals?.outstanding || 0) / parseFloat(salesSummary?.totals?.total_revenue || 1)) * 100).toFixed(1)}% pending
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(salesSummary?.totals?.total_revenue)}</p>
                <p className="text-sm text-gray-600 mt-1">Total Invoiced</p>
                <p className="text-xs text-blue-600 mt-1">{salesSummary?.totals?.invoice_count || 0} invoices</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Tab */}
      {activeTab === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Type */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <h3 className="text-xl font-bold text-black mb-4">Revenue by Type</h3>
            <div className="space-y-4">
              {breakdown?.byType?.map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${
                      item.type === 'labor' ? 'bg-blue-500' :
                      item.type === 'part' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium capitalize">{item.type}</p>
                      <p className="text-sm text-gray-500">{item.count} items</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatCurrency(item.revenue)}</p>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No data</p>
              )}
            </div>
          </div>

          {/* Top Items */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <h3 className="text-xl font-bold text-black mb-4">Top Selling Items</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {breakdown?.topItems?.map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{item.type} • Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(item.revenue)}</p>
                </div>
              )) || (
                <p className="text-gray-500 text-center py-4">No data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Trend Tab */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Daily Revenue Trend</h3>
          {salesSummary?.daily?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <div className="flex items-end space-x-1 h-64 min-w-max pb-8">
                  {salesSummary.daily.map((day, index) => {
                    const maxRevenue = Math.max(...salesSummary.daily.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={index} className="flex flex-col items-center flex-shrink-0" style={{ width: '50px' }}>
                        <div 
                          className="w-8 bg-black rounded-t hover:bg-gray-700 transition-colors cursor-pointer group relative"
                          style={{ height: `${Math.max(height, 2)}%` }}
                        >
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                            {formatCurrency(day.revenue)}
                            <br />
                            {day.count} invoices
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Table */}
              <div className="mt-8 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Invoices</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salesSummary.daily.map((day, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(day.revenue)}</td>
                        <td className="px-4 py-3 text-right">{day.count}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(day.count > 0 ? day.revenue / day.count : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No daily data for selected period
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesReports;
