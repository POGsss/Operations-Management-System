import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiX,
  HiArrowRight,
  HiSwitchHorizontal,
  HiCheck,
  HiExclamation,
  HiCog,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'service_advisor', label: 'Service Advisor' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'inventory_officer', label: 'Inventory Officer' },
  { value: 'executive', label: 'Executive' },
];

const WorkflowConfig = () => {
  const { session } = useAuth();

  // Data state
  const [jobTypes, setJobTypes] = useState([]);
  const [selectedJobType, setSelectedJobType] = useState(null);
  const [steps, setSteps] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isJobTypeModalOpen, setIsJobTypeModalOpen] = useState(false);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, item: null });

  // Form states
  const [jobTypeForm, setJobTypeForm] = useState({ name: '', description: '', is_active: true });
  const [stepForm, setStepForm] = useState({
    name: '',
    display_name: '',
    description: '',
    step_order: 1,
    is_initial: false,
    is_final: false,
    allowed_roles: [],
    requires_approval: false,
    auto_notify_roles: [],
  });
  const [transitionForm, setTransitionForm] = useState({
    from_step_id: '',
    to_step_id: '',
    allowed_roles: [],
    requires_comment: false,
    requires_approval: false,
    approval_role: '',
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch job types
  const fetchJobTypes = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/workflow/job-types`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch job types');
      const data = await res.json();
      setJobTypes(data.jobTypes || []);
      if (data.jobTypes?.length > 0 && !selectedJobType) {
        setSelectedJobType(data.jobTypes[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch workflow details for selected job type
  const fetchWorkflowDetails = async (jobTypeId) => {
    try {
      const res = await fetch(`${API_URL}/workflow/job-types/${jobTypeId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch workflow details');
      const data = await res.json();
      setSteps(data.steps || []);
      setTransitions(data.transitions || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchJobTypes();
    }
  }, [session]);

  useEffect(() => {
    if (selectedJobType?.id) {
      fetchWorkflowDetails(selectedJobType.id);
    }
  }, [selectedJobType]);

  // Stats
  const stats = useMemo(() => ({
    totalJobTypes: jobTypes.length,
    activeJobTypes: jobTypes.filter(jt => jt.is_active).length,
    totalSteps: steps.length,
    totalTransitions: transitions.length,
  }), [jobTypes, steps, transitions]);

  // JOB TYPE HANDLERS
  const openAddJobTypeModal = () => {
    setEditingItem(null);
    setJobTypeForm({ name: '', description: '', is_active: true });
    setIsJobTypeModalOpen(true);
  };

  const openEditJobTypeModal = (jt) => {
    setEditingItem(jt);
    setJobTypeForm({ name: jt.name, description: jt.description || '', is_active: jt.is_active });
    setIsJobTypeModalOpen(true);
  };

  const handleSaveJobType = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem
        ? `${API_URL}/workflow/job-types/${editingItem.id}`
        : `${API_URL}/workflow/job-types`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(jobTypeForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save job type');
      }

      setSuccessMessage(editingItem ? 'Job type updated!' : 'Job type created!');
      setIsJobTypeModalOpen(false);
      fetchJobTypes();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // STEP HANDLERS
  const openAddStepModal = () => {
    setEditingItem(null);
    setStepForm({
      name: '',
      display_name: '',
      description: '',
      step_order: steps.length + 1,
      is_initial: false,
      is_final: false,
      allowed_roles: [],
      requires_approval: false,
      auto_notify_roles: [],
    });
    setIsStepModalOpen(true);
  };

  const openEditStepModal = (step) => {
    setEditingItem(step);
    setStepForm({
      name: step.name,
      display_name: step.display_name,
      description: step.description || '',
      step_order: step.step_order,
      is_initial: step.is_initial,
      is_final: step.is_final,
      allowed_roles: step.allowed_roles || [],
      requires_approval: step.requires_approval,
      auto_notify_roles: step.auto_notify_roles || [],
    });
    setIsStepModalOpen(true);
  };

  const handleSaveStep = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem
        ? `${API_URL}/workflow/steps/${editingItem.id}`
        : `${API_URL}/workflow/steps`;
      const method = editingItem ? 'PUT' : 'POST';

      const body = editingItem
        ? stepForm
        : { ...stepForm, job_type_id: selectedJobType.id };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save step');
      }

      setSuccessMessage(editingItem ? 'Step updated!' : 'Step created!');
      setIsStepModalOpen(false);
      fetchWorkflowDetails(selectedJobType.id);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // TRANSITION HANDLERS
  const openAddTransitionModal = () => {
    setEditingItem(null);
    setTransitionForm({
      from_step_id: '',
      to_step_id: '',
      allowed_roles: [],
      requires_comment: false,
      requires_approval: false,
      approval_role: '',
    });
    setIsTransitionModalOpen(true);
  };

  const openEditTransitionModal = (transition) => {
    setEditingItem(transition);
    setTransitionForm({
      from_step_id: transition.from_step_id,
      to_step_id: transition.to_step_id,
      allowed_roles: transition.allowed_roles || [],
      requires_comment: transition.requires_comment,
      requires_approval: transition.requires_approval,
      approval_role: transition.approval_role || '',
    });
    setIsTransitionModalOpen(true);
  };

  const handleSaveTransition = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem
        ? `${API_URL}/workflow/transitions/${editingItem.id}`
        : `${API_URL}/workflow/transitions`;
      const method = editingItem ? 'PUT' : 'POST';

      const body = editingItem
        ? transitionForm
        : { ...transitionForm, job_type_id: selectedJobType.id };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save transition');
      }

      setSuccessMessage(editingItem ? 'Transition updated!' : 'Transition created!');
      setIsTransitionModalOpen(false);
      fetchWorkflowDetails(selectedJobType.id);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // DELETE HANDLERS
  const confirmDelete = (type, item) => {
    setDeleteTarget({ type, item });
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const { type, item } = deleteTarget;
    try {
      setSaving(true);
      let url;
      switch (type) {
        case 'jobType':
          url = `${API_URL}/workflow/job-types/${item.id}`;
          break;
        case 'step':
          url = `${API_URL}/workflow/steps/${item.id}`;
          break;
        case 'transition':
          url = `${API_URL}/workflow/transitions/${item.id}`;
          break;
        default:
          return;
      }

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setSuccessMessage('Deleted successfully!');
      setShowDeleteConfirm(false);
      
      if (type === 'jobType') {
        fetchJobTypes();
        if (selectedJobType?.id === item.id) {
          setSelectedJobType(null);
          setSteps([]);
          setTransitions([]);
        }
      } else {
        fetchWorkflowDetails(selectedJobType.id);
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Multi-select role handler
  const toggleRole = (formSetter, currentRoles, role) => {
    if (currentRoles.includes(role)) {
      formSetter(prev => ({ ...prev, allowed_roles: prev.allowed_roles.filter(r => r !== role) }));
    } else {
      formSetter(prev => ({ ...prev, allowed_roles: [...prev.allowed_roles, role] }));
    }
  };

  const toggleNotifyRole = (role) => {
    if (stepForm.auto_notify_roles.includes(role)) {
      setStepForm(prev => ({ ...prev, auto_notify_roles: prev.auto_notify_roles.filter(r => r !== role) }));
    } else {
      setStepForm(prev => ({ ...prev, auto_notify_roles: [...prev.auto_notify_roles, role] }));
    }
  };

  if (loading && jobTypes.length === 0) {
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
          <h1 className="text-3xl font-bold text-black mb-2">Workflow Configuration</h1>
          <p className="text-gray-600">Configure job types, workflow steps, and status transitions</p>
        </div>
        <button
          onClick={openAddJobTypeModal}
          className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
        >
          <HiPlus className="w-5 h-5" />
          <span>Add Job Type</span>
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
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Job Types" value={stats.totalJobTypes} icon={<HiCog />} />
        <MetricCard title="Active Types" value={stats.activeJobTypes} icon={<HiCheck />} />
        <MetricCard title="Workflow Steps" value={stats.totalSteps} icon={<HiArrowRight />} />
        <MetricCard title="Transitions" value={stats.totalTransitions} icon={<HiSwitchHorizontal />} />
      </div>

      {/* Job Types List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Job Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jobTypes.map((jt) => (
            <div
              key={jt.id}
              onClick={() => setSelectedJobType(jt)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                selectedJobType?.id === jt.id
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-lg">{jt.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  jt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {jt.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{jt.description || 'No description'}</p>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditJobTypeModal(jt); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <HiPencil className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); confirmDelete('jobType', jt); }}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <HiTrash className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Steps & Transitions */}
      {selectedJobType && (
        <>
          {/* Steps */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Workflow Steps for "{selectedJobType.name}"
              </h2>
              <button
                onClick={openAddStepModal}
                className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm transition"
              >
                <HiPlus className="w-4 h-4" />
                <span>Add Step</span>
              </button>
            </div>

            {/* Visual Workflow */}
            <div className="flex items-center overflow-x-auto pb-4 mb-4">
              {steps.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <div className={`flex-shrink-0 p-4 rounded-lg border-2 min-w-[180px] ${
                    step.is_initial ? 'border-green-500 bg-green-50' :
                    step.is_final ? 'border-blue-500 bg-blue-50' :
                    'border-gray-300 bg-white'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Step {step.step_order}</span>
                      <div className="flex space-x-1">
                        <button onClick={() => openEditStepModal(step)} className="p-1 hover:bg-gray-200 rounded">
                          <HiPencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => confirmDelete('step', step)} className="p-1 hover:bg-red-100 rounded">
                          <HiTrash className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-medium">{step.display_name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{step.name}</p>
                    {step.requires_approval && (
                      <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        Requires Approval
                      </span>
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <HiArrowRight className="flex-shrink-0 w-6 h-6 mx-2 text-gray-400" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Transitions */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Transitions</h2>
              <button
                onClick={openAddTransitionModal}
                className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm transition"
              >
                <HiPlus className="w-4 h-4" />
                <span>Add Transition</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allowed Roles</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Options</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transitions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{t.from_step?.display_name}</td>
                      <td className="px-4 py-3 text-center"><HiArrowRight className="w-5 h-5 text-gray-400 mx-auto" /></td>
                      <td className="px-4 py-3 font-medium">{t.to_step?.display_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {t.allowed_roles?.map(role => (
                            <span key={role} className="px-2 py-0.5 bg-gray-100 text-xs rounded">
                              {ROLES.find(r => r.value === role)?.label || role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {t.requires_comment && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Comment</span>
                          )}
                          {t.requires_approval && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Approval</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => openEditTransitionModal(t)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <HiPencil className="w-4 h-4 text-gray-600" />
                          </button>
                          <button onClick={() => confirmDelete('transition', t)} className="p-2 hover:bg-red-50 rounded-lg">
                            <HiTrash className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transitions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No transitions defined. Add transitions to enable status changes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Job Type Modal */}
      {isJobTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit Job Type' : 'Add Job Type'}</h3>
              <button onClick={() => setIsJobTypeModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveJobType} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={jobTypeForm.name}
                  onChange={(e) => setJobTypeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={jobTypeForm.description}
                  onChange={(e) => setJobTypeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                  rows={3}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="jt-active"
                  checked={jobTypeForm.is_active}
                  onChange={(e) => setJobTypeForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
                <label htmlFor="jt-active" className="ml-2 text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsJobTypeModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step Modal */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit Step' : 'Add Step'}</h3>
              <button onClick={() => setIsStepModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStep} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={stepForm.display_name}
                    onChange={(e) => setStepForm(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Step Order *</label>
                  <input
                    type="number"
                    value={stepForm.step_order}
                    onChange={(e) => setStepForm(prev => ({ ...prev, step_order: parseInt(e.target.value) || 1 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
                <input
                  type="text"
                  value={stepForm.name}
                  onChange={(e) => setStepForm(prev => ({ ...prev, name: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                  placeholder="e.g., IN_PROGRESS"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                  rows={2}
                />
              </div>
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input type="checkbox" id="step-initial" checked={stepForm.is_initial} onChange={(e) => setStepForm(prev => ({ ...prev, is_initial: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="step-initial" className="ml-2 text-sm text-gray-700">Initial Step</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="step-final" checked={stepForm.is_final} onChange={(e) => setStepForm(prev => ({ ...prev, is_final: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="step-final" className="ml-2 text-sm text-gray-700">Final Step</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="step-approval" checked={stepForm.requires_approval} onChange={(e) => setStepForm(prev => ({ ...prev, requires_approval: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="step-approval" className="ml-2 text-sm text-gray-700">Requires Approval</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(setStepForm, stepForm.allowed_roles, role.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        stepForm.allowed_roles.includes(role.value) ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Notify Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleNotifyRole(role.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        stepForm.auto_notify_roles.includes(role.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsStepModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit Transition' : 'Add Transition'}</h3>
              <button onClick={() => setIsTransitionModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTransition} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Step *</label>
                  <select
                    value={transitionForm.from_step_id}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, from_step_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                    required
                    disabled={!!editingItem}
                  >
                    <option value="">Select step...</option>
                    {steps.map((step) => (
                      <option key={step.id} value={step.id}>{step.display_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Step *</label>
                  <select
                    value={transitionForm.to_step_id}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, to_step_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                    required
                    disabled={!!editingItem}
                  >
                    <option value="">Select step...</option>
                    {steps.filter(s => s.id !== transitionForm.from_step_id).map((step) => (
                      <option key={step.id} value={step.id}>{step.display_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Roles *</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => toggleRole(setTransitionForm, transitionForm.allowed_roles, role.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                        transitionForm.allowed_roles.includes(role.value) ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input type="checkbox" id="trans-comment" checked={transitionForm.requires_comment} onChange={(e) => setTransitionForm(prev => ({ ...prev, requires_comment: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="trans-comment" className="ml-2 text-sm text-gray-700">Requires Comment</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="trans-approval" checked={transitionForm.requires_approval} onChange={(e) => setTransitionForm(prev => ({ ...prev, requires_approval: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="trans-approval" className="ml-2 text-sm text-gray-700">Requires Approval</label>
                </div>
              </div>
              {transitionForm.requires_approval && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approval Role</label>
                  <select
                    value={transitionForm.approval_role}
                    onChange={(e) => setTransitionForm(prev => ({ ...prev, approval_role: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="">Select role...</option>
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsTransitionModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving || transitionForm.allowed_roles.length === 0} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 m-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <HiExclamation className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this {deleteTarget.type === 'jobType' ? 'job type' : deleteTarget.type}?
              {deleteTarget.type === 'jobType' && ' This will also delete all associated steps and transitions.'}
            </p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowConfig;
