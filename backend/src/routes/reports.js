import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// ==================== SALES REPORTS ====================

// Get sales summary report
router.get('/sales/summary', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const { start_date, end_date, branch_id, group_by = 'day' } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Get invoices for the period
    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id, invoice_number, invoice_date, total_amount, labor_total, parts_total,
        tax_amount, amount_paid, balance_due, status,
        branch:branch_id(id, name)
      `)
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .not('status', 'eq', 'cancelled');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: invoices, error } = await query;
    if (error) throw error;

    // Calculate totals
    const totals = {
      total_revenue: invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
      labor_revenue: invoices.reduce((sum, inv) => sum + parseFloat(inv.labor_total || 0), 0),
      parts_revenue: invoices.reduce((sum, inv) => sum + parseFloat(inv.parts_total || 0), 0),
      tax_collected: invoices.reduce((sum, inv) => sum + parseFloat(inv.tax_amount || 0), 0),
      amount_collected: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0),
      outstanding: invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0),
      invoice_count: invoices.length,
      average_ticket: invoices.length > 0 
        ? invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) / invoices.length 
        : 0
    };

    // Group by date
    const dailyData = {};
    invoices.forEach(inv => {
      const date = inv.invoice_date;
      if (!dailyData[date]) {
        dailyData[date] = { date, revenue: 0, count: 0 };
      }
      dailyData[date].revenue += parseFloat(inv.total_amount || 0);
      dailyData[date].count += 1;
    });

    // Group by branch
    const branchData = {};
    invoices.forEach(inv => {
      const branchName = inv.branch?.name || 'Unknown';
      if (!branchData[branchName]) {
        branchData[branchName] = { branch: branchName, revenue: 0, count: 0 };
      }
      branchData[branchName].revenue += parseFloat(inv.total_amount || 0);
      branchData[branchName].count += 1;
    });

    res.json({
      totals,
      daily: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
      byBranch: Object.values(branchData).sort((a, b) => b.revenue - a.revenue),
      period: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Error generating sales summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get revenue breakdown
router.get('/sales/breakdown', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Get invoice items for breakdown
    let query = supabaseAdmin
      .from('invoice_items')
      .select(`
        item_type, name, quantity, unit_price, line_total,
        invoice:invoice_id(invoice_date, branch_id, status)
      `)
      .gte('invoice.invoice_date', startDate)
      .lte('invoice.invoice_date', endDate);

    const { data: items, error } = await query;
    if (error) throw error;

    // Filter out cancelled invoices
    const validItems = items.filter(item => item.invoice?.status !== 'cancelled');

    // Group by item type
    const byType = {};
    validItems.forEach(item => {
      const type = item.item_type || 'other';
      if (!byType[type]) {
        byType[type] = { type, revenue: 0, count: 0, items: [] };
      }
      byType[type].revenue += parseFloat(item.line_total || 0);
      byType[type].count += parseInt(item.quantity || 1);
    });

    // Top selling items
    const itemSales = {};
    validItems.forEach(item => {
      const key = `${item.item_type}:${item.name}`;
      if (!itemSales[key]) {
        itemSales[key] = { name: item.name, type: item.item_type, revenue: 0, quantity: 0 };
      }
      itemSales[key].revenue += parseFloat(item.line_total || 0);
      itemSales[key].quantity += parseInt(item.quantity || 1);
    });

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    res.json({
      byType: Object.values(byType),
      topItems,
      period: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Error generating revenue breakdown:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== JOB REPORTS ====================

// Get job orders report
router.get('/jobs/summary', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('job_orders')
      .select(`
        id, job_number, status, priority, created_at, completed_at,
        branch:branch_id(id, name),
        assigned_to:assigned_to(id, full_name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    // Status breakdown
    const byStatus = {};
    jobs.forEach(job => {
      const status = job.status || 'UNKNOWN';
      if (!byStatus[status]) byStatus[status] = 0;
      byStatus[status]++;
    });

    // Priority breakdown
    const byPriority = {};
    jobs.forEach(job => {
      const priority = job.priority || 'normal';
      if (!byPriority[priority]) byPriority[priority] = 0;
      byPriority[priority]++;
    });

    // By branch
    const byBranch = {};
    jobs.forEach(job => {
      const branch = job.branch?.name || 'Unknown';
      if (!byBranch[branch]) byBranch[branch] = { branch, total: 0, completed: 0 };
      byBranch[branch].total++;
      if (job.status === 'COMPLETED') byBranch[branch].completed++;
    });

    // By mechanic
    const byMechanic = {};
    jobs.forEach(job => {
      if (job.assigned_to) {
        const name = job.assigned_to.full_name || 'Unknown';
        if (!byMechanic[name]) byMechanic[name] = { name, total: 0, completed: 0 };
        byMechanic[name].total++;
        if (job.status === 'COMPLETED') byMechanic[name].completed++;
      }
    });

    // Completion time analysis (for completed jobs)
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED' && j.completed_at);
    const avgCompletionTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const hours = (new Date(j.completed_at) - new Date(j.created_at)) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedJobs.length
      : 0;

    res.json({
      totals: {
        total_jobs: jobs.length,
        completed: jobs.filter(j => j.status === 'COMPLETED').length,
        in_progress: jobs.filter(j => j.status === 'IN_PROGRESS').length,
        pending: jobs.filter(j => !['COMPLETED', 'IN_PROGRESS'].includes(j.status)).length,
        avg_completion_hours: avgCompletionTime.toFixed(1)
      },
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })),
      byBranch: Object.values(byBranch).sort((a, b) => b.total - a.total),
      byMechanic: Object.values(byMechanic).sort((a, b) => b.completed - a.completed).slice(0, 10),
      period: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Error generating jobs summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== INVENTORY REPORTS ====================

// Get inventory value report
router.get('/inventory/value', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE', 'INVENTORY_MANAGER']), async (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = supabaseAdmin
      .from('inventory_items')
      .select(`
        id, sku, name, category, quantity, unit_cost, selling_price, reorder_level,
        branch:branch_id(id, name)
      `)
      .eq('is_active', true);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: items, error } = await query;
    if (error) throw error;

    // Calculate totals
    const totalCostValue = items.reduce((sum, item) => sum + (parseFloat(item.unit_cost || 0) * (item.quantity || 0)), 0);
    const totalRetailValue = items.reduce((sum, item) => sum + (parseFloat(item.selling_price || 0) * (item.quantity || 0)), 0);
    const potentialProfit = totalRetailValue - totalCostValue;

    // Low stock items
    const lowStock = items.filter(item => item.quantity <= item.reorder_level);

    // By category
    const byCategory = {};
    items.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { category: cat, items: 0, quantity: 0, cost_value: 0, retail_value: 0 };
      }
      byCategory[cat].items++;
      byCategory[cat].quantity += item.quantity || 0;
      byCategory[cat].cost_value += (parseFloat(item.unit_cost || 0) * (item.quantity || 0));
      byCategory[cat].retail_value += (parseFloat(item.selling_price || 0) * (item.quantity || 0));
    });

    // By branch
    const byBranch = {};
    items.forEach(item => {
      const branch = item.branch?.name || 'Unknown';
      if (!byBranch[branch]) {
        byBranch[branch] = { branch, items: 0, cost_value: 0, retail_value: 0 };
      }
      byBranch[branch].items++;
      byBranch[branch].cost_value += (parseFloat(item.unit_cost || 0) * (item.quantity || 0));
      byBranch[branch].retail_value += (parseFloat(item.selling_price || 0) * (item.quantity || 0));
    });

    res.json({
      totals: {
        total_items: items.length,
        total_quantity: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        cost_value: totalCostValue.toFixed(2),
        retail_value: totalRetailValue.toFixed(2),
        potential_profit: potentialProfit.toFixed(2),
        low_stock_count: lowStock.length
      },
      lowStock: lowStock.slice(0, 20).map(item => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        reorder_level: item.reorder_level,
        branch: item.branch?.name
      })),
      byCategory: Object.values(byCategory).sort((a, b) => b.retail_value - a.retail_value),
      byBranch: Object.values(byBranch).sort((a, b) => b.retail_value - a.retail_value)
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PERFORMANCE REPORTS ====================

// Get staff performance report
router.get('/performance/summary', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Get time entries
    let query = supabaseAdmin
      .from('time_entries')
      .select(`
        mechanic_id, clock_in, clock_out, break_minutes, is_billable, labor_cost, job_order_id,
        mechanic:mechanic_id(id, full_name, role),
        branch:branch_id(id, name)
      `)
      .gte('clock_in', startDate)
      .lte('clock_in', endDate)
      .not('clock_out', 'is', null);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    } else if (req.user.role === 'BRANCH_MANAGER') {
      query = query.eq('branch_id', req.user.branch_id);
    }

    const { data: entries, error } = await query;
    if (error) throw error;

    // Aggregate by mechanic
    const byMechanic = {};
    entries.forEach(entry => {
      const id = entry.mechanic_id;
      const duration = (new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000 - (entry.break_minutes || 0);
      
      if (!byMechanic[id]) {
        byMechanic[id] = {
          id,
          name: entry.mechanic?.full_name || 'Unknown',
          branch: entry.branch?.name || 'Unknown',
          total_minutes: 0,
          billable_minutes: 0,
          labor_revenue: 0,
          jobs: new Set()
        };
      }
      
      byMechanic[id].total_minutes += duration;
      if (entry.is_billable) byMechanic[id].billable_minutes += duration;
      byMechanic[id].labor_revenue += parseFloat(entry.labor_cost || 0);
      byMechanic[id].jobs.add(entry.job_order_id);
    });

    // Calculate metrics
    const performance = Object.values(byMechanic).map(m => ({
      ...m,
      total_hours: (m.total_minutes / 60).toFixed(1),
      billable_hours: (m.billable_minutes / 60).toFixed(1),
      efficiency: m.total_minutes > 0 ? ((m.billable_minutes / m.total_minutes) * 100).toFixed(1) : 0,
      jobs_count: m.jobs.size,
      labor_revenue: m.labor_revenue.toFixed(2)
    })).sort((a, b) => parseFloat(b.billable_hours) - parseFloat(a.billable_hours));

    // Team totals
    const teamTotals = {
      total_hours: (entries.reduce((sum, e) => {
        const duration = (new Date(e.clock_out) - new Date(e.clock_in)) / 60000 - (e.break_minutes || 0);
        return sum + duration;
      }, 0) / 60).toFixed(1),
      billable_hours: (entries.filter(e => e.is_billable).reduce((sum, e) => {
        const duration = (new Date(e.clock_out) - new Date(e.clock_in)) / 60000 - (e.break_minutes || 0);
        return sum + duration;
      }, 0) / 60).toFixed(1),
      labor_revenue: entries.reduce((sum, e) => sum + parseFloat(e.labor_cost || 0), 0).toFixed(2),
      unique_jobs: new Set(entries.map(e => e.job_order_id)).size,
      mechanic_count: Object.keys(byMechanic).length
    };

    res.json({
      teamTotals,
      byMechanic: performance,
      period: { start_date: startDate, end_date: endDate }
    });
  } catch (error) {
    console.error('Error generating performance report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXECUTIVE DASHBOARD ====================

// Get executive overview
router.get('/executive/overview', authenticateToken, requireRole(['ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0];

    // This month's invoices
    const { data: thisMonthInvoices } = await supabaseAdmin
      .from('invoices')
      .select('total_amount, amount_paid')
      .gte('invoice_date', monthStart)
      .lte('invoice_date', today)
      .not('status', 'eq', 'cancelled');

    // Last month's invoices
    const { data: lastMonthInvoices } = await supabaseAdmin
      .from('invoices')
      .select('total_amount')
      .gte('invoice_date', lastMonthStart)
      .lte('invoice_date', lastMonthEnd)
      .not('status', 'eq', 'cancelled');

    // Active jobs
    const { count: activeJobs } = await supabaseAdmin
      .from('job_orders')
      .select('id', { count: 'exact' })
      .in('status', ['ASSIGNED', 'IN_PROGRESS', 'PENDING_PARTS']);

    // Branches
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, name')
      .eq('is_active', true);

    // Calculate metrics
    const thisMonthRevenue = thisMonthInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0;
    const thisMonthCollected = thisMonthInvoices?.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0) || 0;
    const lastMonthRevenue = lastMonthInvoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0) || 0;
    
    const revenueGrowth = lastMonthRevenue > 0 
      ? (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1)
      : 0;

    res.json({
      metrics: {
        monthly_revenue: thisMonthRevenue.toFixed(2),
        monthly_collected: thisMonthCollected.toFixed(2),
        revenue_growth: revenueGrowth,
        active_jobs: activeJobs || 0,
        branch_count: branches?.length || 0
      },
      period: { start: monthStart, end: today }
    });
  } catch (error) {
    console.error('Error generating executive overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPORT ====================

// Export report as CSV (simple implementation)
router.get('/export/:type', authenticateToken, requireRole(['BRANCH_MANAGER', 'ADMIN', 'EXECUTIVE']), async (req, res) => {
  try {
    const { type } = req.params;
    const { start_date, end_date, branch_id } = req.query;

    let data = [];
    let filename = '';
    let headers = [];

    switch (type) {
      case 'sales':
        const salesQuery = supabaseAdmin
          .from('invoices')
          .select('invoice_number, invoice_date, customer_name, total_amount, amount_paid, balance_due, status')
          .gte('invoice_date', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .lte('invoice_date', end_date || new Date().toISOString().split('T')[0])
          .order('invoice_date', { ascending: false });
        
        const { data: salesData } = await salesQuery;
        data = salesData || [];
        headers = ['Invoice #', 'Date', 'Customer', 'Total', 'Paid', 'Balance', 'Status'];
        filename = 'sales_report.csv';
        break;

      case 'jobs':
        const jobsQuery = supabaseAdmin
          .from('job_orders')
          .select('job_number, created_at, status, priority, vehicle_plate')
          .gte('created_at', start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .lte('created_at', end_date || new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false });
        
        const { data: jobsData } = await jobsQuery;
        data = jobsData || [];
        headers = ['Job #', 'Created', 'Status', 'Priority', 'Vehicle'];
        filename = 'jobs_report.csv';
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Generate CSV
    const csvRows = [headers.join(',')];
    data.forEach(row => {
      const values = Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      );
      csvRows.push(values.join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csvRows.join('\n'));

    await logAuditEvent({
      eventType: 'REPORT_EXPORTED',
      userId: req.user.id,
      resourceType: 'report',
      details: { type, start_date, end_date }
    });

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
