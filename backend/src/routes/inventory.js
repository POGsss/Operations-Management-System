import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// Priority options for purchase requests
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];
const PR_STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

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
// INVENTORY STOCK ROUTES
// ==========================================

// GET /api/inventory/stock - Get all stock levels (branch filtered)
router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    
    const { low_stock_only, item_id, limit = 100, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('inventory_stock')
      .select(`
        *,
        item:inventory_items(id, name, sku, category, unit_of_measure),
        branch:branches(id, name, code),
        updater:users!inventory_stock_last_updated_by_fkey(id, full_name)
      `)
      .order('updated_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Branch isolation for non-admin/executive
    if (!['admin', 'executive'].includes(user.role)) {
      query = query.eq('branch_id', user.branch_id);
    }

    // Filter for low stock only
    if (low_stock_only === 'true') {
      query = query.lte('quantity', supabaseAdmin.raw('min_stock'));
    }

    // Filter by specific item
    if (item_id) {
      query = query.eq('item_id', item_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate low stock flag for each item
    const stockWithFlags = (data || []).map(stock => ({
      ...stock,
      is_low_stock: stock.quantity <= stock.min_stock
    }));

    res.json({ stock: stockWithFlags, total: stockWithFlags.length });
  } catch (err) {
    console.error('Error fetching stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/stock/:id - Get single stock record
router.get('/stock/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('inventory_stock')
      .select(`
        *,
        item:inventory_items(id, name, sku, category, unit_of_measure),
        branch:branches(id, name, code),
        updater:users!inventory_stock_last_updated_by_fkey(id, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ stock: data });
  } catch (err) {
    console.error('Error fetching stock record:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/stock - Create new stock record (Admin only)
router.post('/stock', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can create stock records' });
    }

    const { branch_id, item_id, quantity, min_stock, max_stock } = req.body;

    if (!branch_id || !item_id) {
      return res.status(400).json({ error: 'branch_id and item_id are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_stock')
      .insert({
        branch_id,
        item_id,
        quantity: quantity || 0,
        min_stock: min_stock || 5,
        max_stock: max_stock || 100,
        last_updated_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: 'inventory.stock.create',
      resourceType: 'inventory_stock',
      resourceId: data.id,
      newData: data
    });

    res.status(201).json({ stock: data });
  } catch (err) {
    console.error('Error creating stock record:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/stock/:id - Update stock level
router.put('/stock/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    const { id } = req.params;

    if (!['admin', 'inventory_officer'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admin and inventory officer can modify stock' });
    }

    // Get current stock for audit
    const { data: oldData, error: fetchError } = await supabaseAdmin
      .from('inventory_stock')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Branch check for inventory officer
    if (user.role === 'inventory_officer' && oldData.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Cannot modify stock from another branch' });
    }

    const { quantity, min_stock, max_stock } = req.body;

    const updateData = {
      last_updated_by: userId
    };

    if (quantity !== undefined) updateData.quantity = quantity;
    if (min_stock !== undefined) updateData.min_stock = min_stock;
    if (max_stock !== undefined) updateData.max_stock = max_stock;

    const { data, error } = await supabaseAdmin
      .from('inventory_stock')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        item:inventory_items(id, name, sku, category),
        branch:branches(id, name, code)
      `)
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: 'inventory.stock.update',
      resourceType: 'inventory_stock',
      resourceId: id,
      oldData,
      newData: data
    });

    res.json({ stock: data });
  } catch (err) {
    console.error('Error updating stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/stock/adjust - Adjust stock quantity (add/remove)
router.post('/stock/adjust', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    if (!['admin', 'inventory_officer'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admin and inventory officer can adjust stock' });
    }

    const { stock_id, adjustment, reason } = req.body;

    if (!stock_id || adjustment === undefined) {
      return res.status(400).json({ error: 'stock_id and adjustment are required' });
    }

    // Get current stock
    const { data: currentStock, error: fetchError } = await supabaseAdmin
      .from('inventory_stock')
      .select('*')
      .eq('id', stock_id)
      .single();

    if (fetchError) throw fetchError;

    // Branch check for inventory officer
    if (user.role === 'inventory_officer' && currentStock.branch_id !== user.branch_id) {
      return res.status(403).json({ error: 'Cannot adjust stock from another branch' });
    }

    const newQuantity = currentStock.quantity + parseInt(adjustment);
    
    if (newQuantity < 0) {
      return res.status(400).json({ error: 'Stock cannot go below zero' });
    }

    const { data, error } = await supabaseAdmin
      .from('inventory_stock')
      .update({
        quantity: newQuantity,
        last_updated_by: userId
      })
      .eq('id', stock_id)
      .select(`
        *,
        item:inventory_items(id, name, sku, category),
        branch:branches(id, name, code)
      `)
      .single();

    if (error) throw error;

    // Log audit event with adjustment details
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: adjustment > 0 ? 'inventory.stock.increase' : 'inventory.stock.decrease',
      resourceType: 'inventory_stock',
      resourceId: stock_id,
      oldData: { quantity: currentStock.quantity },
      newData: { quantity: newQuantity, adjustment, reason }
    });

    res.json({ stock: data });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/items - Get all inventory items (catalog)
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const { category, search, limit = 100, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ items: data || [] });
  } catch (err) {
    console.error('Error fetching inventory items:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PURCHASE REQUEST ROUTES
// ==========================================

// GET /api/inventory/purchase-requests - List all purchase requests
router.get('/purchase-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    
    const { status, priority, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        branch:branches(id, name, code),
        requester:users!purchase_requests_requested_by_fkey(id, full_name),
        reviewer:users!purchase_requests_reviewed_by_fkey(id, full_name),
        purchase_request_items(
          id,
          quantity,
          notes,
          item:inventory_items(id, name, sku, category)
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Branch isolation for non-admin/executive
    if (!['admin', 'executive'].includes(user.role)) {
      query = query.eq('branch_id', user.branch_id);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ purchaseRequests: data || [], total: (data || []).length });
  } catch (err) {
    console.error('Error fetching purchase requests:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/purchase-requests/:id - Get single purchase request
router.get('/purchase-requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        branch:branches(id, name, code),
        requester:users!purchase_requests_requested_by_fkey(id, full_name),
        reviewer:users!purchase_requests_reviewed_by_fkey(id, full_name),
        purchase_request_items(
          id,
          quantity,
          notes,
          item:inventory_items(id, name, sku, category)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ purchaseRequest: data });
  } catch (err) {
    console.error('Error fetching purchase request:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/purchase-requests - Create new purchase request
router.post('/purchase-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);

    if (!['admin', 'branch_manager', 'inventory_officer'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admin, branch manager, and inventory officer can create purchase requests' });
    }

    const { priority, notes, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate priority
    if (priority && !PRIORITY_OPTIONS.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority value' });
    }

    // Create purchase request
    const { data: prData, error: prError } = await supabaseAdmin
      .from('purchase_requests')
      .insert({
        branch_id: user.branch_id,
        requested_by: userId,
        priority: priority || 'normal',
        notes: notes || null
      })
      .select()
      .single();

    if (prError) throw prError;

    // Create line items
    const lineItems = items.map(item => ({
      purchase_request_id: prData.id,
      item_id: item.item_id,
      quantity: item.quantity,
      notes: item.notes || null
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('purchase_request_items')
      .insert(lineItems);

    if (itemsError) throw itemsError;

    // Fetch complete PR with items
    const { data: fullPR, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select(`
        *,
        branch:branches(id, name, code),
        requester:users!purchase_requests_requested_by_fkey(id, full_name),
        purchase_request_items(
          id,
          quantity,
          notes,
          item:inventory_items(id, name, sku, category)
        )
      `)
      .eq('id', prData.id)
      .single();

    if (fetchError) throw fetchError;

    // Log audit event
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: 'inventory.purchase_request.create',
      resourceType: 'purchase_request',
      resourceId: prData.id,
      newData: fullPR
    });

    res.status(201).json({ purchaseRequest: fullPR });
  } catch (err) {
    console.error('Error creating purchase request:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/purchase-requests/:id/status - Update PR status (Admin approve/reject)
router.put('/purchase-requests/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    const { id } = req.params;

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can approve or reject purchase requests' });
    }

    const { status, notes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
    }

    // Get current PR for audit
    const { data: oldData, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (oldData.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending purchase requests' });
    }

    // Update status (trigger will auto-fill reviewed_by and reviewed_at)
    const updateData = { status };
    if (notes) {
      updateData.notes = oldData.notes ? `${oldData.notes}\n\nReview: ${notes}` : `Review: ${notes}`;
    }

    const { data, error } = await supabaseAdmin
      .from('purchase_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        branch:branches(id, name, code),
        requester:users!purchase_requests_requested_by_fkey(id, full_name),
        reviewer:users!purchase_requests_reviewed_by_fkey(id, full_name),
        purchase_request_items(
          id,
          quantity,
          notes,
          item:inventory_items(id, name, sku, category)
        )
      `)
      .single();

    if (error) throw error;

    // Manual update for reviewed_by since trigger uses auth.uid()
    await supabaseAdmin
      .from('purchase_requests')
      .update({ 
        reviewed_by: userId, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', id);

    // Log audit event
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: `inventory.purchase_request.${status}`,
      resourceType: 'purchase_request',
      resourceId: id,
      oldData,
      newData: data
    });

    res.json({ purchaseRequest: { ...data, reviewed_by: userId, reviewed_at: new Date().toISOString() } });
  } catch (err) {
    console.error('Error updating purchase request status:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/inventory/purchase-requests/:id - Delete pending purchase request
router.delete('/purchase-requests/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    const { id } = req.params;

    // Get PR to verify ownership and status
    const { data: pr, error: fetchError } = await supabaseAdmin
      .from('purchase_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Only allow deletion of pending requests
    if (pr.status !== 'pending') {
      return res.status(400).json({ error: 'Can only delete pending purchase requests' });
    }

    // Check permission - admin can delete any, others only their own
    if (user.role !== 'admin' && pr.requested_by !== userId) {
      return res.status(403).json({ error: 'Cannot delete purchase requests created by others' });
    }

    // Delete PR (cascade will delete items)
    const { error } = await supabaseAdmin
      .from('purchase_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      supabase: supabaseAdmin,
      userId,
      action: 'inventory.purchase_request.delete',
      resourceType: 'purchase_request',
      resourceId: id,
      oldData: pr
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting purchase request:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/branches - Get branches for dropdown
router.get('/branches', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('id, name, code')
      .eq('status', 'active')
      .order('name');

    if (error) throw error;

    res.json({ branches: data || [] });
  } catch (err) {
    console.error('Error fetching branches:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/logs - Get inventory activity logs
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    
    const { limit = 50, offset = 0, action_type } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, full_name)
      `)
      .like('action', 'inventory.%')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (action_type) {
      query = query.like('action', `inventory.${action_type}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ logs: data || [], total: (data || []).length });
  } catch (err) {
    console.error('Error fetching inventory logs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
