import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { HiTrash, HiPlus, HiX } from 'react-icons/hi';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        role: 'mechanic',
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const roles = [
        { value: 'admin', label: 'Admin' },
        { value: 'branch_manager', label: 'Branch Manager' },
        { value: 'service_advisor', label: 'Service Advisor' },
        { value: 'mechanic', label: 'Mechanic' },
        { value: 'inventory_officer', label: 'Inventory Officer' },
        { value: 'executive', label: 'Executive' },
    ];

    // Fetch users from database
    useEffect(() => {
        getCurrentUser();
        fetchUsers();
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
                .select('id, email, full_name, role, created_at')
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage('');

        try {
            // Validate inputs
            if (!formData.email || !formData.password || !formData.fullName) {
                setError('All fields are required');
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

            // Call backend register endpoint with Bearer token
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create user');
            } else {
                setSuccessMessage(`User ${formData.email} created successfully!`);
                setFormData({
                    email: '',
                    password: '',
                    fullName: '',
                    role: 'mechanic',
                });
                setShowAddForm(false);
                fetchUsers(); // Refresh user list
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
            setError(`Failed to create user: ${err.message}. Make sure backend is running at ${backendUrl}`);
            console.error('Add user error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        // Show confirmation dialog
        setUserToDelete({ id: userId, email: userEmail });
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
                    adminId: currentUserId, // Pass the current user's ID
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError('Failed to delete user: ' + (data.error || 'Unknown error'));
                console.error('Delete error:', data);
            } else {
                setSuccessMessage(`User ${userEmail} deleted successfully!`);
                fetchUsers(); // Refresh user list
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
                        <p className="text-gray-600">Add, view, and manage system users</p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center justify-between">
                    <p>{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="text-red-700 hover:text-red-900"
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Add User Form */}
            {showAddForm && (
                <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-black mb-4">Add New User</h2>
                    <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    placeholder="user@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Role *
                                </label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition bg-white text-gray-900"
                                    required
                                >
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-10 w-5 h-5 text-gray-600 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Creating...' : 'Create User'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-black px-6 py-2 rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Users List */}
            <div className="bg-white w-full rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center text-gray-600">Loading users...</div>
                ) : users.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">No users found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="pb-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition"
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                            {user.full_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                                                {user.role.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                className="inline-flex items-center space-x-1 text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-2 rounded-lg transition"
                                            >
                                                <HiTrash className="w-4 h-4" />
                                                <span className="text-xs font-medium">Delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* User Count Footer */}
                {!loading && users.length > 0 && (
                    <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-700">
                        Total users: <span className="font-semibold">{users.length}</span>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showConfirmDialog && userToDelete && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="fixed inset-0 bg-black opacity-50"></div>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in z-50">
                        {/* Modal Header */}
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-black">Delete User</h2>
                        </div>

                        {/* Modal Body */}
                        <div className="mb-6">
                            <p className="text-gray-600 text-sm mb-4">
                                Are you sure you want to delete this user?
                            </p>
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Email:</span> {userToDelete.email}
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
