import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiSearch,
  HiX,
  HiEye,
  HiCheck,
  HiXCircle,
  HiClipboardList,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiBadgeCheck,
  HiCurrencyDollar,
} from 'react-icons/hi';
import {
  fetchJobs,
  fetchJobById,
  changeJobStatus,
  assignMechanic,
  unassignMechanic,
  fetchAvailableMechanics,
  JOB_STATUSES,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../../services/jobOrdersService';

const JobOrders = () => {
  const { session, role } = useAuth();

  // Job list state
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Supporting data
  const [mechanics, setMechanics] = useState([]);

  // Modal states
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetails, setJobDetails] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
  });

  // Fetch jobs
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

  // Fetch mechanics
  const loadMechanics = async () => {
    try {
      const data = await fetchAvailableMechanics(session);
      setMechanics(data.mechanics || []);
    } catch (err) {
      console.error('Error loading mechanics:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadJobs();
      loadMechanics();
    }
  }, [session]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = jobs.length;
    const pendingApproval = jobs.filter((j) => j.status === 'ESTIMATED').length;
    const approved = jobs.filter((j) => j.status === 'APPROVED').length;
    const inProgress = jobs.filter((j) => j.status === 'IN_PROGRESS').length;
    const qualityCheck = jobs.filter((j) => j.status === 'QUALITY_CHECK').length;
    const completed = jobs.filter((j) => ['BILLED', 'RELEASED'].includes(j.status)).length;
    const totalRevenue = jobs
      .filter((j) => j.status === 'RELEASED')
      .reduce((sum, j) => sum + parseFloat(j.total_final || j.total_estimated || 0), 0);
    return { total, pendingApproval, approved, inProgress, qualityCheck, completed, totalRevenue };
  }, [jobs]);

  // Filtered and paginated jobs
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

  const totalPages = Math.ceil(filteredJobs.length / pagination.pageSize);
  const paginatedJobs = filteredJobs.slice(
    (pagination.page - 1) * pagination.pageSize,
    pagination.page * pagination.pageSize
  );

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

  // Handle approve job
  const handleApproveJob = async (jobId) => {
    if (!confirm('Are you sure you want to approve this job order?')) return;
    await handleStatusChange(jobId, 'APPROVED');
  };

  // Handle reject job (back to draft)
  const handleRejectJob = async (jobId) => {
    if (!confirm('Are you sure you want to send this back to draft for revisions?')) return;
    await handleStatusChange(jobId, 'DRAFT');
  };

  // Handle assign mechanic
  const handleAssignMechanic = async (mechanicId) => {
    try {
      await assignMechanic(session, selectedJob.id, mechanicId);
      const data = await fetchJobById(session, selectedJob.id);
      setJobDetails(data.job);
      setIsAssignModalOpen(false);
      loadJobs();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle unassign mechanic
  const handleUnassignMechanic = async (mechanicId) => {
    if (!confirm('Are you sure you want to unassign this mechanic?')) return;
    try {
      await unassignMechanic(session, selectedJob.id, mechanicId);
      const data = await fetchJobById(session, selectedJob.id);
      setJobDetails(data.job);
      loadJobs();
    } catch (err) {
      alert(err.message);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Job Orders Management</h1>
        <p className="text-gray-600 mt-1">Review, approve, and manage job orders in your branch</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <MetricCard title="Total Jobs" value={stats.total} icon={HiClipboardList} color="blue" />
        <MetricCard
          title="Pending Approval"
          value={stats.pendingApproval}
          icon={HiClock}
          color="yellow"
        />
        <MetricCard title="Approved" value={stats.approved} icon={HiBadgeCheck} color="green" />
        <MetricCard title="In Progress" value={stats.inProgress} icon={HiExclamationCircle} color="blue" />
        <MetricCard title="Quality Check" value={stats.qualityCheck} icon={HiCheckCircle} color="purple" />
        <MetricCard
          title="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={HiCurrencyDollar}
          color="green"
        />
      </div>

      {/* Pending Approval Alert */}
      {stats.pendingApproval > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <HiClock className="w-6 h-6 text-yellow-400 mr-3" />
            <div>
              <p className="font-medium text-yellow-800">
                {stats.pendingApproval} job order(s) pending your approval
              </p>
              <p className="text-sm text-yellow-700">
                Click on a job to review and approve or reject the estimate
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by Job ID, Customer, or Vehicle Plate..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading jobs...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : paginatedJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No job orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mechanics
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`hover:bg-gray-50 ${
                      job.status === 'ESTIMATED' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">
                        #{job.id?.substring(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {job.customer?.full_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{job.customer?.phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{job.vehicle_plate || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.job_assignments?.length > 0 ? (
                        <div className="flex -space-x-2">
                          {job.job_assignments.slice(0, 3).map((a, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                              title={a.mechanic?.full_name}
                            >
                              {a.mechanic?.full_name?.charAt(0) || '?'}
                            </div>
                          ))}
                          {job.job_assignments.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white">
                              +{job.job_assignments.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(job.total_estimated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewJob(job)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <HiEye className="w-5 h-5" />
                        </button>
                        {job.status === 'ESTIMATED' && (
                          <>
                            <button
                              onClick={() => handleApproveJob(job.id)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <HiCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectJob(job.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Reject / Revise"
                            >
                              <HiXCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {job.status === 'QUALITY_CHECK' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'BILLED')}
                            className="text-orange-600 hover:text-orange-800"
                            title="Mark as Billed"
                          >
                            <HiCurrencyDollar className="w-5 h-5" />
                          </button>
                        )}
                        {job.status === 'BILLED' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'RELEASED')}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Release Vehicle"
                          >
                            <HiCheckCircle className="w-5 h-5" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.page * pagination.pageSize, filteredJobs.length)} of{' '}
              {filteredJobs.length} jobs
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === totalPages}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Job Modal */}
      {isViewModalOpen && jobDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">
                  Job #{jobDetails.id?.substring(0, 8)}
                </h2>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                    STATUS_COLORS[jobDetails.status] || 'bg-gray-100'
                  }`}
                >
                  {STATUS_LABELS[jobDetails.status] || jobDetails.status}
                </span>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Customer & Vehicle Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Name:</span>{' '}
                      <span className="font-medium">{jobDetails.customer?.full_name}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span>{' '}
                      {jobDetails.customer?.phone || '-'}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{' '}
                      {jobDetails.customer?.email || '-'}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Vehicle Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">Plate:</span>{' '}
                      <span className="font-medium">{jobDetails.vehicle_plate || '-'}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">VIN:</span> {jobDetails.vehicle_vin || '-'}
                    </p>
                    <p>
                      <span className="text-gray-500">Odometer:</span>{' '}
                      {jobDetails.odometer ? `${jobDetails.odometer.toLocaleString()} km` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assigned Mechanics */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Assigned Mechanics</h3>
                  {['ESTIMATED', 'APPROVED'].includes(jobDetails.status) && (
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Assign Mechanic
                    </button>
                  )}
                </div>
                {jobDetails.job_assignments?.length > 0 ? (
                  <div className="space-y-2">
                    {jobDetails.job_assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between bg-white rounded-lg p-3"
                      >
                        <div>
                          <p className="font-medium">{assignment.mechanic?.full_name}</p>
                          <p className="text-xs text-gray-500">
                            Assigned: {formatDate(assignment.assigned_at)}
                          </p>
                        </div>
                        {['ESTIMATED', 'APPROVED'].includes(jobDetails.status) && (
                          <button
                            onClick={() => handleUnassignMechanic(assignment.mechanic?.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No mechanics assigned yet</p>
                )}
              </div>

              {/* Estimates Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Estimate Items</h3>
                {jobDetails.job_estimates?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Type</th>
                          <th className="pb-2 text-right">Qty</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobDetails.job_estimates.map((est) => (
                          <tr key={est.id} className="border-b border-gray-100">
                            <td className="py-2">{est.item_name}</td>
                            <td className="py-2">
                              <span className="px-2 py-0.5 text-xs bg-gray-200 rounded">
                                {est.item_type}
                              </span>
                            </td>
                            <td className="py-2 text-right">{est.quantity}</td>
                            <td className="py-2 text-right">{formatCurrency(est.unit_price)}</td>
                            <td className="py-2 text-right font-medium">
                              {formatCurrency(est.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold">
                          <td colSpan={4} className="pt-3 text-right">
                            Total Estimated:
                          </td>
                          <td className="pt-3 text-right">
                            {formatCurrency(jobDetails.total_estimated)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No estimate items</p>
                )}
              </div>

              {/* Parts Used Section */}
              {jobDetails.job_parts_used?.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Parts Used</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="pb-2">Part</th>
                          <th className="pb-2">SKU</th>
                          <th className="pb-2 text-right">Qty</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2">Used At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobDetails.job_parts_used.map((part) => (
                          <tr key={part.id} className="border-b border-gray-100">
                            <td className="py-2">{part.inventory_item?.name}</td>
                            <td className="py-2 font-mono text-xs">
                              {part.inventory_item?.sku}
                            </td>
                            <td className="py-2 text-right">{part.quantity}</td>
                            <td className="py-2 text-right">
                              {formatCurrency(part.inventory_item?.unit_price)}
                            </td>
                            <td className="py-2 text-gray-500">{formatDate(part.used_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Status History */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Status History</h3>
                {jobDetails.job_status_history?.length > 0 ? (
                  <div className="space-y-2">
                    {jobDetails.job_status_history.map((hist) => (
                      <div key={hist.id} className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-gray-500">{formatDate(hist.changed_at)}</span>
                        <span>
                          {hist.old_status && (
                            <>
                              <span className="text-gray-500">{hist.old_status}</span>
                              <span className="mx-2">→</span>
                            </>
                          )}
                          <span className="font-medium">{hist.new_status}</span>
                        </span>
                        <span className="text-gray-500">by {hist.changer?.full_name || 'System'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No status changes recorded</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="border-t p-4 flex justify-between items-center bg-gray-50">
              <div className="text-sm text-gray-500">
                Created: {formatDate(jobDetails.created_at)}
                {jobDetails.creator && ` by ${jobDetails.creator.full_name}`}
              </div>
              <div className="flex gap-3">
                {jobDetails.status === 'ESTIMATED' && (
                  <>
                    <button
                      onClick={() => handleRejectJob(jobDetails.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Reject / Revise
                    </button>
                    <button
                      onClick={() => handleApproveJob(jobDetails.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </>
                )}
                {jobDetails.status === 'QUALITY_CHECK' && (
                  <button
                    onClick={() => handleStatusChange(jobDetails.id, 'BILLED')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Mark as Billed
                  </button>
                )}
                {jobDetails.status === 'BILLED' && (
                  <button
                    onClick={() => handleStatusChange(jobDetails.id, 'RELEASED')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Release Vehicle
                  </button>
                )}
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Mechanic Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Assign Mechanic</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4">
              {mechanics.length > 0 ? (
                <div className="space-y-2">
                  {mechanics
                    .filter(
                      (m) =>
                        !jobDetails?.job_assignments?.some((a) => a.mechanic?.id === m.id)
                    )
                    .map((mechanic) => (
                      <button
                        key={mechanic.id}
                        onClick={() => handleAssignMechanic(mechanic.id)}
                        className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="text-left">
                          <p className="font-medium">{mechanic.full_name}</p>
                          <p className="text-sm text-gray-500">{mechanic.email}</p>
                        </div>
                      </button>
                    ))}
                  {mechanics.filter(
                    (m) =>
                      !jobDetails?.job_assignments?.some((a) => a.mechanic?.id === m.id)
                  ).length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      All mechanics are already assigned
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No mechanics available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrders;
