import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== INVOICES ====================

// GET /api/billing/invoices - List invoices
router.get('/invoices', async (req, res) => {
  try {
    const { branch_id, status, customer_id, job_order_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('invoices')
      .select(`
        *,
        customer:customers(id, full_name, phone, email),
        branch:branches(id, name, code),
        job_order:job_orders(id, status, vehicle_plate),
        creator:users!invoices_created_by_fkey(id, full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Role-based filtering
    if (!['admin', 'executive'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    if (branch_id) query = query.eq('branch_id', branch_id);
    if (status) query = query.eq('status', status);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (job_order_id) query = query.eq('job_order_id', job_order_id);
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      invoices: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/billing/invoices/:id - Get single invoice with items and payments
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        customer:customers(id, full_name, phone, email, address),
        branch:branches(id, name, code, address, contact_phone, contact_email),
        job_order:job_orders(id, status, vehicle_plate, vehicle_vin),
        estimate:estimates(id, estimate_number),
        creator:users!invoices_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Get items
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true });

    if (itemsError) throw itemsError;

    // Get payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        received_by_user:users!payments_received_by_fkey(id, full_name),
        refunds:payment_refunds(*)
      `)
      .eq('invoice_id', id)
      .order('payment_date', { ascending: false });

    if (paymentsError) throw paymentsError;

    res.json({
      invoice: {
        ...invoice,
        items,
        payments
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/invoices - Create invoice
router.post('/invoices', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const {
      branch_id, customer_id, job_order_id, estimate_id,
      customer_name, customer_email, customer_phone, customer_address,
      vehicle_info, invoice_date, due_date,
      tax_rate, notes, terms, items = []
    } = req.body;

    const effectiveBranchId = ['admin', 'executive'].includes(req.user.role) 
      ? branch_id 
      : req.user.branch_id;

    if (!effectiveBranchId) {
      return res.status(400).json({ error: 'Branch ID is required' });
    }

    // Calculate totals from items
    let laborTotal = 0;
    let partsTotal = 0;
    let discountTotal = 0;

    items.forEach(item => {
      const lineTotal = (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0) - (parseFloat(item.discount_amount) || 0);
      if (item.item_type === 'labor') laborTotal += lineTotal;
      else if (item.item_type === 'discount') discountTotal += Math.abs(lineTotal);
      else partsTotal += lineTotal;
    });

    const subtotal = laborTotal + partsTotal - discountTotal;
    const taxAmount = subtotal * (parseFloat(tax_rate) || 0);
    const totalAmount = subtotal + taxAmount;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        branch_id: effectiveBranchId,
        customer_id,
        job_order_id,
        estimate_id,
        invoice_number: '', // Auto-generated
        customer_name,
        customer_email,
        customer_phone,
        customer_address,
        vehicle_info,
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        due_date,
        labor_total: laborTotal,
        parts_total: partsTotal,
        discount_amount: discountTotal,
        subtotal,
        tax_rate: parseFloat(tax_rate) || 0,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        notes,
        terms,
        created_by: req.user.id
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Add items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
        item_type: item.item_type,
        job_estimate_id: item.job_estimate_id,
        inventory_item_id: item.inventory_item_id,
        name: item.name,
        description: item.description,
        sku: item.sku,
        quantity: parseFloat(item.quantity) || 1,
        unit_price: parseFloat(item.unit_price) || 0,
        discount_percent: parseFloat(item.discount_percent) || 0,
        discount_amount: parseFloat(item.discount_amount) || 0,
        line_total: item.item_type === 'discount' 
          ? -Math.abs((parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0))
          : (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0) - (parseFloat(item.discount_amount) || 0),
        is_taxable: item.is_taxable !== false,
        sort_order: index
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    await logAuditEvent({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: invoice.id,
      entityName: invoice.invoice_number,
      details: { customer_id, job_order_id, total_amount: totalAmount }
    });

    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/invoices/from-job/:jobId - Create invoice from job order
router.post('/invoices/from-job/:jobId', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { tax_rate = 0.08, due_days = 30, notes, terms } = req.body;

    // Get job order with customer and estimates
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job_orders')
      .select(`
        *,
        customer:customers(id, full_name, phone, email, address),
        branch:branches(id, name),
        estimates:job_estimates(*)
      `)
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;
    if (!job) return res.status(404).json({ error: 'Job order not found' });

    // Check if job is complete
    if (!['COMPLETED', 'CLOSED'].includes(job.status)) {
      return res.status(400).json({ error: 'Job order must be completed before invoicing' });
    }

    // Prepare vehicle info
    const vehicleInfo = [job.vehicle_plate, job.vehicle_vin].filter(Boolean).join(' | ');

    // Convert job estimates to invoice items
    const items = (job.estimates || []).map(est => ({
      item_type: est.item_type.toLowerCase(),
      job_estimate_id: est.id,
      name: est.item_name,
      quantity: est.quantity,
      unit_price: parseFloat(est.unit_price),
      line_total: parseFloat(est.total_price)
    }));

    // Calculate totals
    let laborTotal = 0;
    let partsTotal = 0;

    items.forEach(item => {
      if (item.item_type === 'labor') laborTotal += item.line_total;
      else partsTotal += item.line_total;
    });

    const subtotal = laborTotal + partsTotal;
    const taxAmount = subtotal * parseFloat(tax_rate);
    const totalAmount = subtotal + taxAmount;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(due_days));

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        branch_id: job.branch_id,
        customer_id: job.customer_id,
        job_order_id: job.id,
        invoice_number: '',
        customer_name: job.customer?.full_name,
        customer_email: job.customer?.email,
        customer_phone: job.customer?.phone,
        customer_address: job.customer?.address,
        vehicle_info: vehicleInfo,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        labor_total: laborTotal,
        parts_total: partsTotal,
        discount_amount: 0,
        subtotal,
        tax_rate: parseFloat(tax_rate),
        tax_amount: taxAmount,
        total_amount: totalAmount,
        balance_due: totalAmount,
        notes,
        terms,
        created_by: req.user.id
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Add items
    if (items.length > 0) {
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
        item_type: item.item_type,
        job_estimate_id: item.job_estimate_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
        is_taxable: true,
        sort_order: index
      }));

      await supabaseAdmin.from('invoice_items').insert(itemsToInsert);
    }

    await logAuditEvent({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'invoice',
      entityId: invoice.id,
      entityName: invoice.invoice_number,
      details: { from_job_order: jobId, total_amount: totalAmount }
    });

    res.status(201).json({ invoice });
  } catch (error) {
    console.error('Error creating invoice from job:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/billing/invoices/:id - Update invoice
router.put('/invoices/:id', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_email, customer_phone, customer_address,
      vehicle_info, due_date, notes, terms } = req.body;

    // Check if invoice can be edited
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('status')
      .eq('id', id)
      .single();

    if (existing && ['paid', 'cancelled', 'refunded'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot edit a paid, cancelled, or refunded invoice' });
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        customer_name, customer_email, customer_phone, customer_address,
        vehicle_info, due_date, notes, terms
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'invoice',
      entityId: data.id,
      entityName: data.invoice_number,
      details: {}
    });

    res.json({ invoice: data });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/invoices/:id/send - Mark invoice as sent
router.post('/invoices/:id/send', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(400).json({ error: 'Invoice not found or already sent' });

    await logAuditEvent({
      userId: req.user.id,
      action: 'SEND',
      entityType: 'invoice',
      entityId: data.id,
      entityName: data.invoice_number,
      details: {}
    });

    res.json({ invoice: data });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/invoices/:id/cancel - Cancel invoice
router.post('/invoices/:id/cancel', requireRole(['admin', 'executive', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('status, invoice_number, amount_paid')
      .eq('id', id)
      .single();

    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    if (['paid', 'cancelled', 'refunded'].includes(existing.status)) {
      return res.status(400).json({ error: 'Cannot cancel this invoice' });
    }
    if (parseFloat(existing.amount_paid) > 0) {
      return res.status(400).json({ error: 'Cannot cancel invoice with payments. Process refund first.' });
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'CANCEL',
      entityType: 'invoice',
      entityId: data.id,
      entityName: data.invoice_number,
      details: { reason }
    });

    res.json({ invoice: data });
  } catch (error) {
    console.error('Error cancelling invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENTS ====================

// GET /api/billing/payments - List payments
router.get('/payments', async (req, res) => {
  try {
    const { branch_id, invoice_id, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('payments')
      .select(`
        *,
        invoice:invoices(id, invoice_number, customer_name, total_amount),
        branch:branches(id, name),
        received_by_user:users!payments_received_by_fkey(id, full_name)
      `, { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!['admin', 'executive'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    }

    if (branch_id) query = query.eq('branch_id', branch_id);
    if (invoice_id) query = query.eq('invoice_id', invoice_id);
    if (from_date) query = query.gte('payment_date', from_date);
    if (to_date) query = query.lte('payment_date', to_date);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      payments: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/payments - Record payment
router.post('/payments', requireRole(['admin', 'executive', 'manager', 'service_advisor']), async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, payment_date, reference_number, authorization_code, notes } = req.body;

    if (!invoice_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'Invoice ID, amount, and payment method are required' });
    }

    // Get invoice
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('branch_id, balance_due, status, invoice_number')
      .eq('id', invoice_id)
      .single();

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (['cancelled', 'refunded'].includes(invoice.status)) {
      return res.status(400).json({ error: 'Cannot add payment to cancelled or refunded invoice' });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount > parseFloat(invoice.balance_due)) {
      return res.status(400).json({ error: 'Payment amount exceeds balance due' });
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert({
        invoice_id,
        branch_id: invoice.branch_id,
        payment_number: '',
        amount: paymentAmount,
        payment_method,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        reference_number,
        authorization_code,
        notes,
        received_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'payment',
      entityId: data.id,
      entityName: data.payment_number,
      details: { invoice_id, amount: paymentAmount, method: payment_method }
    });

    res.status(201).json({ payment: data });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/billing/payments/:id/refund - Process refund
router.post('/payments/:id/refund', requireRole(['admin', 'executive', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({ error: 'Amount and reason are required' });
    }

    // Get payment
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('amount, invoice_id, payment_number')
      .eq('id', id)
      .single();

    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    // Calculate total refunds for this payment
    const { data: existingRefunds } = await supabaseAdmin
      .from('payment_refunds')
      .select('amount')
      .eq('payment_id', id);

    const totalRefunded = (existingRefunds || []).reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const availableToRefund = parseFloat(payment.amount) - totalRefunded;

    if (parseFloat(amount) > availableToRefund) {
      return res.status(400).json({ error: `Refund amount exceeds available amount (${availableToRefund.toFixed(2)})` });
    }

    const { data, error } = await supabaseAdmin
      .from('payment_refunds')
      .insert({
        payment_id: id,
        invoice_id: payment.invoice_id,
        amount: parseFloat(amount),
        reason,
        refunded_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user.id,
      action: 'REFUND',
      entityType: 'payment',
      entityId: id,
      entityName: payment.payment_number,
      details: { refund_amount: parseFloat(amount), reason }
    });

    res.status(201).json({ refund: data });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SALES REPORTS ====================

// GET /api/billing/sales/summary - Get sales summary
router.get('/sales/summary', async (req, res) => {
  try {
    const { branch_id, from_date, to_date, group_by = 'day' } = req.query;

    const fromDate = from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to_date || new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('invoices')
      .select('invoice_date, branch_id, branches(name), total_amount, labor_total, parts_total, amount_paid, status')
      .gte('invoice_date', fromDate)
      .lte('invoice_date', toDate)
      .not('status', 'in', '("draft","cancelled")');

    if (!['admin', 'executive'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    } else if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Group data
    const summary = {};
    (data || []).forEach(inv => {
      const key = group_by === 'month' 
        ? inv.invoice_date.substring(0, 7)
        : inv.invoice_date;

      if (!summary[key]) {
        summary[key] = {
          date: key,
          invoice_count: 0,
          total_revenue: 0,
          labor_revenue: 0,
          parts_revenue: 0,
          amount_collected: 0
        };
      }

      summary[key].invoice_count++;
      summary[key].total_revenue += parseFloat(inv.total_amount) || 0;
      summary[key].labor_revenue += parseFloat(inv.labor_total) || 0;
      summary[key].parts_revenue += parseFloat(inv.parts_total) || 0;
      summary[key].amount_collected += parseFloat(inv.amount_paid) || 0;
    });

    const sortedSummary = Object.values(summary).sort((a, b) => a.date.localeCompare(b.date));

    // Totals
    const totals = sortedSummary.reduce((acc, day) => ({
      invoice_count: acc.invoice_count + day.invoice_count,
      total_revenue: acc.total_revenue + day.total_revenue,
      labor_revenue: acc.labor_revenue + day.labor_revenue,
      parts_revenue: acc.parts_revenue + day.parts_revenue,
      amount_collected: acc.amount_collected + day.amount_collected
    }), { invoice_count: 0, total_revenue: 0, labor_revenue: 0, parts_revenue: 0, amount_collected: 0 });

    res.json({
      summary: sortedSummary,
      totals,
      period: { from_date: fromDate, to_date: toDate }
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/billing/sales/outstanding - Get outstanding invoices
router.get('/sales/outstanding', async (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = supabaseAdmin
      .from('invoices')
      .select(`
        id, invoice_number, customer_name, invoice_date, due_date, 
        total_amount, balance_due, status,
        branch:branches(id, name)
      `)
      .gt('balance_due', 0)
      .not('status', 'in', '("draft","cancelled","refunded")')
      .order('due_date', { ascending: true });

    if (!['admin', 'executive'].includes(req.user.role)) {
      query = query.eq('branch_id', req.user.branch_id);
    } else if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Calculate aging
    const today = new Date();
    const aging = {
      current: [],
      overdue_1_30: [],
      overdue_31_60: [],
      overdue_61_90: [],
      overdue_90_plus: []
    };

    (data || []).forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      inv.days_overdue = Math.max(0, daysOverdue);

      if (daysOverdue <= 0) aging.current.push(inv);
      else if (daysOverdue <= 30) aging.overdue_1_30.push(inv);
      else if (daysOverdue <= 60) aging.overdue_31_60.push(inv);
      else if (daysOverdue <= 90) aging.overdue_61_90.push(inv);
      else aging.overdue_90_plus.push(inv);
    });

    const summary = {
      current: aging.current.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0),
      overdue_1_30: aging.overdue_1_30.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0),
      overdue_31_60: aging.overdue_31_60.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0),
      overdue_61_90: aging.overdue_61_90.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0),
      overdue_90_plus: aging.overdue_90_plus.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0),
      total: data?.reduce((sum, inv) => sum + parseFloat(inv.balance_due), 0) || 0
    };

    res.json({
      invoices: data,
      aging,
      summary
    });
  } catch (error) {
    console.error('Error fetching outstanding invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
