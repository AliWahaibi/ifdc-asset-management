import { useState, useEffect } from 'react';
import { SharedCalendar } from '@/components/ui/SharedCalendar';
import { admissionService } from '@/services/admissionService';
import { reservationService } from '@/services/reservationService';
import { Calendar } from 'lucide-react';

export function TimelineCalendar() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [admRes, reservationsRes] = await Promise.all([
                admissionService.getAdmissions(),
                reservationService.getReservations(1, 100, 'approved')
            ]);

            // Process Admissions
            const admissionEvents = admRes.map((adm: any) => ({
                id: adm.id,
                title: `PROJECT: ${adm.project_name} (${adm.user?.full_name || 'System User'})`,
                start: new Date(adm.start_date),
                end: new Date(adm.end_date),
                allDay: true,
                isReservation: false,
                resource: adm
            }));

            // Process Reservations
            const reservationEvents = (reservationsRes.data || []).map((res: any) => ({
                id: res.id,
                title: `RESERVED: ${res.asset_name || res.asset_type} (${res.is_external ? res.external_org_name : (res.user?.full_name || 'System User')})`,
                start: new Date(res.start_date),
                end: new Date(res.end_date),
                allDay: true,
                isReservation: true,
                resource: res
            }));

            setEvents([...admissionEvents, ...reservationEvents]);
        } catch (error) {
            console.error("Failed to load calendar data", error);
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
                        Asset & Project Calendar
                    </h1>
                    <p className="mt-3 text-lg text-white/50">
                        Global view of all asset reservations and project deployments.
                    </p>
                </div>
            </div>

            <div className="glass-panel p-6">
                <SharedCalendar 
                    events={events}
                    loading={loading}
                    eventPropGetter={(event) => {
                        let background = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'; // Admissions (Cyan)
                        
                        if (event.isReservation) {
                            background = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'; // Reservations (Amber)
                        }
                        
                        return { style: { background, border: 'none' } };
                    }}
                />
            </div>
        </div>
    );
}

