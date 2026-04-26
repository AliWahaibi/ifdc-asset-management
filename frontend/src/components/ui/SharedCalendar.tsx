import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface SharedCalendarProps {
    events: any[];
    loading?: boolean;
    eventPropGetter?: (event: any) => { style: React.CSSProperties };
    onSelectEvent?: (event: any) => void;
    height?: string | number;
}

export function SharedCalendar({ 
    events, 
    loading = false, 
    eventPropGetter, 
    onSelectEvent,
    height = '750px'
}: SharedCalendarProps) {
    return (
        <div style={{ height }} className="calendar-dark relative">
            {loading ? (
                <div className="h-full flex items-center justify-center bg-slate-900/20 backdrop-blur-sm rounded-xl border border-slate-800">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                </div>
            ) : (
                <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    views={['month', 'week', 'day']}
                    onSelectEvent={onSelectEvent}
                    eventPropGetter={eventPropGetter}
                    messages={{
                        noEventsInRange: 'No items scheduled for this period.'
                    }}
                />
            )}
        </div>
    );
}
