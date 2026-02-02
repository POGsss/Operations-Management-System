import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiCurrencyDollar,
  HiTrendingUp,
  HiTrendingDown,
  HiClipboardList,
  HiOfficeBuilding,
  HiClock,
  HiChartBar,
  HiRefresh,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Overview = () => {
  const { user, session } = useAuth();
  
  const [overview, setOverview] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [jobsSummary, setJobsSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Date range
  const [dateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session?.access_token}` };

      const [overviewRes, salesRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/reports/executive/overview`, { headers }),
        fetch(`${API_URL}/reports/sales/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers }),
        fetch(`${API_URL}/reports/jobs/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers })
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }
      if (salesRes.ok) {
        const data = await salesRes.json();
        setSalesSummary(data);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobsSummary(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchData();
    }
  }, [session]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Welcome, {user?.full_name}</h1>
          <p className="text-gray-600">Executive Dashboard - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
          <HiRefresh className="w-5 h-5" />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(overview?.metrics?.monthly_revenue)}
          trend={overview?.metrics?.revenue_growth ? `${overview.metrics.revenue_growth}%` : null}
          icon={<HiCurrencyDollar />}
          isPositive={parseFloat(overview?.metrics?.revenue_growth || 0) > 0}
        />
        <MetricCard
          title="Collected"
          value={formatCurrency(overview?.metrics?.monthly_collected)}
          icon={<HiTrendingUp />}
        />
        <MetricCard
          title="Active Jobs"
          value={overview?.metrics?.active_jobs?.toString() || '0'}
          icon={<HiClipboardList />}
        />
        <MetricCard
          title="Branches"
          value={overview?.metrics?.branch_count?.toString() || '0'}
          icon={<HiOfficeBuilding />}
        />
      </div>

      {/* Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Invoiced"
          value={formatCurrency(salesSummary?.totals?.total_revenue)}
          icon={<HiChartBar />}
        />
        <MetricCard
          title="Labor Revenue"
          value={formatCurrency(salesSummary?.totals?.labor_revenue)}
          icon={<HiClock />}
        />
        <MetricCard
          title="Parts Revenue"
          value={formatCurrency(salesSummary?.totals?.parts_revenue)}
          icon={<HiCurrencyDollar />}
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency(salesSummary?.totals?.outstanding)}
          icon={<HiTrendingDown />}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Branch */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Revenue by Branch</h3>
          <div className="space-y-4">
            {salesSummary?.byBranch?.slice(0, 5).map((branch, index) => {
              const maxRevenue = salesSummary.byBranch[0]?.revenue || 1;
              const percentage = ((branch.revenue / maxRevenue) * 100).toFixed(0);
              return (
                <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-black">{branch.branch}</span>
                    <span className="text-sm font-bold text-black">{formatCurrency(branch.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{branch.count} invoices</p>
                </div>
              );
            }) || (
              <p className="text-gray-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Jobs Overview */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Jobs Overview</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-black">{jobsSummary?.totals?.total_jobs || 0}</p>
                <p className="text-sm text-gray-600">Total Jobs</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{jobsSummary?.totals?.completed || 0}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{jobsSummary?.totals?.in_progress || 0}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{jobsSummary?.totals?.avg_completion_hours || 0}h</p>
                <p className="text-sm text-gray-600">Avg Completion</p>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">By Status</h4>
              <div className="flex flex-wrap gap-2">
                {jobsSummary?.byStatus?.map((item, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {item.status}: <strong>{item.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart (simplified) */}
      <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Daily Revenue Trend</h3>
        {salesSummary?.daily?.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex items-end space-x-2 h-48 min-w-max">
              {salesSummary.daily.map((day, index) => {
                const maxRevenue = Math.max(...salesSummary.daily.map(d => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={index} className="flex flex-col items-center flex-shrink-0" style={{ width: '40px' }}>
                    <div 
                      className="w-6 bg-black rounded-t hover:bg-gray-700 transition-colors cursor-pointer group relative"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${formatCurrency(day.revenue)}`}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        {formatCurrency(day.revenue)}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No revenue data for selected period
          </div>
        )}
      </div>

      {/* Top Mechanics */}
      {jobsSummary?.byMechanic?.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Top Performing Staff</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Jobs Assigned</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobsSummary.byMechanic.map((mech, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{mech.name}</td>
                    <td className="px-4 py-3 text-right">{mech.total}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{mech.completed}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        (mech.completed / mech.total * 100) >= 80 ? 'bg-green-100 text-green-700' :
                        (mech.completed / mech.total * 100) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {((mech.completed / mech.total) * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
