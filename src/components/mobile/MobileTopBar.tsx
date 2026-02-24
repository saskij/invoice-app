import { Menu, Plus, Zap, Crown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileTopBarProps {
    activePage: string;
    onNavigate: (page: string) => void;
    onOpenMenu: () => void;
    title: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ activePage, onNavigate, onOpenMenu, title }) => {
    const { profile } = useApp();
    const isFree = profile?.plan === 'free';
    const usage = profile ? `${profile.invoices_sent_count}/${profile.invoice_limit}` : '';

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
                <button
                    onClick={onOpenMenu}
                    className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-semibold text-white">
                    {getPageTitle(activePage)}
                </h1>
                <div className="flex items-center gap-3">
                    {profile && (
                        <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-white/5">
                            {isFree ? <Zap size={12} className="text-slate-400" /> : <Crown size={12} className="text-amber-400" />}
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                {usage}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => onNavigate('new-invoice')}
                        className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default MobileTopBar;
