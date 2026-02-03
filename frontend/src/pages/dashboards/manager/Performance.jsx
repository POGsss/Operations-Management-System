import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';
import {
  HiPlus,
  HiPencil,
  HiX,
  HiClock,
  HiTrendingUp,
  HiChartBar,
  HiAcademicCap,
  HiRefresh,
  HiCalendar,
  HiCheckCircle,
  HiStar,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const Performance = () => {
  const { session, user } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState('leaderboard');

  // Data
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [selectedMechanic, setSelectedMechanic] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);

  // Forms
  const [goalForm, setGoalForm] = useState({
    user_id: '', start_date: '', end_date: '',
    hours_target: '', revenue_target: '', jobs_target: '', efficiency_target: '', notes: ''
  });
  const [skillForm, setSkillForm] = useState({
    user_id: '', skill_name: '', skill_category: '', proficiency_level: 3,
    certified: false, certification_number: '', certification_date: '', expiry_date: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end
      });
      const res = await fetch(`${API_URL}/performance/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  // Fetch time entries
  const fetchTimeEntries = async () => {
    try {
      const params = new URLSearchParams({ start_date: dateRange.start, end_date: dateRange.end, limit: '100' });
      if (selectedMechanic) params.append('mechanic_id', selectedMechanic);

      const res = await fetch(`${API_URL}/performance/time-entries?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch time entries');
      const data = await res.json();
      setTimeEntries(data.entries || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
    }
  };

  // Fetch mechanics (users with MECHANIC role)
  const fetchMechanics = async () => {
    try {
      // For now, get from leaderboard data or use a users endpoint if available
      // This is a simplified approach
    } catch (err) {
      console.error('Error fetching mechanics:', err);
    }
  };

  // Fetch goals
  const fetchGoals = async () => {
    try {
      const res = await fetch(`${API_URL}/performance/goals`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch goals');
      const data = await res.json();
      setGoals(data.goals || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
    }
  };

  // Fetch skills
  const fetchSkills = async () => {
    try {
      const params = selectedMechanic ? `?user_id=${selectedMechanic}` : '';
      const res = await fetch(`${API_URL}/performance/skills${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch skills');
      const data = await res.json();
      setSkills(data.skills || []);
    } catch (err) {
      console.error('Error fetching skills:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      setLoading(true);
      Promise.all([fetchLeaderboard(), fetchTimeEntries(), fetchGoals(), fetchSkills()])
        .finally(() => setLoading(false));
    }
  }, [session, dateRange]);

  useEffect(() => {
    if (session?.access_token && activeTab === 'time-entries') {
      fetchTimeEntries();
    }
    if (session?.access_token && activeTab === 'skills') {
      fetchSkills();
    }
  }, [selectedMechanic]);

  // Stats
  const stats = useMemo(() => {
    const totalHours = leaderboard.reduce((sum, m) => sum + parseFloat(m.billable_hours || 0), 0);
    const totalJobs = leaderboard.reduce((sum, m) => sum + (m.jobs_completed || 0), 0);
    const avgEfficiency = leaderboard.length > 0 
      ? (leaderboard.reduce((sum, m) => sum + parseFloat(m.efficiency || 0), 0) / leaderboard.length).toFixed(1)
      : 0;
    const totalRevenue = leaderboard.reduce((sum, m) => sum + parseFloat(m.total_revenue || 0), 0);
    return { totalHours: totalHours.toFixed(1), totalJobs, avgEfficiency, totalRevenue: totalRevenue.toFixed(2) };
  }, [leaderboard]);

  // Save goal
  const handleSaveGoal = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingGoal
        ? `${API_URL}/performance/goals/${editingGoal.id}`
        : `${API_URL}/performance/goals`;
      const method = editingGoal ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          ...goalForm,
          branch_id: user.branch_id,
          hours_target: parseFloat(goalForm.hours_target) || null,
          revenue_target: parseFloat(goalForm.revenue_target) || null,
          jobs_target: parseInt(goalForm.jobs_target) || null,
          efficiency_target: parseFloat(goalForm.efficiency_target) || null
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage(editingGoal ? 'Goal updated!' : 'Goal created!');
      setShowGoalModal(false);
      setEditingGoal(null);
      fetchGoals();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save skill
  const handleSaveSkill = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingSkill
        ? `${API_URL}/performance/skills/${editingSkill.id}`
        : `${API_URL}/performance/skills`;
      const method = editingSkill ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(skillForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSuccessMessage(editingSkill ? 'Skill updated!' : 'Skill added!');
      setShowSkillModal(false);
      setEditingSkill(null);
      fetchSkills();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete skill
  const handleDeleteSkill = async (id) => {
    if (!confirm('Delete this skill?')) return;
    try {
      const res = await fetch(`${API_URL}/performance/skills/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchSkills();
    } catch (err) {
      setError(err.message);
    }
  };

  // Open edit goal
  const openEditGoal = (goal) => {
    setEditingGoal(goal);
    setGoalForm({
      user_id: goal.user_id,
      start_date: goal.start_date,
      end_date: goal.end_date,
      hours_target: goal.hours_target?.toString() || '',
      revenue_target: goal.revenue_target?.toString() || '',
      jobs_target: goal.jobs_target?.toString() || '',
      efficiency_target: goal.efficiency_target?.toString() || '',
      notes: goal.notes || ''
    });
    setShowGoalModal(true);
  };

  // Open add goal
  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({
      user_id: '', start_date: '', end_date: '',
      hours_target: '', revenue_target: '', jobs_target: '', efficiency_target: '', notes: ''
    });
    setShowGoalModal(true);
  };

  // Open edit skill
  const openEditSkill = (skill) => {
    setEditingSkill(skill);
    setSkillForm({
      user_id: skill.user_id,
      skill_name: skill.skill_name,
      skill_category: skill.skill_category || '',
      proficiency_level: skill.proficiency_level || 3,
      certified: skill.certified || false,
      certification_number: skill.certification_number || '',
      certification_date: skill.certification_date || '',
      expiry_date: skill.expiry_date || '',
      notes: skill.notes || ''
    });
    setShowSkillModal(true);
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—';
  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Performance Management</h1>
          <p className="text-gray-600">Track and manage team performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(d => ({ ...d, start: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(d => ({ ...d, end: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button onClick={fetchLeaderboard} className="p-2 hover:bg-gray-100 rounded-lg">
            <HiRefresh className="w-5 h-5" />
          </button>
        </div>
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
        <MetricCard title="Total Billable Hours" value={`${stats.totalHours}h`} icon={<HiClock />} />
        <MetricCard title="Jobs Completed" value={stats.totalJobs.toString()} icon={<HiCheckCircle />} />
        <MetricCard title="Avg Efficiency" value={`${stats.avgEfficiency}%`} icon={<HiTrendingUp />} />
        <MetricCard title="Labor Revenue" value={formatCurrency(stats.totalRevenue)} icon={<HiChartBar />} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'leaderboard', label: 'Leaderboard', icon: HiStar },
            { id: 'time-entries', label: 'Time Entries', icon: HiClock },
            { id: 'goals', label: 'Goals', icon: HiCalendar },
            { id: 'skills', label: 'Skills & Certs', icon: HiAcademicCap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mechanic</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Billable Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jobs</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaderboard.map((mechanic, index) => (
                <tr key={mechanic.mechanic_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{mechanic.mechanic_name}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{mechanic.billable_hours}h</td>
                  <td className="px-4 py-3 text-right text-gray-600">{mechanic.total_hours}h</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      parseFloat(mechanic.efficiency) >= 80 ? 'bg-green-100 text-green-700' :
                      parseFloat(mechanic.efficiency) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {mechanic.efficiency}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{mechanic.jobs_completed}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(mechanic.total_revenue)}</td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No data for selected period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Time Entries Tab */}
      {activeTab === 'time-entries' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Mechanics</option>
              {leaderboard.map(m => (
                <option key={m.mechanic_id} value={m.mechanic_id}>{m.mechanic_name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mechanic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {timeEntries.map(entry => {
                  const duration = entry.clock_out 
                    ? Math.round((new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000 - (entry.break_minutes || 0))
                    : null;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{formatDate(entry.clock_in)}</td>
                      <td className="px-4 py-3 font-medium">{entry.mechanic?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <div>{entry.job_order?.job_number || '—'}</div>
                        <div className="text-xs text-gray-500">{entry.job_order?.vehicle_plate || ''}</div>
                      </td>
                      <td className="px-4 py-3 capitalize">{entry.work_type}</td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {entry.clock_out && ` - ${new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {duration ? `${Math.floor(duration / 60)}h ${duration % 60}m` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.clock_out ? (
                          entry.task_completed ? (
                            <span className="text-green-600"><HiCheckCircle className="w-5 h-5 inline" /></span>
                          ) : (
                            <span className="text-gray-400">Ended</span>
                          )
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs">Active</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {timeEntries.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No time entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAddGoal} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2">
              <HiPlus className="w-5 h-5" />
              <span>Set Goal</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map(goal => {
              const hoursProgress = goal.hours_target ? ((goal.hours_achieved || 0) / goal.hours_target * 100).toFixed(0) : 0;
              const jobsProgress = goal.jobs_target ? ((goal.jobs_achieved || 0) / goal.jobs_target * 100).toFixed(0) : 0;
              return (
                <div key={goal.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold">{goal.user?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{formatDate(goal.start_date)} - {formatDate(goal.end_date)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      goal.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      goal.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {goal.status}
                    </span>
                  </div>

                  {goal.hours_target && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hours</span>
                        <span>{goal.hours_achieved || 0} / {goal.hours_target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-black h-2 rounded-full" style={{ width: `${Math.min(100, hoursProgress)}%` }} />
                      </div>
                    </div>
                  )}

                  {goal.jobs_target && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Jobs</span>
                        <span>{goal.jobs_achieved || 0} / {goal.jobs_target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-black h-2 rounded-full" style={{ width: `${Math.min(100, jobsProgress)}%` }} />
                      </div>
                    </div>
                  )}

                  <button onClick={() => openEditGoal(goal)} className="text-sm text-gray-600 hover:text-black flex items-center mt-2">
                    <HiPencil className="w-4 h-4 mr-1" /> Edit
                  </button>
                </div>
              );
            })}
            {goals.length === 0 && (
              <div className="col-span-3 text-center py-8 text-gray-500">No goals set. Click "Set Goal" to create one.</div>
            )}
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Mechanics</option>
              {leaderboard.map(m => (
                <option key={m.mechanic_id} value={m.mechanic_id}>{m.mechanic_name}</option>
              ))}
            </select>
            <button 
              onClick={() => {
                setEditingSkill(null);
                setSkillForm({
                  user_id: selectedMechanic || '', skill_name: '', skill_category: '', proficiency_level: 3,
                  certified: false, certification_number: '', certification_date: '', expiry_date: '', notes: ''
                });
                setShowSkillModal(true);
              }} 
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center space-x-2"
            >
              <HiPlus className="w-5 h-5" />
              <span>Add Skill</span>
            </button>
          </div>

          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mechanic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Skill</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Level</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Certified</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {skills.map(skill => (
                  <tr key={skill.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{skill.user?.full_name || '—'}</td>
                    <td className="px-4 py-3">{skill.skill_name}</td>
                    <td className="px-4 py-3 capitalize">{skill.skill_category || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map(level => (
                          <span key={level} className={`w-2 h-4 rounded ${level <= skill.proficiency_level ? 'bg-black' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {skill.certified ? (
                        <span className="text-green-600"><HiCheckCircle className="w-5 h-5 inline" /></span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {skill.expiry_date ? (
                        <span className={new Date(skill.expiry_date) < new Date() ? 'text-red-600' : ''}>
                          {formatDate(skill.expiry_date)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditSkill(skill)} className="p-1 hover:bg-gray-100 rounded">
                        <HiPencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteSkill(skill.id)} className="p-1 hover:bg-red-50 rounded text-red-600 ml-1">
                        <HiX className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {skills.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No skills found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">{editingGoal ? 'Edit Goal' : 'Set Performance Goal'}</h2>
              <button
                onClick={() => setShowGoalModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSaveGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mechanic *</label>
                  <select
                    value={goalForm.user_id}
                    onChange={(e) => setGoalForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    required
                  >
                    <option value="">Select mechanic</option>
                    {leaderboard.map(m => (
                      <option key={m.mechanic_id} value={m.mechanic_id}>{m.mechanic_name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input type="date" value={goalForm.start_date} onChange={(e) => setGoalForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input type="date" value={goalForm.end_date} onChange={(e) => setGoalForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hours Target</label>
                    <input type="number" step="0.5" value={goalForm.hours_target} onChange={(e) => setGoalForm(f => ({ ...f, hours_target: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jobs Target</label>
                    <input type="number" value={goalForm.jobs_target} onChange={(e) => setGoalForm(f => ({ ...f, jobs_target: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Revenue Target ($)</label>
                    <input type="number" step="0.01" value={goalForm.revenue_target} onChange={(e) => setGoalForm(f => ({ ...f, revenue_target: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Efficiency Target (%)</label>
                    <input type="number" step="0.1" max="100" value={goalForm.efficiency_target} onChange={(e) => setGoalForm(f => ({ ...f, efficiency_target: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea value={goalForm.notes} onChange={(e) => setGoalForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" rows={2} />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowGoalModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : (editingGoal ? 'Update' : 'Create Goal')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">{editingSkill ? 'Edit Skill' : 'Add Skill'}</h2>
              <button
                onClick={() => setShowSkillModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSaveSkill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mechanic *</label>
                  <select
                    value={skillForm.user_id}
                    onChange={(e) => setSkillForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    required
                  >
                    <option value="">Select mechanic</option>
                    {leaderboard.map(m => (
                      <option key={m.mechanic_id} value={m.mechanic_id}>{m.mechanic_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Skill Name *</label>
                  <input type="text" value={skillForm.skill_name} onChange={(e) => setSkillForm(f => ({ ...f, skill_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select value={skillForm.skill_category} onChange={(e) => setSkillForm(f => ({ ...f, skill_category: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900">
                      <option value="">Select category</option>
                      <option value="engine">Engine</option>
                      <option value="transmission">Transmission</option>
                      <option value="electrical">Electrical</option>
                      <option value="brakes">Brakes</option>
                      <option value="suspension">Suspension</option>
                      <option value="hvac">HVAC</option>
                      <option value="diagnostics">Diagnostics</option>
                      <option value="body">Body Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency (1-5)</label>
                    <input type="number" min="1" max="5" value={skillForm.proficiency_level} onChange={(e) => setSkillForm(f => ({ ...f, proficiency_level: parseInt(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                  </div>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="certified" checked={skillForm.certified} onChange={(e) => setSkillForm(f => ({ ...f, certified: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black" />
                  <label htmlFor="certified" className="ml-2 text-sm text-gray-700">Certified</label>
                </div>
                {skillForm.certified && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Certification Number</label>
                      <input type="text" value={skillForm.certification_number} onChange={(e) => setSkillForm(f => ({ ...f, certification_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cert Date</label>
                        <input type="date" value={skillForm.certification_date} onChange={(e) => setSkillForm(f => ({ ...f, certification_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                        <input type="date" value={skillForm.expiry_date} onChange={(e) => setSkillForm(f => ({ ...f, expiry_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900" />
                      </div>
                    </div>
                  </>
                )}

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowSkillModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? 'Saving...' : (editingSkill ? 'Update' : 'Add Skill')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Performance;
