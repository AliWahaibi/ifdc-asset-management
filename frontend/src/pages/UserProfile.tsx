import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { userService } from '@/services/userService';
import { Shield, UploadCloud, Save, User as UserIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export function UserProfile() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        position: '',
        phone: '',
        cv_file: null as File | null,
        id_card_file: null as File | null,
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || '',
                position: user.position || '',
                phone: user.phone || '',
            }));
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'cv_file' | 'id_card_file') => {
        if (e.target.files && e.target.files.length > 0) {
            setFormData({ ...formData, [field]: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const uploadData = new FormData();
        uploadData.append('full_name', formData.full_name);
        // Retain basic defaults, don't overwrite role or pass
        uploadData.append('email', user.email);
        uploadData.append('role', user.role);

        uploadData.append('phone', formData.phone);

        if (formData.cv_file) {
            uploadData.append('cv_file', formData.cv_file);
        }
        if (formData.id_card_file) {
            uploadData.append('id_card_file', formData.id_card_file);
        }

        try {
            await userService.updateUser(user.id, uploadData);
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

    if (!user) return null;

    return (
        <div className="mx-auto max-w-3xl space-y-8 animate-fade-in py-8 px-4">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-xl shadow-cyan-500/20">
                    <UserIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white">My Profile</h1>
                    <p className="mt-1 text-slate-400">Manage your personal information and documents.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-violet-500" />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
                        <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
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
                        <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="+968..." />
                    </div>
                </div>

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

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={loading} className="flex flex-1 sm:flex-none w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.98] disabled:opacity-50">
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}
