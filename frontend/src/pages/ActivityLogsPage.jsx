// src/pages/ActivityLogsPage.jsx
import { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ArrowUpDown,
    FileText,
    UserCircle,
    ClipboardList,
    Truck,
    Package,
    Pill,
    User,
    Loader2 // For loading spinner
} from 'lucide-react';
import Header from '../components/common/Header';

// Import Redux hooks and action
import { useDispatch, useSelector } from 'react-redux';
import { getLogs, RESET_LOGS } from '../redux/activityLog/activityLogSlice';

const getModuleIcon = (module) => {
    switch (module) {
        case 'Dispensation': return <ClipboardList className="h-4 w-4" />;
        case 'Redistribution': return <Truck className="h-4 w-4" />;
        case 'User': return <User className="h-4 w-4" />;
        case 'Inventory': return <Package className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
    }
};

const getModuleColor = (module) => {
    switch (module) {
        case 'Dispensation': return 'bg-green-500/20 text-green-300';
        case 'Redistribution': return 'bg-purple-500/20 text-purple-300';
        case 'Users': return 'bg-yellow-500/20 text-yellow-300';
        case 'Inventory': return 'bg-blue-500/20 text-blue-300';
        default: return 'bg-gray-600/20 text-gray-200';
    }
};

const ActivityLogsPage = () => {
    const dispatch = useDispatch();
    const { logs, isLoading, isError, message } = useSelector((state) => state.activityLog); // Get data from Redux

    const [searchTerm, setSearchTerm] = useState('');
    const [moduleFilter, setModuleFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState('all'); 
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' }); 

    // Helper to get formatted date string for backend
    const getFormattedDate = (date) => date.toISOString().split('T')[0];

    // Function to fetch logs based on current filters, memoized with useCallback
    const fetchLogs = useCallback(() => {
        let fromDate = null;
        let toDate = null;
        const today = new Date();

        switch (dateRangeFilter) {
            case 'today':
                fromDate = getFormattedDate(today);
                toDate = getFormattedDate(today);
                break;
            case 'week':
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(today.getDate() - 7);
                fromDate = getFormattedDate(oneWeekAgo);
                toDate = getFormattedDate(today);
                break;
            case 'month':
                const oneMonthAgo = new Date(today);
                oneMonthAgo.setMonth(today.getMonth() - 1);
                fromDate = getFormattedDate(oneMonthAgo);
                toDate = getFormattedDate(today);
                break;
            case 'all':
            default:
                // No date filters
                break;
        }

        dispatch(getLogs({
            module: moduleFilter === 'all' ? undefined : moduleFilter, // Send undefined if 'all'
            from: fromDate,
            to: toDate,
 
        }));
    }, [dispatch, moduleFilter, dateRangeFilter]); // Re-fetch when these filters change

    // Trigger fetch on component mount and when relevant filters change
    useEffect(() => {
        fetchLogs();

        // Cleanup: Reset logs state when component unmounts
        return () => {
            dispatch(RESET_LOGS());
        };
    }, [fetchLogs, dispatch]);

    // Client-side filtering based on searchTerm (user name or action description)
    const clientFilteredLogs = logs.filter(log => {
        const userName = log.user ? log.user.name : 'Unknown User'; // Access log.user.name
        const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) || log.action.toLowerCase().includes(searchTerm.toLowerCase());
        // Module and Date filtering are handled by the backend request via fetchLogs
        return matchesSearch;
    });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // Client-side sorting
    const sortedLogs = [...clientFilteredLogs].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = sortConfig.key === 'createdAt' ? new Date(a.createdAt) : (sortConfig.key === 'user' ? (a.user?.name || '') : a[sortConfig.key]);
        let bValue = sortConfig.key === 'createdAt' ? new Date(b.createdAt) : (sortConfig.key === 'user' ? (b.user?.name || '') : b[sortConfig.key]);
        
        // Handle undefined or null values gracefully for string comparison
        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return (sortConfig.direction === 'asc' ? -1 : 1);
        if (aValue > bValue) return (sortConfig.direction === 'asc' ? 1 : -1);
        return 0;
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
                            className="pl-10 pr-3 py-2 w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={moduleFilter}
                        onChange={(e) => setModuleFilter(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Modules</option>
                        <option value="Dispensation">Dispensation</option>
                        <option value="Redistribution">Redistribution</option>
                        <option value="Users">Users</option>
                        <option value="inventory">Inventory</option>
                    </select>
                    <select
                        value={dateRangeFilter}
                        onChange={(e) => setDateRangeFilter(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>

                {/* Table */}
                <motion.div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="animate-spin text-blue-400" size={32} />
                            <span className="ml-3 text-lg text-gray-300">Loading logs...</span>
                        </div>
                    ) : isError ? (
                        <div className="text-center py-10 text-red-400">
                            Error loading logs: {message}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-700 shadow-lg">
                        <table className="min-w-full text-sm text-left text-gray-300">
                            <thead className="bg-gray-700 text-gray-400">
                                <tr>
                                    <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('user')} >
                                        User <ArrowUpDown size={12} className="inline ml-1" />
                                    </th>
                                    <th className="py-2 px-3">Module</th>
                                    <th className="py-2 px-3">Action Description</th>
                                    <th className="py-2 px-3 cursor-pointer" onClick={() => handleSort('createdAt')}> 
                                        Date and Time <ArrowUpDown size={12} className="inline ml-1" />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {sortedLogs.length > 0 ? (
                                        sortedLogs.map((log) => (
                                            <motion.tr
                                                key={log._id} 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                                            >
                                                <td className="py-2 px-3 flex items-center gap-2">
                                                    <UserCircle size={18} className="text-indigo-400" />
                                                    {log.user ? log.user.name : 'N/A'} {/* Access log.user.name */}
                                                </td>
                                                <td className="py-2 px-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getModuleColor(log.module)}`}>
                                                        {getModuleIcon(log.module)} {log.module}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3">{log.action}</td>
                                                <td className="py-2 px-3">
                                                    {new Date(log.createdAt).toLocaleString()} {/* Use createdAt for date */}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-6 text-gray-400">
                                                <FileText className="mx-auto mb-2" size={32} />
                                                No matching logs found.
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default ActivityLogsPage;