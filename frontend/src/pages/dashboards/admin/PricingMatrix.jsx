import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiX,
  HiCurrencyDollar,
  HiCube,
  HiClock,
  HiTag,
  HiExclamation,
  HiFilter,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const CATEGORIES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'general', label: 'General' },
];

const SKILL_LEVELS = [
  { value: 'junior', label: 'Junior' },
  { value: 'standard', label: 'Standard' },
  { value: 'senior', label: 'Senior' },
  { value: 'specialist', label: 'Specialist' },
];

const RULE_TYPES = [
  { value: 'discount', label: 'Discount' },
  { value: 'markup', label: 'Markup' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'tiered', label: 'Tiered' },
];

const APPLIES_TO = [
  { value: 'labor', label: 'Labor' },
  { value: 'parts', label: 'Parts' },
  { value: 'packages', label: 'Packages' },
  { value: 'all', label: 'All' },
];

const PricingMatrix = () => {
  const { session } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState('packages');

  // Data state
  const [packages, setPackages] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchPricing, setBranchPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [isLaborRateModalOpen, setIsLaborRateModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isBranchPricingModalOpen, setIsBranchPricingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, item: null });

  // Form states
  const [packageForm, setPackageForm] = useState({
    name: '', description: '', category: 'general', base_price: '', estimated_hours: '1', is_active: true
  });
  const [laborRateForm, setLaborRateForm] = useState({
    branch_id: '', name: '', description: '', hourly_rate: '', skill_level: 'standard', is_default: false, is_active: true
  });
  const [ruleForm, setRuleForm] = useState({
    branch_id: '', name: '', description: '', rule_type: 'discount', applies_to: 'all',
    value: '', value_type: 'percentage', min_amount: '0', max_amount: '', priority: '0', is_active: true
  });
  const [branchPricingForm, setBranchPricingForm] = useState({
    branch_id: '', package_id: '', price_override: '', is_active: true
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Filter state
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch data
  const fetchPackages = async () => {
    try {
      const res = await fetch(`${API_URL}/pricing/packages`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch packages');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchLaborRates = async () => {
    try {
      const res = await fetch(`${API_URL}/pricing/labor-rates`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch labor rates');
      const data = await res.json();
      setLaborRates(data.laborRates || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchPricingRules = async () => {
    try {
      const res = await fetch(`${API_URL}/pricing/rules`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch pricing rules');
      const data = await res.json();
      setPricingRules(data.pricingRules || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_URL}/branches`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch branches');
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchBranchPricing = async () => {
    try {
      const res = await fetch(`${API_URL}/pricing/branch-packages`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch branch pricing');
      const data = await res.json();
      setBranchPricing(data.branchPackagePricing || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPackages(), fetchLaborRates(), fetchPricingRules(), fetchBranches(), fetchBranchPricing()]);
      setLoading(false);
    };
    if (session?.access_token) loadData();
  }, [session]);

  // Stats
  const stats = useMemo(() => ({
    totalPackages: packages.length,
    activePackages: packages.filter(p => p.is_active).length,
    totalLaborRates: laborRates.length,
    totalRules: pricingRules.length,
  }), [packages, laborRates, pricingRules]);

  // Filtered data
  const filteredPackages = useMemo(() => {
    return packages.filter(p => selectedCategory === 'all' || p.category === selectedCategory);
  }, [packages, selectedCategory]);

  const filteredLaborRates = useMemo(() => {
    return laborRates.filter(r => selectedBranch === 'all' || r.branch_id === selectedBranch);
  }, [laborRates, selectedBranch]);

  const filteredRules = useMemo(() => {
    return pricingRules.filter(r => selectedBranch === 'all' || r.branch_id === selectedBranch);
  }, [pricingRules, selectedBranch]);

  // PACKAGE HANDLERS
  const openAddPackageModal = () => {
    setEditingItem(null);
    setPackageForm({ name: '', description: '', category: 'general', base_price: '', estimated_hours: '1', is_active: true });
    setIsPackageModalOpen(true);
  };

  const openEditPackageModal = (pkg) => {
    setEditingItem(pkg);
    setPackageForm({
      name: pkg.name, description: pkg.description || '', category: pkg.category,
      base_price: pkg.base_price.toString(), estimated_hours: pkg.estimated_hours?.toString() || '1', is_active: pkg.is_active
    });
    setIsPackageModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem ? `${API_URL}/pricing/packages/${editingItem.id}` : `${API_URL}/pricing/packages`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...packageForm,
          base_price: parseFloat(packageForm.base_price),
          estimated_hours: parseFloat(packageForm.estimated_hours)
        })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setSuccessMessage(editingItem ? 'Package updated!' : 'Package created!');
      setIsPackageModalOpen(false);
      fetchPackages();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // LABOR RATE HANDLERS
  const openAddLaborRateModal = () => {
    setEditingItem(null);
    setLaborRateForm({ branch_id: branches[0]?.id || '', name: '', description: '', hourly_rate: '', skill_level: 'standard', is_default: false, is_active: true });
    setIsLaborRateModalOpen(true);
  };

  const openEditLaborRateModal = (rate) => {
    setEditingItem(rate);
    setLaborRateForm({
      branch_id: rate.branch_id, name: rate.name, description: rate.description || '',
      hourly_rate: rate.hourly_rate.toString(), skill_level: rate.skill_level, is_default: rate.is_default, is_active: rate.is_active
    });
    setIsLaborRateModalOpen(true);
  };

  const handleSaveLaborRate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem ? `${API_URL}/pricing/labor-rates/${editingItem.id}` : `${API_URL}/pricing/labor-rates`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...laborRateForm, hourly_rate: parseFloat(laborRateForm.hourly_rate) })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setSuccessMessage(editingItem ? 'Labor rate updated!' : 'Labor rate created!');
      setIsLaborRateModalOpen(false);
      fetchLaborRates();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // PRICING RULE HANDLERS
  const openAddRuleModal = () => {
    setEditingItem(null);
    setRuleForm({
      branch_id: branches[0]?.id || '', name: '', description: '', rule_type: 'discount', applies_to: 'all',
      value: '', value_type: 'percentage', min_amount: '0', max_amount: '', priority: '0', is_active: true
    });
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule) => {
    setEditingItem(rule);
    setRuleForm({
      branch_id: rule.branch_id, name: rule.name, description: rule.description || '', rule_type: rule.rule_type,
      applies_to: rule.applies_to, value: rule.value.toString(), value_type: rule.value_type,
      min_amount: rule.min_amount?.toString() || '0', max_amount: rule.max_amount?.toString() || '', priority: rule.priority?.toString() || '0', is_active: rule.is_active
    });
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingItem ? `${API_URL}/pricing/rules/${editingItem.id}` : `${API_URL}/pricing/rules`;
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...ruleForm,
          value: parseFloat(ruleForm.value),
          min_amount: parseFloat(ruleForm.min_amount) || 0,
          max_amount: ruleForm.max_amount ? parseFloat(ruleForm.max_amount) : null,
          priority: parseInt(ruleForm.priority) || 0
        })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setSuccessMessage(editingItem ? 'Pricing rule updated!' : 'Pricing rule created!');
      setIsRuleModalOpen(false);
      fetchPricingRules();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // BRANCH PRICING HANDLERS
  const openBranchPricingModal = () => {
    setBranchPricingForm({ branch_id: branches[0]?.id || '', package_id: packages[0]?.id || '', price_override: '', is_active: true });
    setIsBranchPricingModalOpen(true);
  };

  const handleSaveBranchPricing = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/pricing/branch-packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ ...branchPricingForm, price_override: parseFloat(branchPricingForm.price_override) })
      });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setSuccessMessage('Branch pricing saved!');
      setIsBranchPricingModalOpen(false);
      fetchBranchPricing();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  // DELETE HANDLERS
  const confirmDelete = (type, item) => {
    setDeleteTarget({ type, item });
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const { type, item } = deleteTarget;
    try {
      setSaving(true);
      let url;
      switch (type) {
        case 'package': url = `${API_URL}/pricing/packages/${item.id}`; break;
        case 'laborRate': url = `${API_URL}/pricing/labor-rates/${item.id}`; break;
        case 'rule': url = `${API_URL}/pricing/rules/${item.id}`; break;
        case 'branchPricing': url = `${API_URL}/pricing/branch-packages/${item.id}`; break;
        default: return;
      }
      const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error); }
      setSuccessMessage('Deleted successfully!');
      setShowDeleteConfirm(false);
      if (type === 'package') fetchPackages();
      else if (type === 'laborRate') fetchLaborRates();
      else if (type === 'rule') fetchPricingRules();
      else if (type === 'branchPricing') fetchBranchPricing();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Pricing Matrix</h1>
        <p className="text-gray-600">Manage service packages, labor rates, and pricing rules</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><HiX className="w-5 h-5" /></button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{successMessage}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard title="Service Packages" value={stats.totalPackages} icon={<HiCube />} />
        <MetricCard title="Active Packages" value={stats.activePackages} icon={<HiTag />} />
        <MetricCard title="Labor Rates" value={stats.totalLaborRates} icon={<HiClock />} />
        <MetricCard title="Pricing Rules" value={stats.totalRules} icon={<HiCurrencyDollar />} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'packages', label: 'Service Packages' },
            { id: 'labor', label: 'Labor Rates' },
            { id: 'rules', label: 'Pricing Rules' },
            { id: 'branch', label: 'Branch Pricing' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Service Packages</h2>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <button onClick={openAddPackageModal} className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm">
              <HiPlus className="w-4 h-4" /><span>Add Package</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Est. Hours</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPackages.map(pkg => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div><span className="font-medium">{pkg.name}</span></div>
                      {pkg.description && <div className="text-xs text-gray-500">{pkg.description}</div>}
                    </td>
                    <td className="px-4 py-3 capitalize">{pkg.category}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(pkg.base_price)}</td>
                    <td className="px-4 py-3 text-right">{pkg.estimated_hours}h</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {pkg.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => openEditPackageModal(pkg)} className="p-2 hover:bg-gray-100 rounded-lg"><HiPencil className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => confirmDelete('package', pkg)} className="p-2 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4 text-red-600" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPackages.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No packages found</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labor Rates Tab */}
      {activeTab === 'labor' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Labor Rates</h2>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={openAddLaborRateModal} className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm">
              <HiPlus className="w-4 h-4" /><span>Add Labor Rate</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill Level</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hourly Rate</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Default</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLaborRates.map(rate => (
                  <tr key={rate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{rate.branch?.name || '—'}</td>
                    <td className="px-4 py-3 font-medium">{rate.name}</td>
                    <td className="px-4 py-3 capitalize">{rate.skill_level}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(rate.hourly_rate)}/hr</td>
                    <td className="px-4 py-3 text-center">{rate.is_default && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Default</span>}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${rate.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => openEditLaborRateModal(rate)} className="p-2 hover:bg-gray-100 rounded-lg"><HiPencil className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => confirmDelete('laborRate', rate)} className="p-2 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4 text-red-600" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLaborRates.length === 0 && (<tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No labor rates found</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Rules Tab */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Pricing Rules</h2>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={openAddRuleModal} className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm">
              <HiPlus className="w-4 h-4" /><span>Add Rule</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applies To</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRules.map(rule => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{rule.branch?.name || '—'}</td>
                    <td className="px-4 py-3 font-medium">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${rule.rule_type === 'discount' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                        {rule.rule_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{rule.applies_to}</td>
                    <td className="px-4 py-3 text-right font-medium">{rule.value_type === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value)}</td>
                    <td className="px-4 py-3 text-center">{rule.priority}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => openEditRuleModal(rule)} className="p-2 hover:bg-gray-100 rounded-lg"><HiPencil className="w-4 h-4 text-gray-600" /></button>
                        <button onClick={() => confirmDelete('rule', rule)} className="p-2 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4 text-red-600" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRules.length === 0 && (<tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No pricing rules found</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branch Pricing Tab */}
      {activeTab === 'branch' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Branch Package Pricing</h2>
            <button onClick={openBranchPricingModal} className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm">
              <HiPlus className="w-4 h-4" /><span>Override Pricing</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Override Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {branchPricing.map(bp => {
                  const diff = bp.price_override - (bp.package?.base_price || 0);
                  return (
                    <tr key={bp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{bp.branch?.name || '—'}</td>
                      <td className="px-4 py-3 font-medium">{bp.package?.name || '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(bp.package?.base_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(bp.price_override)}</td>
                      <td className={`px-4 py-3 text-right ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => confirmDelete('branchPricing', bp)} className="p-2 hover:bg-red-50 rounded-lg"><HiTrash className="w-4 h-4 text-red-600" /></button>
                      </td>
                    </tr>
                  );
                })}
                {branchPricing.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No branch pricing overrides found</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl z-50">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Package' : 'Add Package'}
              </h2>
              <button
                onClick={() => setIsPackageModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePackage} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input type="text" value={packageForm.name} onChange={(e) => setPackageForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select value={packageForm.category} onChange={(e) => setPackageForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price *</label>
                  <input type="number" step="0.01" value={packageForm.base_price} onChange={(e) => setPackageForm(p => ({ ...p, base_price: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Est. Hours</label>
                  <input type="number" step="0.5" value={packageForm.estimated_hours} onChange={(e) => setPackageForm(p => ({ ...p, estimated_hours: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={packageForm.description} onChange={(e) => setPackageForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 resize-none" rows={2} />
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="pkg-active" checked={packageForm.is_active} onChange={(e) => setPackageForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                <label htmlFor="pkg-active" className="ml-2 text-sm text-gray-700">Active</label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsPackageModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Labor Rate Modal */}
      {isLaborRateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl z-50">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Labor Rate' : 'Add Labor Rate'}
              </h2>
              <button
                onClick={() => setIsLaborRateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveLaborRate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                <select value={laborRateForm.branch_id} onChange={(e) => setLaborRateForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required disabled={!!editingItem}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input type="text" value={laborRateForm.name} onChange={(e) => setLaborRateForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate *</label>
                  <input type="number" step="0.01" value={laborRateForm.hourly_rate} onChange={(e) => setLaborRateForm(p => ({ ...p, hourly_rate: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skill Level</label>
                <select value={laborRateForm.skill_level} onChange={(e) => setLaborRateForm(p => ({ ...p, skill_level: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                  {SKILL_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input type="checkbox" id="rate-default" checked={laborRateForm.is_default} onChange={(e) => setLaborRateForm(p => ({ ...p, is_default: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="rate-default" className="ml-2 text-sm text-gray-700">Default Rate</label>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="rate-active" checked={laborRateForm.is_active} onChange={(e) => setLaborRateForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="rate-active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsLaborRateModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                {editingItem ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
              </h2>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSaveRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                  <select value={ruleForm.branch_id} onChange={(e) => setRuleForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required disabled={!!editingItem}>
                    <option value="">Select branch...</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input type="text" value={ruleForm.name} onChange={(e) => setRuleForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type *</label>
                    <select value={ruleForm.rule_type} onChange={(e) => setRuleForm(p => ({ ...p, rule_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                      {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Applies To *</label>
                    <select value={ruleForm.applies_to} onChange={(e) => setRuleForm(p => ({ ...p, applies_to: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                      {APPLIES_TO.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Value *</label>
                    <input type="number" step="0.01" value={ruleForm.value} onChange={(e) => setRuleForm(p => ({ ...p, value: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Value Type *</label>
                    <select value={ruleForm.value_type} onChange={(e) => setRuleForm(p => ({ ...p, value_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                    <input type="number" step="0.01" value={ruleForm.min_amount} onChange={(e) => setRuleForm(p => ({ ...p, min_amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                    <input type="number" step="0.01" value={ruleForm.max_amount} onChange={(e) => setRuleForm(p => ({ ...p, max_amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" placeholder="No limit" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <input type="number" value={ruleForm.priority} onChange={(e) => setRuleForm(p => ({ ...p, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="rule-active" checked={ruleForm.is_active} onChange={(e) => setRuleForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="rule-active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsRuleModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Branch Pricing Modal */}
      {isBranchPricingModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-xl z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                Override Package Pricing
              </h2>
              <button
                onClick={() => setIsBranchPricingModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveBranchPricing} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch *</label>
                <select value={branchPricingForm.branch_id} onChange={(e) => setBranchPricingForm(p => ({ ...p, branch_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Package *</label>
                <select value={branchPricingForm.package_id} onChange={(e) => setBranchPricingForm(p => ({ ...p, package_id: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required>
                  <option value="">Select package...</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.base_price)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Override Price *</label>
                <input type="number" step="0.01" value={branchPricingForm.price_override} onChange={(e) => setBranchPricingForm(p => ({ ...p, price_override: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsBranchPricingModalOpen(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">
                Confirm Delete
              </h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <HiExclamation className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Item</h3>
                  <p className="text-gray-600">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingMatrix;
