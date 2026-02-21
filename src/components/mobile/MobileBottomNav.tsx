import React from 'react';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

interface MobileBottomNavProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activePage, onNavigate }) => {
    const getNavItemClass = (page: string) => `
    flex flex-col items-center justify-center w-full h-full py-2 transition-colors
    ${activePage === page ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}
  `;

    return (
        <nav className="bg-slate-900 border-t border-white/10 safe-area-bottom pb-1">
            <div className="flex items-center justify-around h-16">
                <button className={getNavItemClass('dashboard')} onClick={() => onNavigate('dashboard')}>
                    <LayoutDashboard className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">Home</span>
                </button>

                <button className={getNavItemClass('invoices')} onClick={() => onNavigate('invoices')}>
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">Invoices</span>
                </button>

                <button className={getNavItemClass('settings')} onClick={() => onNavigate('settings')}>
                    <Settings className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-medium">Settings</span>
                </button>
            </div>
        </nav>
    );
};

export default MobileBottomNav;
