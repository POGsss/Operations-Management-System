import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  HiZoomIn,
  HiZoomOut,
  HiRefresh,
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

  // Zoom state for workflow canvas
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

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

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      setStartPan({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanPosition({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setStartPan({ x: e.touches[0].clientX - panPosition.x, y: e.touches[0].clientY - panPosition.y });
    }
  };

  const handleTouchMove = (e) => {
    if (isPanning && e.touches.length === 1) {
      setPanPosition({
        x: e.touches[0].clientX - startPan.x,
        y: e.touches[0].clientY - startPan.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
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
              <div className="flex items-center space-x-2">
                {/* Zoom Controls */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= MIN_ZOOM}
                    className="p-1.5 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom Out"
                  >
                    <HiZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 text-sm font-medium min-w-[50px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= MAX_ZOOM}
                    className="p-1.5 hover:bg-gray-200 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom In"
                  >
                    <HiZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:bg-gray-200 rounded transition ml-1"
                    title="Reset View"
                  >
                    <HiRefresh className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={openAddStepModal}
                  className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm transition"
                >
                  <HiPlus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zoomable Canvas */}
            <div 
              ref={containerRef}
              className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 min-h-[200px]"
              style={{ height: '300px' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Zoom hint */}
              <div className="absolute top-2 left-2 z-10 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
                Ctrl+Scroll to zoom • Drag to pan
              </div>

              {/* Canvas Content */}
              <div 
                ref={canvasRef}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                  cursor: isPanning ? 'grabbing' : 'grab',
                }}
              >
                <div className="flex items-center p-8">
                  {steps.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <HiCog className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No workflow steps defined.</p>
                      <p className="text-sm">Add steps to create a workflow.</p>
                    </div>
                  ) : (
                    steps.map((step, idx) => (
                      <React.Fragment key={step.id}>
                        <div className={`flex-shrink-0 p-4 rounded-lg border-2 min-w-[180px] max-w-[220px] shadow-sm ${
                          step.is_initial ? 'border-green-500 bg-green-50' :
                          step.is_final ? 'border-blue-500 bg-blue-50' :
                          'border-gray-300 bg-white'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              step.is_initial ? 'bg-green-200 text-green-800' :
                              step.is_final ? 'bg-blue-200 text-blue-800' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {step.is_initial ? 'Start' : step.is_final ? 'End' : `Step ${step.step_order}`}
                            </span>
                            <div className="flex space-x-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); openEditStepModal(step); }} 
                                className="p-1 hover:bg-gray-200 rounded transition"
                              >
                                <HiPencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); confirmDelete('step', step); }} 
                                className="p-1 hover:bg-red-100 rounded transition"
                              >
                                <HiTrash className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                          <h4 className="font-medium text-sm">{step.display_name}</h4>
                          <p className="text-xs text-gray-500 mt-1 truncate">{step.name}</p>
                          {step.requires_approval && (
                            <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Requires Approval
                            </span>
                          )}
                          {step.allowed_roles?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {step.allowed_roles.slice(0, 2).map(role => (
                                <span key={role} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {ROLES.find(r => r.value === role)?.label || role}
                                </span>
                              ))}
                              {step.allowed_roles.length > 2 && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  +{step.allowed_roles.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {idx < steps.length - 1 && (
                          <div className="flex-shrink-0 flex items-center mx-3">
                            <div className="w-8 h-0.5 bg-gray-300"></div>
                            <HiArrowRight className="w-5 h-5 text-gray-400 -ml-1" />
                          </div>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Mobile/Small Screen Alternative View */}
            <div className="mt-4 lg:hidden">
              <p className="text-xs text-gray-500 mb-2">Steps List View:</p>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div 
                    key={step.id}
                    className={`p-3 rounded-lg border ${
                      step.is_initial ? 'border-green-500 bg-green-50' :
                      step.is_final ? 'border-blue-500 bg-blue-50' :
                      'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          step.is_initial ? 'bg-green-200 text-green-800' :
                          step.is_final ? 'bg-blue-200 text-blue-800' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-medium text-sm">{step.display_name}</span>
                      </div>
                      <div className="flex space-x-1">
                        <button onClick={() => openEditStepModal(step)} className="p-1.5 hover:bg-gray-100 rounded">
                          <HiPencil className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => confirmDelete('step', step)} className="p-1.5 hover:bg-red-50 rounded">
                          <HiTrash className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl z-50">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Job Type' : 'Add Job Type'}
              </h2>
              <button
                onClick={() => setIsJobTypeModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveJobType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={jobTypeForm.name}
                  onChange={(e) => setJobTypeForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={jobTypeForm.description}
                  onChange={(e) => setJobTypeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 resize-none"
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

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsJobTypeModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step Modal */}
      {isStepModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Step' : 'Add Step'}
              </h2>
              <button
                onClick={() => setIsStepModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSaveStep} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Display Name *</label>
                    <input
                      type="text"
                      value={stepForm.display_name}
                      onChange={(e) => setStepForm(prev => ({ ...prev, display_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Step Order *</label>
                    <input
                      type="number"
                      value={stepForm.step_order}
                      onChange={(e) => setStepForm(prev => ({ ...prev, step_order: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                      min={1}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Name</label>
                  <input
                    type="text"
                    value={stepForm.name}
                    onChange={(e) => setStepForm(prev => ({ ...prev, name: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                    placeholder="e.g., IN_PROGRESS"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={stepForm.description}
                    onChange={(e) => setStepForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 resize-none"
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

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsStepModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transition Modal */}
      {isTransitionModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Transition' : 'Add Transition'}
              </h2>
              <button
                onClick={() => setIsTransitionModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSaveTransition} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From Step *</label>
                    <select
                      value={transitionForm.from_step_id}
                      onChange={(e) => setTransitionForm(prev => ({ ...prev, from_step_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">To Step *</label>
                    <select
                      value={transitionForm.to_step_id}
                      onChange={(e) => setTransitionForm(prev => ({ ...prev, to_step_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Approval Role</label>
                    <select
                      value={transitionForm.approval_role}
                      onChange={(e) => setTransitionForm(prev => ({ ...prev, approval_role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    >
                      <option value="">Select role...</option>
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsTransitionModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || transitionForm.allowed_roles.length === 0} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md z-50 p-6">
            {/* Modal Header */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black">Confirm Delete</h2>
            </div>

            {/* Modal Body */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <HiExclamation className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-gray-600 text-sm">
                  Are you sure you want to delete this {deleteTarget.type === 'jobType' ? 'job type' : deleteTarget.type}?
                  {deleteTarget.type === 'jobType' && ' This will also delete all associated steps and transitions.'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
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
