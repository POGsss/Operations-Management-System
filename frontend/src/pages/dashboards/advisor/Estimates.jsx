import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiX,
  HiDocumentText,
  HiCheck,
  HiClock,
  HiBan,
  HiRefresh,
  HiArrowRight,
  HiSearch,
  HiEye,
  HiChevronDown,
  HiChevronUp,
  HiExclamation,
  HiUser,
  HiTruck
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: HiDocumentText },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: HiClock },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: HiCheck },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: HiBan },
  converted: { label: 'Converted', color: 'bg-blue-100 text-blue-700', icon: HiArrowRight },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: HiClock },
};

const ITEM_TYPES = [
  { value: 'labor', label: 'Labor' },
  { value: 'part', label: 'Part' },
  { value: 'package', label: 'Package' },
  { value: 'fee', label: 'Fee' },
  { value: 'discount', label: 'Discount' },
];

const Estimates = () => {
  const { session, user } = useAuth();

  // Main data state
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters & pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [detailEstimate, setDetailEstimate] = useState(null);

  // Create/edit form state
  const [estimateForm, setEstimateForm] = useState({
    customer_id: '',
    vehicle_id: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_vin: '',
    vehicle_license_plate: '',
    vehicle_mileage: '',
    customer_concern: '',
    internal_notes: '',
    tax_rate: '0.08',
    valid_until: '',
  });
  const [estimateItems, setEstimateItems] = useState([]);
  const [customerVehicles, setCustomerVehicles] = useState([]);
  const [saving, setSaving] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    item_type: 'labor', name: '', description: '', quantity: '1', unit_price: '', estimated_hours: '', hourly_rate: ''
  });

  // Fetch estimates
  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, limit: 15 });
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`${API_URL}/estimates?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimates');
      const data = await res.json();
      setEstimates(data.estimates || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reference data
  const fetchReferenceData = async () => {
    try {
      const [customersRes, packagesRes, laborRatesRes] = await Promise.all([
        fetch(`${API_URL}/customers`, { headers: { Authorization: `Bearer ${session?.access_token}` } }),
        fetch(`${API_URL}/estimates/search/packages`, { headers: { Authorization: `Bearer ${session?.access_token}` } }),
        fetch(`${API_URL}/estimates/labor-rates`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.customers || []);
      }
      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.packages || []);
      }
      if (laborRatesRes.ok) {
        const data = await laborRatesRes.json();
        setLaborRates(data.laborRates || []);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchEstimates();
      fetchReferenceData();
    }
  }, [session, statusFilter, currentPage]);

  // Fetch customer vehicles when customer changes
  const fetchCustomerVehicles = async (customerId) => {
    if (!customerId) {
      setCustomerVehicles([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/estimates/vehicles?customer_id=${customerId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerVehicles(data.vehicles || []);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: estimates.length,
    draft: estimates.filter(e => e.status === 'draft').length,
    pending: estimates.filter(e => e.status === 'pending').length,
    approved: estimates.filter(e => e.status === 'approved').length,
  }), [estimates]);

  // Filtered estimates (client-side search)
  const filteredEstimates = useMemo(() => {
    if (!searchTerm) return estimates;
    const term = searchTerm.toLowerCase();
    return estimates.filter(e =>
      e.estimate_number?.toLowerCase().includes(term) ||
      e.customer?.full_name?.toLowerCase().includes(term) ||
      e.vehicle_make?.toLowerCase().includes(term) ||
      e.vehicle_model?.toLowerCase().includes(term)
    );
  }, [estimates, searchTerm]);

  // Calculate totals for items
  const calculateTotals = (items, taxRate) => {
    let laborTotal = 0;
    let partsTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const lineTotal = parseFloat(item.line_total) || (parseFloat(item.quantity) * parseFloat(item.unit_price));
      if (item.item_type === 'labor') laborTotal += lineTotal;
      else if (item.item_type === 'discount') discountTotal += Math.abs(lineTotal);
      else partsTotal += lineTotal;
    });

    const subtotal = laborTotal + partsTotal - discountTotal;
    const taxAmount = subtotal * parseFloat(taxRate || 0);
    const total = subtotal + taxAmount;

    return { laborTotal, partsTotal, discountTotal, subtotal, taxAmount, total };
  };

  const currentTotals = useMemo(() => {
    return calculateTotals(estimateItems, estimateForm.tax_rate);
  }, [estimateItems, estimateForm.tax_rate]);

  // Open create modal
  const openCreateModal = () => {
    setSelectedEstimate(null);
    setEstimateForm({
      customer_id: '', vehicle_id: '',
      vehicle_make: '', vehicle_model: '', vehicle_year: '', vehicle_vin: '', vehicle_license_plate: '', vehicle_mileage: '',
      customer_concern: '', internal_notes: '', tax_rate: '0.08',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setEstimateItems([]);
    setCustomerVehicles([]);
    setShowCreateModal(true);
  };

  // View estimate details
  const viewEstimateDetails = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimate details');
      const data = await res.json();
      setDetailEstimate(data.estimate);
      setShowDetailModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Edit estimate
  const openEditModal = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch estimate');
      const data = await res.json();
      const e = data.estimate;

      setSelectedEstimate(e);
      setEstimateForm({
        customer_id: e.customer_id || '',
        vehicle_id: e.vehicle_id || '',
        vehicle_make: e.vehicle_make || '',
        vehicle_model: e.vehicle_model || '',
        vehicle_year: e.vehicle_year?.toString() || '',
        vehicle_vin: e.vehicle_vin || '',
        vehicle_license_plate: e.vehicle_license_plate || '',
        vehicle_mileage: e.vehicle_mileage?.toString() || '',
        customer_concern: e.customer_concern || '',
        internal_notes: e.internal_notes || '',
        tax_rate: e.tax_rate?.toString() || '0.08',
        valid_until: e.valid_until ? e.valid_until.split('T')[0] : ''
      });
      setEstimateItems(e.items || []);

      if (e.customer_id) {
        await fetchCustomerVehicles(e.customer_id);
      }

      setShowCreateModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle customer change
  const handleCustomerChange = async (customerId) => {
    setEstimateForm(f => ({ ...f, customer_id: customerId, vehicle_id: '' }));
    await fetchCustomerVehicles(customerId);
  };

  // Handle vehicle selection
  const handleVehicleChange = (vehicleId) => {
    const vehicle = customerVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setEstimateForm(f => ({
        ...f,
        vehicle_id: vehicleId,
        vehicle_make: vehicle.make,
        vehicle_model: vehicle.model,
        vehicle_year: vehicle.year?.toString() || '',
        vehicle_vin: vehicle.vin || '',
        vehicle_license_plate: vehicle.license_plate || '',
        vehicle_mileage: vehicle.mileage?.toString() || ''
      }));
    } else {
      setEstimateForm(f => ({ ...f, vehicle_id: '' }));
    }
  };

  // Add item to estimate
  const handleAddItem = () => {
    if (!newItem.name) return;

    const unitPrice = parseFloat(newItem.unit_price) || 0;
    const quantity = parseFloat(newItem.quantity) || 1;
    const lineTotal = newItem.item_type === 'discount' ? -Math.abs(unitPrice * quantity) : unitPrice * quantity;

    const item = {
      id: `temp-${Date.now()}`,
      item_type: newItem.item_type,
      name: newItem.name,
      description: newItem.description,
      quantity: quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      estimated_hours: parseFloat(newItem.estimated_hours) || null,
      hourly_rate: parseFloat(newItem.hourly_rate) || null,
      is_taxable: newItem.item_type !== 'discount'
    };

    setEstimateItems([...estimateItems, item]);
    setNewItem({ item_type: 'labor', name: '', description: '', quantity: '1', unit_price: '', estimated_hours: '', hourly_rate: '' });
    setShowAddItem(false);
  };

  // Remove item
  const removeItem = (index) => {
    setEstimateItems(estimateItems.filter((_, i) => i !== index));
  };

  // Add package as items
  const addPackageToEstimate = (pkg) => {
    const item = {
      id: `temp-${Date.now()}`,
      item_type: 'package',
      service_package_id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      quantity: 1,
      unit_price: parseFloat(pkg.base_price),
      line_total: parseFloat(pkg.base_price),
      estimated_hours: parseFloat(pkg.estimated_hours) || null,
      is_taxable: true
    };
    setEstimateItems([...estimateItems, item]);
  };

  // Save estimate
  const handleSaveEstimate = async (e) => {
    e.preventDefault();
    if (!estimateForm.customer_id) {
      setError('Please select a customer');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...estimateForm,
        tax_rate: parseFloat(estimateForm.tax_rate) || 0,
        vehicle_year: estimateForm.vehicle_year ? parseInt(estimateForm.vehicle_year) : null,
        vehicle_mileage: estimateForm.vehicle_mileage ? parseInt(estimateForm.vehicle_mileage) : null,
        items: estimateItems.map(item => ({
          item_type: item.item_type,
          service_package_id: item.service_package_id,
          inventory_item_id: item.inventory_item_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          estimated_hours: item.estimated_hours,
          hourly_rate: item.hourly_rate,
          is_taxable: item.is_taxable
        }))
      };

      let res;
      if (selectedEstimate) {
        res = await fetch(`${API_URL}/estimates/${selectedEstimate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_URL}/estimates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save estimate');
      }

      setSuccessMessage(selectedEstimate ? 'Estimate updated!' : 'Estimate created!');
      setShowCreateModal(false);
      fetchEstimates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Workflow actions
  const handleSubmitForApproval = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Estimate submitted for approval!');
      fetchEstimates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Estimate approved!');
      fetchEstimates();
      if (showDetailModal) setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (estimate, reason) => {
    if (!reason) {
      setError('Please provide a rejection reason');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Estimate rejected.');
      fetchEstimates();
      if (showDetailModal) setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConvertToJobOrder = async (estimate) => {
    try {
      const res = await fetch(`${API_URL}/estimates/${estimate.id}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setSuccessMessage(`Converted to Job Order! Job ID: ${data.jobOrder?.id?.slice(0, 8)}...`);
      fetchEstimates();
      if (showDetailModal) setShowDetailModal(false);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_URL}/estimates/${selectedEstimate.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage('Estimate deleted!');
      setShowDeleteConfirm(false);
      setSelectedEstimate(null);
      fetchEstimates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  if (loading && estimates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Estimates</h1>
          <p className="text-gray-600">Create and manage customer estimates</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
        >
          <HiPlus className="w-5 h-5" />
          <span>New Estimate</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Total Estimates" value={stats.total} icon={<HiDocumentText />} />
        <MetricCard title="Draft" value={stats.draft} icon={<HiPencil />} />
        <MetricCard title="Pending Approval" value={stats.pending} icon={<HiClock />} />
        <MetricCard title="Approved" value={stats.approved} icon={<HiCheck />} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <HiSearch className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <button onClick={fetchEstimates} className="p-2 hover:bg-gray-100 rounded-lg">
            <HiRefresh className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Estimates Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estimate #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEstimates.map(estimate => {
              const StatusIcon = STATUS_CONFIG[estimate.status]?.icon || HiDocumentText;
              return (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{estimate.estimate_number}</td>
                  <td className="px-4 py-3">
                    <div>{estimate.customer?.full_name || '—'}</div>
                    {estimate.customer?.phone && <div className="text-xs text-gray-500">{estimate.customer.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div>{estimate.vehicle_make} {estimate.vehicle_model}</div>
                    {estimate.vehicle_license_plate && <div className="text-xs text-gray-500">{estimate.vehicle_license_plate}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(estimate.total_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[estimate.status]?.color}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {STATUS_CONFIG[estimate.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(estimate.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => viewEstimateDetails(estimate)} className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                        <HiEye className="w-4 h-4 text-gray-600" />
                      </button>
                      {estimate.status === 'draft' && (
                        <>
                          <button onClick={() => openEditModal(estimate)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                            <HiPencil className="w-4 h-4 text-gray-600" />
                          </button>
                          <button onClick={() => handleSubmitForApproval(estimate)} className="p-2 hover:bg-blue-50 rounded-lg" title="Submit">
                            <HiArrowRight className="w-4 h-4 text-blue-600" />
                          </button>
                          <button onClick={() => { setSelectedEstimate(estimate); setShowDeleteConfirm(true); }} className="p-2 hover:bg-red-50 rounded-lg" title="Delete">
                            <HiTrash className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                      {estimate.status === 'pending' && user?.role !== 'service_advisor' && (
                        <>
                          <button onClick={() => handleApprove(estimate)} className="p-2 hover:bg-green-50 rounded-lg" title="Approve">
                            <HiCheck className="w-4 h-4 text-green-600" />
                          </button>
                        </>
                      )}
                      {estimate.status === 'approved' && (
                        <button onClick={() => handleConvertToJobOrder(estimate)} className="p-2 hover:bg-blue-50 rounded-lg" title="Convert to Job Order">
                          <HiArrowRight className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredEstimates.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No estimates found</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >Previous</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold">{selectedEstimate ? 'Edit Estimate' : 'Create Estimate'}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEstimate} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer & Vehicle Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center"><HiUser className="w-5 h-5 mr-2" />Customer</h4>
                  <select
                    value={estimateForm.customer_id}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.full_name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center"><HiTruck className="w-5 h-5 mr-2" />Vehicle</h4>
                  <select
                    value={estimateForm.vehicle_id}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select or enter manually...</option>
                    {customerVehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} ({v.license_plate || v.vin || 'No plate'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                  <input type="text" value={estimateForm.vehicle_make} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_make: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input type="text" value={estimateForm.vehicle_model} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_model: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={estimateForm.vehicle_year} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_year: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                  <input type="text" value={estimateForm.vehicle_vin} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_vin: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                  <input type="text" value={estimateForm.vehicle_license_plate} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_license_plate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  <input type="number" value={estimateForm.vehicle_mileage} onChange={(e) => setEstimateForm(f => ({ ...f, vehicle_mileage: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* Customer Concern */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Concern</label>
                <textarea value={estimateForm.customer_concern} onChange={(e) => setEstimateForm(f => ({ ...f, customer_concern: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={2} />
              </div>

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Line Items</h4>
                  <div className="flex space-x-2">
                    <select onChange={(e) => { if (e.target.value) addPackageToEstimate(packages.find(p => p.id === e.target.value)); e.target.value = ''; }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                      <option value="">Add Package...</option>
                      {packages.map(p => (<option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.base_price)})</option>))}
                    </select>
                    <button type="button" onClick={() => setShowAddItem(true)} className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm">
                      <HiPlus className="w-4 h-4" /><span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {estimateItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-3 py-2 capitalize">{item.item_type}</td>
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded">
                              <HiTrash className="w-4 h-4 text-red-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {estimateItems.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">No items added</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Item Form */}
                {showAddItem && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <select value={newItem.item_type} onChange={(e) => setNewItem(n => ({ ...n, item_type: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2">
                        {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <input type="text" placeholder="Name" value={newItem.name} onChange={(e) => setNewItem(n => ({ ...n, name: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2 col-span-2" />
                      <input type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem(n => ({ ...n, quantity: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <input type="number" step="0.01" placeholder="Unit Price" value={newItem.unit_price} onChange={(e) => setNewItem(n => ({ ...n, unit_price: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
                      {newItem.item_type === 'labor' && (
                        <>
                          <input type="number" step="0.5" placeholder="Hours" value={newItem.estimated_hours} onChange={(e) => setNewItem(n => ({ ...n, estimated_hours: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2" />
                          <select value={newItem.hourly_rate} onChange={(e) => setNewItem(n => ({ ...n, hourly_rate: e.target.value, unit_price: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-2">
                            <option value="">Select rate...</option>
                            {laborRates.map(r => <option key={r.id} value={r.hourly_rate}>{r.name} ({formatCurrency(r.hourly_rate)}/hr)</option>)}
                          </select>
                        </>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button type="button" onClick={() => setShowAddItem(false)} className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                      <button type="button" onClick={handleAddItem} className="px-3 py-1.5 bg-black text-white rounded-lg hover:bg-gray-800">Add</button>
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Labor:</span><span>{formatCurrency(currentTotals.laborTotal)}</span></div>
                    <div className="flex justify-between"><span>Parts & Fees:</span><span>{formatCurrency(currentTotals.partsTotal)}</span></div>
                    {currentTotals.discountTotal > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{formatCurrency(currentTotals.discountTotal)}</span></div>}
                    <div className="flex justify-between border-t pt-2"><span>Subtotal:</span><span>{formatCurrency(currentTotals.subtotal)}</span></div>
                    <div className="flex justify-between items-center">
                      <span>Tax Rate:</span>
                      <input type="number" step="0.01" value={estimateForm.tax_rate} onChange={(e) => setEstimateForm(f => ({ ...f, tax_rate: e.target.value }))} className="w-20 border border-gray-300 rounded px-2 py-1 text-right" />
                    </div>
                    <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(currentTotals.taxAmount)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total:</span><span>{formatCurrency(currentTotals.total)}</span></div>
                  </div>
                </div>
              </div>

              {/* Notes & Valid Until */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <textarea value={estimateForm.internal_notes} onChange={(e) => setEstimateForm(f => ({ ...f, internal_notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input type="date" value={estimateForm.valid_until} onChange={(e) => setEstimateForm(f => ({ ...f, valid_until: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                </div>
              </div>
            </form>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveEstimate} disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                {saving ? 'Saving...' : (selectedEstimate ? 'Update Estimate' : 'Create Estimate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && detailEstimate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl m-4">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold">{detailEstimate.estimate_number}</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs mt-1 ${STATUS_CONFIG[detailEstimate.status]?.color}`}>
                  {STATUS_CONFIG[detailEstimate.status]?.label}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Customer & Vehicle */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Customer</h4>
                  <p className="text-gray-800">{detailEstimate.customer?.full_name || '—'}</p>
                  {detailEstimate.customer?.phone && <p className="text-sm text-gray-600">{detailEstimate.customer.phone}</p>}
                  {detailEstimate.customer?.email && <p className="text-sm text-gray-600">{detailEstimate.customer.email}</p>}
                </div>
                <div>
                  <h4 className="font-medium mb-2">Vehicle</h4>
                  <p className="text-gray-800">{detailEstimate.vehicle_year} {detailEstimate.vehicle_make} {detailEstimate.vehicle_model}</p>
                  {detailEstimate.vehicle_license_plate && <p className="text-sm text-gray-600">Plate: {detailEstimate.vehicle_license_plate}</p>}
                  {detailEstimate.vehicle_vin && <p className="text-sm text-gray-600">VIN: {detailEstimate.vehicle_vin}</p>}
                </div>
              </div>

              {/* Customer Concern */}
              {detailEstimate.customer_concern && (
                <div>
                  <h4 className="font-medium mb-2">Customer Concern</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{detailEstimate.customer_concern}</p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-2">Line Items</h4>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(detailEstimate.items || []).map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded mr-2 ${item.item_type === 'labor' ? 'bg-blue-100 text-blue-700' : item.item_type === 'discount' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.item_type}
                          </span>
                          {item.name}
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Labor:</span><span>{formatCurrency(detailEstimate.labor_total)}</span></div>
                  <div className="flex justify-between"><span>Parts:</span><span>{formatCurrency(detailEstimate.parts_total)}</span></div>
                  {parseFloat(detailEstimate.discount_amount) > 0 && <div className="flex justify-between text-red-600"><span>Discount:</span><span>-{formatCurrency(detailEstimate.discount_amount)}</span></div>}
                  <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>{formatCurrency(detailEstimate.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Tax ({(parseFloat(detailEstimate.tax_rate || 0) * 100).toFixed(1)}%):</span><span>{formatCurrency(detailEstimate.tax_amount)}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total:</span><span>{formatCurrency(detailEstimate.total_amount)}</span></div>
                </div>
              </div>

              {/* History */}
              {detailEstimate.history && detailEstimate.history.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Approval History</h4>
                  <div className="space-y-2">
                    {detailEstimate.history.map(h => (
                      <div key={h.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                        <div>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_CONFIG[h.from_status]?.color}`}>{h.from_status}</span>
                          <span className="mx-2">→</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_CONFIG[h.to_status]?.color}`}>{h.to_status}</span>
                          {h.reason && <span className="ml-2 text-gray-600">"{h.reason}"</span>}
                        </div>
                        <div className="text-gray-500">
                          {h.changed_by_user?.full_name} • {new Date(h.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 p-6 border-t">
              {detailEstimate.status === 'pending' && user?.role !== 'service_advisor' && (
                <>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) handleReject(detailEstimate, reason);
                    }}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >Reject</button>
                  <button onClick={() => handleApprove(detailEstimate)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                </>
              )}
              {detailEstimate.status === 'approved' && (
                <button onClick={() => handleConvertToJobOrder(detailEstimate)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Convert to Job Order
                </button>
              )}
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 m-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full"><HiExclamation className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-semibold">Delete Estimate</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete {selectedEstimate.estimate_number}? This cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Estimates;
