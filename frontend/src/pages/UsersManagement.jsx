import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Trash2, Edit2, X, Building, UserCog
} from 'lucide-react';

import Header from '../components/common/Header';
import PageIntro from '../components/common/PageIntro';

const FACILITIES = ['Clinic A', 'Hospital B', 'Warehouse 1'];
const ROLES = ['Admin', 'Staff', 'Pharmacist', 'Supervisor'];

const roleColors = {
  Admin: 'bg-purple-500/20 text-purple-300',
  Staff: 'bg-blue-500/20 text-blue-300',
  Pharmacist: 'bg-green-500/20 text-green-300',
  Supervisor: 'bg-amber-500/20 text-amber-300'
};

const facilityColors = {
  'Clinic A': 'bg-indigo-500/20 text-indigo-300',
  'Hospital B': 'bg-red-500/20 text-red-300',
  'Warehouse 1': 'bg-gray-500/20 text-gray-300'
};

export default function UsersManagement() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', email: 'sarah@clinic.org', role: 'Admin', facility: 'Clinic A', status: 'active' },
    { id: 2, name: 'Nurse Mark', email: 'mark@hospital.org', role: 'Staff', facility: 'Hospital B', status: 'active' },
    { id: 3, name: 'Lisa Chen', email: 'lisa@warehouse.org', role: 'Pharmacist', facility: 'Warehouse 1', status: 'inactive' }
  ]);

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '', email: '', role: '', facility: '', status: 'active'
  });

  const [page, setPage] = useState(1);
  const usersPerPage = 5;
  const filteredUsers = users.filter(
    u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );
  const pageCount = Math.ceil(filteredUsers.length / usersPerPage);
  const paginated = filteredUsers.slice((page - 1) * usersPerPage, page * usersPerPage);

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ name: '', email: '', role: '', facility: '', status: 'active' });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({ ...user });
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (modalMode === 'add') {
      setUsers(prev => [...prev, { ...formData, id: Date.now() }]);
    } else {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? formData : u));
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const toggleStatus = (id) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u
    ));
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto text-gray-300">
      <Header title="Users" />

      <main className="p-6 space-y-6 z-9">
        <PageIntro heading="Users" subHeading="Manage user accounts, roles, and access" />

        {/* Search and Add */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
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

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginated.map(user => (
                <tr key={user.id} className="hover:bg-gray-800">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${facilityColors[user.facility] || 'bg-gray-500/20 text-white'}`}>
                      <Building size={12} className="mr-1" /> {user.facility}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-500/20 text-white'}`}>
                      <UserCog size={12} className="mr-1" /> {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className={`text-xs font-medium px-2 py-1 rounded-full ${user.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button className="text-indigo-400 hover:text-indigo-300" onClick={() => openEditModal(user)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="text-red-400 hover:text-red-300" onClick={() => handleDelete(user.id)}>
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
              className={`px-3 py-1 rounded-md border ${page === i + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
                  {modalMode === 'add' ? 'Add New User' : 'Edit User'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-4 max-h-[70vh]">
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                />
                <select
                  name="facility"
                  value={formData.facility}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                >
                  <option value="">Select Facility</option>
                  {FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-md"
                >
                  <option value="">Select Role</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="p-4 border-t border-gray-700 flex justify-end">
                <button
                  onClick={handleSubmit}
                  className="bg-indigo-600 px-4 py-2 text-white rounded-md hover:bg-indigo-700"
                >
                  {modalMode === 'add' ? 'Add User' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
