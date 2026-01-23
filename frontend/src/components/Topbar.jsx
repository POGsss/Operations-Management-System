import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useDataStore from '../store/UseDataStore';

const Topbar = () => {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { isOpen, setIsOpen } = useDataStore();

  const getRoleDisplayName = (roleValue) => {
    const roleMap = {
      admin: 'Administrator',
      branch_manager: 'Branch Manager',
      service_advisor: 'Service Advisor',
      mechanic: 'Mechanic',
      inventory_officer: 'Inventory Officer',
      executive: 'Executive',
    };
    return roleMap[roleValue] || roleValue;
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left - Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <svg
            className="absolute left-3 top-3 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-gray-50"
          />
        </div>
      </div>

      {/* Right - User Controls */}
      <div className="flex items-center space-x-4 ml-6">
        {/* Notifications (Icon) */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="bg-black" className="size-6">
            <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 24.585 24.585 0 0 1-4.831-1.244.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-black rounded-full"></span>
        </button>

        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Topbar;
