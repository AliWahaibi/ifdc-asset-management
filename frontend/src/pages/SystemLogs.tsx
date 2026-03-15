import { useState, useEffect } from 'react';
import { logService, SystemLog } from '@/services/logService';
import { format } from 'date-fns';
import { Search, Shield, AlertTriangle, Info, XCircle, AlertOctagon, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const LEVEL_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    INFO: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Info },
    WARNING: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: AlertTriangle },
    ERROR: { bg: 'bg-rose-500/10', text: 'text-rose-400', icon: XCircle },
    CRITICAL: { bg: 'bg-red-600/10', text: 'text-red-500', icon: AlertOctagon },
};

export function SystemLogs() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 20;

    const fetchLogs = async (currentPage: number) => {
        setLoading(true);
        try {
            const response = await logService.getLogs(currentPage, LIMIT);
            setLogs(response.data);
            setTotalPages(Math.ceil(response.total / LIMIT));
        } catch (error) {
            toast.error('Failed to load system logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in py-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/20">
                        <Shield className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">System Logs</h1>
                        <p className="mt-1 text-slate-400">Audit trail of system activities and security events.</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Logs Table */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-700/50 bg-slate-900/80">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Timestamp</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Level</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">User</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className="flex justify-center">
                                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No logs found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO;
                                    const Icon = style.icon;
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="p-4 text-sm text-slate-300 font-mono whitespace-nowrap">
                                                {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/5 ${style.bg} ${style.text}`}>
                                                    <Icon className="h-3.5 w-3.5" />
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm font-medium text-white">
                                                {log.action}
                                            </td>
                                            <td className="p-4 text-sm text-slate-300">
                                                {log.user ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-white">{log.user.full_name}</span>
                                                        <span className="text-xs text-slate-500">{log.user.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 italic">System</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-slate-400 max-w-md truncate group-hover:whitespace-normal group-hover:break-words">
                                                {log.details}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && filteredLogs.length > 0 && (
                    <div className="border-t border-slate-700/50 p-4 flex items-center justify-between bg-slate-900/30">
                        <p className="text-sm text-slate-400">
                            Page <span className="font-medium text-white">{page}</span> of <span className="font-medium text-white">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-300"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-300"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
