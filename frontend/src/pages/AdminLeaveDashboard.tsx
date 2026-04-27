import { useState, useEffect } from 'react';
import { parse } from 'date-fns';
import { leaveService } from '@/services/leaveService';
import { Calendar, User, Clock, FileText, MessageSquare, AlertCircle } from 'lucide-react';
import { SharedCalendar } from '@/components/ui/SharedCalendar';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function AdminLeaveDashboard() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        department: '',
        user_id: ''
    });
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    useEffect(() => {
        fetchLeaves();
    }, [filters]);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            const [leavesData, blackoutData] = await Promise.all([
                leaveService.getAllLeaves(filters),
                leaveService.getBlackoutDates()
            ]);
            
            // Deduplicate leaves
            const uniqueLeaves = Array.from(new Map(leavesData.map((item: any) => [item.id, item])).values());
            
            const parseDate = (dateStr: string) => {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) return d;
                try {
                    return parse(dateStr, 'dd/MM/yyyy', new Date());
                } catch (e) {
                    return new Date();
                }
            };
            
            const leaveEvents = uniqueLeaves.map((leave: any) => ({
                id: leave.id,
                title: `${leave.user?.full_name || 'Unknown'} (${leave.leave_type})`,
                start: parseDate(leave.start_date),
                end: parseDate(leave.end_date),
                allDay: true,
                isBlackout: false,
                resource: leave
            }));

            const blackoutEvents = blackoutData.map((b: any) => ({
                id: b.id,
                title: `BLACKOUT: ${b.reason}`,
                start: parseDate(b.start_date),
                end: parseDate(b.end_date),
                allDay: true,
                isBlackout: true,
                resource: b
            }));
            
            setEvents([...leaveEvents, ...blackoutEvents]);
        } catch (error) {
            console.error('Failed to fetch calendar data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEvent = (event: any) => {
        setSelectedEvent(event);
        setIsDetailModalOpen(true);
    };

    const leaveTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            annual: 'Annual Leave',
            sick: 'Sick Leave',
            emergency: 'Emergency Leave',
            special: 'Special Leave',
            sick_companion: 'Sick Companion Leave',
        };
        return labels[type] || type;
    };

    const statusMap: Record<string, string> = {
        'pending_manager': 'pending',
        'pending_ceo': 'pending',
        'pending_hr': 'pending',
        'approved': 'available',
        'rejected': 'retired',
        'cancelled': 'retired'
    };

    return (
        <div className="space-y-8 animate-fade-in py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 p-2.5 shadow-xl shadow-cyan-500/20">
                            <Calendar className="h-7 w-7 text-white" />
                        </div>
                        Global Leave History
                    </h1>
                    <p className="mt-3 text-lg text-white/50">
                        Admin view of all employee leaves and absences.
                    </p>
                </div>
            </div>

            <div className="glass-panel p-6">
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Filter by Department..."
                        value={filters.department}
                        onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-500 text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Filter by User ID..."
                        value={filters.user_id}
                        onChange={(e) => setFilters(f => ({ ...f, user_id: e.target.value }))}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-white outline-none focus:border-cyan-500 text-sm"
                    />
                </div>

                <SharedCalendar 
                    events={events}
                    loading={loading}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={(event) => {
                        if (event.isBlackout) {
                            return {
                                style: {
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    border: '1px solid #334155',
                                    color: '#94a3b8',
                                    opacity: 0.8,
                                    cursor: 'pointer',
                                }
                            };
                        }

                        const leaveType = event.resource.leave_type;
                        let background = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'; // default/annual
                        
                        if (leaveType === 'sick') {
                            background = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
                        } else if (leaveType === 'emergency') {
                            background = 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
                        } else if (leaveType === 'sick_companion' || leaveType === 'special') {
                            background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
                        }
                        
                        return { style: { background, border: 'none', cursor: 'pointer' } };
                    }}
                />
            </div>

            {/* Event Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={selectedEvent?.isBlackout ? 'Blackout Period Details' : 'Leave Request Details'}
                size="md"
            >
                {selectedEvent && (
                    <div className="space-y-5">
                        {selectedEvent.isBlackout ? (
                            /* Blackout Details */
                            <div className="space-y-4">
                                <div className="rounded-xl bg-slate-800/60 p-4 border border-slate-700/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-rose-500/10 rounded-lg">
                                            <AlertCircle className="h-5 w-5 text-rose-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Blackout Period</h3>
                                    </div>
                                    <p className="text-sm text-slate-300">{selectedEvent.resource.reason}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Start Date</p>
                                        <p className="text-sm font-mono text-white mt-1">{selectedEvent.start.toLocaleDateString()}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">End Date</p>
                                        <p className="text-sm font-mono text-white mt-1">{selectedEvent.end.toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Leave Details */
                            <div className="space-y-4">
                                {/* Employee Info */}
                                <div className="flex items-center gap-4 rounded-xl bg-slate-800/60 p-4 border border-slate-700/50">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                                        {selectedEvent.resource.user?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{selectedEvent.resource.user?.full_name || 'Unknown'}</h3>
                                        <p className="text-xs text-slate-400">{selectedEvent.resource.user?.email || ''}</p>
                                        {selectedEvent.resource.user?.department && (
                                            <p className="text-xs text-cyan-400/70 mt-0.5">{selectedEvent.resource.user.department}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Leave Type & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Leave Type</p>
                                        <p className="text-sm font-semibold text-white mt-1">{leaveTypeLabel(selectedEvent.resource.leave_type)}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Status</p>
                                        <StatusBadge status={(statusMap[selectedEvent.resource.status] || selectedEvent.resource.status) as any} />
                                    </div>
                                </div>

                                {/* Dates & Duration */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Start Date</p>
                                        <p className="text-sm font-mono text-white mt-1">{selectedEvent.start.toLocaleDateString()}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">End Date</p>
                                        <p className="text-sm font-mono text-white mt-1">{selectedEvent.end.toLocaleDateString()}</p>
                                    </div>
                                    <div className="rounded-xl bg-slate-800/40 p-3 border border-slate-700/30">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Working Days</p>
                                        <p className="text-2xl font-black text-emerald-400 mt-1">{selectedEvent.resource.total_days}</p>
                                    </div>
                                </div>

                                {/* Reason */}
                                {selectedEvent.resource.reason && (
                                    <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Reason</p>
                                        </div>
                                        <p className="text-sm text-slate-300 italic">"{selectedEvent.resource.reason}"</p>
                                    </div>
                                )}

                                {/* Comments */}
                                {(selectedEvent.resource.manager_comment || selectedEvent.resource.ceo_comment) && (
                                    <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Comments</p>
                                        </div>
                                        {selectedEvent.resource.manager_comment && (
                                            <div className="text-sm text-slate-300">
                                                <span className="text-violet-400 font-semibold text-xs">Manager:</span>{' '}
                                                {selectedEvent.resource.manager_comment}
                                            </div>
                                        )}
                                        {selectedEvent.resource.ceo_comment && (
                                            <div className="text-sm text-slate-300">
                                                <span className="text-cyan-400 font-semibold text-xs">CEO:</span>{' '}
                                                {selectedEvent.resource.ceo_comment}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}