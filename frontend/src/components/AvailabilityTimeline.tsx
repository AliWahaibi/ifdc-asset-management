import { useEffect, useState } from 'react';
import { admissionService } from '@/services/admissionService';
import { userService } from '@/services/userService';
import { operationService } from '@/services/operationService';
import { officeService } from '@/services/officeService';
import { rndService } from '@/services/rndService';
import { vehicleService } from '@/services/vehicleService';
import { reservationService } from '@/services/reservationService';
import { Calendar, User, FileText, Info, Package, Users, Building2 } from 'lucide-react';

interface TimelineEvent {
    id: string;
    project_name: string;
    user_name: string;
    assigned_to_name?: string;
    companion_names?: string[];
    purpose: string;
    start_date: string;
    end_date: string;
    status: string;
    requested_assets: any[];
    is_reservation?: boolean;
    external_org_name?: string;
}

export function AvailabilityTimeline() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [assetMap, setAssetMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [admRes, reservationsRes, dronesRes, officeRes, rndRes, vehiclesRes] = await Promise.all([
                    admissionService.getAdmissions(),
                    reservationService.getReservations(1, 100, 'approved'),
                    operationService.getDrones(1, 100),
                    officeService.getAssets(1, 100),
                    rndService.getAssets(1, 100),
                    vehicleService.getAssets(1, 100)
                ]);

                // Process Admissions as Timeline Items
                const flatAdmissions: TimelineEvent[] = admRes.map((adm: any) => ({
                    id: adm.id,
                    project_name: adm.project_name,
                    user_name: adm.user?.full_name || 'System User',
                    assigned_to_name: adm.assigned_to?.full_name,
                    companion_names: adm.companions?.map((c: any) => c.full_name) || [],
                    purpose: adm.purpose || 'No purpose specified',
                    start_date: adm.start_date,
                    end_date: adm.end_date,
                    status: adm.status,
                    requested_assets: adm.requested_assets || []
                }));

                // Process Reservations as Timeline Items
                const flatReservations: TimelineEvent[] = (reservationsRes.data || []).map((res: any) => ({
                    id: res.id,
                    project_name: res.asset_name || `Reservation: ${res.asset_type}`,
                    user_name: res.is_external ? res.external_org_name : (res.user?.full_name || 'System User'),
                    purpose: res.notes || 'Asset Reservation',
                    start_date: res.start_date,
                    end_date: res.end_date,
                    status: res.status,
                    is_reservation: true,
                    external_org_name: res.external_org_name,
                    requested_assets: [{
                        asset_id: res.asset_id,
                        asset_type: res.asset_type,
                        asset_name: res.asset_name
                    }]
                }));

                setEvents([...flatAdmissions, ...flatReservations]);

                const aMap: Record<string, string> = {};
                dronesRes.data?.forEach(d => aMap[d.id] = d.name);
                officeRes.data?.forEach(o => aMap[o.id] = o.name);
                rndRes.data?.forEach(r => aMap[r.id] = r.name);
                vehiclesRes.data?.forEach(v => aMap[v.id] = v.name);
                setAssetMap(aMap);

            } catch (error) {
                console.error("Failed to load timeline data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Render 30 days
    const days = Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        return d;
    });

    if (loading) {
        return <div className="animate-pulse h-32 bg-slate-800/50 rounded-xl"></div>;
    }

    // No need to group by asset anymore, we iterate over events directly (as admissions)

    return (
        <div className="glass-panel p-6 animate-fade-in">
            <h2 className="font-heading mb-6 flex items-center gap-3 text-xl font-bold text-white tracking-tight">
                <Calendar className="h-6 w-6 text-cyan-400" />
                Availability Timeline (30 Days)
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-900/50 custom-scrollbar">
                <div className="inline-block min-w-full pb-4">
                    {/* Header Row */}
                    <div className="flex border-b border-slate-700/50 bg-slate-800/80 sticky top-0 z-20">
                        <div className="sticky left-0 z-30 w-64 shrink-0 bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 px-4 py-3 flex items-center">
                            <span className="font-semibold text-slate-300 text-sm tracking-wide">Project Name</span>
                        </div>
                        <div className="flex flex-1">
                            {days.map((d, i) => (
                                <div key={i} className="w-24 shrink-0 py-3 px-1 border-r border-slate-700/20 text-center flex flex-col items-center justify-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    <span className="text-sm font-medium text-slate-300 mt-0.5">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body Rows */}
                    {events.length === 0 ? (
                        <div className="flex items-center justify-center h-32 px-6">
                            <p className="text-sm font-medium text-slate-500 bg-slate-800/50 py-2 px-4 rounded-lg">No approved projects to display.</p>
                        </div>
                    ) : (
                        events.map((event) => (
                            <div key={event.id} className="flex items-stretch border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30 transition-colors relative group">
                                {/* Sticky Left Column */}
                                <div className="sticky left-0 z-10 w-64 shrink-0 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 px-4 py-3 group-hover:bg-slate-800/90 transition-colors flex flex-col justify-center shadow-md">
                                    <p className="text-sm font-semibold text-slate-100 truncate pr-2">{event.project_name}</p>
                                    <span className={`inline-flex w-fit mt-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-widest ${
                                        event.is_reservation ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-700 text-cyan-400'
                                    }`}>
                                        {event.is_reservation ? (event.external_org_name ? `Org: ${event.external_org_name}` : `By: ${event.user_name}`) : (event.assigned_to_name ? `Lead: ${event.assigned_to_name}` : `By: ${event.user_name}`)}
                                    </span>
                                </div>

                                {/* Timeline Track */}
                                <div className="flex-1 flex relative py-2" style={{ width: `${days.length * 96}px` }}>
                                    {/* Grid lines */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                        {days.map((_, i) => (
                                            <div key={i} className="w-24 shrink-0 border-r border-slate-700/20 last:border-0 border-dashed" />
                                        ))}
                                    </div>

                                    {/* Bars Container */}
                                    <div className="relative w-full h-10 mt-1 mb-1 mx-2 rounded-lg pointer-events-none">
                                        {(() => {
                                            const start = new Date(event.start_date);
                                            const end = new Date(event.end_date);

                                            // Calculate left % and width % relative to our 30 day window
                                            const windowStart = days[0].getTime();
                                            const windowEnd = days[days.length - 1].getTime() + 86400000;
                                            const totalMs = windowEnd - windowStart;

                                            let resStart = start.getTime();
                                            let resEnd = end.getTime();

                                            if (resEnd < windowStart || resStart > windowEnd) return null;

                                            if (resStart < windowStart) resStart = windowStart;
                                            if (resEnd > windowEnd) resEnd = windowEnd;

                                            const leftPerc = ((resStart - windowStart) / totalMs) * 100;
                                            const widthPerc = ((resEnd - resStart) / totalMs) * 100;

                                            return (
                                                <div
                                                    className={`absolute inset-y-0 border rounded-md flex items-center px-3 shadow-lg transition-all pointer-events-auto cursor-pointer overflow-hidden z-10 group/bar hover:-translate-y-0.5 ${
                                                        event.is_reservation 
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400/30 shadow-amber-500/20' 
                                                        : 'bg-gradient-to-r from-cyan-500 to-indigo-600 border-cyan-400/30 shadow-cyan-500/20'
                                                    }`}
                                                    style={{ left: `${leftPerc}%`, width: `${widthPerc}%`, minWidth: '24px' }}
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                                    <span className="text-[11px] font-extrabold tracking-wide text-white truncate drop-shadow-md whitespace-nowrap">
                                                        {event.project_name} {event.status === 'pending_acceptance' ? '(Waiting)' : ''}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detailed Modal */}
            {selectedEvent && (
                <AdmissionDetailModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    event={selectedEvent} 
                />
            )}
        </div>
    );
}

function AdmissionDetailModal({ isOpen, onClose, event }: { isOpen: boolean, onClose: () => void, event: TimelineEvent }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" onClick={onClose}></div>
            <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-8 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
                <div className={`transition-all duration-500 ease-in-out ${showDetails ? 'max-h-[80vh] overflow-y-auto custom-scrollbar' : ''}`}>
                    {/* Header Context */}
                    <div className="mb-8 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-3 mb-2 text-cyan-400">
                            <Calendar className="h-5 w-5" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em]">Project Admission</span>
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-tight leading-tight">{event.project_name}</h3>
                        <div className="mt-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-slate-400">
                                {event.is_reservation && event.external_org_name ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                <p className="text-sm font-medium">
                                    {event.is_reservation ? 'Reserved by ' : 'Requested by '} 
                                    <span className="text-slate-100 font-bold">{event.user_name}</span>
                                </p>
                            </div>
                            {event.assigned_to_name && (
                                <div className="flex items-center gap-2 text-cyan-400">
                                    <div className="h-4 w-4 rounded-full bg-cyan-400/20 flex items-center justify-center">
                                        <div className="h-2 w-2 rounded-full bg-cyan-400" />
                                    </div>
                                    <p className="text-sm font-medium italic">Assigned Lead: <span className="text-cyan-100 font-bold">{event.assigned_to_name}</span></p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Purpose Section */}
                        <div className="rounded-2xl bg-white/5 p-5 border border-white/10">
                            <div className="flex items-center gap-2 mb-3 text-slate-400">
                                <FileText className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Project Purpose</span>
                            </div>
                            <p className="text-slate-200 leading-relaxed italic">"{event.purpose}"</p>
                        </div>

                        {/* Timeline & Schedule */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-white/5 p-5 border border-white/5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Deployment Start</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-white">{new Date(event.start_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                    <span className="text-xs text-slate-400">{new Date(event.start_date).getFullYear()}</span>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/5 p-5 border border-white/5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Deployment End</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-white">{new Date(event.end_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                                    <span className="text-xs text-slate-400">{new Date(event.end_date).getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attached Assets List */}
                        <div className="rounded-2xl bg-cyan-500/5 p-6 border border-cyan-500/20">
                            <div className="flex items-center gap-3 mb-4">
                                <Package className="h-5 w-5 text-cyan-400" />
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Provisioned Assets ({event.requested_assets?.length || 0})</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {(event.requested_assets || []).map((asset: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-slate-950/40 rounded-xl px-4 py-3 border border-white/5 group/asset hover:border-cyan-500/30 transition-colors">
                                        <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-white truncate">{asset.asset_name}</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{asset.asset_type}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Team Section */}
                        {event.companion_names && event.companion_names.length > 0 && (
                            <div className="rounded-2xl bg-indigo-500/5 p-6 border border-indigo-500/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users className="h-5 w-5 text-indigo-400" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Project Team</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {event.companion_names.map((name: string, idx: number) => (
                                        <span key={idx} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs font-medium text-indigo-300">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detailed View expansion */}
                        {showDetails && (
                            <div className="animate-in slide-in-from-top-4 duration-300 space-y-4">
                                <div className="h-px bg-white/5 w-full my-4" />
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Resource Operational Specs</h4>
                                <div className="space-y-2">
                                    {(event.requested_assets || []).map((asset: any, idx: number) => (
                                        <div key={idx} className="glass-panel p-4 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-white">{asset.asset_name}</p>
                                                <p className="text-slate-500 mt-1 uppercase tracking-tighter">{asset.asset_type}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="rounded bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-400 font-bold uppercase">Provisioned</span>
                                                <p className="mt-1 text-[10px] text-slate-400 font-mono">ID: {asset.asset_id.slice(0,8)}...</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button onClick={onClose} className="flex-1 rounded-2xl bg-white/5 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all border border-white/10">
                            Dismiss
                        </button>
                        <button 
                            onClick={() => setShowDetails(!showDetails)}
                            className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-black text-white transition-all shadow-lg ${
                                showDetails ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25' : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/25'
                            }`}
                        >
                            <Info className="h-4 w-4" />
                            {showDetails ? 'Hide Details' : 'Resource Details'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
