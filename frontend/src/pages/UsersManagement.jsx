import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash2, Edit2, X, UserCog, Phone } from "lucide-react";
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
import { validateEmail } from "../../utils";

const initialState = {
  name: "",
  email: "",
  phone: "",
  role: "",
  active: "true",
};

const ROLES = ["admin", "staff", "pharmacist", "supervisor"];

const roleColors = {
  Admin: "bg-purple-500/20 text-purple-300",
  Staff: "bg-blue-500/20 text-blue-300",
  Pharmacist: "bg-green-500/20 text-green-300",
  Supervisor: "bg-amber-500/20 text-amber-300",
};

export default function UsersManagement() {
  const [formData, setFormData] = useState(initialState);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(1);

  const { name, email, phone, role, active } = formData;

  const dispatch = useDispatch();
  const { users, isLoading, isLoggedIn, isSuccess } = useSelector(
    (state) => state.auth
  );

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

  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  useEffect(() => {
    if (isSuccess && modalMode === "add") {
      dispatch(getUsers());
      dispatch(RESET_AUTH());
      setShowModal(false);
    }
  }, [isSuccess, modalMode, dispatch]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "active" ? value === "true" : value,
    });
  };

  const registerUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !phone || !role)
      return toast.error("Enter all required fields");
    if (!validateEmail(email)) return toast.error("Invalid email");
    if (users.find((u) => u.email === email)) {
      return toast.error("Email already exists");
    }

    const userData = { name, email, phone, role, active };

    if (modalMode === "add") {
      await dispatch(register(userData));
    } else {
      await dispatch(updateUser({ ...userData, id: selectedUser._id }));
    }

    dispatch(getUsers());
    setShowModal(false);
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData(initialState);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormData({ ...user });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    await dispatch(deleteUser(userId));
    dispatch(getUsers());
  };

  const toggleUserStatus = async (userId) => {
    await dispatch(toggleStatus(userId));
    dispatch(getUsers());
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
              className="pl-10 pr-3 py-2 w-full bg-gray-800 border border-gray-700 rounded-md text-white"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus size={16} className="mr-2" /> Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
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
                      <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-green-500 relative transition-all duration-300">
                        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                  </td>

                  <td className="py-3 px-4 flex gap-2">
                    <button
                      className="text-indigo-400 hover:text-indigo-300"
                      onClick={() => openEditModal(user)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(user._id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end gap-2">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-md border ${
                page === i + 1
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>

      {/* Modal */}
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
                  className="text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={registerUser}>
                <div className="overflow-y-auto p-4 space-y-4 max-h-[70vh]">
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={handleInputChange}
                    required
                    placeholder="Full Name"
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                  />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleInputChange}
                    required
                    placeholder="Email"
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                  />
                  <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={handleInputChange}
                    required
                    placeholder="Phone"
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                  />
                  <select
                    name="role"
                    value={role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                  >
                    <option value="">Select Role</option>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end">
                  <button
                    type="submit"
                    className="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
                  >
                    {modalMode === "add" ? "Add User" : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
