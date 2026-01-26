import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useDataStore from '../store/UseDataStore';
import { 
  HiTemplate,
  HiUsers,
  HiOfficeBuilding,
  HiCog,
  HiCurrencyDollar,
  HiClipboardList,
  HiChartBar,
  HiAdjustments,
  HiCube,
  HiStar,
  HiBell,
  HiTrendingDown,
  HiReceiptTax,
  HiTrendingUp
 } from "react-icons/hi";

const menuConfig = {
  admin: [
    { name: 'Overview', icon: <HiTemplate className="w-5 h-5" /> },
    { name: 'Users', icon: <HiUsers className="w-5 h-5" /> },
    { name: 'Branches', icon: <HiOfficeBuilding className="w-5 h-5" /> },
    { name: 'Workflow Config', icon: <HiCog className="w-5 h-5" /> },
    { name: 'Pricing Matrix', icon: <HiCurrencyDollar className="w-5 h-5" /> },
    { name: 'Audit Logs', icon: <HiClipboardList className="w-5 h-5" /> },
    { name: 'Reports', icon: <HiChartBar className="w-5 h-5" /> },
    { name: 'Settings', icon: <HiAdjustments className="w-5 h-5" /> },
  ],
  branch_manager: [
    { name: 'Overview', icon: <HiTemplate className="w-5 h-5" /> },
    { name: 'Job Orders', icon: <HiClipboardList className="w-5 h-5" /> },
    { name: 'Inventory', icon: <HiCube className="w-5 h-5" /> },
    { name: 'Sales', icon: <HiCurrencyDollar className="w-5 h-5" /> },
    { name: 'Performance', icon: <HiStar className="w-5 h-5" /> },
    { name: 'Reports', icon: <HiChartBar className="w-5 h-5" /> },
  ],
  service_advisor: [
    { name: 'Overview', icon: <HiTemplate className="w-5 h-5" /> },
    { name: 'Customers', icon: <HiUsers className="w-5 h-5" /> },
    { name: 'Job Orders', icon: <HiClipboardList className="w-5 h-5" /> },
    { name: 'Estimates', icon: <HiReceiptTax className="w-5 h-5" /> },
    { name: 'Billing', icon: <HiCurrencyDollar className="w-5 h-5" /> },
  ],
  mechanic: [
    { name: 'My Jobs', icon: <HiClipboardList className="w-5 h-5" /> },
    { name: 'Job Status', icon: <HiBell className="w-5 h-5" /> },
    { name: 'Parts Used', icon: <HiTrendingDown className="w-5 h-5" /> },
    { name: 'Inventory', icon: <HiCube className="w-5 h-5" /> },
  ],
  inventory_officer: [
    { name: 'Stock Levels', icon: <HiCube className="w-5 h-5" /> },
    { name: 'Purchase Orders', icon: <HiCurrencyDollar className="w-5 h-5" /> },
    { name: 'Inventory Logs', icon: <HiClipboardList className="w-5 h-5" /> },
  ],
  executive: [
    { name: 'Overview', icon: <HiTemplate className="w-5 h-5" /> },
    { name: 'Sales Reports', icon: <HiChartBar className="w-5 h-5" /> },
    { name: 'Performance', icon: <HiTrendingUp className="w-5 h-5" /> },
    { name: 'Audit Logs', icon: <HiClipboardList className="w-5 h-5" /> },
  ],
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { role, user, logout } = useAuth();
  const { isOpen, setIsOpen } = useDataStore();
  const [activeMenu, setActiveMenu] = useState('Overview');

  const roleMenuItems = menuConfig[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (menuName) => {
    setActiveMenu(menuName);
    setIsOpen(false);
    
    // Navigate to role-specific page
    // Convert menu name to component name format (remove spaces)
    const pageRoute = menuName.replace(/\s+/g, '');
    const roleRoute = role.replace(/_/g, '-');
    
    console.log('Navigating to:', `/dashboard/${roleRoute}/${pageRoute}`);
    navigate(`/dashboard/${roleRoute}/${pageRoute}`);
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-black text-white z-40 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* User Info */}
          {user && (
            <div className="mb-6 pb-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-lg">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-400 capitalize truncate">{role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <nav className="flex-1 space-y-2 overflow-y-auto">
            {roleMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleMenuClick(item.name)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  activeMenu === item.name
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-medium text-sm"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden lg:block w-64"></div>
    </>
  );
};

export default Sidebar;
