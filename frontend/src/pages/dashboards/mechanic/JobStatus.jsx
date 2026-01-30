import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { HiSearch, HiClock, HiCheckCircle, HiArrowRight } from 'react-icons/hi';
import { supabase } from '../../../lib/supabaseClient';
import { STATUS_COLORS, STATUS_LABELS } from '../../../services/jobOrdersService';

const JobStatus = () => {
  const { session, user } = useAuth();
  const [statusHistory, setStatusHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch status history for mechanic's jobs
  const loadStatusHistory = async () => {
    try {
      setLoading(true);

      // Get jobs assigned to this mechanic
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('mechanic_id', user?.id);

      if (!assignments || assignments.length === 0) {
        setStatusHistory([]);
        return;
      }

      const jobIds = assignments.map((a) => a.job_id);

      // Get status history for those jobs
      const { data, error } = await supabase
        .from('job_status_history')
        .select(`
          *,
          changer:users(id, full_name),
          job:job_orders(id, vehicle_plate, customer:customers(full_name))
        `)
        .in('job_id', jobIds)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (err) {
      console.error('Error loading status history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token && user?.id) {
      loadStatusHistory();
    }
  }, [session, user]);

  // Filter history
  const filteredHistory = useMemo(() => {
    if (!searchQuery) return statusHistory;
    const query = searchQuery.toLowerCase();
    return statusHistory.filter(
      (entry) =>
        entry.job?.vehicle_plate?.toLowerCase().includes(query) ||
        entry.job?.customer?.full_name?.toLowerCase().includes(query) ||
        entry.new_status?.toLowerCase().includes(query) ||
        entry.old_status?.toLowerCase().includes(query)
    );
  }, [statusHistory, searchQuery]);

  // Group by date
  const groupedHistory = useMemo(() => {
    const groups = {};
    filteredHistory.forEach((entry) => {
      const date = new Date(entry.changed_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [filteredHistory]);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black mb-2">Job Status History</h1>
        <p className="text-gray-600">Track status changes for your assigned jobs</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by vehicle, customer, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* Status History Timeline */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border border-gray-200">
          Loading status history...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border border-gray-200">
          <HiClock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No status changes recorded yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{date}</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <div key={entry.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gray-100 rounded-full mt-1">
                          <HiClock className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-gray-500">
                              #{entry.job_id?.substring(0, 8)}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {entry.job?.vehicle_plate || 'N/A'}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-sm text-gray-600">
                              {entry.job?.customer?.full_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.old_status && (
                              <>
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    STATUS_COLORS[entry.old_status] || 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {STATUS_LABELS[entry.old_status] || entry.old_status}
                                </span>
                                <HiArrowRight className="w-4 h-4 text-gray-400" />
                              </>
                            )}
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                STATUS_COLORS[entry.new_status] || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {STATUS_LABELS[entry.new_status] || entry.new_status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Changed by {entry.changer?.full_name || 'System'} at{' '}
                            {formatTime(entry.changed_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JobStatus;
