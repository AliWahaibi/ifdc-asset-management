import { useState, useEffect } from 'react';
import { Plane, Plus, Wrench, Clock, CalendarCheck, Edit2, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import type { Column } from '@/components/ui/DataTable';
import type { DroneAsset } from '@/types';

import { operationService, type CreateDroneData } from '@/services/operationService';
import { userService } from '@/services/userService';
import { reservationService } from '@/services/reservationService';
import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole } from '@/lib/roles';
import toast from 'react-hot-toast';

export function OperationsDashboard() {
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
                asset_type: 'drone',
                asset_id: selectedAsset.id,
                start_date: new Date(reservationForm.start_date).toISOString(),
                end_date: new Date(reservationForm.end_date).toISOString(),
                notes: reservationForm.notes,
            });
            toast.success(`Reservation requested for ${selectedAsset.name}`);
            setReservationModalOpen(false);
            fetchDrones();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Failed to request reservation');
        } finally {
            setReserving(false);
        }
    };

    const columns: Column<DroneAsset>[] = [
        {
            key: 'name',
            header: 'Drone Name',
            render: (row) => <span className="font-medium text-white">{row.name}</span>,
        },
        { key: 'serial_number', header: 'Serial Number' },
        { key: 'model', header: 'Model' },
        {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'total_flight_hours',
            header: 'Flight Hours',
            render: (row) => (
                <span className="flex items-center gap-2 text-slate-200">
                    <Clock className="h-4 w-4 text-slate-500" />
                    {row.total_flight_hours.toLocaleString()}h
                </span>
            ),
        },
        {
            key: 'next_maintenance_date',
            header: 'Next Maintenance',
            render: (row) =>
                row.next_maintenance_date ? (
                    <span className="flex items-center gap-2 text-slate-200">
                        <Wrench className="h-4 w-4 text-slate-500" />
                        {new Date(row.next_maintenance_date).toLocaleDateString()}
                    </span>
                ) : (
                    <span className="text-amber-400 text-xs font-medium">Unscheduled</span>
                ),
        },
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
                    {row.status === 'maintenance' && (
                        <button
                            onClick={() => {
                                const notes = window.prompt('Enter maintenance notes (optional):') || 'Routine maintenance completed.';
                                operationService.resolveMaintenance(row.id, notes).then(() => {
                                    toast.success('Maintenance resolved');
                                    fetchDrones();
                                }).catch(() => {
                                    toast.error('Failed to resolve maintenance');
                                });
                            }}
                            className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                        >
                            <Wrench className="h-3.5 w-3.5" />
                            Clear
                        </button>
                    )}
                    {canEdit && (
                        <>
                            <button
                                onClick={() => {
                                    setEditingId(row.id);
                                    setFormData({
                                        name: row.name, model: row.model, serial_number: row.serial_number,
                                        status: row.status, department_id: row.department_id,
                                        total_flight_hours: row.total_flight_hours, notes: row.notes,
                                        cycle_count: 0,
                                        type: '',
                                    });
                                    setAssetType('drone');
                                    setModalOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                            </button>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this drone?')) {
                                        try {
                                            await operationService.deleteDrone(row.id);
                                            toast.success('Drone deleted successfully');
                                            fetchDrones();
                                        } catch (e) {
                                            toast.error('Failed to delete drone');
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

    const [drones, setDrones] = useState<DroneAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [assetType, setAssetType] = useState<'drone' | 'battery' | 'accessory'>('drone');

    // Form State
    const [formData, setFormData] = useState<any>({
        name: '',
        model: '',
        serial_number: '',
        status: 'available',
        department_id: null,
        total_flight_hours: 0,
        notes: '',
        cycle_count: 0,
        type: '',
    });

    const fetchDrones = async () => {
        try {
            setLoading(true);
            const data = await operationService.getDrones(1, 100); // Fetch all for now
            setDrones(data.data || []);
        } catch (error) {
            toast.error('Failed to load drone fleet');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrones();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingId) {
                // Edit only supports drones for now based on current UI
                const payload = { ...formData, total_flight_hours: Number(formData.total_flight_hours) };
                await operationService.updateDrone(editingId, payload);
                toast.success('Drone asset updated successfully');
            } else {
                if (assetType === 'drone') {
                    const payload = { ...formData, total_flight_hours: Number(formData.total_flight_hours) };
                    await operationService.createDrone(payload);
                } else if (assetType === 'battery') {
                    await operationService.createBattery({
                        name: formData.name,
                        model: formData.model,
                        serial_number: formData.serial_number,
                        cycle_count: Number(formData.cycle_count) || 0
                    });
                } else if (assetType === 'accessory') {
                    await operationService.createAccessory({
                        name: formData.name,
                        type: formData.type,
                        serial_number: formData.serial_number
                    });
                }
                toast.success(`${assetType.charAt(0).toUpperCase() + assetType.slice(1)} asset created successfully`);
            }
            setModalOpen(false);
            setEditingId(null);
            resetForm();
            fetchDrones();
        } catch (error) {
            toast.error(`Failed to ${editingId ? 'update' : 'create'} asset`);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            model: '',
            serial_number: '',
            status: 'available',
            department_id: null,
            total_flight_hours: 0,
            notes: '',
            cycle_count: 0,
            type: '',
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mt-2 mb-10">
                <div>
                    <h1 className="font-heading flex items-center gap-3 text-4xl font-bold tracking-tight text-white">
                        <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 shadow-lg shadow-cyan-500/20">
                            <Plane className="h-7 w-7 text-white" />
                        </div>
                        Drone Fleet
                    </h1>
                    <p className="mt-3 text-lg text-slate-400">
                        Manage drone assets, track flight hours, and schedule maintenance.
                    </p>
                </div>
                {user && hasAnyRole(user.role, ['super_admin', 'manager']) && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                setEditingId(null);
                                resetForm();
                                setModalOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.97]"
                        >
                            <Plus className="h-4 w-4" />
                            Add Asset
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Fleet', value: drones.length, color: 'text-white' },
                    { label: 'Available', value: drones.filter(d => d.status === 'available').length, color: 'text-emerald-400' },
                    { label: 'In Use', value: drones.filter(d => d.status === 'in_use').length, color: 'text-cyan-400' },
                    { label: 'Maintenance', value: drones.filter(d => d.status === 'maintenance').length, color: 'text-amber-400' },
                ].map((s) => (
                    <div key={s.label} className="glass-panel p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                        <p className={`font-heading mt-2 text-4xl font-extrabold tracking-tight ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={drones}
                    keyExtractor={(row) => row.id}
                    searchPlaceholder="Search by name, serial, or model..."
                />
            )}

            {/* Modal */}
            <Modal isOpen={modalOpen} onClose={() => {
                setModalOpen(false);
                setEditingId(null);
                resetForm();
            }} title={editingId ? 'Edit Drone Asset' : `Add New ${assetType.charAt(0).toUpperCase() + assetType.slice(1)}`} size="lg">
                <form className="space-y-5" onSubmit={handleSubmit}>
                    {!editingId && (
                        <div className="rounded-xl bg-slate-800/50 p-4 border border-slate-700/50">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Inventory Classification</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['drone', 'battery', 'accessory'] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setAssetType(type)}
                                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                                            assetType === type 
                                            ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-200">Asset Name</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={`e.g. ${assetType === 'drone' ? 'DJI Matrice 350' : assetType === 'battery' ? 'TB65 Intelligent Battery' : 'Zenmuse H20N'}`} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                        </div>

                        {assetType !== 'accessory' && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Model</label>
                                <input required type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. M350-RTK" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                        )}

                        {assetType === 'accessory' && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Accessory Type</label>
                                <input required type="text" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} placeholder="e.g. Camera, Props, Controller" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Serial Number</label>
                            <input required type="text" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} placeholder="SN-XXXX-XXX" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                        </div>

                        {assetType === 'drone' && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Total Flight Hours</label>
                                <input type="number" min="0" step="0.1" value={formData.total_flight_hours} onChange={e => setFormData({ ...formData, total_flight_hours: parseFloat(e.target.value) || 0 })} placeholder="e.g. 150.5" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                        )}

                        {assetType === 'battery' && (
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Cycle Count</label>
                                <input type="number" min="0" value={formData.cycle_count} onChange={e => setFormData({ ...formData, cycle_count: parseInt(e.target.value) || 0 })} placeholder="e.g. 42" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                            </div>
                        )}

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Initial Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30">
                                <option value="available">Available</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-200">Inventory Notes</label>
                            <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any additional information..." className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-400 hover:bg-slate-800">Cancel</button>
                        <button type="submit" disabled={submitting} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-2">
                            {submitting ? 'Saving...' : (editingId ? 'Update Drone' : 'Create Drone')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
