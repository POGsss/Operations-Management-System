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

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (user.role !== 'admin') {
      query = query.eq('branch_id', user.branch_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Customer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { full_name, phone, email, address } = req.body;
    const userId = req.user.id;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('branch_id')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          branch_id: user.branch_id,
          full_name,
          phone,
          email,
          address,
          created_by: userId
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
      status: 'SUCCESS'
    });

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;