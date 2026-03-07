import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export function UnauthorizedPage() {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
            <div className="text-center animate-fade-in">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 shadow-lg">
                    <ShieldAlert className="h-8 w-8 text-rose-400" />
                </div>
                <h1 className="mt-6 text-3xl font-bold text-slate-100">Access Denied</h1>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                    You don't have the required permissions to access this page.
                    Contact your administrator if you believe this is an error.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-slate-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}
