import { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Column } from '@/components/ui/DataTable';
import type { Reservation } from '@/types';
import { reservationService } from '@/services/reservationService';
import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole } from '@/lib/roles';
import toast from 'react-hot-toast';

export function ReservationsDashboard() {
    const { user } = useAuthStore();
    const canApprove = user ? hasAnyRole(user.role, ['super_admin', 'manager', 'team_leader']) : false;

    const [activeTab, setActiveTab] = useState<'pending' | 'all'>(canApprove ? 'pending' : 'all');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);



    const fetchReservations = async () => {
        try {
            setLoading(true);
            const data = await reservationService.getReservations(1, 100);
            setReservations(data.data || []);
        } catch (error) {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const handleAction = async (id: string, newStatus: 'approved' | 'rejected' | 'cancelled') => {
        try {
            await reservationService.updateReservationStatus(id, { status: newStatus });
            toast.success(`Reservation ${newStatus}`);
            fetchReservations(); // Refresh
        } catch (error) {
            toast.error(`Failed to mark reservation as ${newStatus}`);
        }
    };

    const columns: Column<Reservation>[] = [
        {
            key: 'id',
            header: 'Request ID',
            render: (row) => <span className="font-mono text-xs text-slate-400">{row.id.substring(0, 8)}...</span>,
        },
        {
            key: 'asset_type',
            header: 'Asset Type',
            render: (row) => <span className="uppercase text-slate-300">{row.asset_type}</span>,
        },
        {
            key: 'asset_id',
            header: 'Asset Name',
            render: (row) => <span className="font-medium text-slate-200">{row.asset_name || <span className="font-mono text-xs text-slate-400">{row.asset_id.substring(0, 8)}...</span>}</span>,
        },
        {
            key: 'start_date',
            header: 'Start Date',
            render: (row) => <span className="text-slate-300">{new Date(row.start_date).toLocaleDateString()}</span>,
        },
        {
            key: 'end_date',
            header: 'End Date',
            render: (row) => <span className="text-slate-300">{new Date(row.end_date).toLocaleDateString()}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => {
                const pending = row.status === 'pending';
                const approved = row.status === 'approved';
                const rejected = row.status === 'rejected';

                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${pending ? 'bg-amber-500/10 text-amber-400' :
                        approved ? 'bg-emerald-500/10 text-emerald-400' :
                            rejected ? 'bg-rose-500/10 text-rose-400' :
                                'bg-slate-500/10 text-slate-400'
                        }`}>
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                    </span>
                );
            }
        },
        {
            key: 'user_id',
            header: 'User',
            render: (row) => <span className="font-medium text-slate-200">{row.user?.full_name || <span className="font-mono text-xs text-slate-400">{row.user_id?.substring(0, 8)}...</span>}</span>,
        },
        {
            key: 'notes',
            header: 'Reason',
            render: (row) => <span className="text-xs text-slate-400">{row.notes}</span>,
        },
        {
            key: 'id_actions',
            header: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-2">
                    {canApprove && row.status === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(row.id, 'approved')}
                                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                            >
                                <CheckCircle2 className="h-3 w-3" /> Approve
                            </button>
                            <button
                                onClick={() => handleAction(row.id, 'rejected')}
                                className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                            >
                                <XCircle className="h-3 w-3" /> Reject
                            </button>
                        </>
                    ) : canApprove && row.status === 'approved' ? (
                        <button
                            onClick={() => handleAction(row.id, 'cancelled')}
                            className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/20"
                        >
                            <XCircle className="h-3 w-3" /> Revoke
                        </button>
                    ) : (
                        <span className="text-xs text-slate-500">No actions</span>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mt-2 mb-10">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 shadow-lg shadow-indigo-500/20">
                            <CalendarCheck className="h-7 w-7 text-white" />
                        </div>
                        Reservations
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">
                        {canApprove
                            ? "Review and approve asset reservation requests."
                            : "Track your pending, approved, and past reservations."}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Requests', value: reservations.length, color: 'text-white' },
                    { label: 'Pending', value: reservations.filter(r => r.status === 'pending').length, color: 'text-amber-400' },
                    { label: 'Approved', value: reservations.filter(r => r.status === 'approved').length, color: 'text-emerald-400' },
                    { label: 'Rejected', value: reservations.filter(r => r.status === 'rejected').length, color: 'text-rose-400' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                        <p className={`font-heading mt-2 text-4xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>



            {/* Table */}
            <div className="glass-panel mt-6 flex overflow-hidden">
                <div className="flex w-full flex-col">
                    {/* Tabs for Admins */}
                    {canApprove && (
                        <div className="border-b border-slate-700/50 bg-slate-900/50 px-4 py-3">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveTab('pending')}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pending' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    Pending Approval
                                    {reservations.filter(r => r.status === 'pending').length > 0 && (
                                        <span className="ml-2 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] text-white">
                                            {reservations.filter(r => r.status === 'pending').length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setActiveTab('all')}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'all' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
                                >
                                    All Reservations
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="p-4">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={activeTab === 'pending' ? reservations.filter(r => r.status === 'pending') : reservations}
                                keyExtractor={(row) => row.id}
                                searchPlaceholder="Search by ID or type..."
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
