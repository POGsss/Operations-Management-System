import React from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AdminDashboard from './dashboards/AdminDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import AdvisorDashboard from './dashboards/AdvisorDashboard';
import MechanicDashboard from './dashboards/MechanicDashboard';
import InventoryDashboard from './dashboards/InventoryDashboard';
import ExecutiveDashboard from './dashboards/ExecutiveDashboard';

const Dashboard = () => {
  const { role, loading } = useAuth();

  // Show loading state while fetching role
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-black"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Map role to dashboard component
  const dashboardComponents = {
    admin: AdminDashboard,
    branch_manager: ManagerDashboard,
    service_advisor: AdvisorDashboard,
    mechanic: MechanicDashboard,
    inventory_officer: InventoryDashboard,
    executive: ExecutiveDashboard,
  };

  const DashboardComponent = dashboardComponents[role] || AdminDashboard;

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <DashboardComponent />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
