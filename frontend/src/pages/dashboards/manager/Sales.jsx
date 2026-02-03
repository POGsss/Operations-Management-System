import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiCurrencyDollar, HiDocument, HiCheckCircle, HiChartBar } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Sales = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesBreakdown, setBreakdown] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (session?.access_token) {
      fetchSalesData();
    }
  }, [session, dateRange]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const params = `?startDate=${dateRange.start}&endDate=${dateRange.end}`;

      const [summaryRes, breakdownRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/sales/summary${params}`, { headers }),
        fetch(`${API_BASE}/api/reports/sales/breakdown${params}`, { headers })
      ]);

      if (summaryRes.ok) setSalesSummary(await summaryRes.json());
      if (breakdownRes.ok) setBreakdown(await breakdownRes.json());
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const formatPercent = (val) => `${(val || 0).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Sales</h1>
          <p className="text-gray-600">Branch sales metrics and analysis</p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {['summary', 'breakdown', 'trends'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && salesSummary && (
        <>
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(salesSummary.total_revenue)}
              icon={<HiCurrencyDollar className="w-6 h-6" />}
              trend={salesSummary.revenue_change > 0 ? 'up' : 'down'}
              trendValue={`${Math.abs(salesSummary.revenue_change || 0).toFixed(1)}% vs last period`}
            />
            <MetricCard
              title="Total Invoices"
              value={salesSummary.total_invoices || 0}
              icon={<HiDocument className="w-6 h-6" />}
            />
            <MetricCard
              title="Paid Invoices"
              value={salesSummary.paid_invoices || 0}
              icon={<HiCheckCircle className="w-6 h-6" />}
            />
            <MetricCard
              title="Collection Rate"
              value={formatPercent((salesSummary.paid_invoices / salesSummary.total_invoices) * 100)}
              icon={<HiChartBar className="w-6 h-6" />}
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-black mb-4">Revenue Sources</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Labor</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(salesSummary.labor_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Parts</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(salesSummary.parts_revenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">Other</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(salesSummary.other_revenue)}</span>
                </div>
              </div>
              {/* Progress bars */}
              <div className="mt-6 space-y-2">
                {['labor', 'parts', 'other'].map((type, idx) => {
                  const value = salesSummary[`${type}_revenue`] || 0;
                  const total = salesSummary.total_revenue || 1;
                  const percent = (value / total) * 100;
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[idx]}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">{percent.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-black mb-4">Invoice Status</h3>
              <div className="space-y-3">
                {[
                  { label: 'Paid', value: salesSummary.paid_invoices, color: 'bg-green-100 text-green-800' },
                  { label: 'Pending', value: salesSummary.total_invoices - salesSummary.paid_invoices, color: 'bg-yellow-100 text-yellow-800' },
                  { label: 'Overdue', value: salesSummary.overdue_invoices || 0, color: 'bg-red-100 text-red-800' }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">{item.label}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Invoice Value</span>
                  <span className="text-xl font-bold text-black">
                    {formatCurrency(salesSummary.avg_invoice_value)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'breakdown' && salesBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Service Type */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-4">Revenue by Service Type</h3>
            {salesBreakdown.by_service?.length > 0 ? (
              <div className="space-y-3">
                {salesBreakdown.by_service.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="text-gray-700 capitalize">{item.service_type || 'Unknown'}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{item.count} orders</span>
                      <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No service data available</p>
            )}
          </div>

          {/* By Advisor */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-4">Revenue by Advisor</h3>
            {salesBreakdown.by_advisor?.length > 0 ? (
              <div className="space-y-3">
                {salesBreakdown.by_advisor.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {(item.advisor_name || 'U')[0].toUpperCase()}
                      </div>
                      <span className="text-gray-700">{item.advisor_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{item.count} sales</span>
                      <span className="font-semibold">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No advisor data available</p>
            )}
          </div>

          {/* Top Items Sold */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-semibold text-black mb-4">Top Items Sold</h3>
            {salesBreakdown.top_items?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Item</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Type</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Qty Sold</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-600">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesBreakdown.top_items.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{item.item_name}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.item_type === 'labor' ? 'bg-blue-100 text-blue-800' :
                            item.item_type === 'part' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.item_type}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">{item.quantity_sold}</td>
                        <td className="py-3 px-2 text-right font-semibold">{formatCurrency(item.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No items data available</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4">Daily Sales Trend</h3>
          <div className="h-64 flex items-end gap-1 px-4">
            {salesBreakdown?.daily_trend?.length > 0 ? (
              salesBreakdown.daily_trend.slice(-14).map((day, idx) => {
                const maxRevenue = Math.max(...salesBreakdown.daily_trend.map(d => d.revenue || 0));
                const height = maxRevenue > 0 ? ((day.revenue || 0) / maxRevenue) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '200px' }}>
                      <div
                        className="absolute bottom-0 w-full bg-black rounded-t transition-all"
                        style={{ height: `${height}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 -rotate-45 origin-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-gray-500 py-16">
                No trend data available for selected period
              </div>
            )}
          </div>
          {salesBreakdown?.daily_trend?.length > 0 && (
            <div className="mt-8 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600">Daily Average</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    salesBreakdown.daily_trend.reduce((sum, d) => sum + (d.revenue || 0), 0) /
                    salesBreakdown.daily_trend.length
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Best Day</p>
                <p className="text-xl font-bold">
                  {formatCurrency(Math.max(...salesBreakdown.daily_trend.map(d => d.revenue || 0)))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Days</p>
                <p className="text-xl font-bold">{salesBreakdown.daily_trend.length}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sales;
