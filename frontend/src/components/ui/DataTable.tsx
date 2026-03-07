import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (row: T) => string;
    searchable?: boolean;
    searchPlaceholder?: string;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
}

type SortDirection = 'asc' | 'desc' | null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getField = (obj: any, key: string): unknown => obj[key];

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    searchable = true,
    searchPlaceholder = 'Search...',
    onRowClick,
    emptyMessage = 'No data found.',
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<SortDirection>(null);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc');
            if (sortDir === 'desc') setSortKey(null);
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const processed = useMemo(() => {
        let result = [...data];

        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter((row) =>
                columns.some((col) => {
                    const val = getField(row, col.key);
                    return val != null && String(val).toLowerCase().includes(query);
                })
            );
        }

        if (sortKey && sortDir) {
            result.sort((a, b) => {
                const aVal = getField(a, sortKey) ?? '';
                const bVal = getField(b, sortKey) ?? '';
                const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }

        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, search, sortKey, sortDir, columns]);

    return (
        <div className="glass-card">
            {/* Search */}
            {searchable && (
                <div className="px-6 py-4">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-xl border border-slate-800 bg-white/[0.03] py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-y border-slate-800/60">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400 ${col.sortable !== false ? 'cursor-pointer select-none hover:text-slate-200' : ''} ${col.className ?? ''}`}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.header}
                                        {col.sortable !== false && sortKey === col.key && (
                                            sortDir === 'asc'
                                                ? <ChevronUp className="h-3.5 w-3.5 text-cyan-400" />
                                                : <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                        {processed.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-16 text-center text-slate-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            processed.map((row, i) => (
                                <tr
                                    key={keyExtractor(row)}
                                    onClick={() => onRowClick?.(row)}
                                    className={`group transition-all hover:bg-white/[0.03] ${onRowClick ? 'cursor-pointer' : ''}`}
                                    style={{ animationDelay: `${i * 30}ms` }}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-6 py-5 text-slate-300 ${col.className ?? ''}`}>
                                            {col.render ? col.render(row) : (getField(row, col.key) as React.ReactNode) ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/60 px-6 py-3 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-300">{processed.length}</span> of <span className="font-medium text-slate-300">{data.length}</span> record{data.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
