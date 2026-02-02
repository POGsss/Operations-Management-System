import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  HiSearch,
  HiRefresh,
  HiClipboardList,
  HiArrowUp,
  HiArrowDown,
  HiPencil,
  HiPlus,
  HiTrash,
  HiCheck,
  HiBan,
  HiCube,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

// Action type colors and labels
const ACTION_CONFIG = {
  'inventory.stock.create': { color: 'bg-blue-100 text-blue-800', label: 'Stock Created', icon: HiPlus },
  'inventory.stock.update': { color: 'bg-yellow-100 text-yellow-800', label: 'Stock Updated', icon: HiPencil },
  'inventory.stock.increase': { color: 'bg-green-100 text-green-800', label: 'Stock Increased', icon: HiArrowUp },
  'inventory.stock.decrease': { color: 'bg-red-100 text-red-800', label: 'Stock Decreased', icon: HiArrowDown },
  'inventory.purchase_request.create': { color: 'bg-purple-100 text-purple-800', label: 'PR Created', icon: HiPlus },
  'inventory.purchase_request.approved': { color: 'bg-green-100 text-green-800', label: 'PR Approved', icon: HiCheck },
  'inventory.purchase_request.rejected': { color: 'bg-red-100 text-red-800', label: 'PR Rejected', icon: HiBan },
  'inventory.purchase_request.delete': { color: 'bg-red-100 text-red-800', label: 'PR Deleted', icon: HiTrash },
};

const InventoryLogs = () => {
  const { session } = useAuth();

  // Logs data
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    actionType: 'all',
  });

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventory/logs?limit=100`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory logs');
      }

      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchLogs();
    }
  }, [session]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.id?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.user?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.action?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesActionType =
        filters.actionType === 'all' || log.action?.includes(filters.actionType);

      return matchesSearch && matchesActionType;
    });
  }, [logs, filters]);

  // Get action config
  const getActionConfig = (action) => {
    return ACTION_CONFIG[action] || { color: 'bg-gray-100 text-gray-800', label: action, icon: HiClipboardList };
  };

  // Format details for display
  const formatDetails = (log) => {
    try {
      const oldData = log.old_data ? JSON.parse(log.old_data) : null;
      const newData = log.new_data ? JSON.parse(log.new_data) : null;

      if (log.action?.includes('stock.increase') || log.action?.includes('stock.decrease')) {
        const adjustment = newData?.adjustment;
        const oldQty = oldData?.quantity;
        const newQty = newData?.quantity;
        const reason = newData?.reason;
        return `${oldQty} → ${newQty} (${adjustment > 0 ? '+' : ''}${adjustment})${reason ? ` - ${reason}` : ''}`;
      }

      if (log.action?.includes('stock.create') || log.action?.includes('stock.update')) {
        return `Qty: ${newData?.quantity || 0}, Min: ${newData?.min_stock || '-'}, Max: ${newData?.max_stock || '-'}`;
      }

      if (log.action?.includes('purchase_request')) {
        const items = newData?.purchase_request_items?.length || 0;
        return `${items} item(s), Priority: ${newData?.priority || '-'}`;
      }

      return '-';
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Inventory Logs</h1>
          <p className="text-gray-600">Track all inventory-related activities and changes</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black rounded-lg transition font-medium"
        >
          <HiRefresh className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by user, action, or ID..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
          >
            <option value="all">All Actions</option>
            <option value="stock">Stock Changes</option>
            <option value="purchase_request">Purchase Requests</option>
          </select>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <HiClipboardList className="w-12 h-12 mb-2" />
            <p>No inventory logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  const config = getActionConfig(log.action);
                  const IconComponent = config.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{formatDate(log.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}
                        >
                          <IconComponent className="w-3 h-3" />
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900">{log.user?.full_name || 'System'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-500">
                          #{log.resource_id?.substring(0, 8) || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{formatDetails(log)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredLogs.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredLogs.length} log entries
        </div>
      )}
    </div>
  );
};

export default InventoryLogs;
