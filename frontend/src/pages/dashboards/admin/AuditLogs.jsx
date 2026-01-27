import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { HiChevronDown, HiX, HiSearch, HiRefresh } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    status: '',
    search: '',
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'PASSWORD_CHANGE'];
  const entityTypes = [
    'AUTHENTICATION',
    'USER',
    'BRANCH',
    'JOB_ORDER',
    'INVENTORY',
    'CUSTOMER',
    'REPORT',
    'SYSTEM_CONFIG',
  ];
  const statuses = ['SUCCESS', 'FAILED'];

  // Fetch audit logs
  useEffect(() => {
    fetchLogs();
  }, [filters, dateRange, pagination.page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_logs')
        .select(
          `
          id,
          user_id,
          action,
          entity_type,
          entity_id,
          entity_name,
          details,
          ip_address,
          status,
          error_message,
          created_at,
          users:user_id (id, full_name, email)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        query = query.or(
          `entity_name.ilike.%${filters.search}%,users->>email.ilike.%${filters.search}%`
        );
      }

      if (dateRange.startDate) {
        const startDate = new Date(dateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        query = query.gte('created_at', startDate.toISOString());
      }

      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.pageSize;
      query = query.range(offset, offset + pagination.pageSize - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Fetch error details:', fetchError);
        setError('Failed to fetch audit logs: ' + fetchError.message);
        console.error('Fetch error:', fetchError);
      } else {
        console.log('Audit logs fetched successfully:', data?.length, 'records');
        setLogs(data || []);
        setPagination((prev) => ({
          ...prev,
          total: count || 0,
        }));
      }
    } catch (err) {
      console.error('Fetch exception:', err);
      setError('Error loading audit logs: ' + err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const handleDateChange = (key, value) => {
    setDateRange((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      status: '',
      search: '',
    });
    setDateRange({
      startDate: '',
      endDate: '',
    });
    setPagination({
      page: 1,
      pageSize: 10,
      total: 0,
    });
  };

  const getStatusColor = (status) => {
    return status === 'SUCCESS'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Audit Logs</h1>
            <p className="text-gray-600">Track all system activities and transactions</p>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
          >
            <HiRefresh className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-black mb-4">Filters</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or entity name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 pl-10"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            >
              <option value="">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
          </div>

          {/* Entity Type Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            >
              <option value="">All Types</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            >
              <option value="">All Status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            />
          </div>
        </div>

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="text-sm text-black hover:text-gray-700 font-medium"
        >
          Clear All Filters
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Entity Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-gray-200 last:border-none hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.users ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {log.users.full_name}
                            </p>
                            <p className="text-xs text-gray-600">{log.users.email}</p>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">System</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {log.entity_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedLog(
                              expandedLog === log.id ? null : log.id
                            )
                          }
                          className="text-gray-600 hover:text-black transition"
                        >
                          <HiChevronDown
                            className={`w-5 h-5 transform transition ${
                              expandedLog === log.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedLog === log.id && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan="7" className="px-6 py-4">
                          <div className="space-y-4">
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                  Details:
                                </p>
                                <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.error_message && (
                              <div>
                                <p className="text-sm font-semibold text-red-700 mb-2">
                                  Error:
                                </p>
                                <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
                                  {log.error_message}
                                </p>
                              </div>
                            )}

                            {log.ip_address && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">
                                  IP Address:
                                </p>
                                <p className="text-sm text-gray-600">
                                  {log.ip_address}
                                </p>
                              </div>
                            )}

                            {log.entity_id && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">
                                  Entity ID:
                                </p>
                                <p className="text-xs text-gray-600 font-mono break-all">
                                  {log.entity_id}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-semibold">{pagination.total}</span> logs
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={pagination.pageSize}
                onChange={(e) =>
                  setPagination((prev) => ({
                    ...prev,
                    pageSize: parseInt(e.target.value),
                    page: 1,
                  }))
                }
                className="appearance-none px-3 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: pageNum,
                        }))
                      }
                      className={`px-3 py-1 border rounded text-sm ${
                        pagination.page === pageNum
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(totalPages, prev.page + 1),
                  }))
                }
                disabled={pagination.page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
