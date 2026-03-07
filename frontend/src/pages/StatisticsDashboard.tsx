import { useState, useEffect } from 'react';
import { statisticsService, StatisticsResponse } from '@/services/statisticsService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { PieChart as PieChartIcon, Activity, Users, Monitor, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
const STATUS_COLORS: Record<string, string> = {
    'available': '#10b981', // emerald
    'reserved': '#8b5cf6', // violet
    'maintenance': '#f59e0b', // amber
    'retired': '#ef4444' // rose
};

export function StatisticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StatisticsResponse | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await statisticsService.getStatistics();
                setStats(data);
            } catch (error) {
                toast.error('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading || !stats) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in py-4">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-xl shadow-cyan-500/20">
                    <PieChartIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white">Analytics Dashboard</h1>
                    <p className="mt-1 text-slate-400">System-wide resource usage and reservation activity insights.</p>
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
                    <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-cyan-500/20 p-3 text-cyan-400">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Total Fleet Flight Hours</p>
                            <p className="text-3xl font-bold text-white">{stats.total_flight_hours} <span className="text-sm font-normal text-slate-500">hrs</span></p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Most Reserved Assets (Bar Chart) */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl relative overflow-hidden">
                    <h3 className="mb-6 text-lg font-semibold text-white flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-violet-400" /> Most Reserved Assets
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.most_reserved_assets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                                    itemStyle={{ color: '#22d3ee' }}
                                    cursor={{ fill: '#334155', opacity: 0.4 }}
                                />
                                <Bar dataKey="total_reservations" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} name="Reservations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Breakdown (Pie Chart) */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl relative overflow-hidden">
                    <h3 className="mb-6 text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" /> Current Asset Statuses
                    </h3>
                    <div className="h-80 w-full flex items-center justify-center">
                        {stats.status_breakdown.length === 0 ? (
                            <p className="text-slate-500">No asset data available</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.status_breakdown}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={5}
                                    >
                                        {stats.status_breakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status.toLowerCase()] || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Top Users (Horizontal Bar Chart) */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 shadow-xl relative overflow-hidden lg:col-span-2">
                    <h3 className="mb-6 text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-400" /> Most Active Users
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={stats.top_users} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis dataKey="full_name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }}
                                    itemStyle={{ color: '#8b5cf6' }}
                                    cursor={{ fill: '#334155', opacity: 0.4 }}
                                />
                                <Bar dataKey="total_reservations" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} name="Total Reservations" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
