import type { AssetStatus, MaintenanceStatus, ReservationStatus } from '@/types';

type BadgeStatus = AssetStatus | MaintenanceStatus | ReservationStatus;

const STATUS_STYLES: Record<BadgeStatus, { bg: string; text: string; dot: string }> = {
    available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    in_use: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
    maintenance: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    retired: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
    reserved: { bg: 'bg-violet-500/10', text: 'text-violet-400', dot: 'bg-violet-400' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    in_progress: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-400' },
    completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    rejected: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
    returned: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-400' },
    cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-400' },
};

const STATUS_LABELS: Record<BadgeStatus, string> = {
    available: 'Available', in_use: 'In Use', maintenance: 'Maintenance',
    retired: 'Retired', reserved: 'Reserved', pending: 'Pending',
    in_progress: 'In Progress', completed: 'Completed', approved: 'Approved',
    rejected: 'Rejected', returned: 'Returned', cancelled: 'Cancelled',
};

interface StatusBadgeProps {
    status: BadgeStatus;
    className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const style = STATUS_STYLES[status] ?? STATUS_STYLES.retired;
    const label = STATUS_LABELS[status] ?? status;

    return (
        <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${style.bg} ${style.text} ${className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shadow-sm`} style={{ boxShadow: `0 0 6px currentColor` }} />
            {label}
        </span>
    );
}
