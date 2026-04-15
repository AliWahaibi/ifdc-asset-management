import { useEffect, useState } from 'react';
import { reservationService } from '@/services/reservationService';
import { userService } from '@/services/userService';
import { operationService } from '@/services/operationService';
import { officeService } from '@/services/officeService';
import { rndService } from '@/services/rndService';
import { vehicleService } from '@/services/vehicleService';
import type { Reservation } from '@/types';
import { Calendar } from 'lucide-react';

export function AvailabilityTimeline() {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [assetMap, setAssetMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resRes, usersRes, dronesRes, officeRes, rndRes, vehiclesRes] = await Promise.all([
                    reservationService.getReservations(1, 100, 'approved'),
                    userService.getUsers(),
                    operationService.getDrones(1, 100),
                    officeService.getAssets(1, 100),
                    rndService.getAssets(1, 100),
                    vehicleService.getAssets(1, 100)
                ]);

                setReservations(resRes.data || []);

                const uMap: Record<string, string> = {};
                usersRes.data?.forEach(u => uMap[u.id] = u.full_name);
                setUserMap(uMap);

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

    // Group reservations by asset
    const grouped = reservations.reduce((acc, res) => {
        if (!acc[res.asset_id]) acc[res.asset_id] = [];
        acc[res.asset_id].push(res);
        return acc;
    }, {} as Record<string, Reservation[]>);

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
                            <span className="font-semibold text-slate-300 text-sm tracking-wide">Asset Name</span>
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
                    {Object.entries(grouped).length === 0 ? (
                        <div className="flex items-center justify-center h-32 px-6">
                            <p className="text-sm font-medium text-slate-500 bg-slate-800/50 py-2 px-4 rounded-lg">No approved reservations to display.</p>
                        </div>
                    ) : (
                        Object.entries(grouped).map(([assetId, assetReservations]) => (
                            <div key={assetId} className="flex items-stretch border-b border-slate-700/20 last:border-0 hover:bg-slate-800/30 transition-colors relative group">
                                {/* Sticky Left Column */}
                                <div className="sticky left-0 z-10 w-64 shrink-0 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 px-4 py-3 group-hover:bg-slate-800/90 transition-colors flex flex-col justify-center shadow-md">
                                    <p className="text-sm font-semibold text-slate-100 truncate pr-2">{assetMap[assetId] || 'Unknown Asset'}</p>
                                    <span className="inline-flex w-fit mt-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
                                        {assetReservations[0]?.asset_type}
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
                                        {assetReservations.map((res) => {
                                            const start = new Date(res.start_date);
                                            const end = new Date(res.end_date);

                                            // Calculate left % and width % relative to our 30 day window
                                            const windowStart = days[0].getTime();
                                            const windowEnd = days[days.length - 1].getTime() + 86400000; // end of 30th day
                                            const totalMs = windowEnd - windowStart;

                                            let resStart = start.getTime();
                                            let resEnd = end.getTime();

                                            if (resEnd < windowStart || resStart > windowEnd) return null; // out of scope

                                            if (resStart < windowStart) resStart = windowStart;
                                            if (resEnd > windowEnd) resEnd = windowEnd;

                                            const leftPerc = ((resStart - windowStart) / totalMs) * 100;
                                            const widthPerc = ((resEnd - resStart) / totalMs) * 100;

                                            return (
                                                <div
                                                    key={res.id}
                                                    className="absolute inset-y-0 bg-gradient-to-r from-cyan-500 to-violet-500 border border-cyan-400/30 rounded-md flex items-center px-3 shadow-lg shadow-cyan-500/20 transition-all pointer-events-auto cursor-pointer overflow-hidden z-10 group/bar hover:-translate-y-0.5"
                                                    style={{ left: `${leftPerc}%`, width: `${widthPerc}%`, minWidth: '24px' }}
                                                    onClick={() => {
                                                        setSelectedRes(res);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                                    <span className="text-[11px] font-extrabold tracking-wide text-white truncate drop-shadow-md whitespace-nowrap">
                                                        {res.project?.name || 'Manual Reservation'} • {res.user?.full_name || userMap[res.user_id] || 'User'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detailed Modal */}
            {selectedRes && (
                <ReservationDetailModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    reservation={selectedRes} 
                    assetName={assetMap[selectedRes.asset_id]}
                />
            )}
        </div>
    );
}

function ReservationDetailModal({ isOpen, onClose, reservation, assetName }: { isOpen: boolean, onClose: () => void, reservation: Reservation, assetName: string }) {
    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white">{reservation.project?.name || 'Asset Reservation'}</h3>
                        <p className="text-sm text-slate-400 mt-1">Requested by {reservation.user?.full_name || 'System User'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        reservation.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        reservation.status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                        {reservation.status}
                    </span>
                </div>

                <div className="space-y-4">
                    <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Asset Details</p>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-200 font-medium">{assetName}</span>
                            <span className="text-xs text-slate-400 italic">ID: {reservation.asset_id.slice(0, 8)}...</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Start Date</p>
                            <p className="text-sm text-slate-200">{new Date(reservation.start_date).toLocaleDateString()}</p>
                        </div>
                        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">End Date</p>
                            <p className="text-sm text-slate-200">{new Date(reservation.end_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {reservation.notes && (
                        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Notes / Reason</p>
                            <p className="text-sm text-slate-300 italic">"{reservation.notes}"</p>
                        </div>
                    )}

                    {reservation.status === 'rejected' && reservation.rejection_reason && (
                        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-100">
                            <p className="text-xs font-bold uppercase tracking-widest mb-1">Rejection Reason</p>
                            <p className="text-sm">{reservation.rejection_reason}</p>
                        </div>
                    )}
                </div>

                <button onClick={onClose} className="mt-8 w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors">
                    Close Details
                </button>
            </div>
        </div>
    );
}
