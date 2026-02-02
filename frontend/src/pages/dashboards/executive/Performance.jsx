import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiClock,
  HiTrendingUp,
  HiCurrencyDollar,
  HiUserGroup,
  HiRefresh,
  HiChartBar,
  HiX,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Performance = () => {
  const { session } = useAuth();

  const [performanceData, setPerformanceData] = useState(null);
  const [jobsSummary, setJobsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session?.access_token}` };
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      const [perfRes, jobsRes] = await Promise.all([
        fetch(`${API_URL}/reports/performance/summary?${params}`, { headers }),
        fetch(`${API_URL}/reports/jobs/summary?${params}`, { headers })
      ]);

      if (perfRes.ok) {
        const data = await perfRes.json();
        setPerformanceData(data);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobsSummary(data);
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
  }, [session, dateRange]);

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

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
          <h1 className="text-3xl font-bold text-black mb-2">Performance Analytics</h1>
          <p className="text-gray-600">Team and operational performance insights</p>
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
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
            <HiRefresh className="w-5 h-5" />
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

      {/* Team Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Hours"
          value={`${performanceData?.teamTotals?.total_hours || 0}h`}
          icon={<HiClock />}
        />
        <MetricCard
          title="Billable Hours"
          value={`${performanceData?.teamTotals?.billable_hours || 0}h`}
          icon={<HiTrendingUp />}
        />
        <MetricCard
          title="Labor Revenue"
          value={formatCurrency(performanceData?.teamTotals?.labor_revenue)}
          icon={<HiCurrencyDollar />}
        />
        <MetricCard
          title="Jobs Worked"
          value={performanceData?.teamTotals?.unique_jobs?.toString() || '0'}
          icon={<HiChartBar />}
        />
        <MetricCard
          title="Active Staff"
          value={performanceData?.teamTotals?.mechanic_count?.toString() || '0'}
          icon={<HiUserGroup />}
        />
      </div>

      {/* Job Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <p className="text-sm text-gray-600">Total Jobs</p>
          <p className="text-3xl font-bold text-black">{jobsSummary?.totals?.total_jobs || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-3xl font-bold text-green-600">{jobsSummary?.totals?.completed || 0}</p>
          <p className="text-sm text-gray-500">
            {jobsSummary?.totals?.total_jobs > 0 
              ? ((jobsSummary.totals.completed / jobsSummary.totals.total_jobs) * 100).toFixed(0)
              : 0}% completion rate
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-3xl font-bold text-blue-600">{jobsSummary?.totals?.in_progress || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <p className="text-sm text-gray-600">Avg Completion Time</p>
          <p className="text-3xl font-bold text-black">{jobsSummary?.totals?.avg_completion_hours || 0}h</p>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-black">Staff Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Member</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jobs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {performanceData?.byMechanic?.map((mech, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{mech.name}</td>
                  <td className="px-4 py-3">{mech.branch}</td>
                  <td className="px-4 py-3 text-right">{mech.total_hours}h</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{mech.billable_hours}h</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      parseFloat(mech.efficiency) >= 80 ? 'bg-green-100 text-green-700' :
                      parseFloat(mech.efficiency) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {mech.efficiency}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{mech.jobs_count}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(mech.labor_revenue)}</td>
                </tr>
              ))}
              {(!performanceData?.byMechanic || performanceData.byMechanic.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No performance data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Jobs by Branch & Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Branch */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Jobs by Branch</h3>
          <div className="space-y-4">
            {jobsSummary?.byBranch?.map((branch, index) => {
              const completionRate = branch.total > 0 ? (branch.completed / branch.total * 100).toFixed(0) : 0;
              return (
                <div key={index} className="pb-3 border-b border-gray-100 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{branch.branch}</span>
                    <span className="text-sm text-gray-600">{branch.total} jobs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{branch.completed} completed ({completionRate}%)</p>
                </div>
              );
            }) || (
              <p className="text-gray-500 text-center py-4">No data</p>
            )}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Jobs by Priority</h3>
          <div className="space-y-4">
            {jobsSummary?.byPriority?.map((item, index) => {
              const total = jobsSummary.totals?.total_jobs || 1;
              const percentage = ((item.count / total) * 100).toFixed(0);
              const colors = {
                urgent: 'bg-red-500',
                high: 'bg-orange-500',
                normal: 'bg-blue-500',
                low: 'bg-gray-400'
              };
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${colors[item.priority] || 'bg-gray-400'}`} />
                    <span className="font-medium capitalize">{item.priority}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${colors[item.priority] || 'bg-gray-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{item.count}</span>
                  </div>
                </div>
              );
            }) || (
              <p className="text-gray-500 text-center py-4">No data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;
