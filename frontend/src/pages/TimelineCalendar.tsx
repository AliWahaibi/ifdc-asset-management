import { AvailabilityTimeline } from '@/components/AvailabilityTimeline';

export function TimelineCalendar() {
    return (
        <div className="space-y-8 animate-fade-in pb-8 h-full">
            <div>
                <h1 className="font-heading text-4xl font-bold tracking-tight text-white mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    Resource Gantt Chart
                </h1>
                <p className="text-lg text-slate-400">View upcoming asset reservations and availability timeline.</p>
            </div>

            <div className="mt-4">
                <AvailabilityTimeline />
            </div>
        </div>
    );
}
