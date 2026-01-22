import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';

/**
 * Mechanic Dashboard
 * Personal job assignments, job status, and parts tracking
 */
const MechanicDashboard = () => {
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
          Mechanic Work Dashboard
        </p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Jobs Assigned"
          value="12"
          trend="3"
          icon="🔧"
          isPositive={true}
        />
        <MetricCard
          title="Jobs Completed Today"
          value="4"
          trend="2"
          icon="✓"
          isPositive={true}
        />
        <MetricCard
          title="In Progress"
          value="3"
          trend="1"
          icon="⏱️"
          isPositive={false}
        />
        <MetricCard
          title="Hours Logged"
          value="32.5"
          trend="4.5"
          icon="⏰"
          isPositive={true}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Parts Used Today"
          value="18"
          trend="6"
          icon="🔩"
          isPositive={false}
        />
        <MetricCard
          title="Quality Score"
          value="9.2/10"
          trend="0.3"
          icon="⭐"
          isPositive={true}
        />
        <MetricCard
          title="Avg Job Time"
          value="2.5 hrs"
          trend="0.2 hrs"
          icon="⏳"
          isPositive={false}
        />
        <MetricCard
          title="Tools Assigned"
          value="15"
          trend="2"
          icon="🛠️"
          isPositive={true}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Jobs */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">My Jobs Today</h3>
          <div className="space-y-4">
            {[
              { jobId: 'JO-2024-045', vehicle: '2023 Toyota Camry', service: 'Oil Change', status: 'In Progress' },
              { jobId: 'JO-2024-046', vehicle: '2022 Honda Civic', service: 'Brake Pads', status: 'Ready to Start' },
              { jobId: 'JO-2024-047', vehicle: '2021 Ford F-150', service: 'Engine Diagnostics', status: 'In Progress' },
              { jobId: 'JO-2024-048', vehicle: '2020 Chevy Malibu', service: 'Battery Replacement', status: 'Waiting Approval' },
            ].map((job, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{job.jobId}</p>
                  <p className="text-xs text-gray-600">{job.vehicle} - {job.service}</p>
                </div>
                <span className="text-xs font-medium text-black bg-gray-100 px-2 py-1 rounded">
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Parts Inventory */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Parts Used Today</h3>
          <div className="space-y-4">
            {[
              { part: 'Oil Filter (Mobil 1)', quantity: 2, cost: '$24.99' },
              { part: 'Brake Pads Set', quantity: 1, cost: '$89.99' },
              { part: 'Engine Air Filter', quantity: 1, cost: '$34.50' },
              { part: 'Cabin Air Filter', quantity: 2, cost: '$28.00' },
            ].map((part, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{part.part}</p>
                  <p className="text-xs text-gray-600">Qty: {part.quantity}</p>
                </div>
                <span className="text-sm font-semibold text-black">{part.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Weekly Job Performance</h3>
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

export default MechanicDashboard;
