import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash2, Edit2, X, UserCog, Phone, Loader2 } from "lucide-react"; 
import Header from "../components/common/Header";
import PageIntro from "../components/common/PageIntro";
import {
    getUsers,
    register,
    updateUser,
    RESET_AUTH, 
    toggleStatus,
    deleteUser,
} from "../redux/auth/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { validateEmail } from "../utils"; 

export default function UsersManagement() {
    const { users, isLoading, isSuccess, isError, message } = useSelector(
        (state) => state.auth
    );

    const emptyFormState = {
        name: "",
        email: "",
        phone: "",
        role: "",
        active: true, 
    };

    const ROLES = ["admin", "staff", "pharmacist", "supervisor"];

    const roleColors = {
        admin: "bg-purple-500/20 text-purple-300",
        staff: "bg-blue-500/20 text-blue-300",
        pharmacist: "bg-green-500/20 text-green-300",
        supervisor: "bg-amber-500/20 text-amber-300",
    };

    const [formData, setFormData] = useState(emptyFormState);
    const [search, setSearch] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("add"); 
    const [selectedUser, setSelectedUser] = useState(null);
    const [page, setPage] = useState(1); 
    const [usersFetched, setUsersFetched] = useState(false); // Track if users have been fetched

    // State for custom confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalContent, setConfirmModalContent] = useState({
        title: "",
        message: "",
        action: null, 
    });

    const { name, email, phone, role, active } = formData;

    const dispatch = useDispatch();

    const usersPerPage = 5;
    const filteredUsers =
        users?.filter(
            (u) =>
                u.name.toLowerCase().includes(search.toLowerCase()) ||
                u.email.toLowerCase().includes(search.toLowerCase())
        ) || [];

    const pageCount = Math.ceil(filteredUsers.length / usersPerPage);
    const paginated = filteredUsers.slice(
        (page - 1) * usersPerPage,
        page * usersPerPage
    );

    // Fetch users when loading state changes - FIXED: Refetch only when necessary
    useEffect(() => {
        if (!isLoading && users.length === 0) {
            dispatch(getUsers());
        }
    }, [dispatch, isLoading, users.length]);

    // Handle errors - FIXED: Remove automatic re-fetching on error
    useEffect(() => {
        if (isError && message) {
            toast.error(message);
            dispatch(RESET_AUTH()); 
        }
    }, [isError, message, dispatch]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === "active" ? value === "true" : value, 
        });
    };

    const handleSubmitUserForm = async (e) => {
        e.preventDefault();

        if (!name || !email || !phone || !role) {
            toast.error("Enter all required fields");
            return;
        }
        if (!validateEmail(email)) {
            toast.error("Invalid email");
            return;
        }

        let resultAction;
        if (modalMode === "add") {
            resultAction = await dispatch(register({ name, email, phone, role, active }));
        } else { // modalMode === "edit"
            resultAction = await dispatch(updateUser({ id: selectedUser._id, userData: { name, phone, role, active } }));
        }

        // Handle the result directly after the dispatch
        if (resultAction.meta.requestStatus === 'fulfilled') {
            setShowModal(false); 
            setFormData(emptyFormState); // Reset form
            toast.success(modalMode === "add" ? "User added successfully!" : "User updated successfully!");
            if (modalMode === "add") {
                await dispatch(getUsers()); // Fetch latest users after adding
                setPage(1); // Optionally reset to first page
            }
        } else if (resultAction.meta.requestStatus === 'rejected') {
            console.error("Form submission failed:", resultAction.payload);
        }
    };

    const openAddModal = () => {
        setModalMode("add");
        setFormData(emptyFormState); 
        setShowModal(true);
    };

    const openEditModal = (userToEdit) => {
        setModalMode("edit");
        setSelectedUser(userToEdit);
        setFormData({
            name: userToEdit.name,
            email: userToEdit.email,
            phone: userToEdit.phone,
            role: userToEdit.role,
            active: Boolean(userToEdit.active), 
        });
        setShowModal(true);
    };

    // --- Custom Confirmation Modal Logic ---
    const showConfirmation = (title, message, action) => {
        setConfirmModalContent({ title, message, action });
        setShowConfirmModal(true);
    };

    const handleConfirmAction = async () => {
        // Disable buttons while action is in progress
        setConfirmModalContent(prev => ({ ...prev, action: null })); // Prevent re-execution
        try {
            if (confirmModalContent.action) {
                await confirmModalContent.action(); // Execute the stored action
            }
        } finally {
            setShowConfirmModal(false); // Close modal regardless of success/failure
            setConfirmModalContent({ title: "", message: "", action: null }); // Reset content
        }
    };

    const handleCancelConfirmation = () => {
        setShowConfirmModal(false);
        setConfirmModalContent({ title: "", message: "", action: null });
    };
    // --- End Custom Confirmation Modal Logic ---

    const handleDelete = (userId) => {
        showConfirmation(
            "Confirm Deletion",
            "Are you sure you want to delete this user? This action cannot be undone.",
            async () => {
                const resultAction = await dispatch(deleteUser(userId));
                if (deleteUser.fulfilled.match(resultAction)) {
                    // FIXED: Remove unnecessary re-fetch, Redux state should be updated
                    toast.success("User deleted successfully!");
                } else if (deleteUser.rejected.match(resultAction)) {
                    toast.error(resultAction.payload || "Failed to delete user.");
                }
            }
        );
    };

    const toggleUserStatus = (userId) => {
        const userToToggle = users.find(u => u._id === userId);
        if (!userToToggle) return;

        const newStatus = !Boolean(userToToggle.active); // Determine new status
        const actionMessage = newStatus ? "activate" : "deactivate";

        showConfirmation(
            "Confirm Status Change",
            `Are you sure you want to ${actionMessage} this user?`,
            async () => {
                const resultAction = await dispatch(toggleStatus(userId));
                if (toggleStatus.fulfilled.match(resultAction)) {
                    toast.success(`User ${actionMessage}d successfully!`);
                    // FIXED: Remove unnecessary re-fetch, Redux state should be updated
                } else if (toggleStatus.rejected.match(resultAction)) {
                    toast.error(resultAction.payload || "Failed to change user status.");
                }
            }
        );
    };

    return (
        <div className="flex flex-col flex-1 overflow-y-auto text-gray-300">
            <Header title="Users" />
            <main className="p-6 space-y-6 z-9">
                <PageIntro
                    heading="Users"
                    subHeading="Manage user accounts, roles, and access"
                />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:w-1/3">
                        <Search
                            className="absolute left-3 top-2.5 text-gray-400"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-3 py-2 w-full bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center transition-colors duration-200"
                    >
                        <Plus size={16} className="mr-2" /> Add User
                    </button>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                    {isLoading && users.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="animate-spin text-indigo-400" size={32} />
                            <span className="ml-3 text-lg text-gray-300">Loading users...</span>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                            No users found.
                        </div>
                    ) : (
                        <table className="min-w-full text-sm text-left text-gray-300">
                            <thead className="bg-gray-800 text-gray-400">
                                <tr>
                                    <th className="py-3 px-4">Name</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Phone</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {paginated.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-800">
                                        <td className="py-3 px-4">{user.name}</td>
                                        <td className="py-3 px-4">{user.email}</td>
                                        <td className="py-3 px-4">{user.phone}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                    roleColors[user.role] || "bg-gray-500/20 text-white"
                                                }`}
                                            >
                                                <UserCog size={12} className="mr-1" /> {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(user.active)} 
                                                    onChange={() => toggleUserStatus(user._id)}
                                                    className="sr-only peer"
                                                />
                                                <div className="relative w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-500 transition-colors duration-300 ease-in-out">
                                                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 ease-in-out transform peer-checked:translate-x-5"></div>
                                                </div>
                                            </label>
                                        </td>

                                        <td className="py-3 px-4 flex gap-2">
                                            <button
                                                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                                onClick={() => openEditModal(user)}
                                                title="Edit User"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                onClick={() => handleDelete(user._id)}
                                                title="Delete User"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                    <div className="flex justify-end gap-2">
                        {Array.from({ length: pageCount }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setPage(i + 1)}
                                className={`px-3 py-1 rounded-md border ${
                                    page === i + 1
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600"
                                } transition-colors duration-200`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Add/Edit User Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden flex flex-col"
                        >
                            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                                <h3 className="text-lg font-semibold text-white">
                                    {modalMode === "add" ? "Add New User" : "Edit User"}
                                </h3>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmitUserForm}>
                                <div className="overflow-y-auto p-4 space-y-4 max-h-[70vh]">
                                    <input
                                        type="text"
                                        name="name"
                                        value={name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Full Name"
                                        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={isLoading}
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Email"
                                        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={isLoading || modalMode === "edit"} // Email usually not editable
                                    />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={phone}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Phone"
                                        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={isLoading}
                                    />
                                    <select
                                        name="role"
                                        value={role}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        disabled={isLoading}
                                    >
                                        <option value="">Select Role</option>
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>
                                                {r.charAt(0).toUpperCase() + r.slice(1)} {/* Capitalize role for display */}
                                            </option>
                                        ))}
                                    </select>
                                   
                                </div>
                                <div className="p-4 border-t border-gray-700 flex justify-end">
                                    <button
                                        type="submit"
                                        className="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 flex items-center gap-2"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : null}
                                        {modalMode === "add" ? "Add User" : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4"
                        onClick={handleCancelConfirmation}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden"
                        >
                            <div className="p-5">
                                <h3 className="text-lg font-semibold text-white mb-3">{confirmModalContent.title}</h3>
                                <p className="text-gray-300 text-sm">{confirmModalContent.message}</p>
                            </div>
                            <div className="flex justify-end gap-3 p-4 bg-gray-800 border-t border-gray-700">
                                <button
                                    onClick={handleCancelConfirmation}
                                    className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmAction}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                                    Confirm
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}