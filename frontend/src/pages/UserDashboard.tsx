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

