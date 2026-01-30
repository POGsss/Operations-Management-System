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
  HiChevronDown,
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

  // Confirmation modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [jobToApprove, setJobToApprove] = useState(null);
  const [jobToReject, setJobToReject] = useState(null);
  const [mechanicToUnassign, setMechanicToUnassign] = useState(null);

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

  // Handle approve job - open modal
  const handleApproveJob = (jobId) => {
    setJobToApprove(jobId);
    setShowApproveModal(true);
  };

  // Confirm approve job
  const confirmApproveJob = async () => {
    if (!jobToApprove) return;
    await handleStatusChange(jobToApprove, 'APPROVED');
    setShowApproveModal(false);
    setJobToApprove(null);
  };

  // Cancel approve job
  const cancelApproveJob = () => {
    setShowApproveModal(false);
    setJobToApprove(null);
  };

  // Handle reject job - open modal
  const handleRejectJob = (jobId) => {
    setJobToReject(jobId);
    setShowRejectModal(true);
  };

  // Confirm reject job
  const confirmRejectJob = async () => {
    if (!jobToReject) return;
    await handleStatusChange(jobToReject, 'DRAFT');
    setShowRejectModal(false);
    setJobToReject(null);
  };

  // Cancel reject job
  const cancelRejectJob = () => {
    setShowRejectModal(false);
    setJobToReject(null);
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

  // Handle unassign mechanic - open modal
  const handleUnassignMechanic = (mechanicId, mechanicName) => {
    setMechanicToUnassign({ id: mechanicId, name: mechanicName });
    setShowUnassignModal(true);
  };

  // Confirm unassign mechanic
  const confirmUnassignMechanic = async () => {
    if (!mechanicToUnassign) return;
    try {
      await unassignMechanic(session, selectedJob.id, mechanicToUnassign.id);
      const data = await fetchJobById(session, selectedJob.id);
      setJobDetails(data.job);
      loadJobs();
    } catch (err) {
      alert(err.message);
    }
    setShowUnassignModal(false);
    setMechanicToUnassign(null);
  };

  // Cancel unassign mechanic
  const cancelUnassignMechanic = () => {
    setShowUnassignModal(false);
    setMechanicToUnassign(null);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Job Orders Management</h1>
            <p className="text-gray-600">Review, approve, and manage job orders in your branch</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <MetricCard title="Total Jobs" value={stats.total} />
        <MetricCard title="Pending Approval" value={stats.pendingApproval} />
        <MetricCard title="Approved" value={stats.approved} />
        <MetricCard title="In Progress" value={stats.inProgress} />
        <MetricCard title="Quality Check" value={stats.qualityCheck} />
        <MetricCard title="Revenue" value={formatCurrency(stats.totalRevenue)} />
      </div>

      {/* Pending Approval Alert */}
      {stats.pendingApproval > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <HiClock className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <p className="font-medium">
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
                placeholder="Search by Job ID, Customer, or Vehicle Plate..."
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
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
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

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-600">Loading jobs...</div>
        ) : error ? (
          <div className="px-6 py-8 text-center text-red-600">{error}</div>
        ) : paginatedJobs.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-600">No job orders found</div>
        ) : (
          <>
            <table className="min-w-[1000px] w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Mechanics
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Estimated
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition last:border-0 ${
                      job.status === 'ESTIMATED' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      #{job.id?.substring(0, 8)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {job.customer?.full_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">{job.customer?.phone || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{job.vehicle_plate || '-'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.job_assignments?.length > 0 ? (
                        <div className="flex -space-x-2">
                          {job.job_assignments.slice(0, 3).map((a, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-xs font-medium border-2 border-white"
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(job.total_estimated)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewJob(job)}
                          className="text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                          title="View Details"
                        >
                          <HiEye className="w-5 h-5" />
                        </button>
                        {job.status === 'ESTIMATED' && (
                          <>
                            <button
                              onClick={() => handleApproveJob(job.id)}
                              className="text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition"
                              title="Approve"
                            >
                              <HiCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectJob(job.id)}
                              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                              title="Reject / Revise"
                            >
                              <HiXCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {job.status === 'QUALITY_CHECK' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'BILLED')}
                            className="text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                            title="Mark as Billed"
                          >
                            <HiCurrencyDollar className="w-5 h-5" />
                          </button>
                        )}
                        {job.status === 'BILLED' && (
                          <button
                            onClick={() => handleStatusChange(job.id, 'RELEASED')}
                            className="text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
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
          </>
        )}

        {/* Pagination */}
        {!loading && filteredJobs.length > 0 && (
          <div className="min-w-[1000px] w-full px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{(pagination.page - 1) * pagination.pageSize + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(pagination.page * pagination.pageSize, filteredJobs.length)}
              </span>{' '}
              of <span className="font-semibold">{filteredJobs.length}</span> jobs
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
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
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
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Job Modal */}
      {isViewModalOpen && jobDetails && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col z-50">
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
                            onClick={() => handleUnassignMechanic(assignment.mechanic?.id, assignment.mechanic?.full_name)}
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
            <div className="border-t border-gray-200 p-6 flex justify-between items-center bg-gray-50">
              <div className="text-sm text-gray-600">
                Created: {formatDate(jobDetails.created_at)}
                {jobDetails.creator && ` by ${jobDetails.creator.full_name}`}
              </div>
              <div className="flex gap-3">
                {jobDetails.status === 'ESTIMATED' && (
                  <>
                    <button
                      onClick={() => handleRejectJob(jobDetails.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                    >
                      Reject / Revise
                    </button>
                    <button
                      onClick={() => handleApproveJob(jobDetails.id)}
                      className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
                    >
                      Approve
                    </button>
                  </>
                )}
                {jobDetails.status === 'QUALITY_CHECK' && (
                  <button
                    onClick={() => handleStatusChange(jobDetails.id, 'BILLED')}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
                  >
                    Mark as Billed
                  </button>
                )}
                {jobDetails.status === 'BILLED' && (
                  <button
                    onClick={() => handleStatusChange(jobDetails.id, 'RELEASED')}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium"
                  >
                    Release Vehicle
                  </button>
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

      {/* Assign Mechanic Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto z-[60]">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">Assign Mechanic</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
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
                        className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition"
                      >
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{mechanic.full_name}</p>
                          <p className="text-sm text-gray-600">{mechanic.email}</p>
                        </div>
                      </button>
                    ))}
                  {mechanics.filter(
                    (m) =>
                      !jobDetails?.job_assignments?.some((a) => a.mechanic?.id === m.id)
                  ).length === 0 && (
                    <p className="text-center text-gray-600 py-4">
                      All mechanics are already assigned
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-4">No mechanics available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[70]">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-[70]">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Approve Job Order</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to approve this job order? This will allow work to begin on the vehicle.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Job ID:</span>{' '}
                  #{jobToApprove?.substring(0, 8)}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={cancelApproveJob}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveJob}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[70]">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-[70]">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Reject Job Order</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to reject this job order? It will be sent back to draft for revisions.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">Job ID:</span>{' '}
                  #{jobToReject?.substring(0, 8)}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={cancelRejectJob}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectJob}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Mechanic Confirmation Modal */}
      {showUnassignModal && mechanicToUnassign && (
        <div className="fixed inset-0 flex items-center justify-center z-[70]">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-[70]">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Unassign Mechanic</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to unassign this mechanic from the job?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Mechanic:</span>{' '}
                  {mechanicToUnassign.name || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={cancelUnassignMechanic}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnassignMechanic}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Unassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOrders;
