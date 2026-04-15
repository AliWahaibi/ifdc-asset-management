import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AuroraBackground } from '@/components/ui/aurora-background';
import loginLogo from '@/assets/Asset 4.png';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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

    return (
        <AuroraBackground>
            <div className="relative z-10 w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="mb-12 text-center flex flex-col items-center">
                    <img 
                        src="/logo.png" 
                        alt="AeroTrack" 
                        className="h-24 w-auto drop-shadow-2xl" 
                        fetchPriority="high"
                        loading="eager"
                    />
                </div>

                {/* Login Card */}
                <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/10 dark:bg-black/40 p-8 shadow-2xl backdrop-blur-lg">
                    <h2 className="mb-6 text-lg font-semibold text-slate-200">Sign in to your account</h2>

                    {error && (
                        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                            onClick={handleSubmit}
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
            </div>
        </AuroraBackground>
    );
}
