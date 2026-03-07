import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function DashboardLayout() {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <AuroraBackground className="flex min-h-screen bg-transparent p-0">
            <div className="flex w-full h-full relative z-10">
                <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

                {/* Main content */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
                    <main className={cn("flex-1", location.pathname === '/ai-assistant' ? 'p-0 w-full' : 'px-4 md:px-8 py-4 md:py-8 overflow-x-hidden')}>
                        <Outlet />
                    </main>
                </div>
            </div>
        </AuroraBackground>
    );
}
