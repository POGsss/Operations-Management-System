import express from 'express';
import { supabaseAdmin } from '../db/index.js';
import { authenticateToken, requireRole } from '../middlewares/auth.js';
import { logAuditEvent } from '../utils/auditLog.js';

const router = express.Router();

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
// SERVICE PACKAGES ENDPOINTS
// ==========================================

// GET /api/pricing/packages - List all service packages
router.get('/packages', authenticateToken, async (req, res) => {
  try {
    const { category, active_only } = req.query;

    let query = supabaseAdmin
      .from('service_packages')
      .select(`
        *,
        items:service_package_items(*)
      `)
      .order('category')
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ packages: data || [] });
  } catch (err) {
    console.error('Fetch packages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/packages/:id - Get single package
router.get('/packages/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .select(`
        *,
        items:service_package_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({ package: data });
  } catch (err) {
    console.error('Fetch package error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/packages - Create package (Admin only)
router.post('/packages', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, category, base_price, estimated_hours, is_active = true, items = [] } = req.body;

    if (!name || !category || base_price === undefined) {
      return res.status(400).json({ error: 'Name, category, and base_price are required' });
    }

    // Create package
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('service_packages')
      .insert([{ name, description, category, base_price, estimated_hours, is_active }])
      .select()
      .single();

    if (pkgError) throw pkgError;

    // Add items if provided
    if (items.length > 0) {
      const itemsWithPackageId = items.map(item => ({
        ...item,
        package_id: pkg.id
      }));

      await supabaseAdmin
        .from('service_package_items')
        .insert(itemsWithPackageId);
    }

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'SERVICE_PACKAGE',
      entityId: pkg.id,
      entityName: name,
      details: { category, base_price }
    });

    res.status(201).json({ package: pkg });
  } catch (err) {
    console.error('Create package error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pricing/packages/:id - Update package (Admin only)
router.put('/packages/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, category, base_price, estimated_hours, is_active } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (base_price !== undefined) updates.base_price = base_price;
    if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'SERVICE_PACKAGE',
      entityId: id,
      entityName: data.name,
      details: updates
    });

    res.json({ package: data });
  } catch (err) {
    console.error('Update package error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pricing/packages/:id - Delete package (Admin only)
router.delete('/packages/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('service_packages')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('service_packages')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'SERVICE_PACKAGE',
      entityId: id,
      entityName: existing?.name || 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete package error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// LABOR RATES ENDPOINTS
// ==========================================

// GET /api/pricing/labor-rates - List labor rates
router.get('/labor-rates', authenticateToken, async (req, res) => {
  try {
    const { branch_id, active_only } = req.query;

    let query = supabaseAdmin
      .from('labor_rates')
      .select(`
        *,
        branch:branches(id, name, code)
      `)
      .order('branch_id')
      .order('name');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ laborRates: data || [] });
  } catch (err) {
    console.error('Fetch labor rates error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/labor-rates - Create labor rate (Admin only)
router.post('/labor-rates', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { branch_id, name, description, hourly_rate, skill_level = 'standard', is_default = false, is_active = true } = req.body;

    if (!branch_id || !name || hourly_rate === undefined) {
      return res.status(400).json({ error: 'branch_id, name, and hourly_rate are required' });
    }

    // If this is default, unset other defaults for this branch
    if (is_default) {
      await supabaseAdmin
        .from('labor_rates')
        .update({ is_default: false })
        .eq('branch_id', branch_id);
    }

    const { data, error } = await supabaseAdmin
      .from('labor_rates')
      .insert([{ branch_id, name, description, hourly_rate, skill_level, is_default, is_active }])
      .select(`*, branch:branches(id, name, code)`)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'LABOR_RATE',
      entityId: data.id,
      entityName: name,
      details: { branch_id, hourly_rate, skill_level }
    });

    res.status(201).json({ laborRate: data });
  } catch (err) {
    console.error('Create labor rate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pricing/labor-rates/:id - Update labor rate (Admin only)
router.put('/labor-rates/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, hourly_rate, skill_level, is_default, is_active } = req.body;

    // Get current labor rate to check branch_id
    const { data: current } = await supabaseAdmin
      .from('labor_rates')
      .select('branch_id')
      .eq('id', id)
      .single();

    // If setting as default, unset other defaults for this branch
    if (is_default && current?.branch_id) {
      await supabaseAdmin
        .from('labor_rates')
        .update({ is_default: false })
        .eq('branch_id', current.branch_id)
        .neq('id', id);
    }

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (hourly_rate !== undefined) updates.hourly_rate = hourly_rate;
    if (skill_level !== undefined) updates.skill_level = skill_level;
    if (is_default !== undefined) updates.is_default = is_default;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('labor_rates')
      .update(updates)
      .eq('id', id)
      .select(`*, branch:branches(id, name, code)`)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'LABOR_RATE',
      entityId: id,
      entityName: data.name,
      details: updates
    });

    res.json({ laborRate: data });
  } catch (err) {
    console.error('Update labor rate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pricing/labor-rates/:id - Delete labor rate (Admin only)
router.delete('/labor-rates/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('labor_rates')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('labor_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'LABOR_RATE',
      entityId: id,
      entityName: existing?.name || 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete labor rate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PRICING RULES ENDPOINTS
// ==========================================

// GET /api/pricing/rules - List pricing rules
router.get('/rules', authenticateToken, async (req, res) => {
  try {
    const { branch_id, active_only, rule_type } = req.query;

    let query = supabaseAdmin
      .from('pricing_rules')
      .select(`
        *,
        branch:branches(id, name, code)
      `)
      .order('priority', { ascending: false })
      .order('name');

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }
    if (active_only === 'true') {
      query = query.eq('is_active', true);
    }
    if (rule_type) {
      query = query.eq('rule_type', rule_type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ pricingRules: data || [] });
  } catch (err) {
    console.error('Fetch pricing rules error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/rules - Create pricing rule (Admin only)
router.post('/rules', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      branch_id,
      name,
      description,
      rule_type,
      applies_to,
      value,
      value_type,
      min_amount = 0,
      max_amount,
      priority = 0,
      is_active = true,
      valid_from,
      valid_until
    } = req.body;

    if (!branch_id || !name || !rule_type || !applies_to || value === undefined || !value_type) {
      return res.status(400).json({ error: 'branch_id, name, rule_type, applies_to, value, and value_type are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('pricing_rules')
      .insert([{
        branch_id,
        name,
        description,
        rule_type,
        applies_to,
        value,
        value_type,
        min_amount,
        max_amount,
        priority,
        is_active,
        valid_from,
        valid_until
      }])
      .select(`*, branch:branches(id, name, code)`)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'CREATE',
      entityType: 'PRICING_RULE',
      entityId: data.id,
      entityName: name,
      details: { branch_id, rule_type, applies_to, value, value_type }
    });

    res.status(201).json({ pricingRule: data });
  } catch (err) {
    console.error('Create pricing rule error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pricing/rules/:id - Update pricing rule (Admin only)
router.put('/rules/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name,
      description,
      rule_type,
      applies_to,
      value,
      value_type,
      min_amount,
      max_amount,
      priority,
      is_active,
      valid_from,
      valid_until
    } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (rule_type !== undefined) updates.rule_type = rule_type;
    if (applies_to !== undefined) updates.applies_to = applies_to;
    if (value !== undefined) updates.value = value;
    if (value_type !== undefined) updates.value_type = value_type;
    if (min_amount !== undefined) updates.min_amount = min_amount;
    if (max_amount !== undefined) updates.max_amount = max_amount;
    if (priority !== undefined) updates.priority = priority;
    if (is_active !== undefined) updates.is_active = is_active;
    if (valid_from !== undefined) updates.valid_from = valid_from;
    if (valid_until !== undefined) updates.valid_until = valid_until;

    const { data, error } = await supabaseAdmin
      .from('pricing_rules')
      .update(updates)
      .eq('id', id)
      .select(`*, branch:branches(id, name, code)`)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPDATE',
      entityType: 'PRICING_RULE',
      entityId: id,
      entityName: data.name,
      details: updates
    });

    res.json({ pricingRule: data });
  } catch (err) {
    console.error('Update pricing rule error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pricing/rules/:id - Delete pricing rule (Admin only)
router.delete('/rules/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('pricing_rules')
      .select('name')
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('pricing_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'PRICING_RULE',
      entityId: id,
      entityName: existing?.name || 'Unknown'
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete pricing rule error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BRANCH PACKAGE PRICING ENDPOINTS
// ==========================================

// GET /api/pricing/branch-packages - List branch package pricing
router.get('/branch-packages', authenticateToken, async (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = supabaseAdmin
      .from('branch_package_pricing')
      .select(`
        *,
        branch:branches(id, name, code),
        package:service_packages(id, name, base_price, category)
      `);

    if (branch_id) {
      query = query.eq('branch_id', branch_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ branchPackagePricing: data || [] });
  } catch (err) {
    console.error('Fetch branch package pricing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pricing/branch-packages - Create/Update branch package pricing (Admin only)
router.post('/branch-packages', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { branch_id, package_id, price_override, is_active = true } = req.body;

    if (!branch_id || !package_id || price_override === undefined) {
      return res.status(400).json({ error: 'branch_id, package_id, and price_override are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('branch_package_pricing')
      .upsert([{ branch_id, package_id, price_override, is_active, updated_at: new Date().toISOString() }], {
        onConflict: 'branch_id,package_id'
      })
      .select(`
        *,
        branch:branches(id, name, code),
        package:service_packages(id, name, base_price, category)
      `)
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'UPSERT',
      entityType: 'BRANCH_PACKAGE_PRICING',
      entityId: data.id,
      entityName: `${data.branch?.name} - ${data.package?.name}`,
      details: { branch_id, package_id, price_override }
    });

    res.status(201).json({ branchPackagePricing: data });
  } catch (err) {
    console.error('Create branch package pricing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pricing/branch-packages/:id - Delete branch package pricing (Admin only)
router.delete('/branch-packages/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('branch_package_pricing')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'DELETE',
      entityType: 'BRANCH_PACKAGE_PRICING',
      entityId: id
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete branch package pricing error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PRICE CALCULATOR ENDPOINT
// ==========================================

// POST /api/pricing/calculate - Calculate price for items
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserWithBranch(userId);
    const { branch_id, items } = req.body;

    const targetBranchId = branch_id || user.branch_id;

    if (!targetBranchId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'branch_id and items array are required' });
    }

    // Get labor rates for branch
    const { data: laborRates } = await supabaseAdmin
      .from('labor_rates')
      .select('*')
      .eq('branch_id', targetBranchId)
      .eq('is_active', true);

    const defaultLaborRate = laborRates?.find(r => r.is_default) || laborRates?.[0];

    // Get pricing rules for branch
    const { data: pricingRules } = await supabaseAdmin
      .from('pricing_rules')
      .select('*')
      .eq('branch_id', targetBranchId)
      .eq('is_active', true)
      .or('valid_from.is.null,valid_from.lte.now()')
      .or('valid_until.is.null,valid_until.gte.now()')
      .order('priority', { ascending: false });

    // Calculate each item
    const calculatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      let unitPrice = item.unit_price || 0;
      let calculatedPrice = unitPrice * (item.quantity || 1);

      // Apply labor rate for labor items
      if (item.item_type === 'LABOR' && defaultLaborRate && item.hours) {
        unitPrice = defaultLaborRate.hourly_rate;
        calculatedPrice = unitPrice * item.hours;
      }

      // Apply package pricing for packages
      if (item.item_type === 'PACKAGE' && item.package_id) {
        const { data: branchPricing } = await supabaseAdmin
          .from('branch_package_pricing')
          .select('price_override')
          .eq('branch_id', targetBranchId)
          .eq('package_id', item.package_id)
          .eq('is_active', true)
          .single();

        if (branchPricing) {
          unitPrice = branchPricing.price_override;
          calculatedPrice = unitPrice * (item.quantity || 1);
        }
      }

      calculatedItems.push({
        ...item,
        unit_price: unitPrice,
        total_price: calculatedPrice
      });

      subtotal += calculatedPrice;
    }

    // Apply pricing rules
    let totalDiscount = 0;
    let totalMarkup = 0;
    const appliedRules = [];

    for (const rule of pricingRules || []) {
      if (subtotal < rule.min_amount) continue;
      if (rule.max_amount && subtotal > rule.max_amount) continue;

      let ruleAmount = 0;
      if (rule.value_type === 'percentage') {
        ruleAmount = subtotal * (rule.value / 100);
      } else {
        ruleAmount = rule.value;
      }

      if (rule.rule_type === 'discount') {
        totalDiscount += ruleAmount;
        appliedRules.push({ ...rule, amount: -ruleAmount });
      } else if (rule.rule_type === 'markup') {
        totalMarkup += ruleAmount;
        appliedRules.push({ ...rule, amount: ruleAmount });
      }
    }

    const total = subtotal - totalDiscount + totalMarkup;

    res.json({
      items: calculatedItems,
      subtotal,
      discount: totalDiscount,
      markup: totalMarkup,
      total,
      appliedRules,
      laborRate: defaultLaborRate
    });
  } catch (err) {
    console.error('Calculate price error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pricing/categories - Get unique package categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('service_packages')
      .select('category')
      .order('category');

    if (error) throw error;

    const categories = [...new Set(data.map(p => p.category))];

    res.json({ categories });
  } catch (err) {
    console.error('Fetch categories error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
