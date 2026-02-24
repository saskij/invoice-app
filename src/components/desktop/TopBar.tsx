import { Bell, Crown, Zap, LogOut, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../Shared/AuthModal';
import React, { useState } from 'react';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your invoices and revenue' },
    'new-invoice': { title: 'New Invoice', subtitle: 'Create a professional invoice for your client' },
    invoices: { title: 'All Invoices', subtitle: 'Manage and track all your invoices' },
    settings: { title: 'Settings', subtitle: 'Configure your company and service catalog' },
};

interface TopBarProps {
    activePage: string;
    companyName?: string;
}

const TopBar: React.FC<TopBarProps> = ({ activePage, companyName }) => {
    const info = PAGE_TITLES[activePage] || { title: activePage, subtitle: '' };
    const { profile } = useApp();
    const { user, signOut } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('signup');
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const usagePercent = profile ? Math.min((profile.invoices_sent_count / profile.invoice_limit) * 100, 100) : 0;
    const isFree = profile?.plan === 'free';

    return (
        <header style={{
            height: 64,
            background: 'rgba(15, 23, 42, 0.8)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            backdropFilter: 'blur(8px)',
            flexShrink: 0,
        }}>
            <div>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: 0, letterSpacing: '-0.01em' }}>
                    {info.title}
                </h1>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{info.subtitle}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {profile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: 'rgba(30, 41, 59, 0.5)',
                        padding: '6px 14px',
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: isFree ? '#94a3b8' : '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {isFree ? 'Free Plan' : 'Pro Plan'}
                                </span>
                                {isFree ? <Zap size={10} className="text-slate-500" /> : <Crown size={10} className="text-amber-400" />}
                            </div>
                            <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${usagePercent}%`,
                                    height: '100%',
                                    background: usagePercent > 90 ? '#ef4444' : '#6366f1',
                                    transition: 'width 0.5s ease-out'
                                }}></div>
                            </div>
                            <span style={{ fontSize: 10, color: '#64748b' }}>
                                {profile.invoices_sent_count} of {profile.invoice_limit} invoices
                            </span>
                        </div>
                    </div>
                )}

                <button style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 8,
                    padding: '7px 8px',
                    color: '#818cf8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                }}>
                    <Bell size={16} />
                </button>
                <div style={{ position: 'relative' }}>
                    {user ? (
                        <div
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '4px 4px 4px 12px',
                                borderRadius: 12,
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            className="hover:bg-slate-800"
                        >
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                                {user.email?.split('@')[0]}
                            </span>
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url}) center/cover` : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                {!user?.user_metadata?.avatar_url && (companyName ? companyName.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase())}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={() => { setAuthModalTab('login'); setIsAuthModalOpen(true); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '8px 4px'
                                }}
                                className="hover:text-white transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={() => { setAuthModalTab('signup'); setIsAuthModalOpen(true); }}
                                className="btn-primary"
                                style={{ padding: '8px 20px', fontSize: 13, borderRadius: 10, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                            >
                                Get Started
                            </button>
                        </div>
                    )}

                    {showProfileMenu && user && (
                        <>
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                onClick={() => setShowProfileMenu(false)}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: 220,
                                background: '#1e293b',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                borderRadius: 12,
                                padding: 8,
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)',
                                zIndex: 50,
                                animation: 'slide-down 0.2s ease-out'
                            }}>
                                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 4 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{profile?.company_name || 'My Account'}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                                </div>
                                <button
                                    onClick={() => { signOut(); setShowProfileMenu(false); }}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: 'none',
                                        background: 'none',
                                        color: '#f87171',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover:bg-rose-500/10"
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <AuthModal
                    isOpen={isAuthModalOpen}
                    initialIsLogin={authModalTab === 'login'}
                    onClose={() => setIsAuthModalOpen(false)}
                />
            </div>
        </header>
    );
};

export default TopBar;
