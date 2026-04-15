import { useAuthStore } from '@/stores/authStore';
import { ROLE_LABELS } from '@/lib/roles';
import { LogOut, Search, User, Monitor, Box, Database, Plane, Calendar, Menu } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import topbarLogo from '@/assets/Asset 3.png';

interface SearchResult {
    id: string;
    type: string;
    title: string;
    description: string;
    link: string;
}

interface NavbarProps {
    onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearchSearching, setIsSearchSearching] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Search API call
    useEffect(() => {
        if (!debouncedSearchQuery.trim()) {
            setSearchResults([]);
            setIsSearchOpen(false);
            return;
        }

        const fetchResults = async () => {
            setIsSearchSearching(true);
            try {
                const res = await apiClient.get(`/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
                setSearchResults(res.data || []);
                setIsSearchOpen(true);
            } catch (err) {
                console.error("Search failed");
            } finally {
                setIsSearchSearching(false);
            }
        };

        fetchResults();
    }, [debouncedSearchQuery]);

    // Handle click outside for search
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleResultClick = (link: string) => {
        setIsSearchOpen(false);
        setSearchQuery('');
        navigate(link);
    };

    const getSearchIcon = (type: string) => {
        switch (type) {
            case 'User': return <User className="h-4 w-4 text-cyan-400" />;
            case 'Drone Asset': return <Plane className="h-4 w-4 text-emerald-400" />;
            case 'Office Asset': return <Monitor className="h-4 w-4 text-violet-400" />;
            case 'R&D Asset': return <Box className="h-4 w-4 text-amber-400" />;
            case 'Reservation': return <Calendar className="h-4 w-4 text-rose-400" />;
            default: return <Database className="h-4 w-4 text-slate-400" />;
        }
    };

    if (!user) return null;

    return (
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl text-white px-4 md:px-8">
            <div className="flex items-center flex-1">
                {/* Hamburger Menu (Mobile Only) */}
                <button
                    onClick={onMenuClick}
                    className="mr-3 md:hidden rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-slate-200"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Logo (Mobile/Small screens or variant) */}
                <img src={topbarLogo} alt="IFDC" className="h-7 w-auto mr-6 hidden md:block opacity-80 hover:opacity-100 transition-opacity" />

                {/* Search */}
                <div className="relative hidden w-full max-w-lg md:block" ref={searchRef}>
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search assets, users, reservations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => { if (searchResults.length > 0) setIsSearchOpen(true); }}
                        className="w-full rounded-xl border border-slate-800 bg-white/[0.03] py-2.5 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/40 focus:bg-white/[0.05] focus:ring-1 focus:ring-cyan-500/20"
                    />

                    {/* Search Dropdown */}
                    {isSearchOpen && (
                        <div className="absolute top-full mt-2 w-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-xl overflow-hidden z-50">
                            {isSearchSearching ? (
                                <div className="p-4 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                                    Searching...
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-400">
                                    No results found for "{searchQuery}"
                                </div>
                            ) : (
                                <ul className="max-h-96 overflow-y-auto py-2">
                                    {searchResults.map((result) => (
                                        <li key={`${result.type}-${result.id}`}>
                                            <button
                                                onClick={() => handleResultClick(result.link)}
                                                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left"
                                            >
                                                <div className="mt-0.5 shrink-0 rounded-lg bg-white/[0.05] p-2">
                                                    {getSearchIcon(result.type)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-200">{result.title}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{result.description}</p>
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1 block">
                                                        {result.type}
                                                    </span>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* User */}
                <NavLink to="/profile" className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.03]">
                    <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold text-slate-100">{user.full_name}</p>
                        <p className="text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
                        {user.full_name?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                </NavLink>

                {/* Logout */}
                <button
                    onClick={logout}
                    title="Logout"
                    className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}
