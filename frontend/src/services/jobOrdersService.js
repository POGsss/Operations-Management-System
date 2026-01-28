// Job Orders API Service
const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

// Helper to get auth headers
const getHeaders = (session) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${session?.access_token}`,
});

// ==========================================
// Job Orders
// ==========================================

export const fetchJobs = async (session, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);

  const response = await fetch(`${API_URL}/jobs?${params.toString()}`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch jobs');
  }

  return response.json();
};

export const fetchJobById = async (session, jobId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch job');
  }

  return response.json();
};

export const createJob = async (session, jobData) => {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create job');
  }

  return response.json();
};

export const updateJob = async (session, jobId, jobData) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'PUT',
    headers: getHeaders(session),
    body: JSON.stringify(jobData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update job');
  }

  return response.json();
};

// ==========================================
// Status Changes
// ==========================================

export const changeJobStatus = async (session, jobId, newStatus) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/status`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify({ new_status: newStatus }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change status');
  }

  return response.json();
};

// ==========================================
// Mechanic Assignments
// ==========================================

export const assignMechanic = async (session, jobId, mechanicId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/assign`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify({ mechanic_id: mechanicId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to assign mechanic');
  }

  return response.json();
};

export const unassignMechanic = async (session, jobId, mechanicId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/assign/${mechanicId}`, {
    method: 'DELETE',
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unassign mechanic');
  }

  return response.json();
};

export const fetchAvailableMechanics = async (session) => {
  const response = await fetch(`${API_URL}/jobs/mechanics/available`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch mechanics');
  }

  return response.json();
};

// ==========================================
// Estimates
// ==========================================

export const fetchEstimates = async (session, jobId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/estimates`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch estimates');
  }

  return response.json();
};

export const addEstimate = async (session, jobId, estimateData) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/estimate`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify(estimateData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add estimate');
  }

  return response.json();
};

export const removeEstimate = async (session, jobId, estimateId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/estimate/${estimateId}`, {
    method: 'DELETE',
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove estimate');
  }

  return response.json();
};

// ==========================================
// Parts Used
// ==========================================

export const fetchPartsUsed = async (session, jobId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/parts`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch parts');
  }

  return response.json();
};

export const logPartUsed = async (session, jobId, partData) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/parts`, {
    method: 'POST',
    headers: getHeaders(session),
    body: JSON.stringify(partData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to log part');
  }

  return response.json();
};

// ==========================================
// Status History
// ==========================================

export const fetchJobHistory = async (session, jobId) => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/history`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch history');
  }

  return response.json();
};

// ==========================================
// Statistics
// ==========================================

export const fetchJobStats = async (session) => {
  const response = await fetch(`${API_URL}/jobs/stats/summary`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stats');
  }

  return response.json();
};

// ==========================================
// Customers (for job creation)
// ==========================================

export const fetchCustomers = async (session) => {
  const response = await fetch(`${API_URL}/customers`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch customers');
  }

  return response.json();
};

// ==========================================
// Inventory Items (for parts logging)
// ==========================================

export const fetchInventoryItems = async (session) => {
  const response = await fetch(`${API_URL}/inventory`, {
    headers: getHeaders(session),
  });

  if (!response.ok) {
    // If endpoint doesn't exist yet, return empty array
    return { items: [] };
  }

  return response.json();
};

// Status constants
export const JOB_STATUSES = {
  DRAFT: 'DRAFT',
  ESTIMATED: 'ESTIMATED',
  APPROVED: 'APPROVED',
  IN_PROGRESS: 'IN_PROGRESS',
  QUALITY_CHECK: 'QUALITY_CHECK',
  BILLED: 'BILLED',
  RELEASED: 'RELEASED',
};

export const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ESTIMATED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  QUALITY_CHECK: 'bg-purple-100 text-purple-800',
  BILLED: 'bg-orange-100 text-orange-800',
  RELEASED: 'bg-emerald-100 text-emerald-800',
};

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  ESTIMATED: 'Estimated',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In Progress',
  QUALITY_CHECK: 'Quality Check',
  BILLED: 'Billed',
  RELEASED: 'Released',
};

export const ITEM_TYPES = ['LABOR', 'PART', 'PACKAGE'];
