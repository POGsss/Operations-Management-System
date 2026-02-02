import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// ==================== TIME ENTRIES ====================

// Get time entries (with filters)
router.get('/time-entries', authenticateToken, async (req, res) => {
  try {
    const { mechanic_id, job_order_id, branch_id, start_date, end_date, active_only, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        mechanic:mechanic_id(id, full_name, email),
        job_order:job_order_id(id, job_number, vehicle_plate, status),
        branch:branch_id(id, name)
      `, { count: 'exact' });

    // Filters
    if (mechanic_id) query = query.eq('mechanic_id', mechanic_id);
    if (job_order_id) query = query.eq('job_order_id', job_order_id);
    if (branch_id) query = query.eq('branch_id', branch_id);
    if (start_date) query = query.gte('clock_in', start_date);
    if (end_date) query = query.lte('clock_in', end_date);
    if (active_only === 'true') query = query.is('clock_out', null);

    // Role-based filtering
    if (req.user.role === 'MECHANIC') {
      query = query.eq('mechanic_id', req.user.id);
    } else if (['SERVICE_ADVISOR', 'BRANCH_MANAGER'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    query = query.order('clock_in', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

    const { data: entries, error, count } = await query;
    if (error) throw error;

    res.json({
      entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active time entry for current user
router.get('/time-entries/active', authenticateToken, async (req, res) => {
  try {
    const { data: entry, error } = await supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        job_order:job_order_id(id, job_number, vehicle_plate, customer:customer_id(full_name))
      `)
      .eq('mechanic_id', req.user.id)
      .is('clock_out', null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ entry: entry || null });
  } catch (error) {
    console.error('Error fetching active time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clock in (start timer)
router.post('/time-entries/clock-in', authenticateToken, requireRole(['MECHANIC', 'SERVICE_ADVISOR', 'BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { job_order_id, work_type = 'repair', description, hourly_rate } = req.body;
    const mechanic_id = req.body.mechanic_id || req.user.id;

    // Check for existing active entry
    const { data: existing } = await supabaseAdmin
      .from('time_entries')
      .select('id')
      .eq('mechanic_id', mechanic_id)
      .is('clock_out', null)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Already clocked in. Please clock out first.' });
    }

    // Get job order details for branch_id
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .select('id, branch_id')
      .eq('id', job_order_id)
      .single();

    if (jobError) throw new Error('Job order not found');

    const { data: entry, error } = await supabaseAdmin
      .from('time_entries')
      .insert({
        job_order_id,
        mechanic_id,
        branch_id: job.branch_id,
        work_type,
        description,
        hourly_rate,
        created_by: req.user.id
      })
      .select(`
        *,
        job_order:job_order_id(id, job_number, vehicle_plate)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'TIME_CLOCK_IN',
      userId: req.user.id,
      resourceType: 'time_entry',
      resourceId: entry.id,
      details: { job_order_id, mechanic_id }
    });

    res.status(201).json({ entry });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clock out (stop timer)
router.post('/time-entries/:id/clock-out', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { break_minutes = 0, task_completed = false, description } = req.body;

    const { data: entry, error } = await supabaseAdmin
      .from('time_entries')
      .update({
        clock_out: new Date().toISOString(),
        break_minutes,
        task_completed,
        description: description || undefined
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Calculate duration
    const durationMinutes = Math.round(
      (new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000 - (break_minutes || 0)
    );

    await logAuditEvent({
      eventType: 'TIME_CLOCK_OUT',
      userId: req.user.id,
      resourceType: 'time_entry',
      resourceId: id,
      details: { duration_minutes: durationMinutes, task_completed }
    });

    res.json({ entry, duration_minutes: durationMinutes });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update time entry
router.put('/time-entries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: entry, error } = await supabaseAdmin
      .from('time_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'TIME_ENTRY_UPDATED',
      userId: req.user.id,
      resourceType: 'time_entry',
      resourceId: id,
      details: updates
    });

    res.json({ entry });
  } catch (error) {
    console.error('Error updating time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete time entry
router.delete('/time-entries/:id', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      eventType: 'TIME_ENTRY_DELETED',
      userId: req.user.id,
      resourceType: 'time_entry',
      resourceId: id
    });

    res.json({ message: 'Time entry deleted' });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PERFORMANCE METRICS ====================

// Get performance metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const { user_id, branch_id, start_date, end_date, period_type = 'daily' } = req.query;

    let query = supabaseAdmin
      .from('performance_metrics')
      .select(`
        *,
        user:user_id(id, full_name, role),
        branch:branch_id(id, name)
      `);

    if (user_id) query = query.eq('user_id', user_id);
    if (branch_id) query = query.eq('branch_id', branch_id);
    if (period_type) query = query.eq('period_type', period_type);
    if (start_date) query = query.gte('metric_date', start_date);
    if (end_date) query = query.lte('metric_date', end_date);

    // Role-based filtering
    if (req.user.role === 'MECHANIC' || req.user.role === 'SERVICE_ADVISOR') {
      query = query.eq('user_id', req.user.id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    query = query.order('metric_date', { ascending: false });

    const { data: metrics, error } = await query;
    if (error) throw error;

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate performance metrics for a user/date range
router.post('/metrics/calculate', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.body;

    // Get time entries for the period
    const { data: timeEntries, error: teError } = await supabaseAdmin
      .from('time_entries')
      .select('*')
      .eq('mechanic_id', user_id)
      .gte('clock_in', start_date)
      .lte('clock_in', end_date)
      .not('clock_out', 'is', null);

    if (teError) throw teError;

    // Calculate metrics
    const totalMinutes = timeEntries.reduce((sum, te) => {
      const duration = (new Date(te.clock_out) - new Date(te.clock_in)) / 60000 - (te.break_minutes || 0);
      return sum + duration;
    }, 0);

    const billableMinutes = timeEntries
      .filter(te => te.is_billable)
      .reduce((sum, te) => {
        const duration = (new Date(te.clock_out) - new Date(te.clock_in)) / 60000 - (te.break_minutes || 0);
        return sum + duration;
      }, 0);

    const uniqueJobs = new Set(timeEntries.map(te => te.job_order_id));

    const metrics = {
      user_id,
      branch_id: timeEntries[0]?.branch_id,
      metric_date: start_date,
      period_type: 'custom',
      total_hours_worked: (totalMinutes / 60).toFixed(2),
      billable_hours: (billableMinutes / 60).toFixed(2),
      efficiency_rate: totalMinutes > 0 ? ((billableMinutes / totalMinutes) * 100).toFixed(2) : 0,
      jobs_completed: uniqueJobs.size,
      average_job_time_minutes: uniqueJobs.size > 0 ? Math.round(totalMinutes / uniqueJobs.size) : 0
    };

    res.json({ metrics });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard summary
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const branchId = req.user.branch_id;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get today's time entries for mechanic
    let timeQuery = supabaseAdmin
      .from('time_entries')
      .select('*')
      .gte('clock_in', today);

    if (req.user.role === 'MECHANIC') {
      timeQuery = timeQuery.eq('mechanic_id', userId);
    } else if (req.user.branch_id) {
      timeQuery = timeQuery.eq('branch_id', branchId);
    }

    const { data: todayEntries } = await timeQuery;

    // Get this week's entries
    let weekQuery = supabaseAdmin
      .from('time_entries')
      .select('*')
      .gte('clock_in', weekAgo)
      .not('clock_out', 'is', null);

    if (req.user.role === 'MECHANIC') {
      weekQuery = weekQuery.eq('mechanic_id', userId);
    } else if (req.user.branch_id) {
      weekQuery = weekQuery.eq('branch_id', branchId);
    }

    const { data: weekEntries } = await weekQuery;

    // Calculate today's hours
    const todayMinutes = (todayEntries || [])
      .filter(e => e.clock_out)
      .reduce((sum, e) => {
        const duration = (new Date(e.clock_out) - new Date(e.clock_in)) / 60000 - (e.break_minutes || 0);
        return sum + duration;
      }, 0);

    // Calculate week's hours
    const weekMinutes = (weekEntries || []).reduce((sum, e) => {
      const duration = (new Date(e.clock_out) - new Date(e.clock_in)) / 60000 - (e.break_minutes || 0);
      return sum + duration;
    }, 0);

    // Get active entry
    const { data: activeEntry } = await supabaseAdmin
      .from('time_entries')
      .select(`
        *,
        job_order:job_order_id(id, job_number, vehicle_plate)
      `)
      .eq('mechanic_id', userId)
      .is('clock_out', null)
      .single();

    // Get current goals
    const { data: currentGoal } = await supabaseAdmin
      .from('performance_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('start_date', today)
      .gte('end_date', today)
      .single();

    res.json({
      today: {
        hours: (todayMinutes / 60).toFixed(2),
        entries: todayEntries?.length || 0
      },
      week: {
        hours: (weekMinutes / 60).toFixed(2),
        entries: weekEntries?.length || 0,
        jobs: new Set(weekEntries?.map(e => e.job_order_id) || []).size
      },
      activeEntry,
      currentGoal
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MECHANIC SKILLS ====================

// Get skills for a user
router.get('/skills', authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.query;

    let query = supabaseAdmin
      .from('mechanic_skills')
      .select(`
        *,
        user:user_id(id, full_name)
      `);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (req.user.role === 'MECHANIC') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: skills, error } = await query.order('skill_category');
    if (error) throw error;

    res.json({ skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add skill
router.post('/skills', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { data: skill, error } = await supabaseAdmin
      .from('mechanic_skills')
      .insert(req.body)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'SKILL_ADDED',
      userId: req.user.id,
      resourceType: 'mechanic_skill',
      resourceId: skill.id,
      details: { user_id: req.body.user_id, skill_name: req.body.skill_name }
    });

    res.status(201).json({ skill });
  } catch (error) {
    console.error('Error adding skill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update skill
router.put('/skills/:id', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: skill, error } = await supabaseAdmin
      .from('mechanic_skills')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ skill });
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete skill
router.delete('/skills/:id', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('mechanic_skills')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Skill deleted' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PERFORMANCE GOALS ====================

// Get goals
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const { user_id, status, branch_id } = req.query;

    let query = supabaseAdmin
      .from('performance_goals')
      .select(`
        *,
        user:user_id(id, full_name, role),
        branch:branch_id(id, name)
      `);

    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);
    if (branch_id) query = query.eq('branch_id', branch_id);

    // Role-based filtering
    if (req.user.role === 'MECHANIC' || req.user.role === 'SERVICE_ADVISOR') {
      query = query.eq('user_id', req.user.id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: goals, error } = await query.order('start_date', { ascending: false });
    if (error) throw error;

    res.json({ goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create goal
router.post('/goals', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const goalData = {
      ...req.body,
      created_by: req.user.id
    };

    const { data: goal, error } = await supabaseAdmin
      .from('performance_goals')
      .insert(goalData)
      .select(`
        *,
        user:user_id(id, full_name)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      eventType: 'GOAL_CREATED',
      userId: req.user.id,
      resourceType: 'performance_goal',
      resourceId: goal.id,
      details: { user_id: req.body.user_id }
    });

    res.status(201).json({ goal });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update goal
router.put('/goals/:id', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: goal, error } = await supabaseAdmin
      .from('performance_goals')
      .update(req.body)
      .eq('id', id)
      .select(`
        *,
        user:user_id(id, full_name)
      `)
      .single();

    if (error) throw error;

    res.json({ goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTS ====================

// Get mechanic leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        mechanic_id,
        mechanic:mechanic_id(id, full_name),
        clock_in,
        clock_out,
        break_minutes,
        is_billable,
        labor_cost,
        job_order_id
      `)
      .gte('clock_in', startDate)
      .lte('clock_in', endDate)
      .not('clock_out', 'is', null);

    if (branch_id) query = query.eq('branch_id', branch_id);
    else if (req.user.role === 'BRANCH_MANAGER') query = query.eq('branch_id', req.user.branch_id);

    const { data: entries, error } = await query;
    if (error) throw error;

    // Aggregate by mechanic
    const mechanicStats = {};
    entries.forEach(entry => {
      const id = entry.mechanic_id;
      if (!mechanicStats[id]) {
        mechanicStats[id] = {
          mechanic_id: id,
          mechanic_name: entry.mechanic?.full_name || 'Unknown',
          total_minutes: 0,
          billable_minutes: 0,
          total_revenue: 0,
          jobs: new Set()
        };
      }
      
      const duration = (new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000 - (entry.break_minutes || 0);
      mechanicStats[id].total_minutes += duration;
      if (entry.is_billable) mechanicStats[id].billable_minutes += duration;
      mechanicStats[id].total_revenue += parseFloat(entry.labor_cost || 0);
      mechanicStats[id].jobs.add(entry.job_order_id);
    });

    // Convert to array and calculate efficiency
    const leaderboard = Object.values(mechanicStats)
      .map(stat => ({
        ...stat,
        total_hours: (stat.total_minutes / 60).toFixed(2),
        billable_hours: (stat.billable_minutes / 60).toFixed(2),
        efficiency: stat.total_minutes > 0 ? ((stat.billable_minutes / stat.total_minutes) * 100).toFixed(1) : 0,
        jobs_completed: stat.jobs.size,
        total_revenue: stat.total_revenue.toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.billable_hours) - parseFloat(a.billable_hours));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
