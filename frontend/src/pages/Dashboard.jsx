import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

// Admin subpages
import AdminOverview from './dashboards/admin/Overview';
import AdminUsers from './dashboards/admin/Users';
import AdminBranches from './dashboards/admin/Branches';
import AdminWorkflowConfig from './dashboards/admin/WorkflowConfig';
import AdminPricingMatrix from './dashboards/admin/PricingMatrix';
import AdminAuditLogs from './dashboards/admin/AuditLogs';
import AdminReports from './dashboards/admin/Reports';
import AdminSettings from './dashboards/admin/Settings';

// Manager subpages
import ManagerOverview from './dashboards/manager/Overview';
import ManagerJobOrders from './dashboards/manager/JobOrders';
import ManagerInventory from './dashboards/manager/Inventory';
import ManagerSales from './dashboards/manager/Sales';
import ManagerPerformance from './dashboards/manager/Performance';
import ManagerReports from './dashboards/manager/Reports';

// Advisor subpages
import AdvisorOverview from './dashboards/advisor/Overview';
import AdvisorCustomers from './dashboards/advisor/Customers';
import AdvisorJobOrders from './dashboards/advisor/JobOrders';
import AdvisorEstimates from './dashboards/advisor/Estimates';
import AdvisorBilling from './dashboards/advisor/Billing';

// Mechanic subpages
import MechanicMyJobs from './dashboards/mechanic/MyJobs';
import MechanicJobStatus from './dashboards/mechanic/JobStatus';
import MechanicPartsUsed from './dashboards/mechanic/PartsUsed';
import MechanicInventory from './dashboards/mechanic/Inventory';

// Inventory Officer subpages
import InventoryStockLevels from './dashboards/Inventory/StockLevels';
import InventoryPurchaseOrders from './dashboards/Inventory/PurchaseOrders';
import InventoryLogs from './dashboards/Inventory/InventoryLogs';

// Executive subpages
import ExecutiveOverview from './dashboards/executive/Overview';
import ExecutiveSalesReports from './dashboards/executive/SalesReports';
import ExecutivePerformance from './dashboards/executive/Performance';
import ExecutiveAuditLogs from './dashboards/executive/AuditLogs';

const Dashboard = () => {
  const { role, loading } = useAuth();
  const { roleRoute, page } = useParams();
  const navigate = useNavigate();

  // First sidebar item for each role
  const firstMenuItems = {
    admin: 'Overview',
    branch_manager: 'Overview',
    service_advisor: 'Overview',
    mechanic: 'MyJobs',
    inventory_officer: 'StockLevels',
    executive: 'Overview',
  };

  // Redirect to first menu item if no page is specified
  useEffect(() => {
    if (role && !page) {
      const firstPage = firstMenuItems[role];
      const roleRoute = role.replace(/_/g, '-');
      navigate(`/dashboard/${roleRoute}/${firstPage}`, { replace: true });
    }
  }, [role, page, navigate]);

  console.log('Dashboard Debug:', { role, roleRoute, page }); // Debug log

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

  // Map role and page to subpage components
  const subpageComponents = {
    admin: {
      'Overview': AdminOverview,
      'Users': AdminUsers,
      'Branches': AdminBranches,
      'WorkflowConfig': AdminWorkflowConfig,
      'PricingMatrix': AdminPricingMatrix,
      'AuditLogs': AdminAuditLogs,
      'Reports': AdminReports,
      'Settings': AdminSettings,
    },
    'branch-manager': {
      'Overview': ManagerOverview,
      'JobOrders': ManagerJobOrders,
      'Inventory': ManagerInventory,
      'Sales': ManagerSales,
      'Performance': ManagerPerformance,
      'Reports': ManagerReports,
    },
    'service-advisor': {
      'Overview': AdvisorOverview,
      'Customers': AdvisorCustomers,
      'JobOrders': AdvisorJobOrders,
      'Estimates': AdvisorEstimates,
      'Billing': AdvisorBilling,
    },
    mechanic: {
      'MyJobs': MechanicMyJobs,
      'JobStatus': MechanicJobStatus,
      'PartsUsed': MechanicPartsUsed,
      'Inventory': MechanicInventory,
    },
    'inventory-officer': {
      'StockLevels': InventoryStockLevels,
      'PurchaseOrders': InventoryPurchaseOrders,
      'InventoryLogs': InventoryLogs,
    },
    executive: {
      'Overview': ExecutiveOverview,
      'SalesReports': ExecutiveSalesReports,
      'Performance': ExecutivePerformance,
      'AuditLogs': ExecutiveAuditLogs,
    },
  };

  // Get the subpage component
  const ContentComponent = subpageComponents[roleRoute]?.[page];

  console.log('Looking for subpage:', { roleRoute, page, found: !!ContentComponent }); // Debug log

  // Fallback if component not found
  if (!ContentComponent) {
    return (
      <div className="flex bg-gray-50 min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="text-center">
              <p className="text-gray-600">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

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
          <ContentComponent />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
