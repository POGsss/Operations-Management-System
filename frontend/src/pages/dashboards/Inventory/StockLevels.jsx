import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiSearch,
  HiX,
  HiPencil,
  HiPlus,
  HiMinus,
  HiCube,
  HiExclamationCircle,
  HiCheckCircle,
  HiRefresh,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const StockLevels = () => {
  const { session, user } = useAuth();

  // Stock data state
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Branches and items for dropdowns
  const [branches, setBranches] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    lowStockOnly: false,
    branch: 'all',
  });

  // Modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Form states
  const [adjustForm, setAdjustForm] = useState({ adjustment: 0, reason: '' });
  const [editForm, setEditForm] = useState({ min_stock: 5, max_stock: 100 });
  const [createForm, setCreateForm] = useState({
    branch_id: '',
    item_id: '',
    quantity: 0,
    min_stock: 5,
    max_stock: 100,
  });
  const [saving, setSaving] = useState(false);

  // Confirmation modal
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Fetch stock levels
  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventory/stock`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stock levels');
      }

      const data = await response.json();
      setStockItems(data.stock || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching stock:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory/branches`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch branches');
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  // Fetch inventory items
  const fetchInventoryItems = async () => {
    try {
      const response = await fetch(`${API_URL}/inventory/items`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setInventoryItems(data.items || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchStock();
      fetchBranches();
      fetchInventoryItems();
    }
  }, [session]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = stockItems.length;
    const lowStock = stockItems.filter((s) => s.is_low_stock).length;
    const healthy = total - lowStock;
    const totalQuantity = stockItems.reduce((sum, s) => sum + (s.quantity || 0), 0);

    return { total, lowStock, healthy, totalQuantity };
  }, [stockItems]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    return stockItems.filter((stock) => {
      const matchesSearch =
        stock.item?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        stock.item?.sku?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesLowStock = !filters.lowStockOnly || stock.is_low_stock;
      const matchesBranch = filters.branch === 'all' || stock.branch_id === filters.branch;

      return matchesSearch && matchesLowStock && matchesBranch;
    });
  }, [stockItems, filters]);

  // Open adjust modal
  const openAdjustModal = (stock) => {
    setSelectedStock(stock);
    setAdjustForm({ adjustment: 0, reason: '' });
    setIsAdjustModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (stock) => {
    setSelectedStock(stock);
    setEditForm({
      min_stock: stock.min_stock || 5,
      max_stock: stock.max_stock || 100,
    });
    setIsEditModalOpen(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setCreateForm({
      branch_id: '',
      item_id: '',
      quantity: 0,
      min_stock: 5,
      max_stock: 100,
    });
    setIsCreateModalOpen(true);
  };

  // Handle adjust stock with confirmation
  const handleAdjustConfirm = () => {
    setConfirmAction({
      type: 'adjust',
      title: 'Confirm Stock Adjustment',
      message: `Are you sure you want to ${adjustForm.adjustment >= 0 ? 'add' : 'remove'} ${Math.abs(adjustForm.adjustment)} units ${adjustForm.adjustment >= 0 ? 'to' : 'from'} "${selectedStock?.item?.name}"?`,
    });
    setShowConfirmDialog(true);
  };

  const handleAdjustStock = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/stock/adjust`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_id: selectedStock.id,
          adjustment: parseInt(adjustForm.adjustment),
          reason: adjustForm.reason,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to adjust stock');
      }

      await fetchStock();
      setIsAdjustModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error adjusting stock:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle edit stock settings with confirmation
  const handleEditConfirm = () => {
    setConfirmAction({
      type: 'edit',
      title: 'Confirm Settings Update',
      message: `Are you sure you want to update the stock thresholds for "${selectedStock?.item?.name}"?`,
    });
    setShowConfirmDialog(true);
  };

  const handleEditStock = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/stock/${selectedStock.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update stock');
      }

      await fetchStock();
      setIsEditModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error updating stock:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle create stock record with confirmation
  const handleCreateConfirm = (e) => {
    e.preventDefault();
    const item = inventoryItems.find((i) => i.id === createForm.item_id);
    const branch = branches.find((b) => b.id === createForm.branch_id);
    setConfirmAction({
      type: 'create',
      title: 'Confirm Stock Record Creation',
      message: `Create stock record for "${item?.name}" at "${branch?.name}"?`,
    });
    setShowConfirmDialog(true);
  };

  const handleCreateStock = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/stock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create stock record');
      }

      await fetchStock();
      setIsCreateModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error creating stock:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Confirm action handler
  const handleConfirm = () => {
    if (confirmAction?.type === 'adjust') {
      handleAdjustStock();
    } else if (confirmAction?.type === 'edit') {
      handleEditStock();
    } else if (confirmAction?.type === 'create') {
      handleCreateStock();
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'inventory_officer';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Stock Levels</h1>
          <p className="text-gray-600">Monitor and manage inventory stock per branch</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchStock}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
          >
            <HiRefresh className="w-5 h-5" />
            Refresh
          </button>
          {isAdmin && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
            >
              <HiPlus className="w-5 h-5" />
              Add Stock Record
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          value={stats.total}
          icon={<HiCube className="w-6 h-6" />}
        />
        <MetricCard
          title="Low Stock Items"
          value={stats.lowStock}
          icon={<HiExclamationCircle className="w-6 h-6" />}
          trend={stats.lowStock > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          title="Healthy Stock"
          value={stats.healthy}
          icon={<HiCheckCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Total Quantity"
          value={stats.totalQuantity.toLocaleString()}
          icon={<HiCube className="w-6 h-6" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by item name or SKU..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.lowStockOnly}
                onChange={(e) => setFilters({ ...filters, lowStockOnly: e.target.checked })}
                className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span className="text-sm text-gray-700">Low Stock Only</span>
            </label>
            {isAdmin && (
              <select
                value={filters.branch}
                onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <HiCube className="w-12 h-12 mb-2" />
            <p>No stock records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min / Max
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStock.map((stock) => (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{stock.item?.name}</p>
                        <p className="text-sm text-gray-500 font-mono">{stock.item?.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{stock.branch?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-semibold ${stock.is_low_stock ? 'text-red-600' : 'text-gray-900'}`}>
                        {stock.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {stock.min_stock} / {stock.max_stock}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {stock.is_low_stock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          <HiExclamationCircle className="w-4 h-4" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <HiCheckCircle className="w-4 h-4" />
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openAdjustModal(stock)}
                          className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          title="Adjust Stock"
                        >
                          <HiPlus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(stock)}
                          className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          title="Edit Thresholds"
                        >
                          <HiPencil className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedStock && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full z-50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Adjust Stock</h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedStock.item?.name}</p>
                <p className="text-sm text-gray-500">Current Stock: {selectedStock.quantity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment (positive to add, negative to remove)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, adjustment: adjustForm.adjustment - 1 })}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <HiMinus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    value={adjustForm.adjustment}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: parseInt(e.target.value) || 0 })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-black"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustForm({ ...adjustForm, adjustment: adjustForm.adjustment + 1 })}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  New quantity: {selectedStock.quantity + adjustForm.adjustment}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  placeholder="Enter reason for adjustment..."
                />
              </div>
            </div>
            <div className="p-4 flex justify-end gap-3">
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustConfirm}
                disabled={adjustForm.adjustment === 0 || (selectedStock.quantity + adjustForm.adjustment) < 0}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Thresholds Modal */}
      {isEditModalOpen && selectedStock && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full z-50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Edit Stock Thresholds</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{selectedStock.item?.name}</p>
                <p className="text-sm text-gray-500">Current Stock: {selectedStock.quantity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Stock (Alert Threshold)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.min_stock}
                  onChange={(e) => setEditForm({ ...editForm, min_stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Stock (Reorder Cap)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editForm.max_stock}
                  onChange={(e) => setEditForm({ ...editForm, max_stock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div className="p-4 flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditConfirm}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Stock Record Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full z-50 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Add Stock Record</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateConfirm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch *
                </label>
                <select
                  value={createForm.branch_id}
                  onChange={(e) => setCreateForm({ ...createForm, branch_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                >
                  <option value="">Select Branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inventory Item *
                </label>
                <select
                  value={createForm.item_id}
                  onChange={(e) => setCreateForm({ ...createForm, item_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                >
                  <option value="">Select Item</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.min_stock}
                    onChange={(e) => setCreateForm({ ...createForm, min_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.max_stock}
                    onChange={(e) => setCreateForm({ ...createForm, max_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
                >
                  Create Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full z-50 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-black mb-2">{confirmAction.title}</h3>
              <p className="text-gray-600">{confirmAction.message}</p>
            </div>
            <div className="p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50"
              >
                {saving ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLevels;
