import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// Helper to get user with role
const getUserWithRole = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role, branch_id, full_name')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// ==========================================
// JOB TYPES ENDPOINTS
// ==========================================

// GET /api/workflow/job-types - List all job types
router.get('/job-types', authenticateToken, async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = supabaseAdmin
      .from('job_types')
      .select('*')
      .order('name');
    
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ jobTypes: data || [] });
  } catch (err) {
    console.error('Fetch job types error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflow/job-types/:id - Get single job type with steps and transitions
router.get('/job-types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: jobType, error: jobTypeError } = await supabaseAdmin
      .from('job_types')
      .select('*')
      .eq('id', id)
      .single();

    if (jobTypeError) throw jobTypeError;

    // Get workflow steps
    const { data: steps, error: stepsError } = await supabaseAdmin
      .from('workflow_steps')
      .select('*')
      .eq('job_type_id', id)
      .order('step_order');

    if (stepsError) throw stepsError;

    // Get transitions
    const { data: transitions, error: transitionsError } = await supabaseAdmin
      .from('workflow_transitions')
      .select(`
        *,
        from_step:workflow_steps!workflow_transitions_from_step_id_fkey(id, name, display_name),
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(id, name, display_name)
      `)
      .eq('job_type_id', id);

    if (transitionsError) throw transitionsError;

    res.json({
      jobType,
      steps: steps || [],
      transitions: transitions || []
    });
  } catch (err) {
    console.error('Fetch job type error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflow/job-types - Create job type (Admin only)
router.post('/job-types', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, is_active = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('job_types')
      .insert([{ name, description, is_active }])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'JOB_TYPE',
      entityId: data.id,
      entityName: name,
      details: { description, is_active }
    });

    res.status(201).json({ jobType: data });
  } catch (err) {
    console.error('Create job type error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflow/job-types/:id - Update job type (Admin only)
router.put('/job-types/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('job_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'JOB_TYPE',
      entityId: id,
      entityName: data.name,
      details: updates
    });

    res.json({ jobType: data });
  } catch (err) {
    console.error('Update job type error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflow/job-types/:id - Delete job type (Admin only)
router.delete('/job-types/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get job type name for audit
    const { data: existing } = await supabaseAdmin
      .from('job_types')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('job_types')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'JOB_TYPE',
      entityId: id,
      entityName: existing?.name || 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete job type error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WORKFLOW STEPS ENDPOINTS
// ==========================================

// GET /api/workflow/steps - List all workflow steps
router.get('/steps', authenticateToken, async (req, res) => {
  try {
    const { job_type_id } = req.query;

    let query = supabaseAdmin
      .from('workflow_steps')
      .select(`
        *,
        job_type:job_types(id, name)
      `)
      .order('step_order');

    if (job_type_id) {
      query = query.eq('job_type_id', job_type_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ steps: data || [] });
  } catch (err) {
    console.error('Fetch workflow steps error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflow/steps - Create workflow step (Admin only)
router.post('/steps', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      job_type_id,
      name,
      display_name,
      description,
      step_order,
      is_initial = false,
      is_final = false,
      allowed_roles = [],
      requires_approval = false,
      auto_notify_roles = []
    } = req.body;

    if (!job_type_id || !name || !display_name || step_order === undefined) {
      return res.status(400).json({ error: 'job_type_id, name, display_name, and step_order are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_steps')
      .insert([{
        job_type_id,
        name: name.toUpperCase().replace(/\s+/g, '_'),
        display_name,
        description,
        step_order,
        is_initial,
        is_final,
        allowed_roles,
        requires_approval,
        auto_notify_roles
      }])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'WORKFLOW_STEP',
      entityId: data.id,
      entityName: display_name,
      details: { job_type_id, name, step_order }
    });

    res.status(201).json({ step: data });
  } catch (err) {
    console.error('Create workflow step error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflow/steps/:id - Update workflow step (Admin only)
router.put('/steps/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      display_name,
      description,
      step_order,
      is_initial,
      is_final,
      allowed_roles,
      requires_approval,
      auto_notify_roles
    } = req.body;

    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;
    if (step_order !== undefined) updates.step_order = step_order;
    if (is_initial !== undefined) updates.is_initial = is_initial;
    if (is_final !== undefined) updates.is_final = is_final;
    if (allowed_roles !== undefined) updates.allowed_roles = allowed_roles;
    if (requires_approval !== undefined) updates.requires_approval = requires_approval;
    if (auto_notify_roles !== undefined) updates.auto_notify_roles = auto_notify_roles;

    const { data, error } = await supabaseAdmin
      .from('workflow_steps')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'WORKFLOW_STEP',
      entityId: id,
      entityName: data.display_name,
      details: updates
    });

    res.json({ step: data });
  } catch (err) {
    console.error('Update workflow step error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflow/steps/:id - Delete workflow step (Admin only)
router.delete('/steps/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get step name for audit
    const { data: existing } = await supabaseAdmin
      .from('workflow_steps')
      .select('display_name')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('workflow_steps')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'WORKFLOW_STEP',
      entityId: id,
      entityName: existing?.display_name || 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete workflow step error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WORKFLOW TRANSITIONS ENDPOINTS
// ==========================================

// GET /api/workflow/transitions - List all transitions
router.get('/transitions', authenticateToken, async (req, res) => {
  try {
    const { job_type_id, from_step_id } = req.query;

    let query = supabaseAdmin
      .from('workflow_transitions')
      .select(`
        *,
        job_type:job_types(id, name),
        from_step:workflow_steps!workflow_transitions_from_step_id_fkey(id, name, display_name),
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(id, name, display_name)
      `);

    if (job_type_id) {
      query = query.eq('job_type_id', job_type_id);
    }
    if (from_step_id) {
      query = query.eq('from_step_id', from_step_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ transitions: data || [] });
  } catch (err) {
    console.error('Fetch transitions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workflow/transitions/available/:jobId - Get available transitions for a job
router.get('/transitions/available/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    const user = await getUserWithRole(userId);

    // Get job with current status
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .select('id, status, job_type_id')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Get current step
    const jobTypeId = job.job_type_id || '00000000-0000-0000-0000-000000000001';
    
    const { data: currentStep, error: stepError } = await supabaseAdmin
      .from('workflow_steps')
      .select('id, name')
      .eq('job_type_id', jobTypeId)
      .eq('name', job.status)
      .single();

    if (stepError) {
      // If no step found, return empty transitions
      return res.json({ transitions: [], currentStatus: job.status });
    }

    // Get available transitions for this step
    const { data: transitions, error: transError } = await supabaseAdmin
      .from('workflow_transitions')
      .select(`
        *,
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(id, name, display_name)
      `)
      .eq('from_step_id', currentStep.id);

    if (transError) throw transError;

    // Filter by user role
    const availableTransitions = (transitions || []).filter(t => 
      t.allowed_roles.includes(user.role)
    );

    res.json({
      transitions: availableTransitions,
      currentStatus: job.status
    });
  } catch (err) {
    console.error('Fetch available transitions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workflow/transitions - Create transition (Admin only)
router.post('/transitions', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      job_type_id,
      from_step_id,
      to_step_id,
      allowed_roles = [],
      requires_comment = false,
      requires_approval = false,
      approval_role
    } = req.body;

    if (!job_type_id || !from_step_id || !to_step_id) {
      return res.status(400).json({ error: 'job_type_id, from_step_id, and to_step_id are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('workflow_transitions')
      .insert([{
        job_type_id,
        from_step_id,
        to_step_id,
        allowed_roles,
        requires_comment,
        requires_approval,
        approval_role
      }])
      .select(`
        *,
        from_step:workflow_steps!workflow_transitions_from_step_id_fkey(id, name, display_name),
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(id, name, display_name)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'WORKFLOW_TRANSITION',
      entityId: data.id,
      entityName: `${data.from_step?.display_name} → ${data.to_step?.display_name}`,
      details: { job_type_id, from_step_id, to_step_id, allowed_roles }
    });

    res.status(201).json({ transition: data });
  } catch (err) {
    console.error('Create transition error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/workflow/transitions/:id - Update transition (Admin only)
router.put('/transitions/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      allowed_roles,
      requires_comment,
      requires_approval,
      approval_role
    } = req.body;

    const updates = {};
    if (allowed_roles !== undefined) updates.allowed_roles = allowed_roles;
    if (requires_comment !== undefined) updates.requires_comment = requires_comment;
    if (requires_approval !== undefined) updates.requires_approval = requires_approval;
    if (approval_role !== undefined) updates.approval_role = approval_role;

    const { data, error } = await supabaseAdmin
      .from('workflow_transitions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        from_step:workflow_steps!workflow_transitions_from_step_id_fkey(id, name, display_name),
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(id, name, display_name)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'WORKFLOW_TRANSITION',
      entityId: id,
      entityName: `${data.from_step?.display_name} → ${data.to_step?.display_name}`,
      details: updates
    });

    res.json({ transition: data });
  } catch (err) {
    console.error('Update transition error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/workflow/transitions/:id - Delete transition (Admin only)
router.delete('/transitions/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Get transition info for audit
    const { data: existing } = await supabaseAdmin
      .from('workflow_transitions')
      .select(`
        from_step:workflow_steps!workflow_transitions_from_step_id_fkey(display_name),
        to_step:workflow_steps!workflow_transitions_to_step_id_fkey(display_name)
      `)
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('workflow_transitions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'WORKFLOW_TRANSITION',
      entityId: id,
      entityName: existing ? `${existing.from_step?.display_name} → ${existing.to_step?.display_name}` : 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete transition error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VALIDATE TRANSITION
// ==========================================

// POST /api/workflow/validate-transition - Check if a transition is valid
router.post('/validate-transition', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id, new_status } = req.body;

    if (!job_id || !new_status) {
      return res.status(400).json({ error: 'job_id and new_status are required' });
    }

    const user = await getUserWithRole(userId);

    // Get job with current status
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .select('id, status, job_type_id, branch_id')
      .eq('id', job_id)
      .single();

    if (jobError) throw jobError;

    // Branch isolation check
    if (!['admin', 'executive'].includes(user.role) && job.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied: different branch' });
    }

    const jobTypeId = job.job_type_id || '00000000-0000-0000-0000-000000000001';

    // Get steps
    const { data: fromStep } = await supabaseAdmin
      .from('workflow_steps')
      .select('id')
      .eq('job_type_id', jobTypeId)
      .eq('name', job.status)
      .single();

    const { data: toStep } = await supabaseAdmin
      .from('workflow_steps')
      .select('id')
      .eq('job_type_id', jobTypeId)
      .eq('name', new_status)
      .single();

    if (!fromStep || !toStep) {
      return res.json({
        valid: false,
        reason: 'Invalid status value'
      });
    }

    // Check if transition exists
    const { data: transition } = await supabaseAdmin
      .from('workflow_transitions')
      .select('*')
      .eq('from_step_id', fromStep.id)
      .eq('to_step_id', toStep.id)
      .single();

    if (!transition) {
      return res.json({
        valid: false,
        reason: `Cannot transition from ${job.status} to ${new_status}`
      });
    }

    // Check role permission
    if (!transition.allowed_roles.includes(user.role)) {
      return res.json({
        valid: false,
        reason: `Your role (${user.role}) is not allowed to make this transition`
      });
    }

    res.json({
      valid: true,
      transition,
      requires_comment: transition.requires_comment,
      requires_approval: transition.requires_approval
    });
  } catch (err) {
    console.error('Validate transition error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
