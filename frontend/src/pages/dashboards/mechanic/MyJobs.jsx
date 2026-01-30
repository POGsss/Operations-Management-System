import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiSearch,
  HiX,
  HiEye,
  HiPlay,
  HiCheck,
  HiClipboardList,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiCog,
  HiPlus,
  HiChevronDown,
} from 'react-icons/hi';
import {
  fetchJobs,
  fetchJobById,
  changeJobStatus,
  logPartUsed,
  fetchPartsUsed,
  JOB_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../../services/jobOrdersService';
import { supabase } from '../../../lib/supabaseClient';

const MyJobs = () => {
  const { session, user } = useAuth();

  // Job list state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPartsModalOpen, setIsPartsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);

  // Inventory items for parts logging
  const [inventoryItems, setInventoryItems] = useState([]);
  const [partsForm, setPartsForm] = useState({
    inventory_item_id: '',
    quantity: 1,
  });
  const [savingPart, setSavingPart] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  // Fetch assigned jobs
  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await fetchJobs(session);
      setJobs(data.jobs || []);
      setError(null);
    } catch (err) {
      console.error('Fetch jobs error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory items for parts logging
  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, sku, unit_price, stock')
        .gt('stock', 0)
        .order('name');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadJobs();
      loadInventoryItems();
    }
  }, [session]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = jobs.length;
    const approved = jobs.filter((j) => j.status === 'APPROVED').length;
    const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
    const qualityCheck = jobs.filter((j) => j.status === 'QUALITY_CHECK').length;
    const completed = jobs.filter((j) => ['BILLED', 'RELEASED'].includes(j.status)).length;
    return { total, approved, inProgress, qualityCheck, completed };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        job.id?.toLowerCase().includes(searchLower) ||
        job.customer?.full_name?.toLowerCase().includes(searchLower) ||
        job.vehicle_plate?.toLowerCase().includes(searchLower);

      const matchesStatus = filters.status === 'all' || job.status === filters.status;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, filters]);

  // Handle view job details
  const handleViewJob = async (job) => {
    try {
      const data = await fetchJobById(session, job.id);
      setJobDetails(data.job);
      setSelectedJob(job);
      setIsViewModalOpen(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle status change
  const handleStatusChange = async (jobId, newStatus) => {
    try {
      await changeJobStatus(session, jobId, newStatus);
      loadJobs();
      if (jobDetails && jobDetails.id === jobId) {
        const data = await fetchJobById(session, jobId);
        setJobDetails(data.job);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle start job
  const handleStartJob = async (jobId) => {
    if (!confirm('Are you sure you want to start working on this job?')) return;
    await handleStatusChange(jobId, 'IN_PROGRESS');
  };

  // Handle complete job (send to quality check)
  const handleCompleteJob = async (jobId) => {
    if (!confirm('Mark this job as complete and send for quality check?')) return;
    await handleStatusChange(jobId, 'QUALITY_CHECK');
  };

  // Handle log part
  const handleLogPart = async (e) => {
    e.preventDefault();
    try {
      setSavingPart(true);
      await logPartUsed(session, selectedJob.id, {
        inventory_item_id: partsForm.inventory_item_id,
        quantity: parseInt(partsForm.quantity),
      });
      setPartsForm({ inventory_item_id: '', quantity: 1 });
      // Refresh job details and inventory
      const data = await fetchJobById(session, selectedJob.id);
      setJobDetails(data.job);
      loadInventoryItems();
      setIsPartsModalOpen(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingPart(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge color for cards
  const getStatusCardStyle = (status) => {
    const styles = {
      APPROVED: 'border-l-4 border-l-green-500',
      IN_PROGRESS: 'border-l-4 border-l-blue-500',
      QUALITY_CHECK: 'border-l-4 border-l-purple-500',
    };
    return styles[status] || '';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">My Jobs</h1>
            <p className="text-gray-600">View and manage your assigned job orders</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <MetricCard title="Total Assigned" value={stats.total} />
        <MetricCard title="Ready to Start" value={stats.approved} />
        <MetricCard title="In Progress" value={stats.inProgress} />
        <MetricCard title="Quality Check" value={stats.qualityCheck} />
        <MetricCard title="Completed" value={stats.completed} />
      </div>

      {/* Active Jobs Alert */}
      {stats.inProgress > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <HiCog className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <p className="font-medium">
                You have {stats.inProgress} job(s) currently in progress
              </p>
              <p className="text-sm text-blue-700">
                Remember to log all parts used before completing the job
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-bold text-black mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Job ID, Customer, or Vehicle..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 pl-10"
              />
            </div>
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">Ready to Start</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="QUALITY_CHECK">Quality Check</option>
            </select>
            <HiChevronDown className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
          </div>
        </div>
        <button
          onClick={() => setFilters({ search: '', status: 'all' })}
          className="text-sm text-black hover:text-gray-700 font-medium"
        >
          Clear All Filters
        </button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-600">Loading your jobs...</div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-red-600">{error}</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center text-gray-600">
          <HiClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No jobs assigned to you yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className={`bg-white rounded-lg shadow border border-gray-200 hover:shadow-lg transition ${getStatusCardStyle(
                job.status
              )}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-sm text-gray-600">
                      #{job.id?.substring(0, 8)}
                    </span>
                    <h3 className="font-semibold text-black mt-1">
                      {job.customer?.full_name || 'Unknown Customer'}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {STATUS_LABELS[job.status] || job.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>
                    <span className="font-medium">Vehicle:</span> {job.vehicle_plate || 'N/A'}
                  </p>
                  {job.odometer && (
                    <p>
                      <span className="font-medium">Odometer:</span>{' '}
                      {job.odometer.toLocaleString()} km
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Estimated:</span>{' '}
                    {formatCurrency(job.total_estimated)}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewJob(job)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <HiEye className="w-4 h-4" />
                    View
                  </button>
                  {job.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStartJob(job.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-black rounded-lg hover:bg-gray-800 transition"
                    >
                      <HiPlay className="w-4 h-4" />
                      Start
                    </button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleCompleteJob(job.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-white bg-black rounded-lg hover:bg-gray-800 transition"
                    >
                      <HiCheck className="w-4 h-4" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Job Modal */}
      {isViewModalOpen && jobDetails && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col z-50">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-black">
                  Job #{jobDetails.id?.substring(0, 8)}
                </h2>
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mt-2 ${
                    STATUS_COLORS[jobDetails.status] || 'bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[jobDetails.status] || jobDetails.status}
                </span>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-black mb-2">Customer</h3>
                  <p className="font-medium">{jobDetails.customer?.full_name}</p>
                  <p className="text-sm text-gray-500">{jobDetails.customer?.phone}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-black mb-2">Vehicle</h3>
                  <p className="font-medium">{jobDetails.vehicle_plate || 'N/A'}</p>
                  <p className="text-sm text-gray-500">
                    {jobDetails.odometer ? `${jobDetails.odometer.toLocaleString()} km` : '-'}
                  </p>
                </div>
              </div>

              {/* Work Items / Estimates */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-black mb-3">Work Items</h3>
                {jobDetails.job_estimates?.length > 0 ? (
                  <div className="space-y-2">
                    {jobDetails.job_estimates.map((est) => (
                      <div
                        key={est.id}
                        className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div>
                          <p className="font-medium">{est.item_name}</p>
                          <span className="text-xs text-gray-500">{est.item_type}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {est.quantity} x {formatCurrency(est.unit_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No work items defined</p>
                )}
              </div>

              {/* Parts Used */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-black">Parts Used</h3>
                  {jobDetails.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => setIsPartsModalOpen(true)}
                      className="flex items-center gap-1 text-sm text-gray-700 hover:text-black transition"
                    >
                      <HiPlus className="w-4 h-4" />
                      Log Part
                    </button>
                  )}
                </div>
                {jobDetails.job_parts_used?.length > 0 ? (
                  <div className="space-y-2">
                    {jobDetails.job_parts_used.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200"
                      >
                        <div>
                          <p className="font-medium">{part.inventory_item?.name}</p>
                          <span className="text-xs text-gray-500 font-mono">
                            {part.inventory_item?.sku}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {part.quantity}</p>
                          <span className="text-xs text-gray-500">
                            {formatDate(part.used_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No parts logged yet</p>
                )}
              </div>

              {/* Notes */}
              {jobDetails.notes && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <h3 className="font-semibold text-black mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{jobDetails.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-6 flex justify-between items-center bg-gray-50">
              <div className="text-sm text-gray-500">
                Assigned: {formatDate(jobDetails.job_assignments?.[0]?.assigned_at)}
              </div>
              <div className="flex gap-3">
                {jobDetails.status === 'APPROVED' && (
                  <button
                    onClick={() => handleStartJob(jobDetails.id)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                  >
                    Start Job
                  </button>
                )}
                {jobDetails.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={() => setIsPartsModalOpen(true)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Log Parts
                    </button>
                    <button
                      onClick={() => handleCompleteJob(jobDetails.id)}
                      className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                    >
                      Mark Complete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Parts Modal */}
      {isPartsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-50">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Log Part Used</h2>
              <button
                onClick={() => setIsPartsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleLogPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Part *
                </label>
                <select
                  value={partsForm.inventory_item_id}
                  onChange={(e) =>
                    setPartsForm({ ...partsForm, inventory_item_id: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                >
                  <option value="">Choose a part...</option>
                  {inventoryItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) - Stock: {item.stock} - {formatCurrency(item.unit_price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={partsForm.quantity}
                  onChange={(e) =>
                    setPartsForm({ ...partsForm, quantity: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsPartsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPart}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {savingPart ? 'Logging...' : 'Log Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobs;
