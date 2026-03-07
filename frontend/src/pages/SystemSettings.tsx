import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { settingsService, SystemSetting } from '@/services/settingsService';
import { Settings, Save, Building, Mail, Activity, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

export function SystemSettings() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [settings, setSettings] = useState<SystemSetting>({
        id: 1,
        company_name: '',
        support_email: '',
        maintenance_threshold_hours: 50,
        default_currency: 'OMR'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await settingsService.getSettings();
                setSettings(data);
            } catch (error) {
                toast.error('Failed to load system settings');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const updated = await settingsService.updateSettings(settings);
            setSettings(updated);
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-8 animate-fade-in py-8 px-4">
            <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 shadow-xl shadow-cyan-500/20">
                    <Settings className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white">System Settings</h1>
                    <p className="mt-1 text-slate-400">Configure global application parameters and operational thresholds.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* General Section */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 md:p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-violet-500" />
                    <h3 className="mb-6 text-lg font-semibold text-white flex items-center gap-2">
                        <Building className="h-5 w-5 text-cyan-400" /> General Configuration
                    </h3>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-200">Company Name</label>
                            <div className="relative">
                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input required type="text" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Support Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input required type="email" value={settings.support_email} onChange={e => setSettings({ ...settings, support_email: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Default Currency</label>
                            <div className="relative">
                                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input required type="text" value={settings.default_currency} onChange={e => setSettings({ ...settings, default_currency: e.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" placeholder="OMR" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Section */}
                <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-6 md:p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-rose-500" />
                    <h3 className="mb-6 text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-orange-400" /> Operations Thresholds
                    </h3>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-200">Maintenance Threshold (Hours)</label>
                            <div className="relative">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <input required type="number" min="0" value={settings.maintenance_threshold_hours} onChange={e => setSettings({ ...settings, maintenance_threshold_hours: parseInt(e.target.value) || 0 })} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500" />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Flight hours before a drone requires maintenance alerts.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    {(() => {
                        const { user } = useAuthStore.getState();
                        const canEdit = user ? ['super_admin', 'admin'].includes(user.role) : false;
                        if (!canEdit) return null;
                        return (
                            <button type="submit" disabled={submitting} className="flex flex-1 sm:flex-none w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-[0.98] disabled:opacity-50">
                                <Save className="h-4 w-4" />
                                {submitting ? 'Saving...' : 'Save Settings'}
                            </button>
                        );
                    })()}
                </div>
            </form>
        </div>
    );
}
