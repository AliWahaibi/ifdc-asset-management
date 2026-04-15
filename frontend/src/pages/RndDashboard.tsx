import { useState, useEffect } from 'react';
import { FlaskConical, Plus, ShieldAlert, FileJson, CalendarCheck, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import type { RndAsset } from '@/types';

import { rndService, type CreateRndAssetData } from '@/services/rndService';
import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole } from '@/lib/roles';
import toast from 'react-hot-toast';
import CreatableSelect from 'react-select/creatable';

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
    vtol: { label: 'V-TOL', color: 'bg-cyan-500/10 text-cyan-400' },
    experimental: { label: 'Experimental', color: 'bg-rose-500/10 text-rose-400' },
    prototype: { label: 'Prototype', color: 'bg-amber-500/10 text-amber-400' },
    component: { label: 'Component', color: 'bg-slate-500/10 text-slate-300' },
};

export function RndDashboard() {
    const { user } = useAuthStore();
    const canEdit = user ? hasAnyRole(user.role, ['super_admin', 'manager']) : false;
    const [editingId, setEditingId] = useState<string | null>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);


    const columns: Column<RndAsset>[] = [
        {
            key: 'name',
            header: 'Asset',
            render: (row) => (
                <div className="flex items-center gap-2.5">
                    <span className="font-medium text-white">{row.name}</span>
                    {row.is_classified && (
                        <span title="Classified" className="rounded-md bg-rose-500/10 px-1.5 py-0.5">
                            <ShieldAlert className="h-3 w-3 text-rose-400" />
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'asset_type',
            header: 'Type',
            render: (row) => {
                const t = TYPE_STYLES[row.asset_type];
                return t ? <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${t.color}`}>{t.label}</span> : <>{row.asset_type}</>;
            },
        },
        { key: 'serial_number', header: 'Serial' },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
            key: 'specifications',
            header: 'Key Specs',
            sortable: false,
            render: (row) => {
                let parsedSpecs: Record<string, any> = {};
                try {
                    parsedSpecs = typeof row.specifications === 'string' ? JSON.parse(row.specifications as any) : (row.specifications || {});
                } catch (e) { }

                const entries = Object.entries(parsedSpecs).slice(0, 2);
                return (
                    <div className="flex flex-wrap gap-2">
                        {entries.map(([key, val]) => (
                            <span key={key} className="rounded-lg bg-white/[0.04] px-2 py-1 text-[11px] text-slate-400">
                                {key}: <span className="text-slate-200">{String(val)}</span>
                            </span>
                        ))}
                        {Object.keys(parsedSpecs).length > 2 && (
                            <span className="flex items-center gap-1 text-[11px] text-cyan-400 cursor-pointer hover:underline">
                                <FileJson className="h-3 w-3" /> +{Object.keys(parsedSpecs).length - 2}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'id',
            header: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <>
                            <button
                                onClick={() => {
                                    setEditingId(row.id);
                                    setFormData({
                                        name: row.name, asset_type: row.asset_type, serial_number: row.serial_number,
                                        status: row.status, department_id: row.department_id,
                                        specifications: typeof row.specifications === 'string' ? JSON.parse(row.specifications as string) : (row.specifications || {}),
                                        is_classified: row.is_classified, notes: row.notes,
                                    });
                                    setModalOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                            </button>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this R&D asset?')) {
                                        try {
                                            await rndService.deleteAsset(row.id);
                                            toast.success('Asset deleted successfully');
                                            fetchAssets();
                                        } catch (e) {
                                            toast.error('Failed to delete asset');
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    const [assets, setAssets] = useState<RndAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<CreateRndAssetData>({
        name: '', asset_type: 'vtol', serial_number: '', status: 'available',
        department_id: null, specifications: {}, is_classified: false, notes: ''
    });

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const data = await rndService.getAssets(1, 100);
            setAssets(data.data || []);
        } catch (error) {
            toast.error('Failed to load R&D assets');
        } finally {
            setLoading(false);
        }
    };

    const fetchSuggestions = async () => {
        try {
            const data = await rndService.getUniqueTypes();
            setSuggestions(data.rnd_asset_types);
        } catch (e) { }
    };

    useEffect(() => {
        fetchAssets();
        fetchSuggestions();
    }, []);

    const customSelectStyles = {
        control: (base: any) => ({
            ...base,
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderRadius: '0.75rem',
            padding: '2px',
            color: 'white',
            '&:hover': {
                borderColor: '#06b6d4',
            }
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isFocused ? '#334155' : 'transparent',
            color: 'white',
            '&:active': {
                backgroundColor: '#475569',
            }
        }),
        singleValue: (base: any) => ({
            ...base,
            color: 'white',
        }),
        input: (base: any) => ({
            ...base,
            color: 'white',
        })
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await rndService.updateAsset(editingId, formData);
                toast.success('R&D asset updated successfully');
            } else {
                await rndService.createAsset(formData);
                toast.success('R&D asset created successfully');
            }
            setModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', asset_type: 'vtol', serial_number: '', status: 'available', department_id: null, specifications: {}, is_classified: false, notes: '' });
            fetchAssets();
        } catch (error) {
            toast.error('Failed to create R&D asset');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between mt-2 mb-10">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-2.5 shadow-lg shadow-emerald-500/20">
                            <FlaskConical className="h-7 w-7 text-white" />
                        </div>
                        R&D Lab
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">V-TOL equipment, experimental prototypes, and R&D components.</p>
                </div>
                {user && hasAnyRole(user.role, ['super_admin', 'manager']) && (
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 active:scale-[0.97]">
                        <Plus className="h-4 w-4" /> Add R&D Asset
                    </button>
                )}
            </div>

            {/* Classification Warning */}
            <div className="flex items-center gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-6 py-4">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
                <div>
                    <p className="text-sm font-semibold text-rose-300">Classified Assets Notice</p>
                    <p className="mt-0.5 text-sm text-slate-400">Some assets are marked as classified. Access restricted to authorized personnel.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total R&D', value: assets.length, color: 'text-white' },
                    { label: 'V-TOL Units', value: assets.filter(a => a.asset_type === 'vtol').length, color: 'text-cyan-400' },
                    { label: 'Classified', value: assets.filter(a => a.is_classified).length, color: 'text-rose-400' },
                    { label: 'Available', value: assets.filter(a => a.status === 'available').length, color: 'text-emerald-400' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                        <p className={`font-heading mt-2 text-4xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
            ) : (
                <DataTable columns={columns} data={assets} keyExtractor={(row) => row.id} searchPlaceholder="Search equipment by name or serial..." />
            )}

            <Modal isOpen={modalOpen} onClose={() => {
                setModalOpen(false);
                setEditingId(null);
                setFormData({ name: '', asset_type: 'vtol', serial_number: '', status: 'available', department_id: null, specifications: {}, is_classified: false, notes: '' });
            }} title={editingId ? 'Edit R&D Asset' : 'Add R&D Asset'} size="lg">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Asset Name</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. V-TOL Gamma" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Type</label>
                            <CreatableSelect
                                isClearable
                                value={formData.asset_type ? { label: formData.asset_type.toUpperCase(), value: formData.asset_type } : null}
                                options={suggestions.map(t => ({ label: t.toUpperCase(), value: t }))}
                                onChange={(opt: any) => setFormData({ ...formData, asset_type: opt ? opt.value : '' })}
                                styles={customSelectStyles}
                                placeholder="Select or type new..."
                            />
                        </div>
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Serial Number</label><input required type="text" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="XX-XX-XXX" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div className="flex items-center gap-3 pt-8"><input type="checkbox" id="classified" checked={formData.is_classified} onChange={e => setFormData({ ...formData, is_classified: e.target.checked })} className="h-4 w-4 rounded border-slate-600 bg-slate-800" /><label htmlFor="classified" className="text-sm text-slate-300">Mark as Classified</label></div>
                        <div className="sm:col-span-2"><label className="mb-2 block text-sm font-medium text-slate-200">Notes / Details</label><input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Phase testing details..." className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2">
                            {submitting ? 'Saving...' : (editingId ? 'Update Asset' : 'Create Asset')}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
