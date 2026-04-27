import { useState, useEffect } from 'react';
import { SharedCalendar } from '@/components/ui/SharedCalendar';
import { admissionService } from '@/services/admissionService';
import { reservationService } from '@/services/reservationService';
import { Calendar, User, Box, MapPin, Clock, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AssetStatus, MaintenanceStatus, ReservationStatus } from '@/types';

type BadgeStatus = AssetStatus | MaintenanceStatus | ReservationStatus;

export function TimelineCalendar() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

    const handleSelectEvent = (event: any) => {
        setSelectedEvent(event);
        setIsDetailModalOpen(true);
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
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={(event) => {
                        let background = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)'; // Admissions (Cyan)
                        
                        if (event.isReservation) {
                            background = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'; // Reservations (Amber)
                        }
                        
                        return { style: { background, border: 'none', cursor: 'pointer' } };
                    }}
                />
            </div>

            {/* Event Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={selectedEvent?.isReservation ? 'Reservation Details' : 'Project Admission Details'}
                size="md"
            >
                {selectedEvent && !selectedEvent.isReservation && (
                    /* Project Admission Details */
                    <div className="space-y-4">
                        <div className="rounded-xl bg-slate-800/60 p-4 border border-slate-700/50">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-cyan-500/10 rounded-lg">
                                    <MapPin className="h-5 w-5 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{selectedEvent.resource.project_name}</h3>
                                    {selectedEvent.resource.purpose && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{selectedEvent.resource.purpose}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Personnel */}
                        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30 space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Requested By</p>
                            </div>
                            <p className="text-sm font-medium text-white">{selectedEvent.resource.user?.full_name || 'System'}</p>
                            {selectedEvent.resource.assigned_to && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                                    <span className="text-sm text-cyan-400 font-medium">Assigned to: {selectedEvent.resource.assigned_to.full_name}</span>
                                </div>
                            )}
                        </div>

                        {/* Dates & Status */}
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
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Status</p>
                                <StatusBadge status={selectedEvent.resource.status as BadgeStatus} />
                            </div>
                        </div>

                        {/* Requested Assets */}
                        {selectedEvent.resource.requested_assets?.length > 0 && (
                            <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Box className="h-3.5 w-3.5 text-slate-400" />
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                        Requested Assets ({selectedEvent.resource.requested_assets.length})
                                    </p>
                                </div>
                                {selectedEvent.resource.requested_assets.map((asset: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                        <div>
                                            <p className="text-sm font-medium text-white">{asset.asset_name || 'Unknown Asset'}</p>
                                            <p className="text-[10px] text-slate-500 uppercase">{asset.asset_type}</p>
                                        </div>
                                        <StatusBadge status={asset.status as BadgeStatus} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Companions */}
                        {selectedEvent.resource.companions?.length > 0 && (
                            <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-3.5 w-3.5 text-slate-400" />
                                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Companions</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedEvent.resource.companions.map((c: any) => (
                                        <span key={c.id} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">
                                            {c.full_name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Rejection Reason */}
                        {selectedEvent.resource.rejection_reason && (
                            <div className="rounded-xl bg-rose-500/10 p-4 border border-rose-500/20">
                                <p className="text-[10px] uppercase tracking-widest text-rose-400 font-bold mb-1">Rejection Reason</p>
                                <p className="text-sm text-slate-300 italic">"{selectedEvent.resource.rejection_reason}"</p>
                            </div>
                        )}
                    </div>
                )}

                {selectedEvent && selectedEvent.isReservation && (
                    /* Reservation Details */
                    <div className="space-y-4">
                        <div className="rounded-xl bg-slate-800/60 p-4 border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Box className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{selectedEvent.resource.asset_name || selectedEvent.resource.asset_type}</h3>
                                    <p className="text-xs text-slate-400 capitalize">{selectedEvent.resource.asset_type} reservation</p>
                                </div>
                            </div>
                        </div>

                        {/* Requester */}
                        <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30 space-y-2">
                            <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                    {selectedEvent.resource.is_external ? 'External Organization' : 'Reserved By'}
                                </p>
                            </div>
                            <p className="text-sm font-medium text-white">
                                {selectedEvent.resource.is_external 
                                    ? selectedEvent.resource.external_org_name
                                    : (selectedEvent.resource.user?.full_name || 'System')
                                }
                            </p>
                            {selectedEvent.resource.is_external && selectedEvent.resource.external_contact_email && (
                                <p className="text-xs text-slate-400">{selectedEvent.resource.external_contact_email}</p>
                            )}
                        </div>

                        {/* Dates & Status */}
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
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Status</p>
                                <StatusBadge status={selectedEvent.resource.status as BadgeStatus} />
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedEvent.resource.notes && (
                            <div className="rounded-xl bg-slate-800/40 p-4 border border-slate-700/30">
                                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Notes</p>
                                <p className="text-sm text-slate-300 italic">"{selectedEvent.resource.notes}"</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
