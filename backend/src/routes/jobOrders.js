import express from 'express';
import { supabase, supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// Status workflow transitions
const allowedTransitions = {
  DRAFT: ['ESTIMATED'],
  ESTIMATED: ['APPROVED', 'DRAFT'], // Can go back to DRAFT for revisions
  APPROVED: ['IN_PROGRESS'],
  IN_PROGRESS: ['QUALITY_CHECK'],
  QUALITY_CHECK: ['BILLED', 'IN_PROGRESS'], // Can go back if issues found
  BILLED: ['RELEASED'],
  RELEASED: []
};

// Role-based status change permissions
const roleStatusPermissions = {
  admin: ['DRAFT', 'ESTIMATED', 'APPROVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'BILLED', 'RELEASED'],
  branch_manager: ['APPROVED', 'QUALITY_CHECK', 'BILLED', 'RELEASED'],
  service_advisor: ['DRAFT', 'ESTIMATED'],
  mechanic: ['IN_PROGRESS', 'QUALITY_CHECK'],
  inventory_officer: ['BILLED'],
  executive: [] // Read-only
};

// Helper to get user with branch info
const getUserWithBranch = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role, branch_id, full_name')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

// ==========================================
// GET /api/jobs - List all jobs (branch filtered)
// ==========================================
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    
    const { status, customer_id, mechanic_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('job_orders')
      .select(`
        *,
        customer:customers(id, full_name, phone, email),
        creator:users!job_orders_created_by_fkey(id, full_name),
        approver:users!job_orders_approved_by_fkey(id, full_name),
        branch:branches(id, name, code),
        job_assignments(
          id,
          mechanic:users!job_assignments_mechanic_id_fkey(id, full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Branch isolation for non-admin/executive
    if (!['admin', 'executive'].includes(user.role)) {
      query = query.eq('branch_id', user.branch_id);
    }

    // Mechanic sees only their assigned jobs
    if (user.role === 'mechanic') {
      const { data: assignedJobs } = await supabaseAdmin
        .from('job_assignments')
        .select('job_id')
        .eq('mechanic_id', userId);
      
      const jobIds = assignedJobs?.map(a => a.job_id) || [];
      if (jobIds.length > 0) {
        query = query.in('id', jobIds);
      } else {
        return res.json({ jobs: [], total: 0 });
      }
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ jobs: data || [], total: count });
  } catch (err) {
    console.error('Fetch jobs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/:id - Get job details
// ==========================================
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    const { data: job, error } = await supabaseAdmin
      .from('job_orders')
      .select(`
        *,
        customer:customers(id, full_name, phone, email, address),
        creator:users!job_orders_created_by_fkey(id, full_name, email),
        approver:users!job_orders_approved_by_fkey(id, full_name, email),
        branch:branches(id, name, code, city),
        job_assignments(
          id,
          assigned_at,
          mechanic:users!job_assignments_mechanic_id_fkey(id, full_name, email),
          assigner:users!job_assignments_assigned_by_fkey(id, full_name)
        ),
        job_estimates(
          id,
          item_name,
          item_type,
          quantity,
          unit_price,
          total_price,
          created_at
        ),
        job_parts_used(
          id,
          quantity,
          reserved,
          used_at,
          inventory_item:inventory_items(id, name, sku, unit_price)
        ),
        job_status_history(
          id,
          old_status,
          new_status,
          changed_at,
          changer:users(id, full_name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Branch isolation check
    if (!['admin', 'executive'].includes(user.role) && job.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied to this job order' });
    }

    res.json({ job });
  } catch (err) {
    console.error('Fetch job error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/jobs - Create a new job order
// ==========================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only service advisors, branch managers, and admins can create jobs
    if (!['admin', 'branch_manager', 'service_advisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to create job orders' });
    }

    const { customer_id, vehicle_plate, vehicle_vin, odometer, notes } = req.body;

    if (!customer_id) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const { data: job, error } = await supabaseAdmin
      .from('job_orders')
      .insert([{
        branch_id: user.branch_id,
        customer_id,
        vehicle_plate: vehicle_plate || null,
        vehicle_vin: vehicle_vin || null,
        odometer: odometer || null,
        notes: notes || null,
        status: 'DRAFT',
        created_by: userId,
        total_estimated: 0,
        total_final: 0
      }])
      .select(`
        *,
        customer:customers(id, full_name, phone),
        branch:branches(id, name)
      `)
      .single();

    if (error) throw error;

    // Log initial status
    await supabaseAdmin
      .from('job_status_history')
      .insert([{
        job_id: job.id,
        old_status: null,
        new_status: 'DRAFT',
        changed_by: userId
      }]);

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'JOB_ORDER',
      entityId: job.id,
      entityName: `Job #${job.id.substring(0, 8)}`,
      details: { customer_id, vehicle_plate, status: 'DRAFT' },
      status: 'SUCCESS'
    });

    res.status(201).json({ job });
  } catch (err) {
    console.error('Create job error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUT /api/jobs/:id - Update job order
// ==========================================
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    const { vehicle_plate, vehicle_vin, odometer, notes } = req.body;

    // Check job exists and user has access
    const { data: existingJob } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Branch check
    if (!['admin'].includes(user.role) && existingJob.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only update DRAFT jobs
    if (existingJob.status !== 'DRAFT' && !['admin'].includes(user.role)) {
      return res.status(400).json({ error: 'Can only update jobs in DRAFT status' });
    }

    const { data: job, error } = await supabaseAdmin
      .from('job_orders')
      .update({
        vehicle_plate: vehicle_plate ?? existingJob.vehicle_plate,
        vehicle_vin: vehicle_vin ?? existingJob.vehicle_vin,
        odometer: odometer ?? existingJob.odometer,
        notes: notes ?? existingJob.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'JOB_ORDER',
      entityId: job.id,
      entityName: `Job #${job.id.substring(0, 8)}`,
      details: { vehicle_plate, vehicle_vin, odometer },
      status: 'SUCCESS'
    });

    res.json({ job });
  } catch (err) {
    console.error('Update job error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/jobs/:id/status - Change job status
// ==========================================
router.post('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_status } = req.body;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    if (!new_status) {
      return res.status(400).json({ error: 'New status is required' });
    }

    // Get current job
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Branch check
    if (!['admin', 'executive'].includes(user.role) && job.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate transition
    const currentStatus = job.status;
    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(new_status) && user.role !== 'admin') {
      return res.status(400).json({
        error: `Cannot transition from ${currentStatus} to ${new_status}`,
        allowed_transitions: allowed
      });
    }

    // Check role permission
    const rolePermissions = roleStatusPermissions[user.role] || [];
    if (!rolePermissions.includes(new_status) && user.role !== 'admin') {
      return res.status(403).json({
        error: `Your role (${user.role}) cannot change status to ${new_status}`
      });
    }

    // Update job status
    const updateData = {
      status: new_status,
      updated_at: new Date().toISOString()
    };

    // Set approved_by when approving
    if (new_status === 'APPROVED') {
      updateData.approved_by = userId;
    }

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from('job_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log status change
    await supabaseAdmin
      .from('job_status_history')
      .insert([{
        job_id: id,
        old_status: currentStatus,
        new_status: new_status,
        changed_by: userId
      }]);

    await logAuditEvent({
      userId,
      action: 'STATUS_CHANGE',
      entityType: 'JOB_ORDER',
      entityId: id,
      entityName: `Job #${id.substring(0, 8)}`,
      details: { old_status: currentStatus, new_status },
      status: 'SUCCESS'
    });

    res.json({ job: updatedJob, message: `Status changed from ${currentStatus} to ${new_status}` });
  } catch (err) {
    console.error('Status change error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/jobs/:id/assign - Assign mechanic
// ==========================================
router.post('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mechanic_id } = req.body;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only service advisors, branch managers, and admins can assign
    if (!['admin', 'branch_manager', 'service_advisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to assign mechanics' });
    }

    if (!mechanic_id) {
      return res.status(400).json({ error: 'Mechanic ID is required' });
    }

    // Verify job exists and user has access
    const { data: job } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Branch check
    if (user.role !== 'admin' && job.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify mechanic exists and is in the same branch
    const { data: mechanic } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, branch_id')
      .eq('id', mechanic_id)
      .single();

    if (!mechanic) {
      return res.status(404).json({ error: 'Mechanic not found' });
    }

    if (mechanic.role !== 'mechanic') {
      return res.status(400).json({ error: 'Selected user is not a mechanic' });
    }

    if (user.role !== 'admin' && mechanic.branch_id !== job.branch_id) {
      return res.status(400).json({ error: 'Mechanic must be from the same branch' });
    }

    // Check if already assigned
    const { data: existingAssignment } = await supabaseAdmin
      .from('job_assignments')
      .select('id')
      .eq('job_id', id)
      .eq('mechanic_id', mechanic_id)
      .single();

    if (existingAssignment) {
      return res.status(400).json({ error: 'Mechanic is already assigned to this job' });
    }

    // Create assignment
    const { data: assignment, error } = await supabaseAdmin
      .from('job_assignments')
      .insert([{
        job_id: id,
        mechanic_id,
        assigned_by: userId
      }])
      .select(`
        *,
        mechanic:users!job_assignments_mechanic_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'ASSIGN_MECHANIC',
      entityType: 'JOB_ORDER',
      entityId: id,
      entityName: `Job #${id.substring(0, 8)}`,
      details: { mechanic_id, mechanic_name: mechanic.full_name },
      status: 'SUCCESS'
    });

    res.status(201).json({ assignment });
  } catch (err) {
    console.error('Assign mechanic error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DELETE /api/jobs/:id/assign/:mechanicId - Unassign mechanic
// ==========================================
router.delete('/:id/assign/:mechanicId', authenticateToken, async (req, res) => {
  try {
    const { id, mechanicId } = req.params;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only service advisors, branch managers, and admins can unassign
    if (!['admin', 'branch_manager', 'service_advisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to unassign mechanics' });
    }

    const { error } = await supabaseAdmin
      .from('job_assignments')
      .delete()
      .eq('job_id', id)
      .eq('mechanic_id', mechanicId);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UNASSIGN_MECHANIC',
      entityType: 'JOB_ORDER',
      entityId: id,
      entityName: `Job #${id.substring(0, 8)}`,
      details: { mechanic_id: mechanicId },
      status: 'SUCCESS'
    });

    res.json({ message: 'Mechanic unassigned successfully' });
  } catch (err) {
    console.error('Unassign mechanic error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/:id/estimates - Get job estimates
// ==========================================
router.get('/:id/estimates', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: estimates, error } = await supabaseAdmin
      .from('job_estimates')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ estimates: estimates || [] });
  } catch (err) {
    console.error('Fetch estimates error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/jobs/:id/estimate - Add estimate item
// ==========================================
router.post('/:id/estimate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, item_type, quantity, unit_price } = req.body;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only service advisors and admins can add estimates
    if (!['admin', 'branch_manager', 'service_advisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to add estimates' });
    }

    if (!item_name || !item_type || !unit_price) {
      return res.status(400).json({ error: 'Item name, type, and unit price are required' });
    }

    if (!['LABOR', 'PART', 'PACKAGE'].includes(item_type)) {
      return res.status(400).json({ error: 'Item type must be LABOR, PART, or PACKAGE' });
    }

    // Verify job exists
    const { data: job } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Branch check
    if (user.role !== 'admin' && job.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Can only add estimates to DRAFT or ESTIMATED jobs
    if (!['DRAFT', 'ESTIMATED'].includes(job.status) && user.role !== 'admin') {
      return res.status(400).json({ error: 'Can only add estimates to DRAFT or ESTIMATED jobs' });
    }

    const qty = parseInt(quantity) || 1;
    const price = parseFloat(unit_price);
    const total_price = qty * price;

    const { data: estimate, error } = await supabaseAdmin
      .from('job_estimates')
      .insert([{
        job_id: id,
        item_name,
        item_type,
        quantity: qty,
        unit_price: price,
        total_price
      }])
      .select()
      .single();

    if (error) throw error;

    // Update job total_estimated
    const { data: allEstimates } = await supabaseAdmin
      .from('job_estimates')
      .select('total_price')
      .eq('job_id', id);

    const newTotal = allEstimates.reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    await supabaseAdmin
      .from('job_orders')
      .update({ total_estimated: newTotal, updated_at: new Date().toISOString() })
      .eq('id', id);

    await logAuditEvent({
      userId,
      action: 'ADD_ESTIMATE',
      entityType: 'JOB_ORDER',
      entityId: id,
      entityName: `Job #${id.substring(0, 8)}`,
      details: { item_name, item_type, quantity: qty, unit_price: price, total_price },
      status: 'SUCCESS'
    });

    res.status(201).json({ estimate, new_total: newTotal });
  } catch (err) {
    console.error('Add estimate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// DELETE /api/jobs/:id/estimate/:estimateId - Remove estimate
// ==========================================
router.delete('/:id/estimate/:estimateId', authenticateToken, async (req, res) => {
  try {
    const { id, estimateId } = req.params;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only service advisors and admins can remove estimates
    if (!['admin', 'branch_manager', 'service_advisor'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to remove estimates' });
    }

    // Verify job
    const { data: job } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Can only remove estimates from DRAFT or ESTIMATED jobs
    if (!['DRAFT', 'ESTIMATED'].includes(job.status) && user.role !== 'admin') {
      return res.status(400).json({ error: 'Can only remove estimates from DRAFT or ESTIMATED jobs' });
    }

    const { error } = await supabaseAdmin
      .from('job_estimates')
      .delete()
      .eq('id', estimateId)
      .eq('job_id', id);

    if (error) throw error;

    // Recalculate total
    const { data: allEstimates } = await supabaseAdmin
      .from('job_estimates')
      .select('total_price')
      .eq('job_id', id);

    const newTotal = allEstimates.reduce((sum, e) => sum + parseFloat(e.total_price), 0);

    await supabaseAdmin
      .from('job_orders')
      .update({ total_estimated: newTotal, updated_at: new Date().toISOString() })
      .eq('id', id);

    res.json({ message: 'Estimate removed', new_total: newTotal });
  } catch (err) {
    console.error('Remove estimate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// POST /api/jobs/:id/parts - Log parts used
// ==========================================
router.post('/:id/parts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { inventory_item_id, quantity } = req.body;
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    // Only mechanics, inventory officers, and admins can log parts
    if (!['admin', 'branch_manager', 'mechanic', 'inventory_officer'].includes(user.role)) {
      return res.status(403).json({ error: 'Not authorized to log parts' });
    }

    if (!inventory_item_id || !quantity) {
      return res.status(400).json({ error: 'Inventory item ID and quantity are required' });
    }

    // Verify job exists and is in progress
    const { data: job } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!['APPROVED', 'IN_PROGRESS', 'QUALITY_CHECK'].includes(job.status) && user.role !== 'admin') {
      return res.status(400).json({ error: 'Can only log parts for jobs that are approved or in progress' });
    }

    // Verify inventory item exists and has stock
    const { data: inventoryItem } = await supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('id', inventory_item_id)
      .single();

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const qty = parseInt(quantity);
    if (inventoryItem.stock < qty) {
      return res.status(400).json({
        error: 'Insufficient stock',
        available: inventoryItem.stock,
        requested: qty
      });
    }

    // Log part usage
    const { data: partUsed, error } = await supabaseAdmin
      .from('job_parts_used')
      .insert([{
        job_id: id,
        inventory_item_id,
        quantity: qty,
        reserved: true
      }])
      .select(`
        *,
        inventory_item:inventory_items(id, name, sku, unit_price)
      `)
      .single();

    if (error) throw error;

    // Deduct from inventory
    await supabaseAdmin
      .from('inventory_items')
      .update({ stock: inventoryItem.stock - qty })
      .eq('id', inventory_item_id);

    // Update job total_final
    const partCost = qty * parseFloat(inventoryItem.unit_price || 0);
    const newFinalTotal = parseFloat(job.total_final || 0) + partCost;

    await supabaseAdmin
      .from('job_orders')
      .update({ total_final: newFinalTotal, updated_at: new Date().toISOString() })
      .eq('id', id);

    await logAuditEvent({
      userId,
      action: 'LOG_PARTS',
      entityType: 'JOB_ORDER',
      entityId: id,
      entityName: `Job #${id.substring(0, 8)}`,
      details: {
        inventory_item_id,
        item_name: inventoryItem.name,
        quantity: qty,
        cost: partCost
      },
      status: 'SUCCESS'
    });

    res.status(201).json({ part_used: partUsed, new_total_final: newFinalTotal });
  } catch (err) {
    console.error('Log parts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/:id/parts - Get parts used for a job
// ==========================================
router.get('/:id/parts', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: parts, error } = await supabaseAdmin
      .from('job_parts_used')
      .select(`
        *,
        inventory_item:inventory_items(id, name, sku, unit_price, stock)
      `)
      .eq('job_id', id)
      .order('used_at', { ascending: true });

    if (error) throw error;

    res.json({ parts: parts || [] });
  } catch (err) {
    console.error('Fetch parts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/:id/history - Get status history
// ==========================================
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: history, error } = await supabaseAdmin
      .from('job_status_history')
      .select(`
        *,
        changer:users(id, full_name)
      `)
      .eq('job_id', id)
      .order('changed_at', { ascending: true });

    if (error) throw error;

    res.json({ history: history || [] });
  } catch (err) {
    console.error('Fetch history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/mechanics/available - Get available mechanics
// ==========================================
router.get('/mechanics/available', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    let query = supabaseAdmin
      .from('users')
      .select('id, full_name, email, branch_id')
      .eq('role', 'mechanic');

    // Branch filter for non-admin
    if (user.role !== 'admin') {
      query = query.eq('branch_id', user.branch_id);
    }

    const { data: mechanics, error } = await query;

    if (error) throw error;

    res.json({ mechanics: mechanics || [] });
  } catch (err) {
    console.error('Fetch mechanics error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GET /api/jobs/stats/summary - Get job statistics
// ==========================================
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    let query = supabaseAdmin.from('job_orders').select('status, total_estimated, total_final');

    // Branch filter
    if (!['admin', 'executive'].includes(user.role)) {
      query = query.eq('branch_id', user.branch_id);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    const stats = {
      total: jobs.length,
      by_status: {},
      total_estimated: 0,
      total_final: 0
    };

    jobs.forEach(job => {
      stats.by_status[job.status] = (stats.by_status[job.status] || 0) + 1;
      stats.total_estimated += parseFloat(job.total_estimated || 0);
      stats.total_final += parseFloat(job.total_final || 0);
    });

    res.json({ stats });
  } catch (err) {
    console.error('Fetch stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
