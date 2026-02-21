import React from 'react';
import { Menu, Plus } from 'lucide-react';

interface MobileTopBarProps {
    activePage: string;
    onNavigate: (page: string) => void;
    title: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ activePage, onNavigate, title }) => {
    const getPageTitle = (page: string) => {
        switch (page) {
            case 'dashboard': return 'Dashboard';
            case 'invoices': return 'Invoices';
            case 'settings': return 'Settings';
            case 'new-invoice': return 'New Invoice';
            default: return title;
        }
    };

    return (
        <header className="bg-slate-900 border-b border-white/10 px-4 py-3 sticky top-0 z-50">
            <div className="flex items-center justify-between">
                <button className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold text-white">
                    {getPageTitle(activePage)}
                </h1>
                <button
                    onClick={() => onNavigate('new-invoice')}
                    className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export default MobileTopBar;
