import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ branches: data });
  } catch (err) {
    console.error('Fetch branches error:', err.message);
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ branch: data });
  } catch (err) {
    console.error('Fetch branch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch branch' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { name, code, city, manager, status } = req.body;

    // Check if user is admin
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminCheckError || !adminUser || adminUser.role !== 'admin') {
      await logAuditEvent({
        userId: adminId,
        action: 'CREATE',
        entityType: 'BRANCH',
        entityName: name,
        status: 'FAILED',
        errorMessage: 'Admin access required',
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data, error } = await supabaseAdmin
      .from('branches')
      .insert([
        {
          name,
          code,
          city,
          manager,
          status: status || 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Log successful branch creation
    await logAuditEvent({
      userId: adminId,
      action: 'CREATE',
      entityType: 'BRANCH',
      entityId: data.id,
      entityName: name,
      details: {
        code,
        city,
        manager,
        status,
      },
      status: 'SUCCESS',
    });

    res.status(201).json({ branch: data });
  } catch (err) {
    console.error('Create branch error:', err.message);
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;

    // Check if user is admin
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminCheckError || !adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('branches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log branch update
    await logAuditEvent({
      userId: adminId,
      action: 'UPDATE',
      entityType: 'BRANCH',
      entityId: id,
      entityName: data.name,
      details: updates,
      status: 'SUCCESS',
    });

    res.json({ branch: data });
  } catch (err) {
    console.error('Update branch error:', err.message);
    res.status(500).json({ error: 'Failed to update branch' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;

    // Check if user is admin
    const { data: adminUser, error: adminCheckError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminCheckError || !adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get branch info before deleting for logging
    const { data: branchData } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('branches')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log branch deletion
    await logAuditEvent({
      userId: adminId,
      action: 'DELETE',
      entityType: 'BRANCH',
      entityId: id,
      entityName: branchData?.name || 'Unknown',
      details: branchData,
      status: 'SUCCESS',
    });

    res.json({ message: 'Branch deleted successfully' });
  } catch (err) {
    console.error('Delete branch error:', err.message);
    res.status(500).json({ error: 'Failed to delete branch' });
  }
});

export default router;