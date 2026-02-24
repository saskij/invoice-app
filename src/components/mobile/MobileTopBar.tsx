import React, { useState } from 'react';
import { Menu, Plus, Zap, Crown, User, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../Shared/AuthModal';
import { toast } from 'react-hot-toast';

interface MobileTopBarProps {
    activePage: string;
    onNavigate: (page: string) => void;
    onOpenMenu: () => void;
    title: string;
}

const MobileTopBar: React.FC<MobileTopBarProps> = ({ activePage, onNavigate, onOpenMenu, title }) => {
    const { profile, settings } = useApp();
    const { user, signOut } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const isFree = profile?.plan === 'free';
    const usage = profile ? `${profile.invoices_sent_count}/${profile.invoice_limit}` : '';

    const getPageTitle = (page: string) => {
        switch (page) {
            case 'dashboard': return 'Dashboard';
            case 'invoices': return 'Invoices';
            case 'settings': return 'Settings';
            case 'new-invoice': return 'New Invoice';
            case 'clients': return 'Clients';
            case 'catalog': return 'Catalog';
            default: return title;
        }
    };

    const handleProfileClick = () => {
        if (!user) {
            setIsAuthModalOpen(true);
        } else {
            setShowProfileMenu(!showProfileMenu);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        setShowProfileMenu(false);
        toast.success('Signed out successfully');
    };

    return (
        <>
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

                    <div className="flex items-center gap-2">
                        {profile && (
                            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/50 px-2 py-1 rounded-md border border-white/5">
                                {isFree ? <Zap size={12} className="text-slate-400" /> : <Crown size={12} className="text-amber-400" />}
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                    {usage}
                                </span>
                            </div>
                        )}

                        <div className="relative">
                            <button
                                onClick={handleProfileClick}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${user
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20 border border-indigo-400/30'
                                        : 'bg-slate-800 border border-slate-700 text-slate-400'
                                    }`}
                            >
                                {user?.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        className="w-full h-full rounded-xl object-cover"
                                        alt="Profile"
                                    />
                                ) : (
                                    user ? (
                                        <span className="text-xs font-bold text-white uppercase">
                                            {settings?.company?.name?.slice(0, 2) || user.email?.slice(0, 2) || 'U'}
                                        </span>
                                    ) : (
                                        <User size={18} />
                                    )
                                )}
                            </button>

                            {/* Mobile Profile Dropdown */}
                            {showProfileMenu && user && (
                                <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                                    <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                                        <p className="text-xs font-medium text-slate-400 truncate">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => onNavigate('new-invoice')}
                            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            {/* Backdrop for profile menu */}
            {showProfileMenu && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={() => setShowProfileMenu(false)}
                />
            )}
        </>
    );
};

export default MobileTopBar;
