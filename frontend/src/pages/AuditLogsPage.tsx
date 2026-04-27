import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import type { AuditLog } from '@/types';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Activity, Calendar, User as UserIcon, Box, Eye, Code, Search } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/audit-logs', { params: { limit: 100 } });
            setLogs(response.data.data || []);
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            key: 'created_at',
            header: 'Timestamp',
            render: (row: AuditLog) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span>{format(new Date(row.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                </div>
            )
        },
        {
            key: 'user',
            header: 'User',
            render: (row: AuditLog) => (
                <div className="flex items-center gap-2">
                    {row.user ? (
                        <>
                            <div className="h-6 w-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                                {row.user.full_name?.charAt(0) || '?'}
                            </div>
                            <span>{row.user.full_name}</span>
                        </>
                    ) : (
                        <>
                            <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center">
                                <UserIcon className="h-3 w-3 text-slate-500" />
                            </div>
                            <span className="text-slate-500 italic">System</span>
                        </>
                    )}
                </div>
            )
        },
        {
            key: 'action_type',
            header: 'Action',
            render: (row: AuditLog) => {
                let badgeColor = 'bg-slate-800 text-slate-300';
                if (row.action_type.includes('dispatch')) badgeColor = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
                if (row.action_type.includes('alert')) badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                
                return (
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${badgeColor}`}>
                        {row.action_type.replace(/_/g, ' ')}
                    </span>
                );
            }
        },
        {
            key: 'entity',
            header: 'Target Entity',
            render: (row: AuditLog) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-300 uppercase">{row.entity_type}</span>
                    <span className="text-xs text-slate-500 font-mono">{row.entity_id}</span>
                </div>
            )
        },
        {
            key: 'details',
            header: 'Details',
            sortable: false,
            render: (row: AuditLog) => (
                <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedLog(row); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-all text-xs font-bold uppercase tracking-wider"
                >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                </button>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-2.5 shadow-xl shadow-violet-500/20">
                            <Activity className="h-7 w-7 text-white" />
                        </div>
                        Audit Trail
                    </h1>
                    <p className="mt-3 text-lg text-white/50">
                        Comprehensive log of all critical system actions.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center glass-panel">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
            ) : (
                <DataTable 
                    columns={columns} 
                    data={logs} 
                    keyExtractor={(row) => row.id.toString()}
                    searchPlaceholder="Search audit logs..."
                />
            )}

            {/* JSON Details Modal */}
            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="Audit Log Details"
                size="lg"
            >
                {selectedLog && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30">
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Action</p>
                                <p className="text-lg font-bold text-white mt-1 uppercase">{selectedLog.action_type.replace(/_/g, ' ')}</p>
                            </div>
                            <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30">
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Entity</p>
                                <p className="text-lg font-bold text-cyan-400 mt-1 uppercase">{selectedLog.entity_type} <span className="text-xs text-slate-500 font-mono tracking-normal ml-2">{selectedLog.entity_id}</span></p>
                            </div>
                        </div>

                        <div className="rounded-xl bg-slate-950 border border-slate-800/60 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800/60">
                                <Code className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-bold text-slate-300">Payload Metadata</h3>
                            </div>
                            <div className="p-4 overflow-x-auto custom-scrollbar">
                                <pre className="text-xs font-mono text-emerald-400">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
