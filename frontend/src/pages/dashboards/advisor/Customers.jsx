import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import { HiTrash, HiPlus, HiX, HiSearch, HiPencil, HiPhone, HiMail, HiLocationMarker } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Customers = () => {
  const { session, user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 12,
    total: 0,
  });

  const itemsPerPage = pagination.pageSize;

  // Fetch customers
  useEffect(() => {
    if (session?.access_token) {
      fetchCustomers();
    }
  }, [session]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_URL}/customers`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch customers');
      }

      const data = await res.json();
      setCustomers(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.is_active === true).length;
    const inactive = customers.filter(c => c.is_active === false).length;
    return { total, active, inactive };
  }, [customers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch =
        customer.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus =
        filters.status === 'all' ||
        (filters.status === 'active' && customer.is_active === true) ||
        (filters.status === 'inactive' && customer.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [customers, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const offset = (pagination.page - 1) * itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(offset, offset + itemsPerPage);

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
    });
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  // Modal helpers
  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      is_active: customer.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      is_active: true,
    });
  };

  // Handle form submission (Create/Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage('');

    try {
      if (!formData.full_name) {
        setError('Full name is required');
        setSubmitting(false);
        return;
      }

      const url = editingCustomer
        ? `${API_URL}/customers/${editingCustomer.id}`
        : `${API_URL}/customers`;

      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to ${editingCustomer ? 'update' : 'create'} customer`);
      } else {
        setSuccessMessage(`Customer ${editingCustomer ? 'updated' : 'created'} successfully!`);
        closeModal();
        fetchCustomers();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(`Failed to save customer: ${err.message}`);
      console.error('Save customer error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete handlers
  const handleDeleteCustomer = (customer) => {
    setCustomerToDelete(customer);
    setShowConfirmDialog(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    setShowConfirmDialog(false);

    try {
      setError(null);

      const res = await fetch(`${API_URL}/customers/${customerToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete customer');
      } else {
        setSuccessMessage('Customer deleted successfully!');
        fetchCustomers();
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(`Failed to delete customer: ${err.message}`);
      console.error('Delete customer error:', err);
    } finally {
      setCustomerToDelete(null);
    }
  };

  const cancelDeleteCustomer = () => {
    setShowConfirmDialog(false);
    setCustomerToDelete(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Customers</h1>
            <p className="text-gray-600">Manage customer information</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
          >
            <HiPlus className="w-5 h-5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Active Customers"
          value={summaryStats.active}
          trend={`${summaryStats.total} total`}
          isPositive={true}
        />
        <MetricCard
          title="Inactive Customers"
          value={summaryStats.inactive}
          trend={summaryStats.inactive > 0 ? 'Needs attention' : 'All active'}
          isPositive={summaryStats.inactive === 0}
        />
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg flex items-center justify-between">
          <p>{successMessage}</p>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-green-700 hover:text-green-900"
          >
            <HiX className="w-5 h-5" />
          </button>
        </div>
      )}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
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
        </div>

        {/* Clear Filters */}
        <button
          onClick={clearFilters}
          className="text-sm text-gray-600 hover:text-black transition"
        >
          Clear Filters
        </button>
      </div>

      {/* Customers Grid */}
      <div>
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border border-gray-200">
            Loading customers...
          </div>
        ) : paginatedCustomers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border border-gray-200">
            No customers found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-lg transition"
              >
                {/* Customer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-black">
                      {customer.full_name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                        customer.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(customer)}
                      className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                      title="Edit customer"
                    >
                      <HiPencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Delete customer"
                    >
                      <HiTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-2">
                  {customer.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <HiPhone className="w-4 h-4 mr-2 text-gray-400" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <HiMail className="w-4 h-4 mr-2 text-gray-400" />
                      {customer.email}
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <HiLocationMarker className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Customer Footer */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-400">
                    Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredCustomers.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{offset + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(offset + itemsPerPage, filteredCustomers.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredCustomers.length}</span> customers
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
                <option value="12">12 per page</option>
                <option value="24">24 per page</option>
                <option value="48">48 per page</option>
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

      {/* Create/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 z-50">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-black">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Enter customer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter address"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 resize-none"
                />
              </div>

              {/* Status */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_active: e.target.value === 'active',
                    })
                  }
                  className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? editingCustomer
                      ? 'Saving...'
                      : 'Creating...'
                    : editingCustomer
                    ? 'Save Changes'
                    : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDialog && customerToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-50">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Delete Customer</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to delete this customer? This action cannot be undone.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Name:</span>{' '}
                  {customerToDelete.full_name || '-'}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Email:</span>{' '}
                  {customerToDelete.email || '-'}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Phone:</span>{' '}
                  {customerToDelete.phone || '-'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteCustomer}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCustomer}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
