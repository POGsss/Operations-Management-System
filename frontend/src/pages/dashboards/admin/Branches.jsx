import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiChevronDown, HiX, HiSearch, HiRefresh } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Branches = () => {
  const { role, session } = useAuth();
  const isAdmin = role === 'admin';

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBranch, setExpandedBranch] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    city: 'all',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const itemsPerPage = pagination.pageSize;

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/branches`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch branches');

      const data = await res.json();
      setBranches(data.branches || []);
      setError(null);
    } catch (err) {
      console.error('Fetch branches error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchBranches();
    }
  }, [session]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    return [...new Set(branches.map(b => b.city))].sort();
  }, [branches]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = branches.length;
    const active = branches.filter(b => b.status === 'active').length;
    const inactive = branches.filter(b => b.status === 'inactive').length;
    return { total, active, inactive };
  }, [branches]);

  // Filter branches
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch =
        branch.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.city.toLowerCase().includes(filters.search.toLowerCase()) ||
        (branch.manager || '').toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus =
        filters.status === 'all' || branch.status === filters.status;

      const matchesCity =
        filters.city === 'all' || branch.city === filters.city;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [branches, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);
  const offset = (pagination.page - 1) * itemsPerPage;
  const paginatedBranches = filteredBranches.slice(offset, offset + itemsPerPage);

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

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      city: 'all',
    });
    setPagination({
      page: 1,
      pageSize: 10,
      total: 0,
    });
  };

  const getStatusColor = (status) => {
    return status === 'active'
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
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Branches</h1>
            <p className="text-gray-600">Manage all branch locations and operations</p>
          </div>
          <button
            onClick={fetchBranches}
            className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
          >
            <HiRefresh className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total Branches" value={summaryStats.total} />
        <MetricCard
          title="Active Branches"
          value={summaryStats.active}
          trend="Operational"
          isPositive
        />
        <MetricCard
          title="Inactive Branches"
          value={summaryStats.inactive}
          trend="Closed"
          isPositive={false}
        />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, city, or manager..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 pl-10"
              />
            </div>
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
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
          </div>

          {/* City Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            >
              <option value="all">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
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

      {/* Branches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">Loading branches...</div>
        ) : paginatedBranches.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No branches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedBranches.map((branch) => (
                  <React.Fragment key={branch.id}>
                    <tr className="border-b border-gray-200 last:border-none hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {branch.name}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {branch.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {branch.city}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {branch.manager || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                            branch.status
                          )}`}
                        >
                          {branch.status === 'active' ? '✓ Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {isAdmin && (
                            <>
                              <button className="px-3 py-1 text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded transition">
                                Edit
                              </button>
                              <button className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition">
                                Delete
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              setExpandedBranch(
                                expandedBranch === branch.id ? null : branch.id
                              )
                            }
                            className="text-gray-600 hover:text-black transition"
                          >
                            <HiChevronDown
                              className={`w-5 h-5 transform transition ${
                                expandedBranch === branch.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {expandedBranch === branch.id && (
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <td colSpan="6" className="px-6 py-4">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Branch Information:
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-4 rounded border border-gray-200">
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Full Name</p>
                                  <p className="text-sm text-gray-900">{branch.name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Branch Code</p>
                                  <p className="text-sm text-gray-900 font-mono">{branch.code}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">City</p>
                                  <p className="text-sm text-gray-900">{branch.city}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Manager</p>
                                  <p className="text-sm text-gray-900">{branch.manager || 'Not assigned'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-medium">Status</p>
                                  <p className={`text-sm font-medium ${branch.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                                    {branch.status === 'active' ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                                {branch.created_at && (
                                  <div>
                                    <p className="text-xs text-gray-600 font-medium">Created</p>
                                    <p className="text-sm text-gray-900">{formatDate(branch.created_at)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
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
        {!loading && filteredBranches.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{offset + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(offset + itemsPerPage, filteredBranches.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredBranches.length}</span> branches
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
                className="appearance-none px-3 py-1 border border-gray-300 rounded text-sm bg-white"
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
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
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
                      className={`px-3 py-1 border rounded text-sm transition ${
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
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
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

export default Branches;