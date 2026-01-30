import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { HiTrash, HiPlus, HiX, HiSearch, HiPencil } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [branchesLoading, setBranchesLoading] = useState(false);

    // Modal and form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'mechanic',
        branchId: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    
    // Delete confirmation modal
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        search: '',
        role: 'all',
        branch: 'all',
    });

    // Pagination
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 10,
        total: 0,
    });

    const roles = [
        { value: 'admin', label: 'Admin' },
        { value: 'branch_manager', label: 'Branch Manager' },
        { value: 'service_advisor', label: 'Service Advisor' },
        { value: 'mechanic', label: 'Mechanic' },
        { value: 'inventory_officer', label: 'Inventory Officer' },
        { value: 'executive', label: 'Executive' },
    ];

    // Helper function to format role names for display
    const formatRoleName = (role) => {
        if (!role) return '-';
        const roleObj = roles.find(r => r.value === role);
        if (roleObj) return roleObj.label;
        // Fallback: capitalize and replace underscores
        return role.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const itemsPerPage = pagination.pageSize;

    // Fetch users and branches
    useEffect(() => {
        getCurrentUser();
        fetchUsers();
        fetchBranches();
    }, []);

    const getCurrentUser = async () => {
        try {
            const { data, error } = await supabase.auth.getUser();
            if (!error && data?.user) {
                setCurrentUserId(data.user.id);
            }
        } catch (err) {
            console.error('Error getting current user:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, branch_id, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                setError(error.message);
                console.error('Error fetching users:', error);
            } else {
                setUsers(data || []);
            }
        } catch (err) {
            setError('Failed to fetch users');
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            setBranchesLoading(true);
            const { data, error } = await supabase
                .from('branches')
                .select('id, name, code')
                .eq('status', 'active')
                .order('name');

            if (error) {
                console.error('Error fetching branches:', error);
            } else {
                setBranches(data || []);
            }
        } catch (err) {
            console.error('Fetch branches error:', err);
        } finally {
            setBranchesLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Modal helpers
    const openAddModal = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            fullName: '',
            role: 'mechanic',
            branchId: '',
        });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '',
            fullName: user.full_name,
            role: user.role,
            branchId: user.branch_id || '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            fullName: '',
            role: 'mechanic',
            branchId: '',
        });
    };

    // Filter and search
    const getUniqueRoles = useMemo(() => {
        return [...new Set(users.map(u => u.role))].sort();
    }, [users]);

    const getBranchName = (branchId) => {
        return branches.find(b => b.id === branchId)?.name || '—';
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                user.email?.toLowerCase().includes(filters.search.toLowerCase());

            const matchesRole =
                filters.role === 'all' || user.role === filters.role;

            const matchesBranch =
                filters.branch === 'all' || user.branch_id === filters.branch;

            return matchesSearch && matchesRole && matchesBranch;
        });
    }, [users, filters]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
        setPagination((prev) => ({
            ...prev,
            page: 1,
        }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            role: 'all',
            branch: 'all',
        });
        setPagination({
            page: 1,
            pageSize: 10,
            total: 0,
        });
    };

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const offset = (pagination.page - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(offset, offset + itemsPerPage);

    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage('');

        try {
            // For editing, password is optional; for new users, it's required
            if (!editingUser && (!formData.email || !formData.password || !formData.fullName)) {
                setError('Email, password, and full name are required for new users');
                setSubmitting(false);
                return;
            }

            if (!formData.email || !formData.fullName) {
                setError('Email and full name are required');
                setSubmitting(false);
                return;
            }

            // Get current session token
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session?.access_token) {
                setError('Authentication required. Please log in again.');
                setSubmitting(false);
                return;
            }

            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

            if (editingUser) {
                // Edit user
                const response = await fetch(`${backendUrl}/api/auth/update-user/${editingUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        fullName: formData.fullName,
                        role: formData.role,
                        branchId: formData.branchId || null,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Failed to update user');
                } else {
                    setSuccessMessage(`User ${formData.email} updated successfully!`);
                    closeModal();
                    fetchUsers();
                    setTimeout(() => setSuccessMessage(''), 3000);
                }
            } else {
                // Create new user
                const response = await fetch(`${backendUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        fullName: formData.fullName,
                        role: formData.role,
                        branchId: formData.branchId || null,
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Failed to create user');
                } else {
                    setSuccessMessage(`User ${formData.email} created successfully!`);
                    closeModal();
                    fetchUsers();
                    setTimeout(() => setSuccessMessage(''), 3000);
                }
            }
        } catch (err) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
            setError(`Failed to save user: ${err.message}. Make sure backend is running at ${backendUrl}`);
            console.error('Save user error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = (user) => {
        setUserToDelete(user);
        setShowConfirmDialog(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        const { id: userId, email: userEmail } = userToDelete;
        setShowConfirmDialog(false);

        try {
            setError(null);

            // Get current session token
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session?.access_token) {
                setError('Authentication required. Please log in again.');
                return;
            }

            // Call backend delete endpoint with Bearer token
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
            const response = await fetch(`${backendUrl}/api/auth/delete-user/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    adminId: currentUserId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError('Failed to delete user: ' + (data.error || 'Unknown error'));
                console.error('Delete error:', data);
            } else {
                setSuccessMessage(`User ${userEmail} deleted successfully!`);
                fetchUsers();
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
            setError(`Failed to delete user: ${err.message}. Make sure backend is running at ${backendUrl}`);
            console.error('Delete user error:', err);
        }

        setUserToDelete(null);
    };

    const cancelDeleteUser = () => {
        setShowConfirmDialog(false);
        setUserToDelete(null);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-black mb-2">Users Management</h1>
                        <p className="text-gray-600">Add, view, edit, and manage system users</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition"
                    >
                        <HiPlus className="w-5 h-5" />
                        <span>Add User</span>
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg flex items-center justify-between">
                    <p>{successMessage}</p>
                    <button
                        onClick={() => setSuccessMessage('')}
                        className="text-green-700 hover:text-green-900"
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <p>{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900"
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-black mb-4">Filters</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <HiSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900 pl-10"
                            />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                        </label>
                        <select
                            value={filters.role}
                            onChange={(e) => handleFilterChange('role', e.target.value)}
                            className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                        >
                            <option value="all">All Roles</option>
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                    </div>

                    {/* Branch Filter */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Branch
                        </label>
                        <select
                            value={filters.branch}
                            onChange={(e) => handleFilterChange('branch', e.target.value)}
                            className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                        >
                            <option value="all">All Branches</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                    </div>
                </div>

                {/* Clear Filters */}
                <button
                    onClick={clearFilters}
                    className="text-sm text-black hover:text-gray-700 font-medium"
                >
                    Clear All Filters
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-x-auto">
                <table className="min-w-[1000px] w-full table-auto">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Branch
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Created
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    Loading users...
                                </td>
                            </tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b border-gray-200 hover:bg-gray-50 transition last:border-0"
                                >
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                        {user.full_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {formatRoleName(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {getBranchName(user.branch_id) || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="text-sm text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition"
                                                title="Edit user"
                                            >
                                                <HiPencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                                title="Delete user"
                                            >
                                                <HiTrash className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* Pagination Footer */}
                {!loading && filteredUsers.length > 0 && (
                <div className="min-w-[1000px] w-full px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                    Showing <span className="font-semibold">{offset + 1}</span> to{' '}
                    <span className="font-semibold">
                        {Math.min(offset + itemsPerPage, filteredUsers.length)}
                    </span>{' '}
                    of <span className="font-semibold">{filteredUsers.length}</span> users
                    </div>

                    <div className="flex items-center space-x-2">
                    <select
                        value={pagination.pageSize}
                        onChange={(e) =>
                        setPagination((prev) => ({
                            ...prev,
                            pageSize: parseInt(e.target.value),
                            page: 1,
                        }))
                        }
                        className="appearance-none px-3 py-1 border border-gray-300 rounded text-sm bg-white"
                    >
                        <option value="10">10 per page</option>
                        <option value="25">25 per page</option>
                        <option value="50">50 per page</option>
                    </select>

                    <button
                        onClick={() =>
                        setPagination((prev) => ({
                            ...prev,
                            page: Math.max(1, prev.page - 1),
                        }))
                        }
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                    >
                        Previous
                    </button>

                    <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                        } else if (pagination.page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = pagination.page - 2 + i;
                        }

                        return (
                            <button
                            key={pageNum}
                            onClick={() =>
                                setPagination((prev) => ({
                                ...prev,
                                page: pageNum,
                                }))
                            }
                            className={`px-3 py-1 border rounded text-sm transition ${pagination.page === pageNum
                                ? 'bg-black text-white border-black'
                                : 'border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                            {pageNum}
                            </button>
                        );
                        })}
                    </div>

                    <button
                        onClick={() =>
                        setPagination((prev) => ({
                            ...prev,
                            page: Math.min(totalPages, prev.page + 1),
                        }))
                        }
                        disabled={pagination.page === totalPages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                    >
                        Next
                    </button>
                    </div>
                </div>
                )}
            </div>

            {/* Add/Edit User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto z-50">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-black">
                                {editingUser ? 'Edit User' : 'Add User'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 transition"
                            >
                                <HiX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddUser} className="p-6 space-y-4">
                            <div className='grid grid-cols-2 gap-2'>
                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fullName: e.target.value })
                                        }
                                        placeholder="John Doe"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                        required
                                    />
                                </div>

                                {/* Role */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Role *
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) =>
                                            setFormData({ ...formData, role: e.target.value })
                                        }
                                        className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                        required
                                    >
                                        {roles.map((role) => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    required
                                />
                            </div>

                            {/* Password - Only for new users */}
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                password: e.target.value,
                                            })
                                        }
                                        placeholder="Enter password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                        required
                                    />
                                </div>
                            )}

                            {/* Password - Optional for edit users */}
                            {editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password (leave empty to keep current)
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                password: e.target.value,
                                            })
                                        }
                                        placeholder="Leave empty to keep current password"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    />
                                </div>
                            )}

                            {/* Branch */}
                            <div className="relative col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Branch (Optional)
                                </label>
                                <select
                                    value={formData.branchId}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            branchId: e.target.value,
                                        })
                                    }
                                    className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                >
                                    <option value="">Select a branch...</option>
                                    {branches.map((branch) => (
                                        <option key={branch.id} value={branch.id}>
                                            {branch.name} ({branch.code})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting
                                        ? editingUser
                                            ? 'Saving...'
                                            : 'Creating...'
                                        : editingUser
                                        ? 'Save Changes'
                                        : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showConfirmDialog && userToDelete && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in z-50">
                        {/* Modal Header */}
                        <div className="mb-4">
                            <h2 className="text-2xl font-bold text-black">Delete User</h2>
                        </div>

                        {/* Modal Body */}
                        <div className="mb-6">
                            <p className="text-gray-600 text-sm mb-4">
                                Are you sure you want to delete this user?
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Name:</span>{' '}
                                    {userToDelete.full_name || '-'}
                                </p>
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Email:</span>{' '}
                                    {userToDelete.email}
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDeleteUser}
                                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black rounded-lg transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
