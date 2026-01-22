import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';

/**
 * Executive Dashboard
 * High-level business analytics and performance metrics
 */
const ExecutiveDashboard = () => {
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
          Executive Business Dashboard
        </p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value="$2.4M"
          trend="18%"
          icon="💰"
          isPositive={true}
        />
        <MetricCard
          title="Net Profit"
          value="$485K"
          trend="22%"
          icon="📈"
          isPositive={true}
        />
        <MetricCard
          title="YoY Growth"
          value="24%"
          trend="6%"
          icon="📊"
          isPositive={true}
        />
        <MetricCard
          title="Market Share"
          value="12.5%"
          trend="2.3%"
          icon="🎯"
          isPositive={true}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Customer Base"
          value="3,240"
          trend="15%"
          icon="👥"
          isPositive={true}
        />
        <MetricCard
          title="Employee Count"
          value="342"
          trend="8%"
          icon="👔"
          isPositive={true}
        />
        <MetricCard
          title="Branches"
          value="28"
          trend="3"
          icon="🏢"
          isPositive={true}
        />
        <MetricCard
          title="Operational Cost"
          value="$1.2M"
          trend="3%"
          icon="⚙️"
          isPositive={false}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Financial Summary</h3>
          <div className="space-y-4">
            {[
              { category: 'Service Revenue', amount: '$1,680K', percentage: '70%' },
              { category: 'Parts Sales', amount: '$576K', percentage: '24%' },
              { category: 'Consulting', amount: '$144K', percentage: '6%' },
            ].map((item, index) => (
              <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-black">{item.category}</span>
                  <span className="text-sm font-bold text-black">{item.amount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full"
                    style={{ width: item.percentage }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">{item.percentage}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            {[
              { metric: 'Customer Retention', value: '87%', status: 'Excellent' },
              { metric: 'Service Quality Score', value: '4.6/5', status: 'Excellent' },
              { metric: 'Employee Satisfaction', value: '82%', status: 'Good' },
              { metric: 'Operational Efficiency', value: '91%', status: 'Excellent' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <span className="text-sm font-medium text-black">{item.metric}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-black">{item.value}</p>
                  <p className="text-xs text-gray-600">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Annual Revenue Trend</h3>
          <div className="h-64 bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-gray-600 text-sm">Chart placeholder - Replace with real analytics</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Branch Performance</h3>
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
    </div>
  );
};

export default ExecutiveDashboard;
