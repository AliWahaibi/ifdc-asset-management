import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/services/userService';
import { Shield, UploadCloud, Save, User as UserIcon, ArrowLeft, Monitor, Briefcase, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function UserProfile() {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
    const [admissions, setAdmissions] = useState<any[]>([]);
    const [viewedUser, setViewedUser] = useState<any>(null);

    const isOwnProfile = !id || id === currentUser?.id;

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        position: '',
        phone: '',
        cv_file: null as File | null,
        id_card_file: null as File | null,
    });

    useEffect(() => {
        const loadProfile = async () => {
            if (!currentUser) return;
            setLoading(true);
            setError(null);
            try {
                if (isOwnProfile) {
                    const data = await userService.getProfile();
                    if (data && data.user) {
                        setViewedUser(data.user);
                        setAssignedAssets(data.office_assets || []);
                    } else {
                        throw new Error('Profile data incomplete');
                    }
                } else if (id) {
                    const data = await userService.getUser(id) as any;
                    if (data && data.user) {
                        setViewedUser(data.user);
                        setAssignedAssets(data.office_assets || []);
                        setAdmissions(data.admissions || []);
                    } else {
                        setError('User not found or access denied');
                    }
                }
            } catch (err: any) {
                console.error('Failed to load profile:', err);
                setError(err.message || 'Failed to load profile data');
                toast.error('Failed to load profile');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [id, isOwnProfile, currentUser]);

    useEffect(() => {
        if (viewedUser) {
            setFormData({
                full_name: viewedUser.full_name || '',
                email: viewedUser.email || '',
                position: viewedUser.position || '',
                phone: viewedUser.phone || '',
                cv_file: null,
                id_card_file: null,
            });
        }
    }, [viewedUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cv_file' | 'id_card_file') => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData({ ...formData, [field]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !viewedUser || !isOwnProfile) return;
        setLoading(true);

        const uploadData = new FormData();
        uploadData.append('full_name', formData.full_name);
        // Retain basic defaults, don't overwrite role or pass
        uploadData.append('email', viewedUser?.email || '');
        uploadData.append('role', viewedUser?.role || 'user');

        uploadData.append('phone', formData.phone);

        if (formData.cv_file) {
            uploadData.append('cv_file', formData.cv_file);
        }
        if (formData.id_card_file) {
            uploadData.append('id_card_file', formData.id_card_file);
        }

        try {
            await userService.updateUser(viewedUser.id, uploadData);
            toast.success('Profile updated successfully! Refreshing...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser || (loading && !viewedUser)) return (
        <div className="flex h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
                <p className="text-slate-400 animate-pulse text-sm font-medium">Loading profile details...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="mx-auto max-w-3xl py-20 px-4 text-center">
            <div className="mb-6 flex justify-center">
                <div className="rounded-2xl bg-rose-500/10 p-4 border border-rose-500/20">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">{error}</p>
            <button 
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-all border border-slate-700"
            >
                <ArrowLeft className="h-4 w-4" />
                Go Back
            </button>
        </div>
    );

    if (!viewedUser) return null;

    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in py-8 px-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-xl shadow-cyan-500/20">
                        <UserIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="font-heading text-3xl font-bold tracking-tight text-white">
                            {isOwnProfile ? 'My Profile' : `${viewedUser?.full_name || 'User'}'s Profile`}
                        </h1>
                        <p className="mt-1 text-slate-400">
                            {isOwnProfile ? 'Manage your personal information and documents.' : `Viewing deployment and asset details for ${viewedUser?.role?.replace('_', ' ') || 'member'}.`}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-violet-500" />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
                        <input 
                            required 
                            type="text" 
                            readOnly={!isOwnProfile}
                            value={formData.full_name} 
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })} 
                            className={`w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${!isOwnProfile ? 'opacity-70 cursor-not-allowed' : ''}`} 
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">Email Address</label>
                        <input readOnly type="email" value={formData.email} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">Position</label>
                        <input readOnly type="text" value={formData.position} className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 outline-none cursor-not-allowed" />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">Phone Number</label>
                        <input 
                            type="text" 
                            readOnly={!isOwnProfile}
                            value={formData.phone} 
                            onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                            className={`w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 ${!isOwnProfile ? 'opacity-70 cursor-not-allowed' : ''}`} 
                            placeholder="+968..." 
                        />
                    </div>
                </div>

                {isOwnProfile && (
                    <div className="pt-4 border-t border-slate-700/50">
                        <h3 className="mb-4 text-sm font-semibold text-slate-300">Identity Documents</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <UploadCloud className="h-4 w-4 text-cyan-400" />
                                    Update CV (PDF, Image)
                                </label>
                                <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, 'cv_file')} className="w-full text-[11px] text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-cyan-500/10 file:px-3 file:py-1.5 file:font-semibold file:text-cyan-400 hover:file:bg-cyan-500/20" />
                            </div>
                            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50">
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
                                    <Shield className="h-4 w-4 text-violet-400" />
                                    Update Emirates ID (PDF, Image)
                                </label>
                                <input type="file" accept=".pdf,image/*" onChange={e => handleFileChange(e, 'id_card_file')} className="w-full text-[11px] text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-500/10 file:px-3 file:py-1.5 file:font-semibold file:text-violet-400 hover:file:bg-violet-500/20" />
                            </div>
                        </div>
                    </div>
                )}

                {isOwnProfile && (
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={loading} className="flex flex-1 sm:flex-none w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.98] disabled:opacity-50">
                            <Save className="h-4 w-4" />
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                )}
            </form>

            {/* Assigned Assets Section */}
            <div className="space-y-4 pt-10 border-t border-slate-700/50">
                <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-cyan-400" />
                    {isOwnProfile ? 'My Assigned Assets' : `${viewedUser?.role?.replace('_', ' ') || 'User'}'s Assigned Assets`}
                </h2>
                {assignedAssets.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
                        <p className="text-slate-500 italic">No office assets currently assigned to this user.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {assignedAssets.map((asset: any) => (
                            <div key={asset.id} className="glass-panel p-5 group hover:border-cyan-500/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase text-sm">{asset.name}</h3>
                                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{asset.category}</p>
                                    </div>
                                    <span className="text-[9px] font-mono bg-slate-800/50 border border-slate-700 px-1.5 py-0.5 rounded text-slate-500">{asset.serial_number}</span>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-500">Status: <span className="text-emerald-400 font-medium">{asset.status}</span></span>
                                    {asset.warranty_expiry && (
                                        <span className="text-slate-500">Warranty: {new Date(asset.warranty_expiry).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Admissions Section */}
            {!isOwnProfile && (
                <div className="space-y-4 pt-10 border-t border-slate-700/50">
                    <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-violet-400" />
                        Project Admissions & Assignments
                    </h2>
                    {admissions.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
                            <p className="text-slate-500 italic">No project admissions recorded for this user.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {admissions.map((proj: any) => (
                                <div key={proj.id} className="glass-panel p-5 border-l-4 border-l-violet-500">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-white">{proj.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${proj.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                            {proj.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex gap-4 text-xs text-slate-400">
                                        <span>Start: {new Date(proj.start_date).toLocaleDateString()}</span>
                                        <span>End: {new Date(proj.end_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
