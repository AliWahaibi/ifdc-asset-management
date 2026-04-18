import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    Plane,
    Monitor,
    FlaskConical,
    CalendarCheck,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    LayoutDashboard,
    FileCheck,
    ClipboardList,
    Check,
    X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { hasMinimumRole } from '@/lib/roles';
import { useNavigate } from 'react-router-dom';

import { operationService } from '@/services/operationService';
import { officeService } from '@/services/officeService';
import { rndService } from '@/services/rndService';
import { reservationService } from '@/services/reservationService';
import { dashboardService, type Activity } from '@/services/dashboardService';
import { admissionService } from '@/services/admissionService';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';

interface DashboardMetrics {
    totalDrones: number;
    totalOffice: number;
    totalRnd: number;
    totalReservations: number;
    pendingReservations: number;
    pendingAdmissions: number;
}



interface StatCard {
    label: string;
    value: string;
    change: string;
    icon: ReactNode;
    gradient: string;
    glowColor: string;
    onClick?: () => void;
}

export function UserDashboard() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const isManager = user ? hasMinimumRole(user.role, 'super_admin') : false;

    const [metrics, setMetrics] = useState<DashboardMetrics>({
        totalDrones: 0,
        totalOffice: 0,
        totalRnd: 0,
        totalReservations: 0,
        pendingReservations: 0,
        pendingAdmissions: 0,
    });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [myAssignments, setMyAssignments] = useState<any[]>([]);
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);

    const fetchMyAssignments = async () => {
        if (!user) return;
        try {
            const allAdmissions = await admissionService.getAdmissions();
            const pending = allAdmissions.filter(
                (a: any) => a.assigned_to_id === user.id && a.status === 'pending_acceptance'
            );
            setMyAssignments(pending);
        } catch (error) {
            console.error('Failed to load assignments:', error);
        }
    };

    const handleAcceptAssignment = async (id: string, closeSelected: boolean = false) => {
        setAssignmentLoading(true);
        try {
            await admissionService.acceptAssignment(id);
            toast.success('Assignment accepted successfully');
            if (closeSelected) setSelectedAssignment(null);
            fetchMyAssignments();
        } catch (error) {
            toast.error('Failed to accept assignment');
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleRejectAssignment = async (id: string, closeSelected: boolean = false) => {
        if (!window.confirm('Are you sure you want to reject this assignment?')) return;
        setAssignmentLoading(true);
        try {
            await admissionService.updateAdmissionStatus(id, 'rejected', 'Assignment rejected by assignee');
            toast.success('Assignment rejected');
            if (closeSelected) setSelectedAssignment(null);
            fetchMyAssignments();
        } catch (error) {
            toast.error('Failed to reject assignment');
        } finally {
            setAssignmentLoading(false);
        }
    };

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Fetch totals (limit=1 just to get the 'total' field quickly from backend)
                const [dronesRes, officeRes, rndRes, reservationsRes, pendingRes, activitiesRes, admissionsRes] = await Promise.all([
                    operationService.getDrones(1, 1),
                    officeService.getAssets(1, 1),
                    rndService.getAssets(1, 1),
                    reservationService.getReservations(1, 1),
                    reservationService.getReservations(1, 1, 'pending'),
                    dashboardService.getActivities(),
                    admissionService.getAdmissions()
                ]);

                setMetrics({
                    totalDrones: dronesRes.total || 0,
                    totalOffice: officeRes.total || 0,
                    totalRnd: rndRes.total || 0,
                    totalReservations: reservationsRes.total || 0,
                    pendingReservations: pendingRes.total || 0,
                    pendingAdmissions: admissionsRes.filter((a: any) => a.status === 'pending_approval').length,
                });
                setActivities(activitiesRes || []);
            } catch (error) {
                console.error('Failed to load dashboard metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
        fetchMyAssignments();
    }, []);

    const STATS: StatCard[] = [
        {
            label: 'Total Drones',
            value: loading ? '-' : metrics.totalDrones.toString(),
            change: 'Live tracking',
            icon: <Plane className="h-6 w-6" />,
            gradient: 'from-cyan-500 to-blue-600',
            glowColor: 'shadow-cyan-500/20',
        },
        {
            label: 'Office Assets',
            value: loading ? '-' : metrics.totalOffice.toString(),
            change: 'Live tracking',
            icon: <Monitor className="h-6 w-6" />,
            gradient: 'from-violet-500 to-purple-600',
            glowColor: 'shadow-violet-500/20',
        },
        {
            label: 'R&D Projects',
            value: loading ? '-' : metrics.totalRnd.toString(),
            change: 'Live tracking',
            icon: <FlaskConical className="h-6 w-6" />,
            gradient: 'from-emerald-500 to-green-600',
            glowColor: 'shadow-emerald-500/20',
        },
        {
            label: 'Reservations',
            value: loading ? '-' : metrics.totalReservations.toString(),
            change: `${metrics.pendingReservations} pending`,
            icon: <CalendarCheck className="h-6 w-6" />,
            gradient: 'from-amber-500 to-orange-600',
            glowColor: 'shadow-amber-500/20',
        },
    ];

    if (isManager) {
        STATS.push({
            label: 'Pending Admissions',
            value: loading ? '-' : metrics.pendingAdmissions.toString(),
            change: 'Needs Review',
            icon: <FileCheck className="h-6 w-6" />,
            gradient: 'from-pink-500 to-rose-600',
            glowColor: 'shadow-pink-500/20',
            onClick: () => navigate('/admissions-list'),
        });
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome */}
            <div>
                <h1 className="font-heading text-4xl font-bold text-white tracking-tight">
                    Welcome back, <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">{user?.full_name?.split(' ')[0] ?? 'User'}</span>
                </h1>
                <p className="mt-3 text-lg text-slate-400">
                    Here's what's happening across your asset management system.
                </p>
            </div>

            {/* Stat Cards */}
            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${isManager ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
                {STATS.map((stat) => (
                    <div
                        key={stat.label}
                        className={`glass-card group p-6 ${stat.glowColor} ${stat.onClick ? 'cursor-pointer transition-transform hover:scale-[1.02]' : ''}`}
                        onClick={stat.onClick}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                                <p className="font-heading text-5xl font-extrabold tracking-tight text-white">{stat.value}</p>
                            </div>
                            <div className={`rounded-2xl bg-gradient-to-br ${stat.gradient} p-4 text-white shadow-lg ${stat.glowColor}`}>
                                {stat.icon}
                            </div>
                        </div>
                        <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-slate-400">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            <span>{stat.change}</span>
                        </div>
                        {/* Decorative glow */}
                        <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${stat.gradient} opacity-[0.06] blur-3xl transition-all group-hover:opacity-[0.12]`} />
                    </div>
                ))}
            </div>

            {/* My Pending Assignments */}
            {myAssignments.length > 0 && (
                <div className="glass-panel p-8 border-l-4 border-l-amber-500">
                    <h2 className="font-heading mb-6 flex items-center gap-3 text-xl font-bold text-white tracking-tight">
                        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/20">
                            <ClipboardList className="h-5 w-5 text-white" />
                        </div>
                        My Pending Assignments
                        <span className="ml-2 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold text-amber-400">
                            {myAssignments.length}
                        </span>
                    </h2>
                    <div className="space-y-4">
                        {myAssignments.map((assignment: any) => (
                            <div
                                key={assignment.id}
                                onClick={() => setSelectedAssignment(assignment)}
                                className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-slate-700/50 px-6 py-5 cursor-pointer transition-colors hover:bg-slate-800 hover:border-cyan-500/50"
                            >
                                <div className="flex-1 pr-6">
                                    <h3 className="text-base font-bold text-white">{assignment.project_name}</h3>
                                    {assignment.purpose && (
                                        <p className="mt-1 text-sm text-slate-400">{assignment.purpose}</p>
                                    )}
                                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                                        <span>From: <span className="text-slate-300 font-mono">{new Date(assignment.start_date).toLocaleDateString()}</span></span>
                                        <span>To: <span className="text-slate-300 font-mono">{new Date(assignment.end_date).toLocaleDateString()}</span></span>
                                        {assignment.user?.full_name && (
                                            <span>Assigned by: <span className="text-cyan-400 font-medium">{assignment.user.full_name}</span></span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 ml-6" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleAcceptAssignment(assignment.id)}
                                        disabled={assignmentLoading}
                                        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 text-sm font-bold text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 disabled:opacity-50"
                                    >
                                        <Check className="h-4 w-4" />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleRejectAssignment(assignment.id)}
                                        disabled={assignmentLoading}
                                        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-5 py-2.5 text-sm font-bold text-rose-400 transition-all hover:bg-rose-500/20 hover:border-rose-500/40 active:scale-95 disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Admission Details Modal */}
            <Modal
                isOpen={!!selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
                title="Assignment Details"
                size="lg"
            >
                {selectedAssignment && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Project Description</h3>
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                    <p className="text-white text-lg font-medium">{selectedAssignment.project_name}</p>
                                    <p className="mt-2 text-slate-300 leading-relaxed text-sm">
                                        {selectedAssignment.purpose || "No detailed purpose provided."}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">Start Date</h3>
                                    <p className="text-white font-mono">{new Date(selectedAssignment.start_date).toLocaleDateString()}</p>
                                </div>
                                <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
                                    <h3 className="text-xs font-semibold text-slate-400 uppercase mb-1">End Date</h3>
                                    <p className="text-white font-mono">{new Date(selectedAssignment.end_date).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Requested Assets</h3>
                                <div className="space-y-2">
                                    {selectedAssignment.requested_assets?.map((asset: any, index: number) => (
                                        <div key={index} className="flex justify-between items-center rounded-lg bg-slate-800/50 border border-slate-700 p-3">
                                            <span className="text-white font-medium">{asset.asset_name || asset.asset_id}</span>
                                            <span className="text-xs uppercase px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">{asset.asset_type}</span>
                                        </div>
                                    ))}
                                    {(!selectedAssignment.requested_assets || selectedAssignment.requested_assets.length === 0) && (
                                        <div className="text-slate-500 text-sm">No assets requested.</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Companions</h3>
                                {selectedAssignment.companions?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedAssignment.companions.map((comp: any) => (
                                            <span key={comp.id} className="text-sm bg-violet-500/10 text-violet-300 border border-violet-500/20 px-3 py-1.5 rounded-lg">
                                                {comp.full_name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No companions assigned.</p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-700/50 pt-5 flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => handleRejectAssignment(selectedAssignment.id, true)}
                                disabled={assignmentLoading}
                                className="flex items-center gap-2 rounded-xl border border-rose-500/30 px-5 py-2.5 text-sm font-bold text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                            >
                                <X className="h-4 w-4" /> Reject
                            </button>
                            <button
                                onClick={() => handleAcceptAssignment(selectedAssignment.id, true)}
                                disabled={assignmentLoading}
                                className="flex items-center gap-2 rounded-xl bg-emerald-500 border border-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-900 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors disabled:opacity-50"
                            >
                                <Check className="h-4 w-4" /> Accept Assignment
                            </button>
                        </div>
                    </div>
                )}
            </Modal>


            {/* Activity + System Status */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                {/* Recent Activity */}
                <div className="glass-panel lg:col-span-3 p-8">
                    <h2 className="font-heading mb-6 flex items-center gap-3 text-xl font-bold text-white tracking-tight">
                        <LayoutDashboard className="h-6 w-6 text-cyan-400" />
                        Recent Activity
                    </h2>
                    <div className="space-y-4">
                        {activities.length === 0 && !loading && (
                            <p className="text-sm text-slate-500">No recent activity</p>
                        )}
                        {activities.map((activity, i) => {
                            let icon = <CheckCircle2 className="h-4 w-4" />;
                            let color = 'text-slate-400';
                            switch (activity.type) {
                                case 'drone': icon = <Plane className="h-4 w-4" />; color = 'text-cyan-400'; break;
                                case 'office': icon = <Monitor className="h-4 w-4" />; color = 'text-violet-400'; break;
                                case 'rnd': icon = <FlaskConical className="h-4 w-4" />; color = 'text-emerald-400'; break;
                                case 'reservation': icon = <CalendarCheck className="h-4 w-4" />; color = 'text-amber-400'; break;
                                case 'user': icon = <CheckCircle2 className="h-4 w-4" />; color = 'text-blue-400'; break;
                            }
                            return (
                                <div
                                    key={i}
                                    className="flex items-center gap-4 rounded-xl bg-white/[0.02] px-5 py-4 transition-colors hover:bg-white/[0.04]"
                                >
                                    <span className={color}>{icon}</span>
                                    <span className="flex-1 text-sm text-slate-200">{activity.title}</span>
                                    <span className="shrink-0 text-xs text-slate-500">{new Date(activity.created_at).toLocaleDateString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* System Status */}
                <div className="glass-panel lg:col-span-2 p-8">
                    <h2 className="font-heading mb-6 text-xl font-bold text-white tracking-tight">System Status</h2>
                    <div className="space-y-7">
                        {[
                            { label: 'Operational Drones', current: metrics.totalDrones, total: Math.max(metrics.totalDrones, 1), color: 'from-emerald-500 to-emerald-400' },
                            { label: 'Office Assets Available', current: metrics.totalOffice, total: Math.max(metrics.totalOffice, 1), color: 'from-cyan-500 to-cyan-400' },
                            { label: 'R&D Projects Active', current: metrics.totalRnd, total: Math.max(metrics.totalRnd, 1), color: 'from-violet-500 to-violet-400' },
                            { label: 'Pending Reservations', current: metrics.pendingReservations, total: Math.max(metrics.totalReservations, 1), color: 'from-amber-500 to-amber-400' },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="mb-2 flex justify-between text-sm">
                                    <span className="text-slate-300">{item.label}</span>
                                    <span className="font-semibold text-white">{item.current}/{item.total}</span>
                                </div>
                                <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                                        style={{ width: `${(item.current / item.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {isManager && (
                        <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                            <p className="flex items-center gap-2.5 text-sm font-medium text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                {metrics.pendingReservations} reservations require approval
                            </p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

