import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';

const Overview = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Welcome, {user?.full_name}</h1>
        <p className="text-gray-600">System overview and key metrics</p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value="1,234"
          trend="12%"
          icon=""
          isPositive={true}
        />
        <MetricCard
          title="Active Branches"
          value="28"
          trend="5%"
          icon=""
          isPositive={true}
        />
        <MetricCard
          title="System Uptime"
          value="99.9%"
          trend="0.1%"
          icon=""
          isPositive={true}
        />
        <MetricCard
          title="Audit Logs"
          value="45.2K"
          trend="8.5%"
          icon=""
          isPositive={true}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Failed Logins"
          value="12"
          trend="3%"
          icon=""
          isPositive={false}
        />
        <MetricCard
          title="Pending Approvals"
          value="8"
          trend="2"
          icon=""
          isPositive={false}
        />
        <MetricCard
          title="API Requests"
          value="2.5M"
          trend="15%"
          icon=""
          isPositive={true}
        />
        <MetricCard
          title="Database Size"
          value="425GB"
          trend="7%"
          icon=""
          isPositive={false}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'User Created', user: 'john.doe@company.com', time: '2 hours ago' },
              { action: 'Branch Updated', user: 'NYC Branch', time: '5 hours ago' },
              { action: 'Audit Log Exported', user: 'admin@company.com', time: '1 day ago' },
              { action: 'System Config Changed', user: 'admin@company.com', time: '2 days ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{activity.action}</p>
                  <p className="text-xs text-gray-600">{activity.user}</p>
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { name: 'API Server', status: 'Operational', color: 'bg-black' },
              { name: 'Database', status: 'Operational', color: 'bg-black' },
              { name: 'Cache Service', status: 'Operational', color: 'bg-black' },
              { name: 'Queue Service', status: 'Warning', color: 'bg-gray-600' },
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <span className="text-sm font-medium text-black">{service.name}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${service.color}`}></div>
                  <span className="text-xs text-gray-600">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">System Usage Trend</h3>
        <div className="h-64 bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-gray-600 text-sm">Chart placeholder - Replace with real analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
