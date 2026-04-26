import { useState, useEffect } from 'react';
import { Car, Drone, Laptop, FlaskConical, Send, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';

export function ExternalReservation() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [availableAssets, setAvailableAssets] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        asset_type: 'drone',
        asset_id: '',
        start_date: '',
        end_date: '',
        notes: '',
        external_org_name: '',
        external_contact_email: ''
    });

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                // We'll use a public endpoint if available, or just fetch all for now
                // For security, usually you'd only show certain assets
                // But for this task, let's assume they know what they want or we fetch IDs
                const response = await apiClient.get(`/public/assets/list?type=${formData.asset_type}`);
                setAvailableAssets(response.data);
            } catch (e) {
                console.error("Failed to fetch assets", e);
            }
        };
        if (formData.asset_type) {
            fetchAssets();
        }
    }, [formData.asset_type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiClient.post('/public/reserve', formData);
            setSubmitted(true);
            toast.success('Reservation request submitted successfully');
        } catch (error: any) {
            toast.error(error?.response?.data?.error || 'Failed to submit request');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center backdrop-blur-xl">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h2 className="font-heading text-3xl font-bold text-white">Request Received!</h2>
                    <p className="mt-4 text-slate-400">Your reservation request has been submitted for internal review. We will contact you at {formData.external_contact_email} once approved.</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-8 w-full rounded-xl bg-emerald-500 py-4 font-bold text-white transition-all hover:bg-emerald-600 active:scale-95"
                    >
                        Submit Another Request
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 px-6 py-12 selection:bg-emerald-500/30">
            <div className="mx-auto max-w-2xl">
                <div className="text-center mb-12">
                    <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Asset <span className="text-emerald-500">Reservation</span>
                    </h1>
                    <p className="mt-4 text-lg text-slate-400">External Organization Request Form</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-md shadow-2xl">
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        {/* Organization Details */}
                        <div className="sm:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500">Organization Information</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Organization Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.external_org_name}
                                        onChange={e => setFormData({...formData, external_org_name: e.target.value})}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                                        placeholder="e.g. United Nations"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Contact Email</label>
                                    <input
                                        required
                                        type="email"
                                        value={formData.external_contact_email}
                                        onChange={e => setFormData({...formData, external_contact_email: e.target.value})}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                                        placeholder="contact@org.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Asset Details */}
                        <div className="sm:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-500">Asset Selection</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { id: 'drone', icon: Drone, label: 'Drone' },
                                    { id: 'vehicle', icon: Car, label: 'Vehicle' },
                                    { id: 'office', icon: Laptop, label: 'Office' },
                                    { id: 'rnd', icon: FlaskConical, label: 'R&D' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setFormData({...formData, asset_type: item.id})}
                                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                                            formData.asset_type === item.id 
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                                            : 'border-slate-800 bg-slate-800/30 text-slate-500 hover:border-slate-700 hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <item.icon className="h-6 w-6" />
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Select Asset</label>
                                <select
                                    required
                                    value={formData.asset_id}
                                    onChange={e => setFormData({...formData, asset_id: e.target.value})}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all appearance-none"
                                >
                                    <option value="" disabled>Choose an available asset...</option>
                                    {availableAssets.map(asset => (
                                        <option key={asset.id} value={asset.id}>
                                            {asset.name} {asset.license_plate ? `(${asset.license_plate})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="sm:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-500">Duration & Notes</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Start Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">End Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Purpose / Notes</label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                                    placeholder="Briefly describe the purpose of this reservation..."
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 py-4 font-bold text-white transition-all hover:bg-emerald-600 disabled:opacity-50"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    <Send className="h-5 w-5" />
                                    Submit Reservation Request
                                </>
                            )}
                        </div>
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                    IFDC Asset Management System &bull; External Access Portal
                </p>
            </div>
        </div>
    );
}
