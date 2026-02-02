import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiSearch,
  HiX,
  HiPlus,
  HiEye,
  HiTrash,
  HiCheck,
  HiBan,
  HiClipboardList,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiRefresh,
  HiExclamationCircle,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

// Priority colors
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

// Status colors
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const PurchaseOrders = () => {
  const { session, user } = useAuth();

  // Purchase requests data
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inventory items for dropdown
  const [inventoryItems, setInventoryItems] = useState([]);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
  });

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    priority: 'normal',
    notes: '',
    items: [{ item_id: '', quantity: 1, notes: '' }],
  });
  const [saving, setSaving] = useState(false);

  // Confirmation modal
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch purchase requests
  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/inventory/purchase-requests`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch purchase requests');
      }

      const data = await response.json();
      setPurchaseRequests(data.purchaseRequests || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching purchase requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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
      fetchPurchaseRequests();
      fetchInventoryItems();
    }
  }, [session]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = purchaseRequests.length;
    const pending = purchaseRequests.filter((pr) => pr.status === 'pending').length;
    const approved = purchaseRequests.filter((pr) => pr.status === 'approved').length;
    const rejected = purchaseRequests.filter((pr) => pr.status === 'rejected').length;

    return { total, pending, approved, rejected };
  }, [purchaseRequests]);

  // Filtered purchase requests
  const filteredPRs = useMemo(() => {
    return purchaseRequests.filter((pr) => {
      const matchesSearch =
        pr.id?.toLowerCase().includes(filters.search.toLowerCase()) ||
        pr.requester?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        pr.branch?.name?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = filters.status === 'all' || pr.status === filters.status;
      const matchesPriority = filters.priority === 'all' || pr.priority === filters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [purchaseRequests, filters]);

  // Open view modal
  const openViewModal = (pr) => {
    setSelectedPR(pr);
    setIsViewModalOpen(true);
  };

  // Open create modal
  const openCreateModal = () => {
    setCreateForm({
      priority: 'normal',
      notes: '',
      items: [{ item_id: '', quantity: 1, notes: '' }],
    });
    setIsCreateModalOpen(true);
  };

  // Add item to form
  const addItemToForm = () => {
    setCreateForm({
      ...createForm,
      items: [...createForm.items, { item_id: '', quantity: 1, notes: '' }],
    });
  };

  // Remove item from form
  const removeItemFromForm = (index) => {
    if (createForm.items.length > 1) {
      const newItems = createForm.items.filter((_, i) => i !== index);
      setCreateForm({ ...createForm, items: newItems });
    }
  };

  // Update item in form
  const updateItemInForm = (index, field, value) => {
    const newItems = [...createForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setCreateForm({ ...createForm, items: newItems });
  };

  // Handle create PR with confirmation
  const handleCreateConfirm = (e) => {
    e.preventDefault();
    setConfirmAction({
      type: 'create',
      title: 'Confirm Purchase Request',
      message: `Are you sure you want to submit this purchase request with ${createForm.items.length} item(s)?`,
    });
    setShowConfirmDialog(true);
  };

  const handleCreatePR = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/purchase-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: createForm.priority,
          notes: createForm.notes,
          items: createForm.items.filter((i) => i.item_id),
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create purchase request');
      }

      await fetchPurchaseRequests();
      setIsCreateModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error creating PR:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle approve PR
  const handleApproveConfirm = (pr) => {
    setSelectedPR(pr);
    setConfirmAction({
      type: 'approve',
      title: 'Approve Purchase Request',
      message: `Are you sure you want to approve PR #${pr.id?.substring(0, 8)} from ${pr.branch?.name}?`,
    });
    setShowConfirmDialog(true);
  };

  const handleApprovePR = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/purchase-requests/${selectedPR.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to approve PR');
      }

      await fetchPurchaseRequests();
      setIsViewModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error approving PR:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle reject PR
  const handleRejectConfirm = (pr) => {
    setSelectedPR(pr);
    setConfirmAction({
      type: 'reject',
      title: 'Reject Purchase Request',
      message: `Are you sure you want to reject PR #${pr.id?.substring(0, 8)} from ${pr.branch?.name}?`,
    });
    setShowConfirmDialog(true);
  };

  const handleRejectPR = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/purchase-requests/${selectedPR.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to reject PR');
      }

      await fetchPurchaseRequests();
      setIsViewModalOpen(false);
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error rejecting PR:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle delete PR
  const handleDeleteConfirm = (pr) => {
    setSelectedPR(pr);
    setConfirmAction({
      type: 'delete',
      title: 'Delete Purchase Request',
      message: `Are you sure you want to delete PR #${pr.id?.substring(0, 8)}? This action cannot be undone.`,
    });
    setShowConfirmDialog(true);
  };

  const handleDeletePR = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/inventory/purchase-requests/${selectedPR.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete PR');
      }

      await fetchPurchaseRequests();
      setShowConfirmDialog(false);
    } catch (err) {
      console.error('Error deleting PR:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Confirm action handler
  const handleConfirm = () => {
    if (confirmAction?.type === 'create') {
      handleCreatePR();
    } else if (confirmAction?.type === 'approve') {
      handleApprovePR();
    } else if (confirmAction?.type === 'reject') {
      handleRejectPR();
    } else if (confirmAction?.type === 'delete') {
      handleDeletePR();
    }
  };

  const isAdmin = user?.role === 'admin';
  const canCreate = ['admin', 'branch_manager', 'inventory_officer'].includes(user?.role);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Purchase Requests</h1>
          <p className="text-gray-600">Manage inventory purchase requests</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPurchaseRequests}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
          >
            <HiRefresh className="w-5 h-5" />
            Refresh
          </button>
          {canCreate && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
            >
              <HiPlus className="w-5 h-5" />
              New Request
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Requests"
          value={stats.total}
          icon={<HiClipboardList className="w-6 h-6" />}
        />
        <MetricCard
          title="Pending"
          value={stats.pending}
          icon={<HiClock className="w-6 h-6" />}
          trend={stats.pending > 0 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Approved"
          value={stats.approved}
          icon={<HiCheckCircle className="w-6 h-6" />}
        />
        <MetricCard
          title="Rejected"
          value={stats.rejected}
          icon={<HiXCircle className="w-6 h-6" />}
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
                placeholder="Search by ID, requester, or branch..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Purchase Requests Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <HiClipboardList className="w-12 h-12 mb-2" />
            <p>No purchase requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPRs.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm">#{pr.id?.substring(0, 8)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{pr.branch?.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{pr.requester?.full_name}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-medium">{pr.purchase_request_items?.length || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          PRIORITY_COLORS[pr.priority] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pr.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          STATUS_COLORS[pr.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{formatDate(pr.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openViewModal(pr)}
                          className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          title="View Details"
                        >
                          <HiEye className="w-5 h-5" />
                        </button>
                        {isAdmin && pr.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveConfirm(pr)}
                              className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition"
                              title="Approve"
                            >
                              <HiCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectConfirm(pr)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                              title="Reject"
                            >
                              <HiBan className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {pr.status === 'pending' && (pr.requested_by === user?.id || isAdmin) && (
                          <button
                            onClick={() => handleDeleteConfirm(pr)}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <HiTrash className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View PR Modal */}
      {isViewModalOpen && selectedPR && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col z-50">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                PR #{selectedPR.id?.substring(0, 8)}
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Branch:</span>{' '}
                      <span className="font-medium">{selectedPR.branch?.name || '-'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Requested By:</span>{' '}
                      <span className="font-medium">{selectedPR.requester?.full_name || '-'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Priority:</span>{' '}
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                          PRIORITY_COLORS[selectedPR.priority]
                        }`}
                      >
                        {selectedPR.priority}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Status:</span>{' '}
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                          STATUS_COLORS[selectedPR.status]
                        }`}
                      >
                        {selectedPR.status}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Review Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Reviewed By:</span>{' '}
                      <span className="font-medium">{selectedPR.reviewer?.full_name || 'Not yet reviewed'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Reviewed At:</span>{' '}
                      <span className="font-medium">{selectedPR.reviewed_at ? formatDate(selectedPR.reviewed_at) : '-'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Requested Items</h3>
                {selectedPR.purchase_request_items?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">SKU</th>
                          <th className="pb-2 text-right">Quantity</th>
                          <th className="pb-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPR.purchase_request_items.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-2 font-medium">{item.item?.name}</td>
                            <td className="py-2 font-mono text-gray-500">{item.item?.sku}</td>
                            <td className="py-2 text-right">{item.quantity}</td>
                            <td className="py-2 text-gray-500">{item.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No items in this request</p>
                )}
              </div>

              {/* Notes */}
              {selectedPR.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedPR.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Created: {formatDate(selectedPR.created_at)}
              </div>
              <div className="flex gap-3">
                {isAdmin && selectedPR.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleRejectConfirm(selectedPR)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveConfirm(selectedPR)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                    >
                      Approve
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create PR Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col z-50">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">New Purchase Request</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateConfirm} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Priority Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={createForm.priority}
                  onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Items *</label>
                  <button
                    type="button"
                    onClick={addItemToForm}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {createForm.items.map((item, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                          <label className="block text-xs text-gray-500 mb-1">Item</label>
                          <select
                            value={item.item_id}
                            onChange={(e) => updateItemInForm(index, 'item_id', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-sm"
                          >
                            <option value="">Select Item</option>
                            {inventoryItems.map((invItem) => (
                              <option key={invItem.id} value={invItem.id}>
                                {invItem.name} ({invItem.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemInForm(index, 'quantity', parseInt(e.target.value) || 1)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-500 mb-1">Notes</label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemInForm(index, 'notes', e.target.value)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black text-sm"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          {createForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemFromForm(index)}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            >
                              <HiTrash className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                  placeholder="Enter any additional notes or reasons for this request..."
                />
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createForm.items.every((i) => !i.item_id)}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Request
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
            <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
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
                className={`px-4 py-2 rounded-lg transition font-medium disabled:opacity-50 ${
                  confirmAction.type === 'reject' || confirmAction.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : confirmAction.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-black hover:bg-gray-800 text-white'
                }`}
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

export default PurchaseOrders;
