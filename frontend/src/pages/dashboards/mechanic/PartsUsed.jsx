import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { HiSearch, HiCube, HiClipboardList } from 'react-icons/hi';
import { supabase } from '../../../lib/supabaseClient';

const PartsUsed = () => {
  const { session, user } = useAuth();
  const [partsHistory, setPartsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch parts used by the mechanic
  const loadPartsHistory = async () => {
    try {
      setLoading(true);
      
      // Get jobs assigned to this mechanic
      const { data: assignments } = await supabase
        .from('job_assignments')
        .select('job_id')
        .eq('mechanic_id', user?.id);

      if (!assignments || assignments.length === 0) {
        setPartsHistory([]);
        return;
      }

      const jobIds = assignments.map(a => a.job_id);

      // Get parts used in those jobs
      const { data, error } = await supabase
        .from('job_parts_used')
        .select(`
          *,
          inventory_item:inventory_items(id, name, sku, unit_price),
          job:job_orders(id, vehicle_plate, customer:customers(full_name))
        `)
        .in('job_id', jobIds)
        .order('used_at', { ascending: false });

      if (error) throw error;
      setPartsHistory(data || []);
    } catch (err) {
      console.error('Error loading parts history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token && user?.id) {
      loadPartsHistory();
    }
  }, [session, user]);

  // Filter parts
  const filteredParts = useMemo(() => {
    if (!searchQuery) return partsHistory;
    const query = searchQuery.toLowerCase();
    return partsHistory.filter(
      (part) =>
        part.inventory_item?.name?.toLowerCase().includes(query) ||
        part.inventory_item?.sku?.toLowerCase().includes(query) ||
        part.job?.vehicle_plate?.toLowerCase().includes(query) ||
        part.job?.customer?.full_name?.toLowerCase().includes(query)
    );
  }, [partsHistory, searchQuery]);

  // Group by date
  const groupedParts = useMemo(() => {
    const groups = {};
    filteredParts.forEach((part) => {
      const date = new Date(part.used_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(part);
    });
    return groups;
  }, [filteredParts]);

  // Stats
  const stats = useMemo(() => {
    const totalParts = partsHistory.reduce((sum, p) => sum + p.quantity, 0);
    const uniqueParts = new Set(partsHistory.map((p) => p.inventory_item_id)).size;
    const totalJobs = new Set(partsHistory.map((p) => p.job_id)).size;
    return { totalParts, uniqueParts, totalJobs };
  }, [partsHistory]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Parts Used</h1>
        <p className="text-gray-600 mt-1">Track parts you've used in your jobs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HiCube className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Parts Used</p>
              <p className="text-2xl font-bold">{stats.totalParts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiCube className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Unique Parts</p>
              <p className="text-2xl font-bold">{stats.uniqueParts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <HiClipboardList className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Jobs with Parts</p>
              <p className="text-2xl font-bold">{stats.totalJobs}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by part name, SKU, vehicle, or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Parts History */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Loading parts history...
        </div>
      ) : filteredParts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <HiCube className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No parts logged yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedParts).map(([date, parts]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">{date}</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="divide-y">
                  {parts.map((part) => (
                    <div key={part.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <HiCube className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{part.inventory_item?.name}</p>
                          <p className="text-sm text-gray-500">
                            {part.inventory_item?.sku} • {part.job?.vehicle_plate || 'N/A'} •{' '}
                            {part.job?.customer?.full_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Qty: {part.quantity}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(part.inventory_item?.unit_price * part.quantity)}
                        </p>
                        <p className="text-xs text-gray-400">{formatTime(part.used_at)}</p>
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

export default PartsUsed;
