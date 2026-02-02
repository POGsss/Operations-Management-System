import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== VEHICLES ====================

// GET /api/estimates/vehicles - List vehicles (optionally by customer)
router.get('/vehicles', async (req, res) => {
  try {
    const { customer_id } = req.query;
    let query = supabaseAdmin
      .from('vehicles')
      .select(`
        *,
        customer:customers(id, full_name, phone, email)
      `)
      .order('created_at', { ascending: false });

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ vehicles: data });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates/vehicles - Create vehicle
router.post('/vehicles', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { customer_id, make, model, year, vin, license_plate, color, engine_type, transmission, mileage, notes } = req.body;

    if (!customer_id || !make || !model) {
      return res.status(400).json({ error: 'Customer ID, make, and model are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .insert({
        customer_id, make, model, year, vin, license_plate, color, engine_type, transmission, mileage, notes
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'vehicle',
      entityId: data.id,
      entityName: `${make} ${model}`,
      details: { customer_id, vin, license_plate }
    });

    res.status(201).json({ vehicle: data });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/estimates/vehicles/:id - Update vehicle
router.put('/vehicles/:id', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, year, vin, license_plate, color, engine_type, transmission, mileage, notes, is_active } = req.body;

    const { data, error } = await supabaseAdmin
      .from('vehicles')
      .update({ make, model, year, vin, license_plate, color, engine_type, transmission, mileage, notes, is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'vehicle',
      entityId: data.id,
      entityName: `${data.make} ${data.model}`,
      details: { vin, license_plate }
    });

    res.json({ vehicle: data });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ESTIMATES ====================

// GET /api/estimates - List estimates
router.get('/', async (req, res) => {
  try {
    const { branch_id, status, customer_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('estimates')
      .select(`
        *,
        customer:customers(id, full_name, phone, email),
        vehicle:vehicles(id, make, model, year, vin, license_plate),
        branch:branches(id, name, code),
        creator:users!estimates_created_by_fkey(id, full_name, email),
        approver:users!estimates_approved_by_fkey(id, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply role-based filtering
    if (!['admin', 'executive'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    if (branch_id) query = query.eq('branch_id', branch_id);
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      estimates: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/estimates/:id - Get single estimate with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get estimate
    const { data: estimate, error: estimateError } = await supabaseAdmin
      .from('estimates')
      .select(`
        *,
        customer:customers(id, full_name, phone, email, address),
        vehicle:vehicles(id, make, model, year, vin, license_plate, mileage),
        branch:branches(id, name, code, address, contact_phone),
        creator:users!estimates_created_by_fkey(id, full_name, email),
        approver:users!estimates_approved_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (estimateError) throw estimateError;
    if (!estimate) return res.status(404).json({ error: 'Estimate not found' });

    // Get items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('estimate_items')
      .select('*')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Get approval history
    const { data: history, error: historyError } = await supabaseAdmin
      .from('estimate_approval_history')
      .select(`
        *,
        changed_by_user:users!estimate_approval_history_changed_by_fkey(id, full_name, email)
      `)
      .eq('estimate_id', id)
      .order('created_at', { ascending: false });

    if (historyError) throw historyError;

    res.json({
      estimate: {
        ...estimate,
        items,
        history
      }
    });
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates - Create estimate
router.post('/', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const {
      branch_id, customer_id, vehicle_id,
      vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_license_plate, vehicle_mileage,
      customer_concern, internal_notes, terms_and_conditions,
      tax_rate, valid_until, items = []
    } = req.body;

    // Use user's branch if not admin/executive
    const effectiveBranchId = ['admin', 'executive'].includes(req.user.role) 
      ? branch_id 
      : req.user.branch_id;

    if (!effectiveBranchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Create estimate (estimate_number auto-generated by trigger)
    const { data: estimate, error: estimateError } = await supabaseAdmin
      .from('estimates')
      .insert({
        branch_id: effectiveBranchId,
        customer_id,
        vehicle_id,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_vin,
        vehicle_license_plate,
        vehicle_mileage,
        customer_concern,
        internal_notes,
        terms_and_conditions,
        tax_rate: tax_rate || 0,
        valid_until,
        created_by: req.user.id,
        estimate_number: '' // Will be auto-generated
      })
      .select()
      .single();

    if (estimateError) throw estimateError;

    // Add items if provided
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        estimate_id: estimate.id,
        item_type: item.item_type,
        service_package_id: item.service_package_id,
        inventory_item_id: item.inventory_item_id,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        line_total: (item.quantity || 1) * (item.unit_price || 0) - (item.discount_amount || 0),
        estimated_hours: item.estimated_hours,
        hourly_rate: item.hourly_rate,
        is_taxable: item.is_taxable !== false,
        sort_order: index
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('estimate_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Fetch complete estimate
    const { data: completeEstimate, error: fetchError } = await supabaseAdmin
      .from('estimates')
      .select('*')
      .eq('id', estimate.id)
      .single();

    if (fetchError) throw fetchError;

    await logAuditEvent({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'estimate',
      entityId: completeEstimate.id,
      entityName: completeEstimate.estimate_number,
      details: { customer_id, vehicle_id, items_count: items.length }
    });

    res.status(201).json({ estimate: completeEstimate });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/estimates/:id - Update estimate
router.put('/:id', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, vehicle_id,
      vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_license_plate, vehicle_mileage,
      customer_concern, internal_notes, terms_and_conditions,
      tax_rate, valid_until
    } = req.body;

    // Check current status
    const { data: existing } = await supabaseAdmin
      .from('estimates')
      .select('status')
      .eq('id', id)
      .single();

    if (existing && ['converted', 'approved'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot edit a converted or approved estimate' });
    }

    const { data, error } = await supabaseAdmin
      .from('estimates')
      .update({
        customer_id, vehicle_id,
        vehicle_make, vehicle_model, vehicle_year, vehicle_vin, vehicle_license_plate, vehicle_mileage,
        customer_concern, internal_notes, terms_and_conditions,
        tax_rate, valid_until
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'estimate',
      entityId: data.id,
      entityName: data.estimate_number,
      details: {}
    });

    res.json({ estimate: data });
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/estimates/:id - Delete estimate (draft only)
router.delete('/:id', requireRole(['admin', 'executive', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow deleting drafts
    const { data: existing } = await supabaseAdmin
      .from('estimates')
      .select('status, estimate_number')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft estimates can be deleted' });
    }

    const { error } = await supabaseAdmin
      .from('estimates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'estimate',
      entityId: id,
      entityName: existing.estimate_number,
      details: {}
    });

    res.json({ message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ESTIMATE ITEMS ====================

// POST /api/estimates/:id/items - Add item to estimate
router.post('/:id/items', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { item_type, service_package_id, inventory_item_id, name, description, sku,
      quantity, unit_price, discount_percent, discount_amount, estimated_hours, hourly_rate, is_taxable } = req.body;

    if (!name || !item_type) {
      return res.status(400).json({ error: 'Name and item type are required' });
    }

    // Get max sort order
    const { data: maxOrder } = await supabaseAdmin
      .from('estimate_items')
      .select('sort_order')
      .eq('estimate_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxOrder?.sort_order || 0) + 1;
    const lineTotal = (quantity || 1) * (unit_price || 0) - (discount_amount || 0);

    const { data, error } = await supabaseAdmin
      .from('estimate_items')
      .insert({
        estimate_id: id,
        item_type,
        service_package_id,
        inventory_item_id,
        name,
        description,
        sku,
        quantity: quantity || 1,
        unit_price: unit_price || 0,
        discount_percent: discount_percent || 0,
        discount_amount: discount_amount || 0,
        line_total: lineTotal,
        estimated_hours,
        hourly_rate,
        is_taxable: is_taxable !== false,
        sort_order: sortOrder
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ item: data });
  } catch (error) {
    console.error('Error adding estimate item:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/estimates/:id/items/:itemId - Update item
router.put('/:id/items/:itemId', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, description, quantity, unit_price, discount_percent, discount_amount,
      estimated_hours, hourly_rate, is_taxable, sort_order } = req.body;

    const lineTotal = (quantity || 1) * (unit_price || 0) - (discount_amount || 0);

    const { data, error } = await supabaseAdmin
      .from('estimate_items')
      .update({
        name, description, quantity, unit_price, discount_percent, discount_amount,
        line_total: lineTotal, estimated_hours, hourly_rate, is_taxable, sort_order
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    res.json({ item: data });
  } catch (error) {
    console.error('Error updating estimate item:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/estimates/:id/items/:itemId - Remove item
router.delete('/:id/items/:itemId', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { itemId } = req.params;

    const { error } = await supabaseAdmin
      .from('estimate_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error removing estimate item:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ESTIMATE WORKFLOW ====================

// POST /api/estimates/:id/submit - Submit estimate for approval
router.post('/:id/submit', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: estimate } = await supabaseAdmin
      .from('estimates')
      .select('status, estimate_number')
      .eq('id', id)
      .single();

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft estimates can be submitted' });
    }

    // Update status
    const { data, error } = await supabaseAdmin
      .from('estimates')
      .update({ status: 'pending' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log history
    await supabaseAdmin
      .from('estimate_approval_history')
      .insert({
        estimate_id: id,
        from_status: 'draft',
        to_status: 'pending',
        changed_by: req.user.id
      });

    await logAuditEvent({
      userId: req.user.id,
      action: 'SUBMIT',
      entityType: 'estimate',
      entityId: id,
      entityName: estimate.estimate_number,
      details: { from_status: 'draft', to_status: 'pending' }
    });

    res.json({ estimate: data });
  } catch (error) {
    console.error('Error submitting estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates/:id/approve - Approve estimate
router.post('/:id/approve', requireRole(['admin', 'executive', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: estimate } = await supabaseAdmin
      .from('estimates')
      .select('status, estimate_number')
      .eq('id', id)
      .single();

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending estimates can be approved' });
    }

    const { data, error } = await supabaseAdmin
      .from('estimates')
      .update({
        status: 'approved',
        approved_by: req.user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('estimate_approval_history')
      .insert({
        estimate_id: id,
        from_status: 'pending',
        to_status: 'approved',
        changed_by: req.user.id,
        reason
      });

    await logAuditEvent({
      userId: req.user.id,
      action: 'APPROVE',
      entityType: 'estimate',
      entityId: id,
      entityName: estimate.estimate_number,
      details: { reason }
    });

    res.json({ estimate: data });
  } catch (error) {
    console.error('Error approving estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates/:id/reject - Reject estimate
router.post('/:id/reject', requireRole(['admin', 'executive', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const { data: estimate } = await supabaseAdmin
      .from('estimates')
      .select('status, estimate_number')
      .eq('id', id)
      .single();

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending estimates can be rejected' });
    }

    const { data, error } = await supabaseAdmin
      .from('estimates')
      .update({ status: 'rejected' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('estimate_approval_history')
      .insert({
        estimate_id: id,
        from_status: 'pending',
        to_status: 'rejected',
        changed_by: req.user.id,
        reason
      });

    await logAuditEvent({
      userId: req.user.id,
      action: 'REJECT',
      entityType: 'estimate',
      entityId: id,
      entityName: estimate.estimate_number,
      details: { reason }
    });

    res.json({ estimate: data });
  } catch (error) {
    console.error('Error rejecting estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates/:id/convert - Convert estimate to job order
router.post('/:id/convert', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: estimate } = await supabaseAdmin
      .from('estimates')
      .select(`
        *,
        items:estimate_items(*)
      `)
      .eq('id', id)
      .single();

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (estimate.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved estimates can be converted to job orders' });
    }

    // Create job order
    const { data: jobOrder, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .insert({
        branch_id: estimate.branch_id,
        customer_id: estimate.customer_id,
        status: 'DRAFT',
        vehicle_plate: estimate.vehicle_license_plate,
        vehicle_vin: estimate.vehicle_vin,
        odometer: estimate.vehicle_mileage,
        notes: estimate.customer_concern,
        total_estimated: estimate.total_amount,
        created_by: req.user.id
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Create job estimates from estimate items
    if (estimate.items && estimate.items.length > 0) {
      const jobEstimates = estimate.items
        .filter(item => ['labor', 'part', 'package'].includes(item.item_type))
        .map(item => ({
          job_id: jobOrder.id,
          item_name: item.name,
          item_type: item.item_type.toUpperCase(),
          quantity: Math.round(item.quantity),
          unit_price: item.unit_price,
          total_price: item.line_total
        }));

      if (jobEstimates.length > 0) {
        await supabaseAdmin
          .from('job_estimates')
          .insert(jobEstimates);
      }
    }

    // Update estimate status
    const { data: updatedEstimate, error: updateError } = await supabaseAdmin
      .from('estimates')
      .update({
        status: 'converted',
        converted_to_job_order_id: jobOrder.id,
        converted_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin
      .from('estimate_approval_history')
      .insert({
        estimate_id: id,
        from_status: 'approved',
        to_status: 'converted',
        changed_by: req.user.id
      });

    await logAuditEvent({
      userId: req.user.id,
      action: 'CONVERT',
      entityType: 'estimate',
      entityId: id,
      entityName: estimate.estimate_number,
      details: { job_order_id: jobOrder.id }
    });

    res.json({
      estimate: updatedEstimate,
      jobOrder
    });
  } catch (error) {
    console.error('Error converting estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/estimates/:id/revise - Revert to draft for revision
router.post('/:id/revise', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: estimate } = await supabaseAdmin
      .from('estimates')
      .select('status, estimate_number')
      .eq('id', id)
      .single();

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    if (!['pending', 'rejected'].includes(estimate.status)) {
      return res.status(400).json({ error: 'Only pending or rejected estimates can be revised' });
    }

    const { data, error } = await supabaseAdmin
      .from('estimates')
      .update({ status: 'draft' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabaseAdmin
      .from('estimate_approval_history')
      .insert({
        estimate_id: id,
        from_status: estimate.status,
        to_status: 'draft',
        changed_by: req.user.id,
        reason
      });

    await logAuditEvent({
      userId: req.user.id,
      action: 'REVISE',
      entityType: 'estimate',
      entityId: id,
      entityName: estimate.estimate_number,
      details: { from_status: estimate.status, reason }
    });

    res.json({ estimate: data });
  } catch (error) {
    console.error('Error revising estimate:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH & LOOKUP ====================

// GET /api/estimates/search/packages - Search service packages
router.get('/search/packages', async (req, res) => {
  try {
    const { q, category } = req.query;

    let query = supabaseAdmin
      .from('service_packages')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;

    res.json({ packages: data });
  } catch (error) {
    console.error('Error searching packages:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/estimates/search/parts - Search inventory items (parts)
router.get('/search/parts', async (req, res) => {
  try {
    const { q, category } = req.query;

    let query = supabaseAdmin
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (q) {
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;

    res.json({ parts: data });
  } catch (error) {
    console.error('Error searching parts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/estimates/labor-rates - Get labor rates for branch
router.get('/labor-rates', async (req, res) => {
  try {
    const { branch_id } = req.query;
    const effectiveBranchId = branch_id || req.user.branch_id;

    const { data, error } = await supabaseAdmin
      .from('labor_rates')
      .select('*')
      .eq('branch_id', effectiveBranchId)
      .eq('is_active', true)
      .order('skill_level');

    if (error) throw error;

    res.json({ laborRates: data });
  } catch (error) {
    console.error('Error fetching labor rates:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
