import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, Car, Edit2, Trash2 } from 'lucide-react';
import { vehicleService, VehicleAsset, CreateVehicleAssetData } from '@/services/vehicleService';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { format } from 'date-fns';

export function VehiclesManagement() {
    const [assets, setAssets] = useState<VehicleAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<VehicleAsset | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateVehicleAssetData>();

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const response = await vehicleService.getAssets(page, 10, searchTerm);
            setAssets(response.data);
            setTotalPages(Math.ceil(response.total / response.limit));
        } catch (error) {
            toast.error('Failed to fetch vehicle assets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchAssets();
        }, 300);
        return () => clearTimeout(debounce);
    }, [page, searchTerm]);

    const onSubmit = async (data: CreateVehicleAssetData) => {
        try {
            if (editingAsset) {
                await vehicleService.updateAsset(editingAsset.id, data);
                toast.success('Vehicle updated successfully');
            } else {
                await vehicleService.createAsset(data);
                toast.success('Vehicle created successfully');
            }
            setIsModalOpen(false);
            reset();
            setEditingAsset(null);
            fetchAssets();
        } catch (error) {
            toast.error(editingAsset ? 'Failed to update vehicle' : 'Failed to create vehicle');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this vehicle?')) {
            try {
                await vehicleService.deleteAsset(id);
                toast.success('Vehicle deleted successfully');
                fetchAssets();
            } catch (error) {
                toast.error('Failed to delete vehicle');
            }
        }
    };

    const openEditModal = (asset: VehicleAsset) => {
        setEditingAsset(asset);
        reset({
            name: asset.name,
            license_plate: asset.license_plate,
            status: asset.status,
            mileage: asset.mileage,
            notes: asset.notes
        });
        setIsModalOpen(true);
    };

    const columns: Column<VehicleAsset>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (row: VehicleAsset) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Car className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-medium text-white">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.license_plate}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row: VehicleAsset) => (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${row.status === 'available' ? 'bg-green-400/10 text-green-400 ring-green-400/20' :
                    row.status === 'in_use' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/20' :
                        row.status === 'maintenance' ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20' :
                            'bg-red-400/10 text-red-400 ring-red-400/20'
                    }`}>
                    {row.status.replace('_', ' ').toUpperCase()}
                </span>
            ),
        },
        {
            key: 'mileage',
            header: 'Mileage',
            render: (row: VehicleAsset) => <span className="text-slate-300">{row.mileage.toLocaleString()} km</span>,
        },
        {
            key: 'updated_at',
            header: 'Last Updated',
            render: (row: VehicleAsset) => <span className="text-slate-400">{format(new Date(row.updated_at), 'MMM d, yyyy')}</span>,
        },
        {
            key: 'id',
            header: 'Actions',
            render: (row: VehicleAsset) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => openEditModal(row)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    const vehicles = assets;
    console.log("Raw Vehicle Data:", vehicles);

    return (
        <div className="space-y-8 animate-fade-in py-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/20">
                        <Car className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">Vehicles</h1>
                        <p className="mt-1 text-slate-400">Manage fleet vehicles, mileage, and maintenance.</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingAsset(null);
                        reset({ status: 'available', mileage: 0 });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="h-5 w-5" />
                    Add Vehicle
                </button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search vehicles by name or license plate..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-sm overflow-hidden shadow-xl">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={vehicles}
                        keyExtractor={(row) => row.id}
                        searchPlaceholder="Search vehicles by name or license plate..."
                    />
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAsset ? 'Edit Vehicle' : 'Add New Vehicle'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Vehicle Name</label>
                        <input
                            {...register('name', { required: 'Name is required' })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. Toyota Land Cruiser"
                        />
                        {errors.name && <span className="text-xs text-red-400">{errors.name.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">License Plate</label>
                        <input
                            {...register('license_plate', { required: 'License plate is required' })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            placeholder="e.g. DXB 12345"
                        />
                        {errors.license_plate && <span className="text-xs text-red-400">{errors.license_plate.message}</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                            <select
                                {...register('status', { required: true })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="available">Available</option>
                                <option value="in_use">In Use</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="reserved">Reserved</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Mileage (km)</label>
                            <input
                                type="number"
                                {...register('mileage', { valueAsNumber: true })}
                                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Notes</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                            placeholder="Additional details..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            {editingAsset ? 'Update Vehicle' : 'Create Vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
