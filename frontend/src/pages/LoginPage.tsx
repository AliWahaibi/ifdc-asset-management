import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/aurora-background';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                setError(axiosErr.response?.data?.message || 'Invalid credentials. Please try again.');
            } else {
                setError('Unable to connect to server. Please try again later.');
            }
        }
    };

    // Demo mode: Logs in using the real backend seeded database users
    const handleDemoLogin = async (role: 'super_admin' | 'admin_manager' | 'editor_team_leader' | 'user_employee') => {
        const roleEmailMap = {
            'super_admin': 'admin@ifdc.ae',
            'admin_manager': 'manager@ifdc.ae',
            'editor_team_leader': 'editor@ifdc.ae',
            'user_employee': 'user@ifdc.ae'
        };
        const demoEmail = roleEmailMap[role];
        setEmail(demoEmail);
        setPassword('password123');

        try {
            await login(demoEmail, 'password123');
            navigate(from, { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosErr = err as { response?: { data?: { message?: string } } };
                setError(axiosErr.response?.data?.message || 'Invalid credentials. Please try again.');
            } else {
                setError('Unable to connect to server. Please try again later.');
            }
        }
    };

    return (
        <AuroraBackground>
            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="mb-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-xl shadow-cyan-500/20">
                        <Shield className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-slate-100">IFDC Asset Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Ibn Firnas Drone Center</p>
                </div>

                {/* Login Card */}
                <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/40 p-8 shadow-2xl backdrop-blur-lg">
                    <h2 className="mb-6 text-lg font-semibold text-slate-200">Sign in to your account</h2>

                    {error && (
                        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@ifdc.ae"
                                autoComplete="email"
                                className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-400 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-300">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-2.5 pr-10 text-sm text-slate-200 placeholder-slate-400 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 backdrop-blur-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-500 hover:to-cyan-400 hover:shadow-cyan-500/35 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Demo Accounts */}
                <div className="mt-6 rounded-xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/40 p-4 backdrop-blur-lg">
                    <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-300">
                        Demo Accounts
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {([
                            { role: 'super_admin' as const, label: 'Super Admin', color: 'hover:border-rose-500/50 hover:text-rose-400' },
                            { role: 'admin_manager' as const, label: 'Manager', color: 'hover:border-violet-500/50 hover:text-violet-400' },
                            { role: 'editor_team_leader' as const, label: 'Team Leader', color: 'hover:border-cyan-500/50 hover:text-cyan-400' },
                            { role: 'user_employee' as const, label: 'Employee', color: 'hover:border-emerald-500/50 hover:text-emerald-400' },
                        ]).map((demo) => (
                            <button
                                key={demo.role}
                                onClick={() => handleDemoLogin(demo.role)}
                                className={`rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300 transition-all ${demo.color}`}
                            >
                                {demo.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </AuroraBackground>
    );
}
