import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
    Calendar, Plus, Trash2, Car, Briefcase, Info, Loader2, AlertCircle, 
    Camera, Users, Users2 
} from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import Select, { components, OptionProps } from 'react-select';
import { admissionService, AssetAvailability } from '@/services/admissionService';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/services/userService';
import { User } from '@/types';

interface AdmissionFormData {
    project_name: string;
    purpose: string;
    start_date: string;
    end_date: string;
    assets: {
        asset_id: string;
    }[];
    need_vehicle: boolean;
    vehicle_id?: string;
    companion_ids: string[];
    assigned_to_id?: string;
}

interface AssetOption {
    value: string;
    label: string;
    asset: AssetAvailability;
    isDisabled: boolean;
}

const CustomOption = (props: OptionProps<AssetOption>) => {
    const { data, isDisabled } = props;
    return (
        <components.Option {...props}>
            <div className={`flex flex-col ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className="font-medium text-white">{data.asset.name}</span>
                {isDisabled && data.asset.is_reserved && (
                    <span className="text-xs text-red-400 mt-1">
                        ❌ {data.asset.name} (Reserved by {data.asset.reserved_by_user_name})
                    </span>
                )}
                {!isDisabled && (
                    <span className="text-xs text-slate-400">{data.asset.type}</span>
                )}
            </div>
        </components.Option>
    );
};

const customStyles = {
    control: (base: any, state: any) => ({
        ...base,
        background: 'rgba(30, 41, 59, 0.5)',
        borderColor: state.isFocused ? '#06b6d4' : '#334155',
        borderRadius: '0.75rem',
        padding: '2px',
        color: 'white',
        boxShadow: state.isFocused ? '0 0 0 1px #06b6d4' : 'none',
        '&:hover': {
            borderColor: '#06b6d4'
        }
    }),
    menu: (base: any) => ({
        ...base,
        background: '#1e293b',
        borderRadius: '0.75rem',
        border: '1px solid #334155',
        zIndex: 9999
    }),
    option: (base: any, state: any) => ({
        ...base,
        background: state.isFocused ? '#334155' : 'transparent',
        color: state.isDisabled ? '#94a3b8' : 'white',
        cursor: state.isDisabled ? 'not-allowed' : 'pointer',
        ':active': {
            backgroundColor: '#475569'
        }
    }),
    singleValue: (base: any) => ({
        ...base,
        color: 'white'
    }),
    input: (base: any) => ({
        ...base,
        color: 'white'
    })
};

export function ProjectAdmission() {
    const navigate = useNavigate();
    const [availableAssets, setAvailableAssets] = useState<AssetAvailability[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanBuffer, setScanBuffer] = useState('');
    const [lastScanTime, setLastScanTime] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const { user: currentUser } = useAuthStore();
    const isManagerial = currentUser?.role === 'manager' || currentUser?.role === 'team_leader' || currentUser?.role === 'super_admin';

    const { register, control, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<AdmissionFormData>({
        defaultValues: {
            assets: [{ asset_id: '' }],
            need_vehicle: false,
            companion_ids: []
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "assets"
    });

    const startDate = watch('start_date');
    const endDate = watch('end_date');
    const needVehicle = watch('need_vehicle');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                // Task 16: The dropdown for assigning users must fetch the full list of users
                const response = await userService.getUsers(1, 10000);
                setUsers(response.data);
            } catch (error) {
                console.error('Failed to fetch users', error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            if (currentTime - lastScanTime > 100) {
                setScanBuffer('');
            }
            setLastScanTime(currentTime);

            if (e.key === 'Enter') {
                if (scanBuffer.length > 2) {
                    handleScanSuccess(scanBuffer);
                }
                setScanBuffer('');
            } else if (e.key.length === 1) {
                setScanBuffer(prev => prev + e.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scanBuffer, lastScanTime, availableAssets]);

    const handleScanSuccess = (decodedText: string) => {
        setIsScannerOpen(false);
        const matchingAsset = nonVehicleAssets.find(a => 
            a.serial_number?.toLowerCase() === decodedText.toLowerCase() || 
            a.reference_number?.toLowerCase() === decodedText.toLowerCase()
        );

        if (matchingAsset) {
            const currentAssets = getValues('assets') || [];
            const isAlreadyAdded = currentAssets.some(a => a.asset_id === matchingAsset.id);

            if (!isAlreadyAdded) {
                const emptyIndex = currentAssets.findIndex(a => !a.asset_id);
                if (emptyIndex !== -1) {
                    update(emptyIndex, { asset_id: matchingAsset.id });
                } else {
                    append({ asset_id: matchingAsset.id });
                }
                toast.success(`Scanned: ${matchingAsset.name}`);
            } else {
                toast.error(`${matchingAsset.name} is already in the list`);
            }
        } else {
            toast.error(`No asset found for code: ${decodedText}`);
        }
    };

    useEffect(() => {
        const fetchAvailability = async () => {
            if (startDate && endDate) {
                setLoadingAvailability(true);
                try {
                    const assets = await admissionService.checkAvailability(startDate, endDate);
                    setAvailableAssets(assets);
                } catch (error) {
                    toast.error('Failed to check asset availability');
                } finally {
                    setLoadingAvailability(false);
                }
            }
        };

        fetchAvailability();
    }, [startDate, endDate]);

    const onSubmit = async (data: AdmissionFormData) => {
        setSubmitting(true);
        try {
            const requestedAssets = data.assets
                .filter(a => a.asset_id)
                .map(a => {
                    const asset = availableAssets.find(av => av.id === a.asset_id);
                    return {
                        asset_id: a.asset_id,
                        asset_type: asset?.type || 'unknown'
                    };
                });

            if (data.need_vehicle && data.vehicle_id) {
                const vehicle = availableAssets.find(av => av.id === data.vehicle_id);
                if (vehicle) {
                    requestedAssets.push({
                        asset_id: data.vehicle_id,
                        asset_type: vehicle.type
                    });
                }
            }

            if (requestedAssets.length === 0) {
                toast.error('Please select at least one asset or vehicle');
                return;
            }

            await admissionService.createAdmission({
                project_name: data.project_name,
                purpose: data.purpose,
                start_date: new Date(data.start_date).toISOString(),
                end_date: new Date(data.end_date).toISOString(),
                requested_assets: requestedAssets,
                assigned_to_id: data.assigned_to_id,
                companion_ids: data.companion_ids
            });

            toast.success('Project admission submitted successfully!');
            navigate('/admissions-list');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to submit admission');
        } finally {
            setSubmitting(false);
        }
    };

    const nonVehicleAssets = availableAssets.filter(a => a.type !== 'vehicle');
    const vehicleAssets = availableAssets.filter(a => a.type === 'vehicle');

    const formatOptions = (assets: AssetAvailability[]): AssetOption[] => {
        return assets.map(asset => ({
            value: asset.id,
            label: asset.name,
            asset: asset,
            isDisabled: asset.is_reserved
        }));
    };

    const userOptions = users.map(u => ({
        value: u.id,
        label: u.full_name,
        email: u.email
    }));

    const assetFilter = (option: any, inputValue: string) => {
        if (!inputValue) return true;
        const input = inputValue.toLowerCase();
        const asset = option.data.asset;
        const serialMatch = asset.serial_number?.toLowerCase().includes(input);
        const refMatch = asset.reference_number?.toLowerCase().includes(input);
        const nameMatch = asset.name?.toLowerCase().includes(input);
        return serialMatch || refMatch || nameMatch;
    };

    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in py-4">
            <div className="flex items-center gap-4 mb-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-xl shadow-blue-500/20">
                    <Briefcase className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white">Project Admission</h1>
                    <p className="mt-1 text-slate-400">Request resources and assets for a new project.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-cyan-400" /> Project Details
                    </h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
                            <input
                                {...register('project_name', { required: 'Project name is required' })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                                placeholder="Enter project name (e.g., Namaa)"
                            />
                            {errors.project_name && <span className="text-xs text-red-400 mt-1">{errors.project_name.message}</span>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Purpose / Description</label>
                            <textarea
                                {...register('purpose', { required: 'Project purpose is required' })}
                                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                                placeholder="Briefly describe the purpose of this request"
                                rows={3}
                            />
                            {errors.purpose && <span className="text-xs text-red-400 mt-1">{errors.purpose.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 pointer-events-none" />
                                <input
                                    type="date"
                                    {...register('start_date', { required: 'Start date is required' })}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all [color-scheme:dark]"
                                />
                            </div>
                            {errors.start_date && <span className="text-xs text-red-400 mt-1">{errors.start_date.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-slate-500 pointer-events-none" />
                                <input
                                    type="date"
                                    {...register('end_date', { required: 'End date is required' })}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 pl-10 pr-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all [color-scheme:dark]"
                                />
                            </div>
                            {errors.end_date && <span className="text-xs text-red-400 mt-1">{errors.end_date.message}</span>}
                        </div>
                    </div>
                </div>

                <div className="relative z-50 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-violet-400" /> Requested Assets
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 animate-pulse uppercase tracking-wider">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Barcode Scanner Ready
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    console.log("Scanner button clicked");
                                    setIsScannerOpen(true);
                                }}
                                className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-slate-700 transition-all border border-slate-700 hover:border-cyan-500/50 group"
                            >
                                <Camera className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                                Use Camera
                            </button>
                            <button
                                type="button"
                                onClick={() => append({ asset_id: '' })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
                            >
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        </div>
                    </div>

                    {loadingAvailability ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" /> Checking availability...
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(!startDate || !endDate) && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" /> Select dates above to see available assets.
                                </div>
                            )}

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-start animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex-1 relative">
                                        <Controller
                                            control={control}
                                            name={`assets.${index}.asset_id`}
                                            rules={{ required: true }}
                                            render={({ field: { onChange, value } }) => (
                                                <Select
                                                    options={formatOptions(nonVehicleAssets)}
                                                    components={{ Option: CustomOption }}
                                                    styles={customStyles}
                                                    placeholder="Scan Barcode or Search Asset..."
                                                    isDisabled={!startDate || !endDate}
                                                    isClearable
                                                    isSearchable
                                                    filterOption={assetFilter}
                                                    noOptionsMessage={() => "Asset not found"}
                                                    value={formatOptions(nonVehicleAssets).find(op => op.value === value)}
                                                    onChange={(option) => onChange((option as AssetOption)?.value)}
                                                />
                                            )}
                                        />
                                    </div>
                                    {fields.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Team Allocation */}
                <div className="relative z-40 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-400" /> Team Allocation
                    </h2>
                    
                    <div className="space-y-6">
                        {isManagerial && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                                    <Users2 className="h-4 w-4 text-cyan-400" /> Assign To Employee
                                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase font-mono">Managerial Only</span>
                                </label>
                                <Controller
                                    control={control}
                                    name="assigned_to_id"
                                    render={({ field: { onChange, value } }) => (
                                        <Select
                                            options={userOptions}
                                            styles={customStyles}
                                            placeholder="Select employee to lead this project..."
                                            isClearable
                                            isSearchable
                                            isLoading={loadingUsers}
                                            value={userOptions.find(op => op.value === value)}
                                            onChange={(option: any) => onChange(option?.value)}
                                        />
                                    )}
                                />
                                <p className="mt-1.5 text-xs text-slate-500 italic">If assigned, the employee will receive a notification to accept the task.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                                <Users className="h-4 w-4 text-violet-400" /> Project Companions
                            </label>
                            <Controller
                                control={control}
                                name="companion_ids"
                                render={({ field: { onChange, value } }) => (
                                    <Select
                                        isMulti
                                        options={userOptions}
                                        styles={customStyles}
                                        placeholder="Add other team members to this project..."
                                        isLoading={loadingUsers}
                                        value={userOptions.filter(op => value?.includes(op.value))}
                                        onChange={(options: any) => onChange(options ? options.map((opt: any) => opt.value) : [])}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* Vehicle Selection */}
                <div className="relative z-10 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <input
                            type="checkbox"
                            id="need_vehicle"
                            {...register('need_vehicle')}
                            className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="need_vehicle" className="text-lg font-semibold text-white flex items-center gap-2 cursor-pointer select-none">
                            <Car className="h-5 w-5 text-emerald-400" /> Do you need a Vehicle?
                        </label>
                    </div>

                    {needVehicle && (
                        <div className="pl-8 animate-fade-in">
                            {loadingAvailability ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading vehicles...
                                </div>
                            ) : (
                                <Controller
                                    control={control}
                                    name="vehicle_id"
                                    rules={{ required: needVehicle }}
                                    render={({ field: { onChange, value } }) => (
                                        <Select
                                            options={formatOptions(vehicleAssets)}
                                            components={{ Option: CustomOption }}
                                            styles={customStyles}
                                            placeholder="Search and select a vehicle..."
                                            isDisabled={!startDate || !endDate}
                                            isClearable
                                            isSearchable
                                            noOptionsMessage={() => "Vehicle not found"}
                                            value={formatOptions(vehicleAssets).find(op => op.value === value)}
                                            onChange={(option) => onChange((option as AssetOption)?.value)}
                                        />
                                    )}
                                />
                            )}
                            {errors.vehicle_id && <span className="text-xs text-red-400 mt-1 block">Please select a vehicle</span>}
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={submitting || loadingAvailability}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] hover:shadow-cyan-500/40 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
            <Modal 
                isOpen={isScannerOpen} 
                onClose={() => setIsScannerOpen(false)} 
                title="Scan Asset Barcode"
                size="md"
            >
                <BarcodeScanner 
                    onScanSuccess={handleScanSuccess} 
                    onClose={() => setIsScannerOpen(false)} 
                />
            </Modal>
        </div>
    );
}
