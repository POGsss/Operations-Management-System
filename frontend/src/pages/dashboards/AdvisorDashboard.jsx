import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';

/**
 * Service Advisor Dashboard
 * Customer management, job orders, estimates, and billing
 */
const AdvisorDashboard = () => {
  const { getUser } = useAuth();
  const user = getUser();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">
          Welcome, {user?.name}
        </h1>
        <p className="text-gray-600 text-lg">
          Service Advisor Dashboard
        </p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value="156"
          trend="8%"
          icon="👤"
          isPositive={true}
        />
        <MetricCard
          title="Active Estimates"
          value="34"
          trend="5%"
          icon="📄"
          isPositive={true}
        />
        <MetricCard
          title="Pending Approvals"
          value="12"
          trend="2"
          icon="⏳"
          isPositive={false}
        />
        <MetricCard
          title="This Month Revenue"
          value="$18,200"
          trend="10%"
          icon="💰"
          isPositive={true}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Billable Hours"
          value="256"
          trend="12%"
          icon="⏱️"
          isPositive={true}
        />
        <MetricCard
          title="Outstanding Invoices"
          value="$5,430"
          trend="3"
          icon="💳"
          isPositive={false}
        />
        <MetricCard
          title="Customer Satisfaction"
          value="4.7/5"
          trend="0.2"
          icon="⭐"
          isPositive={true}
        />
        <MetricCard
          title="Repeat Customers"
          value="68%"
          trend="4%"
          icon="🔄"
          isPositive={true}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Recent Customers</h3>
          <div className="space-y-4">
            {[
              { name: 'John Anderson', vehicle: '2023 Toyota Camry', lastVisit: '2 days ago' },
              { name: 'Sarah Martinez', vehicle: '2022 Honda Accord', lastVisit: '1 week ago' },
              { name: 'Mike Johnson', vehicle: '2021 Ford Mustang', lastVisit: '2 weeks ago' },
              { name: 'Emily Rodriguez', vehicle: '2020 Chevy Silverado', lastVisit: '1 month ago' },
            ].map((customer, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{customer.name}</p>
                  <p className="text-xs text-gray-600">{customer.vehicle}</p>
                </div>
                <span className="text-xs text-gray-500">{customer.lastVisit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Status */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Billing Status</h3>
          <div className="space-y-4">
            {[
              { status: 'Paid', count: '98', color: 'bg-black' },
              { status: 'Pending', count: '12', color: 'bg-gray-400' },
              { status: 'Overdue', count: '5', color: 'bg-gray-600' },
              { status: 'Disputed', count: '2', color: 'bg-gray-500' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm font-medium text-black">{item.status}</span>
                </div>
                <span className="text-sm font-semibold text-black">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Revenue Trend</h3>
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

export default AdvisorDashboard;
