import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const Overview = () => {
    const { user, session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [jobsSummary, setJobsSummary] = useState(null);
    const [salesSummary, setSalesSummary] = useState(null);
    const [recentJobs, setRecentJobs] = useState([]);

    useEffect(() => {
        if (session?.access_token) {
            fetchDashboardData();
        }
    }, [session]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${session.access_token}` };
            const startDate = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
            const endDate = new Date().toISOString().split('T')[0];
            const params = `?startDate=${startDate}&endDate=${endDate}`;

            const [jobsRes, salesRes, inventoryRes, recentJobsRes] = await Promise.all([
                fetch(`${API_BASE}/api/reports/jobs/summary${params}`, { headers }),
                fetch(`${API_BASE}/api/reports/sales/summary${params}`, { headers }),
                fetch(`${API_BASE}/api/reports/inventory/value`, { headers }),
                fetch(`${API_BASE}/api/jobs?status=in_progress,pending,waiting_parts&limit=5`, { headers })
            ]);

            if (jobsRes.ok) setJobsSummary(await jobsRes.json());
            if (salesRes.ok) setSalesSummary(await salesRes.json());
            if (inventoryRes.ok) setOverview(await inventoryRes.json());
            if (recentJobsRes.ok) {
                const data = await recentJobsRes.json();
                setRecentJobs(data.jobOrders || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-blue-100 text-blue-800',
        waiting_parts: 'bg-orange-100 text-orange-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };

    const priorityColors = {
        high: 'text-red-600',
        medium: 'text-yellow-600',
        low: 'text-green-600'
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-black mb-2">Welcome, {user?.full_name}</h1>
                <p className="text-gray-600">Branch operations overview</p>
            </div>

            {/* Metrics Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Job Orders"
                    value={jobsSummary?.total_jobs || 0}
                    icon="🔧"
                />
                <MetricCard
                    title="Completed Jobs"
                    value={jobsSummary?.completed_jobs || 0}
                    icon="✅"
                />
                <MetricCard
                    title="In Progress"
                    value={jobsSummary?.in_progress_jobs || 0}
                    icon="⏳"
                />
                <MetricCard
                    title="Monthly Revenue"
                    value={formatCurrency(salesSummary?.total_revenue)}
                    icon="💰"
                />
            </div>

            {/* Metrics Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Inventory Items"
                    value={overview?.total_items || 0}
                    icon="📦"
                />
                <MetricCard
                    title="Low Stock Items"
                    value={overview?.low_stock_count || 0}
                    icon="⚠️"
                />
                <MetricCard
                    title="Inventory Value"
                    value={formatCurrency(overview?.total_value)}
                    icon="💵"
                />
                <MetricCard
                    title="Completion Rate"
                    value={`${(jobsSummary?.completion_rate || 0).toFixed(1)}%`}
                    icon="📈"
                />
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Jobs */}
                <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                    <h3 className="text-xl font-bold text-black mb-4">Active Jobs</h3>
                    {recentJobs.length > 0 ? (
                        <div className="space-y-4">
                            {recentJobs.slice(0, 5).map((job, index) => (
                                <div key={job.id || index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                                    <div>
                                        <p className="text-sm font-semibold text-black">{job.order_number || `JO-${job.id?.slice(0, 8)}`}</p>
                                        <p className="text-xs text-gray-600">
                                            {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {job.status?.replace('_', ' ')}
                                        </span>
                                        <p className={`text-xs mt-1 capitalize ${priorityColors[job.priority] || 'text-gray-500'}`}>
                                            {job.priority || 'Normal'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No active jobs</p>
                    )}
                </div>

                {/* Jobs by Status */}
                <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                    <h3 className="text-xl font-bold text-black mb-4">Jobs by Status</h3>
                    {jobsSummary?.by_status?.length > 0 ? (
                        <div className="space-y-4">
                            {jobsSummary.by_status.map((status, index) => {
                                const total = jobsSummary.total_jobs || 1;
                                const percent = (status.count / total) * 100;
                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="capitalize">{status.status?.replace('_', ' ') || 'Unknown'}</span>
                                            <span className="font-semibold">{status.count}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-black rounded-full"
                                                style={{ width: `${percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No job data</p>
                    )}
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                <h3 className="text-xl font-bold text-black mb-4">Revenue Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Labor Revenue</p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesSummary?.labor_revenue)}</p>
                        {salesSummary?.total_revenue > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {((salesSummary.labor_revenue / salesSummary.total_revenue) * 100).toFixed(1)}% of total
                            </p>
                        )}
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Parts Revenue</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(salesSummary?.parts_revenue)}</p>
                        {salesSummary?.total_revenue > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {((salesSummary.parts_revenue / salesSummary.total_revenue) * 100).toFixed(1)}% of total
                            </p>
                        )}
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-gray-600">Other Revenue</p>
                        <p className="text-2xl font-bold text-purple-600">{formatCurrency(salesSummary?.other_revenue)}</p>
                        {salesSummary?.total_revenue > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                {((salesSummary.other_revenue / salesSummary.total_revenue) * 100).toFixed(1)}% of total
                            </p>
                        )}
                    </div>
                </div>
                {/* Revenue bar visualization */}
                {salesSummary?.total_revenue > 0 && (
                    <div className="mt-6">
                        <div className="h-6 rounded-full overflow-hidden flex">
                            <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${(salesSummary.labor_revenue / salesSummary.total_revenue) * 100}%` }}
                            ></div>
                            <div
                                className="bg-green-500 h-full"
                                style={{ width: `${(salesSummary.parts_revenue / salesSummary.total_revenue) * 100}%` }}
                            ></div>
                            <div
                                className="bg-purple-500 h-full"
                                style={{ width: `${(salesSummary.other_revenue / salesSummary.total_revenue) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-center gap-6 mt-3 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span>Labor</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span>Parts</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span>Other</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Overview;
