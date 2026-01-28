import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiChevronDown, HiX, HiSearch, HiPlus, HiPencil, HiTrash } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Branches = () => {
  const { role, session } = useAuth();
  const isAdmin = role === 'admin';

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedBranch, setExpandedBranch] = useState(null);
  const [managers, setManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);

  // Modal + form state for add / edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: '',
    managerId: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

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
      if (isAdmin) {
        fetchManagers();
      }
    }
  }, [session, isAdmin]);

  const fetchManagers = async () => {
    if (!isAdmin) return;

    try {
      setManagersLoading(true);
      const res = await fetch(
        `${API_URL}/auth/users?role=branch_manager`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load managers');
      }

      const data = await res.json();
      setManagers(data.users || []);
    } catch (err) {
      console.error('Fetch managers error:', err);
      // Keep this non-fatal; just log and continue
    } finally {
      setManagersLoading(false);
    }
  };

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

  // Map of manager_id -> manager user
  const managerMap = useMemo(() => {
    const map = new Map();
    managers.forEach((user) => {
      if (user?.id) {
        map.set(user.id, user);
      }
    });
    return map;
  }, [managers]);

  // Filter branches
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const managerUser = managerMap.get(branch.manager_id);
      const managerName = managerUser?.full_name || '';

      const matchesSearch =
        branch.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        branch.city.toLowerCase().includes(filters.search.toLowerCase()) ||
        managerName.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus =
        filters.status === 'all' || branch.status === filters.status;

      const matchesCity =
        filters.city === 'all' || branch.city === filters.city;

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [branches, filters, managerMap]);

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

  // Modal helpers
  const openAddModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      city: '',
      managerId: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      city: branch.city || '',
      managerId: branch.manager_id || '',
      status: branch.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setSaving(true);
      setError(null);

      const url = editingBranch
        ? `${API_URL}/branches/${editingBranch.id}`
        : `${API_URL}/branches`;

      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save branch');
      }

      await fetchBranches();
      setIsModalOpen(false);
      setEditingBranch(null);
    } catch (err) {
      console.error('Save branch error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = (branch) => {
    if (!isAdmin) return;
    setBranchToDelete(branch);
    setShowConfirmDialog(true);
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;

    setShowConfirmDialog(false);

    try {
      setDeletingId(branchToDelete.id);
      setError(null);

      const res = await fetch(`${API_URL}/branches/${branchToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete branch');
      }

      setBranches((prev) => prev.filter((b) => b.id !== branchToDelete.id));
      if (expandedBranch === branchToDelete.id) {
        setExpandedBranch(null);
      }
    } catch (err) {
      console.error('Delete branch error:', err);
      setError(err.message);
    } finally {
      setDeletingId(null);
      setBranchToDelete(null);
    }
  };

  const cancelDeleteBranch = () => {
    setShowConfirmDialog(false);
    setBranchToDelete(null);
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
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
            >
              <HiPlus className="w-5 h-5" />
              <span>Add Branch</span>
            </button>
          )}
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
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        <table className="min-w-[1000px] w-full table-auto">
          <thead>
            <tr className="border-b border-gray-200">
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
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                  Loading branches...
                </td>
              </tr>
            ) : paginatedBranches.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-600">
                  No branches found
                </td>
              </tr>
            ) : (
              paginatedBranches.map((branch) => (
                <React.Fragment key={branch.id}>
                  <tr className="border-b border-gray-200 hover:bg-gray-50 transition last:border-0">
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
                      {managerMap.get(branch.manager_id)?.full_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          branch.status
                        )}`}
                      >
                        {branch.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(branch)}
                              className="text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                            >
                              <HiPencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBranch(branch)}
                              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            >
                              <HiTrash className="w-5 h-5" />
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
                            className={`w-5 h-5 transform transition ${expandedBranch === branch.id ? 'rotate-180' : ''
                              }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedBranch === branch.id && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan="6" className="px-6 py-4">
                        <div className="space-y-4">
                          {/* Branch Details */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Branch Information
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Branch ID</p>
                                <p className="text-sm text-gray-900 font-mono">{branch.id}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Branch Code</p>
                                <p className="text-sm text-gray-900 font-mono">{branch.code}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">City</p>
                                <p className="text-sm text-gray-900">{branch.city}</p>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Status</p>
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                    branch.status
                                  )}`}
                                >
                                  {branch.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Manager Information */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Manager Information
                            </h4>
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              {managerMap.get(branch.manager_id) ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="text-sm text-gray-900 font-medium">
                                      {managerMap.get(branch.manager_id)?.full_name}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm text-gray-600">
                                      {managerMap.get(branch.manager_id)?.email}
                                    </p>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">Manager ID</p>
                                    <p className="text-sm text-gray-600 font-mono">
                                      {branch.manager_id}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No manager assigned</p>
                              )}
                            </div>
                          </div>

                          {/* Timestamps */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Timestamps
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Created At</p>
                                <p className="text-sm text-gray-900">
                                  {formatDate(branch.created_at)}
                                </p>
                              </div>
                              {branch.updated_at && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Updated At</p>
                                  <p className="text-sm text-gray-900">
                                    {formatDate(branch.updated_at)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {!loading && filteredBranches.length > 0 && (
          <div className="min-w-[1000px] w-full px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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
                      className={`px-3 py-1 border rounded text-sm transition ${pagination.page === pageNum
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

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-50">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                {editingBranch ? 'Edit Branch' : 'Add Branch'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBranch(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="Downtown Branch"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleFormChange}
                    placeholder="DT001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleFormChange}
                    placeholder="New York"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>

                <div className='relative'>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                </div>

                <div className='relative col-span-2'>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager (User)
                  </label>
                  <select
                    name="managerId"
                    value={formData.managerId}
                    onChange={handleFormChange}
                    className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="">
                      {managersLoading ? 'Loading managers...' : 'Unassigned'}
                    </option>
                    {managers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBranch(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving
                    ? editingBranch
                      ? 'Saving...'
                      : 'Creating...'
                    : editingBranch
                      ? 'Save Changes'
                      : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDialog && branchToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in z-50">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Delete Branch</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to delete this branch?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Branch Name:</span> {branchToDelete.name}
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Code:</span> {branchToDelete.code}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">City:</span> {branchToDelete.city}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteBranch}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBranch}
                disabled={deletingId === branchToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingId === branchToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Branches;