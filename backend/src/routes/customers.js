import express from 'express';
import { supabase, supabaseAdmin } from '../db/index.js';
import { authenticateToken } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// Get Customers (Branch Scoped)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id, role')
      .eq('id', userId)
      .single();

    let query = supabaseAdmin
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    // Admin and Executive can see all customers
    if (user.role !== 'admin' && user.role !== 'executive') {
      query = query.eq('branch_id', user.branch_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Single Customer by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id, role')
      .eq('id', userId)
      .single();

    let query = supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id);

    // Non-admin/executive users can only see customers from their branch
    if (user.role !== 'admin' && user.role !== 'executive') {
      query = query.eq('branch_id', user.branch_id);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create Customer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, email, address, is_active } = req.body;
    const userId = req.user.id;

    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id')
      .eq('id', userId)
      .single();

    if (!user?.branch_id) {
      return res.status(400).json({ error: 'User must be assigned to a branch to create customers' });
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          branch_id: user.branch_id,
          full_name,
          phone: phone || null,
          email: email || null,
          address: address || null,
          is_active: is_active !== undefined ? is_active : true,
          created_by: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'CUSTOMER',
      entityId: data.id,
      entityName: full_name,
      details: { phone, email, address, is_active },
      status: 'SUCCESS'
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Customer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, email, address, is_active } = req.body;
    const userId = req.user.id;

    if (!full_name) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // Get user's branch
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id, role')
      .eq('id', userId)
      .single();

    // Check if customer exists and belongs to user's branch
    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' });
      }
      throw fetchError;
    }

    // Non-admin/executive users can only update customers from their branch
    if (user.role !== 'admin' && user.role !== 'executive') {
      if (existingCustomer.branch_id !== user.branch_id) {
        return res.status(403).json({ error: 'You can only update customers from your branch' });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update({
        full_name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'CUSTOMER',
      entityId: id,
      entityName: full_name,
      details: { 
        previous: existingCustomer,
        updated: { full_name, phone, email, address, is_active }
      },
      status: 'SUCCESS'
    });

    res.json(data);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Customer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get user's branch and role
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id, role')
      .eq('id', userId)
      .single();

    // Check if customer exists
    const { data: existingCustomer, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Customer not found' });
      }
      throw fetchError;
    }

    // Non-admin/executive users can only delete customers from their branch
    if (user.role !== 'admin' && user.role !== 'executive') {
      if (existingCustomer.branch_id !== user.branch_id) {
        return res.status(403).json({ error: 'You can only delete customers from your branch' });
      }
    }

    // Check if customer has any job orders
    const { data: jobOrders, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .select('id')
      .eq('customer_id', id)
      .limit(1);

    if (jobError) throw jobError;

    if (jobOrders && jobOrders.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete customer with existing job orders. Consider marking them as inactive instead.' 
      });
    }

    const { error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'CUSTOMER',
      entityId: id,
      entityName: existingCustomer.full_name,
      details: { deletedCustomer: existingCustomer },
      status: 'SUCCESS'
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;