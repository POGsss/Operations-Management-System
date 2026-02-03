import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiOfficeBuilding, HiChip, HiCheckCircle, HiCurrencyDollar, HiCube, HiExclamationCircle, HiClock } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Overview = () => {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    branches: 0,
    jobs: { total: 0, completed: 0, inProgress: 0 },
    revenue: { total: 0, labor: 0, parts: 0 },
    inventory: { items: 0, value: 0, lowStock: 0 }
  });
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  const [branchList, setBranchList] = useState([]);

  useEffect(() => {
    if (session?.access_token) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      const params = `?startDate=${startDate}&endDate=${endDate}`;

      const [branchesRes, execOverviewRes, inventoryRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/api/branches`, { headers }),
        fetch(`${API_BASE}/api/reports/executive/overview${params}`, { headers }),
        fetch(`${API_BASE}/api/reports/inventory/value`, { headers }),
        fetch(`${API_BASE}/api/branches/audit-logs?limit=10`, { headers })
      ]);

      if (branchesRes.ok) {
        const branches = await branchesRes.json();
        setBranchList(branches.slice(0, 6));
        setStats(prev => ({ ...prev, branches: branches.length }));
      }

      if (execOverviewRes.ok) {
        const overview = await execOverviewRes.json();
        setStats(prev => ({
          ...prev,
          jobs: {
            total: overview.total_jobs || 0,
            completed: overview.completed_jobs || 0,
            inProgress: overview.active_jobs || 0
          },
          revenue: {
            total: overview.total_revenue || 0,
            labor: overview.labor_revenue || 0,
            parts: overview.parts_revenue || 0
          }
        }));
      }

      if (inventoryRes.ok) {
        const inventory = await inventoryRes.json();
        setStats(prev => ({
          ...prev,
          inventory: {
            items: inventory.total_items || 0,
            value: inventory.total_value || 0,
            lowStock: inventory.low_stock_count || 0
          }
        }));
      }

      if (auditRes.ok) {
        const logs = await auditRes.json();
        setRecentAuditLogs(logs.slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const formatNumber = (val) =>
    new Intl.NumberFormat('en-US').format(val || 0);

  const timeAgo = (date) => {
    if (!date) return '-';
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

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
        <p className="text-gray-600">System overview and key metrics</p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Branches"
          value={stats.branches}
          icon={<HiOfficeBuilding className="w-6 h-6" />}
        />
        <MetricCard
          title="Total Jobs (30d)"
          value={formatNumber(stats.jobs.total)}
          icon={<HiChip className="w-6 h-6" />}
        />
        <MetricCard
          title="Completed Jobs"
          value={formatNumber(stats.jobs.completed)}
          icon={<HiCheckCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Monthly Revenue"
          value={formatCurrency(stats.revenue.total)}
          icon={<HiCurrencyDollar className="w-6 h-6" />}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Inventory Items"
          value={formatNumber(stats.inventory.items)}
          icon={<HiCube className="w-6 h-6" />}
        />
        <MetricCard
          title="Inventory Value"
          value={formatCurrency(stats.inventory.value)}
          icon={<HiCurrencyDollar className="w-6 h-6" />}
        />
        <MetricCard
          title="Low Stock Alerts"
          value={stats.inventory.lowStock}
          icon={<HiExclamationCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Jobs In Progress"
          value={formatNumber(stats.jobs.inProgress)}
          icon={<HiClock className="w-6 h-6" />}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Logs */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Recent Activity</h3>
          {recentAuditLogs.length > 0 ? (
            <div className="space-y-4">
              {recentAuditLogs.map((log, index) => (
                <div key={log.id || index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-black capitalize">{log.action?.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-600">{log.table_name} - {log.user_email || 'System'}</p>
                  </div>
                  <span className="text-xs text-gray-500">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>

        {/* Branches Overview */}
        <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Branches</h3>
          {branchList.length > 0 ? (
            <div className="space-y-4">
              {branchList.map((branch, index) => (
                <div key={branch.id || index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-black">{branch.name}</p>
                    <p className="text-xs text-gray-600">{branch.city}, {branch.state}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    branch.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {branch.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No branches configured</p>
          )}
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Revenue Breakdown (30 Days)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Labor Revenue</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.revenue.labor)}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Parts Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue.parts)}</p>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-black">{formatCurrency(stats.revenue.total)}</p>
          </div>
        </div>
        {/* Revenue bar visualization */}
        {stats.revenue.total > 0 && (
          <div className="mt-6">
            <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${(stats.revenue.labor / stats.revenue.total) * 100}%` }}
              ></div>
              <div
                className="bg-green-500 h-full"
                style={{ width: `${(stats.revenue.parts / stats.revenue.total) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Labor ({((stats.revenue.labor / stats.revenue.total) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Parts ({((stats.revenue.parts / stats.revenue.total) * 100).toFixed(1)}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Overview;
