import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import MetricCard from '../../../components/MetricCard';

const Overview = () => {
    const { user } = useAuth();

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
                    value="342"
                    trend="8%"
                    icon=""
                    isPositive={true}
                />
                <MetricCard
                    title="Completed Jobs"
                    value="287"
                    trend="12%"
                    icon=""
                    isPositive={true}
                />
                <MetricCard
                    title="Pending Jobs"
                    value="55"
                    trend="3%"
                    icon=""
                    isPositive={false}
                />
                <MetricCard
                    title="This Week Sales"
                    value="$24,500"
                    trend="15%"
                    icon=""
                    isPositive={true}
                />
            </div>

            {/* Metrics Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Inventory Items"
                    value="1,245"
                    trend="5%"
                    icon=""
                    isPositive={true}
                />
                <MetricCard
                    title="Low Stock Items"
                    value="28"
                    trend="2"
                    icon=""
                    isPositive={false}
                />
                <MetricCard
                    title="Staff Count"
                    value="42"
                    trend="2"
                    icon=""
                    isPositive={true}
                />
                <MetricCard
                    title="Avg Job Time"
                    value="4.2 hrs"
                    trend="0.5 hrs"
                    icon=""
                    isPositive={false}
                />
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Jobs */}
                <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                    <h3 className="text-xl font-bold text-black mb-4">Active Jobs</h3>
                    <div className="space-y-4">
                        {[
                            { jobId: 'JO-2024-001', vehicle: '2023 Toyota Camry', status: 'In Progress', priority: 'High' },
                            { jobId: 'JO-2024-002', vehicle: '2022 Honda Civic', status: 'In Progress', priority: 'Medium' },
                            { jobId: 'JO-2024-003', vehicle: '2021 Ford F-150', status: 'Pending Review', priority: 'Low' },
                            { jobId: 'JO-2024-004', vehicle: '2020 Chevy Malibu', status: 'Waiting Parts', priority: 'Medium' },
                        ].map((job, index) => (
                            <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                                <div>
                                    <p className="text-sm font-semibold text-black">{job.jobId}</p>
                                    <p className="text-xs text-gray-600">{job.vehicle}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-black">{job.status}</p>
                                    <p className="text-xs text-gray-500">{job.priority}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sales Performance */}
                <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                    <h3 className="text-xl font-bold text-black mb-4">Sales Performance</h3>
                    <div className="space-y-4">
                        {[
                            { week: 'Week 1', amount: '$5,200', trend: '+5%' },
                            { week: 'Week 2', amount: '$6,800', trend: '+8%' },
                            { week: 'Week 3', amount: '$5,900', trend: '-3%' },
                            { week: 'Week 4', amount: '$6,600', trend: '+12%' },
                        ].map((week, index) => (
                            <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-b-0">
                                <span className="text-sm font-medium text-black">{week.week}</span>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-black">{week.amount}</p>
                                    <p className="text-xs text-gray-600">{week.trend}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Placeholder */}
            <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
                <h3 className="text-xl font-bold text-black mb-4">Job Completion Rate</h3>
                <div className="h-64 bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                        </svg>
                        <p className="text-gray-600 text-sm">Chart placeholder - Replace with real analytics</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
