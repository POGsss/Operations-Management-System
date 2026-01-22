import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';

/**
 * Inventory Officer Dashboard
 * Stock management, purchase orders, and inventory logs
 */
const InventoryDashboard = () => {
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
          Inventory Management Dashboard
        </p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total SKUs"
          value="1,245"
          trend="8%"
          icon="📦"
          isPositive={true}
        />
        <MetricCard
          title="Stock Value"
          value="$234,500"
          trend="12%"
          icon="💰"
          isPositive={true}
        />
        <MetricCard
          title="Low Stock Items"
          value="28"
          trend="3"
          icon="⚠️"
          isPositive={false}
        />
        <MetricCard
          title="Out of Stock"
          value="5"
          trend="1"
          icon="❌"
          isPositive={false}
        />
      </div>

      {/* Metrics Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Pending Orders"
          value="12"
          trend="2"
          icon="📋"
          isPositive={false}
        />
        <MetricCard
          title="Order Value (Pending)"
          value="$45,600"
          trend="5.2%"
          icon="💵"
          isPositive={true}
        />
        <MetricCard
          title="Inventory Turnover"
          value="3.4x"
          trend="0.2x"
          icon="🔄"
          isPositive={true}
        />
        <MetricCard
          title="Warehouses"
          value="4"
          trend="0"
          icon="🏭"
          isPositive={true}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Critical Stock Items</h3>
          <div className="space-y-4">
            {[
              { item: 'Oil Filter (Mobil 1)', current: 5, min: 10, status: 'Low' },
              { item: 'Brake Pads Set', current: 3, min: 8, status: 'Critical' },
              { item: 'Air Filters', current: 8, min: 12, status: 'Low' },
              { item: 'Batteries', current: 2, min: 6, status: 'Critical' },
            ].map((item, index) => (
              <div key={index} className="pb-4 border-b border-gray-200 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-black">{item.item}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    item.status === 'Critical' ? 'bg-gray-600 text-white' : 'bg-gray-300 text-black'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-black h-2 rounded-full"
                    style={{ width: `${(item.current / item.min) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {item.current} / {item.min} units
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Purchase Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Recent Purchase Orders</h3>
          <div className="space-y-4">
            {[
              { poId: 'PO-2024-001', supplier: 'Parts Plus Distributor', amount: '$8,500', date: '3 days ago' },
              { poId: 'PO-2024-002', supplier: 'OEM Supplier Co', amount: '$12,300', date: '5 days ago' },
              { poId: 'PO-2024-003', supplier: 'Industrial Parts Inc', amount: '$6,800', date: '1 week ago' },
              { poId: 'PO-2024-004', supplier: 'Global Motors Supply', amount: '$15,200', date: '2 weeks ago' },
            ].map((order, index) => (
              <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{order.poId}</p>
                  <p className="text-xs text-gray-600">{order.supplier}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-black">{order.amount}</p>
                  <p className="text-xs text-gray-500">{order.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-xl font-bold text-black mb-4">Monthly Inventory Movement</h3>
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

export default InventoryDashboard;
