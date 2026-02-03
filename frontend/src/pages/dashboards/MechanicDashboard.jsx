import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import MetricCard from '../../components/MetricCard';
import {
  HiClock,
  HiPlay,
  HiStop,
  HiCheck,
  HiClipboardList,
  HiTrendingUp,
  HiWrench,
  HiX,
} from 'react-icons/hi';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api';

const MechanicDashboard = () => {
  const { user, session } = useAuth();

  // State
  const [dashboard, setDashboard] = useState(null);
  const [assignedJobs, setAssignedJobs] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Timer state
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Clock-in modal
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInForm, setClockInForm] = useState({
    job_order_id: '',
    work_type: 'repair',
    description: ''
  });

  // Clock-out modal
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [clockOutForm, setClockOutForm] = useState({
    break_minutes: 0,
    task_completed: false,
    description: ''
  });

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/performance/dashboard`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      const data = await res.json();
      setDashboard(data);
      setActiveEntry(data.activeEntry || null);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  // Fetch assigned jobs
  const fetchAssignedJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs?assigned_to=${user?.id}&status=IN_PROGRESS,ASSIGNED`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setAssignedJobs(data.jobOrders || []);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  // Fetch today's time entries
  const fetchTimeEntries = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/performance/time-entries?mechanic_id=${user?.id}&start_date=${today}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch time entries');
      const data = await res.json();
      setTimeEntries(data.entries || []);
    } catch (err) {
      console.error('Error fetching time entries:', err);
    }
  };

  useEffect(() => {
    if (session?.access_token && user?.id) {
      setLoading(true);
      Promise.all([fetchDashboard(), fetchAssignedJobs(), fetchTimeEntries()])
        .finally(() => setLoading(false));
    }
  }, [session, user]);

  // Timer tick
  useEffect(() => {
    if (activeEntry && !activeEntry.clock_out) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - new Date(activeEntry.clock_in).getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeEntry]);

  // Clock in
  const handleClockIn = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/performance/time-entries/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(clockInForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setActiveEntry(data.entry);
      setShowClockInModal(false);
      setSuccessMessage('Clocked in successfully!');
      fetchTimeEntries();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Clock out
  const handleClockOut = async (e) => {
    e.preventDefault();
    if (!activeEntry) return;

    try {
      const res = await fetch(`${API_URL}/performance/time-entries/${activeEntry.id}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(clockOutForm)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setActiveEntry(null);
      setElapsedTime(0);
      setShowClockOutModal(false);
      setSuccessMessage('Clocked out successfully!');
      fetchDashboard();
      fetchTimeEntries();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Format time
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (mins) => {
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  // Today's totals
  const todayStats = useMemo(() => {
    const completedEntries = timeEntries.filter(e => e.clock_out);
    const totalMinutes = completedEntries.reduce((sum, e) => {
      const duration = (new Date(e.clock_out) - new Date(e.clock_in)) / 60000 - (e.break_minutes || 0);
      return sum + duration;
    }, 0);
    const jobsWorked = new Set(completedEntries.map(e => e.job_order_id)).size;
    return { totalMinutes: Math.round(totalMinutes), jobsWorked, entries: completedEntries.length };
  }, [timeEntries]);

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
          <h1 className="text-3xl font-bold text-black mb-2">
            Welcome, {user?.full_name}
          </h1>
          <p className="text-gray-600">Mechanic Work Dashboard</p>
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

      {/* Active Timer Card */}
      <div className={`rounded-2xl p-6 shadow-lg border ${activeEntry ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-4 rounded-full ${activeEntry ? 'bg-green-100' : 'bg-gray-100'}`}>
              <HiClock className={`w-8 h-8 ${activeEntry ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              {activeEntry ? (
                <>
                  <p className="text-sm text-green-600 font-medium">Currently Working On</p>
                  <p className="text-xl font-bold text-gray-900">
                    {activeEntry.job_order?.job_number || 'Job'} - {activeEntry.job_order?.vehicle_plate || ''}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{activeEntry.work_type}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500">Not Clocked In</p>
                  <p className="text-xl font-bold text-gray-900">Ready to start work?</p>
                </>
              )}
            </div>
          </div>

          <div className="text-right">
            {activeEntry ? (
              <>
                <p className="text-4xl font-mono font-bold text-green-600">{formatDuration(elapsedTime)}</p>
                <button
                  onClick={() => setShowClockOutModal(true)}
                  className="mt-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                >
                  <HiStop className="w-5 h-5" />
                  <span>Clock Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowClockInModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                <HiPlay className="w-5 h-5" />
                <span>Clock In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Today's Hours"
          value={`${(todayStats.totalMinutes / 60).toFixed(1)}h`}
          icon={<HiClock />}
        />
        <MetricCard
          title="Jobs Worked Today"
          value={todayStats.jobsWorked.toString()}
          icon={<HiWrench />}
        />
        <MetricCard
          title="Week Total"
          value={`${dashboard?.week?.hours || 0}h`}
          icon={<HiTrendingUp />}
        />
        <MetricCard
          title="Assigned Jobs"
          value={assignedJobs.length.toString()}
          icon={<HiClipboardList />}
        />
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Jobs */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">My Assigned Jobs</h3>
          <div className="space-y-4">
            {assignedJobs.length > 0 ? assignedJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">{job.job_number || job.id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-600">
                    {job.customer?.full_name || 'Unknown'} - {job.vehicle_plate || 'No plate'}
                  </p>
                  <p className="text-xs text-gray-500">{job.description?.slice(0, 50) || 'No description'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-black bg-gray-100 px-2 py-1 rounded">
                    {job.status}
                  </span>
                  {!activeEntry && (
                    <button
                      onClick={() => {
                        setClockInForm({ ...clockInForm, job_order_id: job.id });
                        setShowClockInModal(true);
                      }}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                      title="Start working"
                    >
                      <HiPlay className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No jobs assigned</p>
            )}
          </div>
        </div>

        {/* Today's Time Entries */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Today's Time Log</h3>
          <div className="space-y-4">
            {timeEntries.length > 0 ? timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="text-sm font-semibold text-black">
                    {entry.job_order?.job_number || 'Job'} 
                    <span className="text-xs font-normal text-gray-500 ml-2 capitalize">{entry.work_type}</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {entry.clock_out ? ` - ${new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' - In Progress'}
                  </p>
                </div>
                <div className="text-right">
                  {entry.clock_out ? (
                    <>
                      <p className="text-sm font-semibold text-black">
                        {formatMinutes(Math.round((new Date(entry.clock_out) - new Date(entry.clock_in)) / 60000 - (entry.break_minutes || 0)))}
                      </p>
                      {entry.task_completed && (
                        <span className="text-xs text-green-600 flex items-center justify-end">
                          <HiCheck className="w-3 h-3 mr-1" /> Completed
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">Active</span>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-4">No time entries today</p>
            )}
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      {dashboard?.currentGoal && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-xl font-bold text-black mb-4">Current Goal Progress</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Hours Target</p>
              <p className="text-2xl font-bold text-black">
                {dashboard.currentGoal.hours_achieved || 0} / {dashboard.currentGoal.hours_target || 0}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-black h-2 rounded-full" 
                  style={{ width: `${Math.min(100, ((dashboard.currentGoal.hours_achieved || 0) / (dashboard.currentGoal.hours_target || 1)) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Jobs Target</p>
              <p className="text-2xl font-bold text-black">
                {dashboard.currentGoal.jobs_achieved || 0} / {dashboard.currentGoal.jobs_target || 0}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-black h-2 rounded-full" 
                  style={{ width: `${Math.min(100, ((dashboard.currentGoal.jobs_achieved || 0) / (dashboard.currentGoal.jobs_target || 1)) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Efficiency Target</p>
              <p className="text-2xl font-bold text-black">
                {dashboard.currentGoal.efficiency_achieved || 0}% / {dashboard.currentGoal.efficiency_target || 0}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-black h-2 rounded-full" 
                  style={{ width: `${Math.min(100, ((dashboard.currentGoal.efficiency_achieved || 0) / (dashboard.currentGoal.efficiency_target || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clock In Modal */}
      {showClockInModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">Clock In</h2>
              <button
                onClick={() => setShowClockInModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleClockIn} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job *</label>
                <select
                  value={clockInForm.job_order_id}
                  onChange={(e) => setClockInForm({ ...clockInForm, job_order_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  required
                >
                  <option value="">Select a job</option>
                  {assignedJobs.map(job => (
                    <option key={job.id} value={job.id}>
                      {job.job_number || job.id.slice(0, 8)} - {job.customer?.full_name || 'Unknown'} ({job.vehicle_plate || 'No plate'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                <select
                  value={clockInForm.work_type}
                  onChange={(e) => setClockInForm({ ...clockInForm, work_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                >
                  <option value="repair">Repair</option>
                  <option value="diagnostic">Diagnostic</option>
                  <option value="inspection">Inspection</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                <textarea
                  value={clockInForm.description}
                  onChange={(e) => setClockInForm({ ...clockInForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  rows={2}
                  placeholder="What will you be working on?"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowClockInModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium">
                  Start Timer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clock Out Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="fixed inset-0 bg-black opacity-50"></div>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg z-50 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-2xl font-bold text-black">Clock Out</h2>
              <button
                onClick={() => setShowClockOutModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Time worked:</p>
                <p className="text-3xl font-mono font-bold text-black">{formatDuration(elapsedTime)}</p>
              </div>

              <form onSubmit={handleClockOut} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Break time (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={clockOutForm.break_minutes}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, break_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="task_completed"
                    checked={clockOutForm.task_completed}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, task_completed: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <label htmlFor="task_completed" className="ml-2 text-sm text-gray-700">Task completed</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={clockOutForm.description}
                    onChange={(e) => setClockOutForm({ ...clockOutForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                    rows={2}
                    placeholder="What did you accomplish?"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowClockOutModal(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium">
                    Clock Out
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

export default MechanicDashboard;
