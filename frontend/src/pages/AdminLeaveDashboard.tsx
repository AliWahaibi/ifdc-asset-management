import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { leaveService } from '@/services/leaveService';
import type { LeaveRequest } from '@/types';
import { Calendar } from 'lucide-react';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

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
            const data = await leaveService.getAllLeaves(filters);
            
            // Deduplicate and format for React Big Calendar
            const uniqueData = Array.from(new Map(data.map((item: any) => [item.id, item])).values());
            
            const formattedEvents = uniqueData.map((leave: any) => ({
                id: leave.id,
                title: `${leave.user?.full_name || 'Unknown'} (${leave.leave_type})`,
                start: new Date(leave.start_date),
                end: new Date(leave.end_date),
                allDay: true,
                resource: leave
            }));
            
            setEvents(formattedEvents);
        } catch (error) {
            console.error('Failed to fetch leaves', error);
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

                <div className="h-[700px] calendar-dark">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                        </div>
                    ) : (
                        <BigCalendar
                            localizer={localizer}
                            events={events}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            views={['month', 'week', 'day']}
                            eventPropGetter={(event) => {
                                const leaveType = event.resource.leave_type;
                                let background = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'; // default/annual
                                
                                if (leaveType === 'sick') {
                                    background = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)';
                                } else if (leaveType === 'emergency') {
                                    background = 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)';
                                } else if (leaveType === 'sick_companion' || leaveType === 'special') {
                                    background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
                                }
                                
                                return { style: { background } };
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}