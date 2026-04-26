import { useState, useEffect } from 'react';
import { parse } from 'date-fns';
import { leaveService } from '@/services/leaveService';
import { Calendar } from 'lucide-react';
import { SharedCalendar } from '@/components/ui/SharedCalendar';

export function AdminLeaveDashboard() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        department: '',
        user_id: ''
    });

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
                    eventPropGetter={(event) => {
                        if (event.isBlackout) {
                            return {
                                style: {
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    border: '1px solid #334155',
                                    color: '#94a3b8',
                                    opacity: 0.8
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
                        
                        return { style: { background, border: 'none' } };
                    }}
                />
            </div>
        </div>
    );
}