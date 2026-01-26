import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';

const ExecutiveDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black mb-2">
          Welcome, {user?.full_name}
        </h1>
        <p className="text-gray-600 text-lg">
          Executive Business Dashboard
        </p>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;
