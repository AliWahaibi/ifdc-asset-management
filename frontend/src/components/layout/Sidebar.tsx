import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole } from '@/lib/roles';
import { ROLE_LABELS } from '@/lib/roles';
import type { UserRole } from '@/types';
import {
    LayoutDashboard,
    Plane,
    Monitor,
    FlaskConical,
    Users,
    Settings,
    CalendarCheck,
    Calendar,
    PieChart,
    Shield,
    ChevronLeft,
    ChevronRight,
    Bot,
    Briefcase,
    Car,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import mainLogo from '@/assets/Asset 2.png';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
    {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
        label: 'Operations',
        path: '/operations',
        icon: <Plane className="h-5 w-5" />,
    },
    {
        label: 'Office Assets',
        path: '/office',
        icon: <Monitor className="h-5 w-5" />,
    },
    {
        label: 'Vehicles',
        path: '/vehicles',
        icon: <Car className="h-5 w-5" />,
    },
    {
        label: 'R&D Lab',
        path: '/rnd',
        icon: <FlaskConical className="h-5 w-5" />,
    },
    {
        label: 'New Admission',
        path: '/admission',
        icon: <Plus className="h-5 w-5" />,
    },
    {
        label: 'Admission Requests',
        path: '/admissions-list',
        icon: <Briefcase className="h-5 w-5" />,
        roles: ['super_admin', 'manager', 'team_leader'],
    },
    {
        label: 'Calendar',
        path: '/calendar',
        icon: <Calendar className="h-5 w-5" />,
    },
    {
        label: 'AI Assistant',
        path: '/ai-assistant',
        icon: <Bot className="h-5 w-5" />,
    },
    {
        label: 'Analytics',
        path: '/statistics',
        icon: <PieChart className="h-5 w-5" />,
        roles: ['super_admin', 'manager'],
    },
    {
        label: 'User Management',
        path: '/users',
        icon: <Users className="h-5 w-5" />,
        roles: ['super_admin', 'manager'],
    },
    {
        label: 'System Logs',
        path: '/logs',
        icon: <Shield className="h-5 w-5" />,
        roles: ['super_admin', 'manager'],
    },
    {
        label: 'Settings',
        path: '/settings',
        icon: <Settings className="h-5 w-5" />,
        roles: ['super_admin', 'manager'],
    },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { user } = useAuthStore();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    if (!user) return null;

    // Filter items based on user role
    const visibleItems = NAV_ITEMS.filter(
        (item) => !item.roles || hasAnyRole(user.role, item.roles)
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}
            <aside
                className={`fixed md:sticky left-0 top-0 z-50 md:z-40 flex h-screen shrink-0 flex-col bg-slate-950 md:bg-black/40 backdrop-blur-xl border-r border-white/10 shadow-2xl text-white transition-transform duration-300 ease-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${collapsed ? 'w-20' : 'w-[272px]'}`}
            >
                {/* Logo */}
                <div className="flex h-[72px] items-center justify-start px-6 pl-10">
                    <img src={mainLogo} alt="AeroTrack" className="h-12 w-auto" />
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gradient-to-r from-slate-700/80 via-slate-700/40 to-transparent" />

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-6">
                    <p className={`mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 ${collapsed ? 'sr-only' : ''}`}>
                        Navigation
                    </p>
                    <ul className="space-y-1.5">
                        {visibleItems.map((item) => {
                            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                            return (
                                <li key={item.path}>
                                    <NavLink
                                        to={item.path}
                                        title={collapsed ? item.label : undefined}
                                        className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-all duration-200 ${isActive
                                            ? 'bg-cyan-500/12 text-cyan-300 shadow-sm'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                            }`}
                                    >
                                        {/* Active bar */}
                                        {isActive && (
                                            <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-md shadow-cyan-400/40" />
                                        )}
                                        <span className={`shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                            {item.icon}
                                        </span>
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </NavLink>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Card */}
                <div className="mx-3 mb-4">
                    <NavLink to="/profile" className={`flex items-center gap-3 rounded-xl bg-white/[0.03] p-3.5 hover:bg-white/[0.06] transition-colors ${collapsed ? 'justify-center' : ''}`}>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-white shadow-md">
                            {user.full_name?.charAt(0).toUpperCase() ?? 'U'}
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 animate-fade-in text-left">
                                <p className="truncate text-sm font-semibold text-slate-100">{user.full_name}</p>
                                <p className="truncate text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</p>
                            </div>
                        )}
                    </NavLink>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="hidden md:flex absolute -right-3.5 top-[72px] h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-800 text-slate-400 shadow-xl transition-all hover:bg-slate-700 hover:text-white hover:scale-110"
                >
                    {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
            </aside>
        </>
    );
}
