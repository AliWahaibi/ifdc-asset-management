import { useState, useEffect } from 'react';
import { Monitor, Plus, CalendarCheck, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import Select from 'react-select';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import type { OfficeAsset } from '@/types';

import { officeService, type CreateOfficeAssetData } from '@/services/officeService';
import { reservationService } from '@/services/reservationService';
import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole } from '@/lib/roles';
import { userService } from '@/services/userService';
import type { User } from '@/types';
import toast from 'react-hot-toast';

const CATEGORY_LABELS: Record<string, string> = {
    furniture: '🪑 Furniture', printer: '🖨️ Printer', laptop: '💻 Laptop',
    desktop: '🖥️ Desktop', monitor: '📺 Monitor', phone: '📞 Phone',
    networking: '🌐 Networking', other: '📦 Other',
};

export function OfficeDashboard() {
    const { user } = useAuthStore();
    const canEdit = user ? hasAnyRole(user.role, ['super_admin', 'manager']) : false;
    const [editingId, setEditingId] = useState<string | null>(null);

    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    const [reservationForm, setReservationForm] = useState({ start_date: '', end_date: '', notes: '' });
    const [reserving, setReserving] = useState(false);

    const handleReserveClick = (asset: any) => {
        setSelectedAsset(asset);
        setReservationForm({ start_date: '', end_date: '', notes: '' });
        setReservationModalOpen(true);
    };

    const handleReservationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAsset) return;
        setReserving(true);
        try {
            await reservationService.createReservation({
                asset_type: 'office',
                asset_id: selectedAsset.id,
                start_date: new Date(reservationForm.start_date).toISOString(),
                end_date: new Date(reservationForm.end_date).toISOString(),
                notes: reservationForm.notes,
            });
            toast.success(`Reservation requested for ${selectedAsset.name}`);
            setReservationModalOpen(false);
            fetchAssets();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to request reservation');
        } finally {
            setReserving(false);
        }
    };

    const columns: Column<OfficeAsset>[] = [
        {
            key: 'name',
            header: 'Asset Name',
            render: (row) => <span className="font-medium text-white">{row.name}</span>,
        },
        {
            key: 'category',
            header: 'Category',
            render: (row) => <span className="text-sm">{CATEGORY_LABELS[row.category] ?? row.category}</span>,
        },
        { key: 'serial_number', header: 'Serial Number' },
        { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status as any} /> },
        {
            key: 'id',
            header: 'Actions',
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        disabled={row.status !== 'available'}
                        onClick={() => handleReserveClick(row)}
                        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-slate-300"
                    >
                        <CalendarCheck className="h-3.5 w-3.5" />
                        Reserve
                    </button>
                    {canEdit && (
                        <>
                            <button
                                onClick={() => {
                                    setEditingId(row.id);
                                    setFormData({
                                        name: row.name, 
                                        category: row.category, 
                                        serial_number: row.serial_number,
                                        status: row.status, 
                                        department_id: row.department_id ?? null,
                                        user_id: row.user_id ?? null, 
                                        assigned_to: row.assigned_to ?? null, 
                                        purchase_date: row.purchase_date ?? null,
                                        warranty_expiry: row.warranty_expiry ?? null, 
                                        notes: row.notes,
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
                                    if (window.confirm('Are you sure you want to delete this asset?')) {
                                        try {
                                            await officeService.deleteAsset(row.id);
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

    const [assets, setAssets] = useState<OfficeAsset[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<{ value: string, label: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<CreateOfficeAssetData>({
        name: '', category: 'laptop', serial_number: '', status: 'Available',
        department_id: null, user_id: null, assigned_to: null, purchase_date: '', warranty_expiry: '', notes: ''
    });

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const data = await officeService.getAssets(1, 100);
            setAssets(data.data || []);
        } catch (error) {
            toast.error('Failed to load office assets');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers(1, 1000);
            setUsers(data.data || []);
        } catch (error) {
            console.error('Failed to load users');
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await officeService.getCategories();
            const formatted = data.map(c => ({
                value: c.name,
                label: CATEGORY_LABELS[c.name] || c.name.charAt(0).toUpperCase() + c.name.slice(1)
            }));
            setCategories(formatted);
        } catch (error) {
            console.error('Failed to load categories');
        }
    };

    useEffect(() => {
        fetchAssets();
        fetchUsers();
        fetchCategories();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                await officeService.updateAsset(editingId, formData);
                toast.success('Office asset updated successfully');
            } else {
                await officeService.createAsset(formData);
                toast.success('Office asset created successfully');
            }
            setModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', category: 'laptop', serial_number: '', status: 'Available', department_id: null, user_id: null, assigned_to: null, purchase_date: '', warranty_expiry: '', notes: '' });
            fetchAssets();
            fetchCategories();
        } catch (error) {
            toast.error('Failed to create office asset');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-between mt-2 mb-10">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 shadow-lg shadow-violet-500/20">
                            <Monitor className="h-7 w-7 text-white" />
                        </div>
                        Office Assets
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">Track office equipment, furniture, and IT assets.</p>
                </div>
                {user && hasAnyRole(user.role, ['super_admin', 'manager']) && (
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 active:scale-[0.97]">
                        <Plus className="h-4 w-4" /> Add Asset
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Assets', value: assets.length, color: 'text-white' },
                    { label: 'Available', value: assets.filter(a => a.status === 'available').length, color: 'text-emerald-400' },
                    { label: 'Assigned', value: assets.filter(a => a.status === 'in_use').length, color: 'text-cyan-400' },
                    { label: 'Maintenance', value: assets.filter(a => a.status === 'maintenance').length, color: 'text-amber-400' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                        <p className={`font-heading mt-2 text-4xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
            ) : (
                <DataTable columns={columns} data={assets} keyExtractor={(row) => row.id} searchPlaceholder="Search office assets by name or serial..." />
            )}

            <Modal isOpen={modalOpen} onClose={() => {
                setModalOpen(false);
                setEditingId(null);
                setFormData({ name: '', category: 'laptop', serial_number: '', status: 'Available', department_id: null, user_id: null, assigned_to: null, purchase_date: '', warranty_expiry: '', notes: '' });
            }} title={editingId ? 'Edit Office Asset' : 'Add Office Asset'} size="lg">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Asset Name</label><input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Dell Latitude" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Category</label>
                            <CreatableSelect
                                isClearable
                                options={categories.length > 0 ? categories : Object.entries(CATEGORY_LABELS).map(([val, label]) => ({ value: val, label }))}
                                value={formData.category ? { value: formData.category, label: CATEGORY_LABELS[formData.category] || formData.category } : null}
                                onChange={(option: any) => setFormData({ ...formData, category: option?.value || '' })}
                                onCreateOption={async (inputValue) => {
                                    setFormData({ ...formData, category: inputValue });
                                    setCategories(prev => [...prev, { value: inputValue, label: inputValue }]);
                                }}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#1E293B',
                                        borderColor: '#334155',
                                        borderRadius: '0.75rem',
                                        padding: '0.2rem 0.5rem',
                                        color: 'white',
                                    }),
                                    menu: (base) => ({ ...base, backgroundColor: '#1E293B', borderColor: '#334155' }),
                                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#334155' : 'transparent', color: 'white' }),
                                    singleValue: (base) => ({ ...base, color: 'white' }),
                                    input: (base) => ({ ...base, color: 'white' }),
                                }}
                            />
                        </div>
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Serial Number</label><input required type="text" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="XX-XXXX-XXX" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Assign to User</label>
                            <Select
                                isClearable
                                options={users.map(u => ({ value: u.id, label: u.full_name }))}
                                value={formData.user_id ? { value: formData.user_id, label: users.find(u => u.id === formData.user_id)?.full_name || 'Unknown' } : null}
                                onChange={(option: any) => setFormData({ ...formData, user_id: option?.value || null })}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#1E293B',
                                        borderColor: '#334155',
                                        borderRadius: '0.75rem',
                                        padding: '0.2rem 0.5rem',
                                        color: 'white',
                                    }),
                                    menu: (base) => ({ ...base, backgroundColor: '#1E293B', borderColor: '#334155' }),
                                    option: (base, state) => ({ ...base, backgroundColor: state.isFocused ? '#334155' : 'transparent', color: 'white' }),
                                    singleValue: (base) => ({ ...base, color: 'white' }),
                                    input: (base) => ({ ...base, color: 'white' }),
                                }}
                            />
                        </div>
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Purchase Date</label><input required type="date" value={formData.purchase_date || ''} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div><label className="mb-2 block text-sm font-medium text-slate-200">Warranty Expiry</label><input type="date" value={formData.warranty_expiry || ''} onChange={e => setFormData({ ...formData, warranty_expiry: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                        <div className="sm:col-span-2"><label className="mb-2 block text-sm font-medium text-slate-200">Notes / Details</label><input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Location, specs..." className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2">
                            {submitting ? 'Saving...' : (editingId ? 'Update Asset' : 'Create Asset')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Reservation Modal */}
            <Modal isOpen={reservationModalOpen} onClose={() => setReservationModalOpen(false)} title={`Request Reservation: ${selectedAsset?.name}`}>
                <form onSubmit={handleReservationSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">Start Date</label>
                            <input required type="datetime-local" value={reservationForm.start_date} onChange={e => setReservationForm({ ...reservationForm, start_date: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-300">End Date</label>
                            <input required type="datetime-local" value={reservationForm.end_date} onChange={e => setReservationForm({ ...reservationForm, end_date: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-300">Reason / Notes</label>
                        <textarea required value={reservationForm.notes} onChange={e => setReservationForm({ ...reservationForm, notes: e.target.value })} className="h-24 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="Please provide a valid reason..."></textarea>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setReservationModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
                        <button type="submit" disabled={reserving || !reservationForm.start_date || !reservationForm.end_date || !reservationForm.notes} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50">
                            {reserving ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
