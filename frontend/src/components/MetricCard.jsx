import React from 'react';

const MetricCard = ({ title, value, trend, icon, isPositive = true }) => {
  const trendColor = isPositive ? 'text-black' : 'text-gray-600';
  const trendIcon = isPositive ? '↑' : '↓';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition">
      {/* Header with icon */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
        </div>
        {icon && (
          <div className="text-3xl opacity-80">
            {icon}
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="mb-4">
        <p className="text-4xl font-bold text-black">{value}</p>
      </div>

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center space-x-1">
          <span className={`text-sm font-semibold ${trendColor}`}>
            {trendIcon} {trend}
          </span>
          <span className="text-xs text-gray-500">this month</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
