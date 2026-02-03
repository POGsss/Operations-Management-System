import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiCube, HiCurrencyDollar, HiExclamationCircle, HiXCircle } from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Inventory = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (session?.access_token) {
      fetchInventoryData();
    }
  }, [session]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [inventoryRes, valueRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventory`, { headers }),
        fetch(`${API_BASE}/api/reports/inventory/value`, { headers })
      ]);

      if (inventoryRes.ok) {
        const data = await inventoryRes.json();
        setInventory(data);
        // Extract unique categories
        const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
      if (valueRes.ok) {
        setInventoryValue(await valueRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'low' && item.quantity <= (item.min_stock || 5)) ||
      (stockFilter === 'out' && item.quantity === 0) ||
      (stockFilter === 'ok' && item.quantity > (item.min_stock || 5));

    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockCount = inventory.filter(i => i.quantity <= (i.min_stock || 5) && i.quantity > 0).length;
  const outOfStockCount = inventory.filter(i => i.quantity === 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">Inventory</h1>
        <p className="text-gray-600">Manage branch inventory</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={inventoryValue?.total_items || inventory.length}
          icon={<HiCube className="w-6 h-6" />}
        />
        <MetricCard
          title="Total Value"
          value={formatCurrency(inventoryValue?.total_value)}
          icon={<HiCurrencyDollar className="w-6 h-6" />}
        />
        <MetricCard
          title="Low Stock"
          value={lowStockCount}
          icon={<HiExclamationCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Out of Stock"
          value={outOfStockCount}
          icon={<HiXCircle className="w-6 h-6" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="all">All Stock Levels</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Item</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Category</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Unit Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Total Value</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => {
                  const isLowStock = item.quantity <= (item.min_stock || 5) && item.quantity > 0;
                  const isOutOfStock = item.quantity === 0;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-black">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 font-mono">{item.sku || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                          {item.category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-semibold ${
                          isOutOfStock ? 'text-red-600' :
                          isLowStock ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {item.quantity}
                        </span>
                        {item.min_stock && (
                          <span className="text-xs text-gray-400 ml-1">/ min {item.min_stock}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {formatCurrency(item.quantity * (item.unit_price || 0))}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
                      ? 'No items match your filters'
                      : 'No inventory items found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Summary */}
      {inventoryValue?.categories?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-black mb-4">Value by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {inventoryValue.categories.map((cat, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 capitalize">{cat.category || 'Uncategorized'}</p>
                <p className="text-xl font-bold text-black">{formatCurrency(cat.total_value)}</p>
                <p className="text-xs text-gray-500">{cat.item_count} items</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
