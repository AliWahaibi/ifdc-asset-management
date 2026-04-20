import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { leaveService } from '@/services/leaveService';
import type { LeaveRequest, LeaveBalance } from '@/types';
import { 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Plus, 
    Info, 
    AlertCircle,
    ChevronRight,
    User,
    MessageSquare,
    Calculator
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import toast from 'react-hot-toast';

export function LeaveManagement() {
    const { user } = useAuthStore();
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [balance, setBalance] = useState<LeaveBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        leave_type: 'annual',
        special_leave_reason: '',
        reason: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leavesData, balanceData] = await Promise.all([
                leaveService.getLeaves(),
                leaveService.getBalance()
            ]);
            setLeaves(leavesData);
            setBalance(balanceData);
        } catch (error) {
            toast.error('Failed to load leave data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await leaveService.createLeave(formData);
            toast.success('Leave request submitted successfully');
            setModalOpen(false);
            setFormData({ start_date: '', end_date: '', leave_type: 'annual', special_leave_reason: '', reason: '' });
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        const comment = window.prompt(`Enter a comment for this ${status}:`);
        if (comment === null) return;

        try {
            await leaveService.updateLeaveStatus(id, status, comment);
            toast.success(`Request ${status} successfully`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const columns: Column<LeaveRequest>[] = [
        ...(user?.role !== 'employee' ? [{
            key: 'user',
            header: 'Employee',
            render: (row: LeaveRequest) => (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400 border border-slate-700">
                        {row.user?.full_name?.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-white">{row.user?.full_name}</span>
                </div>
            )
        }] : []),
        {
            key: 'leave_type',
            header: 'Type',
            render: (row) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    row.leave_type === 'annual' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                    row.leave_type === 'sick' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    row.leave_type === 'emergency' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                }`}>
                    {row.leave_type}
                </span>
            )
        },
        {
            key: 'start_date',
            header: 'Start Date',
            render: (row) => <span className="text-slate-300 font-mono text-xs">{new Date(row.start_date).toLocaleDateString()}</span>
        },
        {
            key: 'end_date',
            header: 'End Date',
            render: (row) => <span className="text-slate-300 font-mono text-xs">{new Date(row.end_date).toLocaleDateString()}</span>
        },
        {
            key: 'total_days',
            header: 'Working Days',
            render: (row) => (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Calculator className="h-3 w-3" />
                    {row.total_days}
                </div>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => {
                // Map internal statuses to badge styles
                const statusMap: Record<string, string> = {
                    'pending_manager': 'pending',
                    'pending_ceo': 'pending',
                    'approved': 'available',
                    'rejected': 'retired',
                    'cancelled': 'retired'
                };
                const labelMap: Record<string, string> = {
                    'pending_manager': 'Pending Manager',
                    'pending_ceo': 'Pending CEO',
                    'approved': 'Approved',
                    'rejected': 'Rejected',
                    'cancelled': 'Cancelled'
                };
                return (
                    <div className="flex flex-col gap-1">
                        <StatusBadge status={statusMap[row.status] as any} />
                        <span className="text-[9px] uppercase tracking-tighter text-slate-500 font-bold px-1.5">{labelMap[row.status]}</span>
                    </div>
                );
            }
        },
        {
            key: 'id',
            header: 'Actions',
            sortable: false,
            render: (row) => {
                const isPending = row.status === 'pending_manager' || row.status === 'pending_ceo';
                const canApprove = (user?.role === 'super_admin') || 
                                 (user?.role === 'manager' && row.status === 'pending_manager' && row.user?.manager_id === user?.id);
                
                return (
                    <div className="flex gap-2">
                        {canApprove && isPending && (
                            <>
                                <button onClick={() => handleUpdateStatus(row.id, 'approved')} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleUpdateStatus(row.id, 'rejected')} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all">
                                    <XCircle className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        {row.user_id === user?.id && isPending && (
                            <button onClick={() => handleUpdateStatus(row.id, 'cancelled')} className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors uppercase">
                                Cancel
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-2.5 shadow-xl shadow-cyan-500/20">
                            <Calendar className="h-7 w-7 text-white" />
                        </div>
                        Leave Management
                    </h1>
                    <p className="mt-3 text-lg text-white/50">
                        Oman localized leave tracking with automated weekend calculation.
                    </p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Request New Leave
                </button>
            </div>

            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Calendar className="h-16 w-16 text-cyan-400" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Annual Balance</p>
                    <h3 className="text-3xl font-black text-white mt-1">23 <span className="text-sm font-medium text-slate-400 tracking-normal italic">working days</span></h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-cyan-400/70">
                        <Info className="h-3 w-3" />
                        Excludes Fri-Sat weekend (Oman)
                    </div>
                </div>

                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Clock className="h-16 w-16 text-violet-400" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Days Used</p>
                    <h3 className="text-3xl font-black text-white mt-1">{balance?.used_annual || 0} <span className="text-sm font-medium text-slate-400 tracking-normal italic">days</span></h3>
                    <div className="mt-4 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-violet-500 transition-all duration-1000"
                            style={{ width: `${((balance?.used_annual || 0) / 30) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="glass-panel p-6 relative overflow-hidden group border-emerald-500/20">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Remaining Balance</p>
                    <h3 className="text-3xl font-black text-emerald-400 mt-1">{balance?.remaining_annual ?? '--'} <span className="text-sm font-medium text-slate-400 tracking-normal italic">days</span></h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400/70">
                        Available for request
                    </div>
                </div>

                {/* Sick Leave Display */}
                <div className="glass-panel p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertCircle className="h-16 w-16 text-amber-500" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sick Leave Used</p>
                    <h3 className="text-3xl font-black text-white mt-1">{balance?.used_sick || 0} <span className="text-sm font-medium text-slate-400 tracking-normal italic">days</span></h3>
                    <div className="mt-4 flex items-center justify-between text-[10px] text-amber-500/70">
                        <span>Includes weekends</span>
                    </div>
                </div>
            </div>

            {/* Main Content Areas */}
            <div className="grid grid-cols-1 gap-8">
                <div className="glass-panel p-0 overflow-hidden border-slate-800/50">
                    <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-white/[0.02]">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Clock className="h-5 w-5 text-cyan-400" />
                            Leave History & Approvals
                        </h2>
                    </div>
                    <div className="p-0">
                        {loading ? (
                            <div className="p-20 flex justify-center">
                                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                            </div>
                        ) : (
                            <DataTable 
                                columns={columns}
                                data={leaves}
                                keyExtractor={(row) => row.id}
                                searchPlaceholder="Search requests..."
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Request Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="New Leave Request"
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-400 mb-2">Leave Type</label>
                        <select
                            required
                            value={formData.leave_type}
                            onChange={e => setFormData({ ...formData, leave_type: e.target.value })}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all text-sm"
                        >
                            <option value="annual">Annual Leave</option>
                            <option value="sick">Sick Leave</option>
                            <option value="emergency">Emergency Leave</option>
                            <option value="special">Special Leave</option>
                        </select>
                    </div>

                    {formData.leave_type === 'special' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-400 mb-2">Special Reason Classification</label>
                            <select
                                required
                                value={formData.special_leave_reason}
                                onChange={e => setFormData({ ...formData, special_leave_reason: e.target.value })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all text-sm"
                            >
                                <option value="" disabled>Select special classification...</option>
                                <option value="hajj">Hajj Leave (20 days once)</option>
                                <option value="marriage">Marriage Leave (3 days once)</option>
                                <option value="paternity">Paternity Leave (7 days)</option>
                                <option value="maternity">Maternity Leave (98 days)</option>
                                <option value="bereavement_family">Bereavement - Immediate Family (3 days)</option>
                                <option value="bereavement_spouse">Bereavement - Spouse (10 days)</option>
                                <option value="bereavement_wife_muslim">Wife's Mourning - Muslim (130 days)</option>
                                <option value="bereavement_wife_nonmuslim">Wife's Mourning - Non Muslim (14 days)</option>
                                <option value="study_exam">Study/Exam Leave (15 days/yr)</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-400 mb-2">Start Date</label>
                            <input 
                                required
                                type="date"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-400 mb-2">End Date</label>
                            <input 
                                required
                                type="date"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all font-mono text-sm"
                            />
                        </div>
                    </div>

                    {formData.leave_type === 'annual' && formData.start_date && (
                        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-4 flex items-start gap-3">
                            <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-white">Annual Leave Notice</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Leaves longer than 15 days require 30 days notice. Shorter leaves require 7 days notice.
                                    Fridays and Saturdays are excluded from the balance calculation.
                                </p>
                            </div>
                        </div>
                    )}
                    {formData.leave_type === 'sick' && formData.start_date && (
                        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-400">Sick Leave Calculation</p>
                                <p className="text-xs text-amber-400/80 mt-1">
                                    Sick leaves are calculated including weekends (calendar days) per Oman Labour Law.
                                </p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-400 mb-2">Reason (Optional)</label>
                        <textarea 
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-500 transition-all min-h-[100px] text-sm"
                            placeholder="Brief reason for your leave..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-6 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-400 hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {submitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
