import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowUpDown,
  FileText,
  UserCircle,
  ClipboardList,
  Truck,
  Package,
  LogIn,
  User
} from 'lucide-react';
import Header from '../components/common/Header';

const mockActivityLogs = [
  { id: 1, user: 'Admin', module: 'Receive', action: 'Received 100 Amoxicillin 500mg tablets from National Medical Stores', date: '2024-06-15 09:15 AM' },
  { id: 2, user: 'Nurse Sarah', module: 'Dispense', action: 'Dispensed 5 Insulin vials to Patient John Doe', date: '2024-06-15 10:30 AM' },
  { id: 3, user: 'Pharm. James', module: 'Redistribution', action: 'Transferred 20 Paracetamol 500mg tablets to Ward 2', date: '2024-06-14 02:45 PM' },
  { id: 4, user: 'Admin', module: 'Users', action: 'Updated permissions for Nurse Sarah', date: '2024-06-14 11:20 AM' },
  { id: 5, user: 'Dr. Smith', module: 'Login', action: 'Logged into the system', date: '2024-06-14 08:05 AM' },
  { id: 6, user: 'Inventory Manager', module: 'Receive', action: 'Received 50 Ibuprofen 200mg tablets from Quality Chemicals', date: '2024-06-13 03:30 PM' },
  { id: 7, user: 'Nurse Sarah', module: 'Dispense', action: 'Dispensed 10 Amoxicillin 500mg tablets to Ward 1', date: '2024-06-13 01:15 PM' },
  { id: 8, user: 'Admin', module: 'Users', action: 'Created new account for Dr. Johnson', date: '2024-06-12 04:50 PM' }
];

const getModuleIcon = (module) => {
  switch (module) {
    case 'Receive': return <Package className="h-4 w-4" />;
    case 'Dispense': return <ClipboardList className="h-4 w-4" />;
    case 'Redistribution': return <Truck className="h-4 w-4" />;
    case 'Users': return <User className="h-4 w-4" />;
    case 'Login': return <LogIn className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const getModuleColor = (module) => {
  switch (module) {
    case 'Receive': return 'bg-blue-500/20 text-blue-300';
    case 'Dispense': return 'bg-green-500/20 text-green-300';
    case 'Redistribution': return 'bg-purple-500/20 text-purple-300';
    case 'Users': return 'bg-yellow-500/20 text-yellow-300';
    case 'Login': return 'bg-gray-500/20 text-gray-300';
    default: return 'bg-gray-600/20 text-gray-200';
  }
};

const ActivityLogsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredLogs = mockActivityLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) || log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;

    const logDate = new Date(log.date);
    const today = new Date();
    let matchesDate = true;
    if (dateFilter === 'today') matchesDate = logDate.toDateString() === today.toDateString();
    else if (dateFilter === 'week') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      matchesDate = logDate >= oneWeekAgo;
    } else if (dateFilter === 'month') {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      matchesDate = logDate >= oneMonthAgo;
    }

    return matchesSearch && matchesModule && matchesDate;
  });

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (!sortConfig.key) return 0;
    if (sortConfig.key === 'date') return (new Date(a.date) - new Date(b.date)) * (sortConfig.direction === 'asc' ? 1 : -1);
    return (a[sortConfig.key] < b[sortConfig.key] ? -1 : 1) * (sortConfig.direction === 'asc' ? 1 : -1);
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Activity Logs" />

      <main className="p-6 space-y-6 text-gray-400 z-10">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search user or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 w-full bg-gray-700 border border-gray-600 rounded-md"
            />
          </div>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
            <option value="all">All Modules</option>
            <option value="Receive">Receive</option>
            <option value="Dispense">Dispense</option>
            <option value="Redistribution">Redistribution</option>
            <option value="Users">Users</option>
            <option value="Login">Login</option>
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Table */}
        <motion.div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <table className="min-w-full text-sm text-left text-gray-300">
            <thead className="bg-gray-700 text-gray-400">
              <tr>
                <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('user')} >
                  User <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="py-2 px-3">Module</th>
                <th className="py-2 px-3">Action Description</th>
                <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('date')}>
                  Date and Time<ArrowUpDown size={12} className="inline ml-1" />
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sortedLogs.map((log) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-700"
                  >
                    <td className="py-2 px-3 flex items-center gap-2">
                      <UserCircle size={18} className="text-indigo-400" />
                      {log.user}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getModuleColor(log.module)}`}>
                        {getModuleIcon(log.module)} {log.module}
                      </span>
                    </td>
                    <td className="py-2 px-3">{log.action}</td>
                    <td className="py-2 px-3">{log.date}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {sortedLogs.length === 0 && (
            <div className="text-center py-6 text-gray-400">
              <FileText className="mx-auto mb-2" size={32} />
              No matching logs found.
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default ActivityLogsPage;
