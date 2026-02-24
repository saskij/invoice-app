import React from 'react';
import {
    X,
    LayoutDashboard,
    FilePlus,
    FileText,
    Users,
    Book,
    Settings,
    LogOut,
    ChevronRight,
    User,
    Zap,
    Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
    const { user, signOut } = useAuth();
    const { activePage, setActivePage, profile } = useApp();

    const isFree = profile?.plan === 'free';

    const NAV_ITEMS = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'new-invoice', label: 'New Invoice', icon: FilePlus },
        { id: 'invoices', label: 'All Invoices', icon: FileText },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'catalog', label: 'Catalog', icon: Book },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleNav = (page: string) => {
        setActivePage(page as any);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`modal-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
                style={{
                    visibility: isOpen ? 'visible' : 'hidden',
                    opacity: isOpen ? 1 : 0,
                    transition: 'all 0.3s ease-in-out',
                    zIndex: 9999
                }}
            />

            {/* Drawer Content */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: isOpen ? 0 : '-100%',
                width: '80%',
                maxWidth: '300px',
                height: '100dvh',
                background: '#0f172a',
                borderRight: '1px solid rgba(99, 102, 241, 0.12)',
                zIndex: 10000,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isOpen ? '20px 0 60px rgba(0,0,0,0.5)' : 'none'
            }}>
                {/* Header Profile Section */}
                <div style={{
                    padding: '32px 20px',
                    background: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.5), transparent)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
                        }}>
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
                            ) : (
                                <User size={24} color="white" />
                            )}
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: '#94a3b8', cursor: 'pointer', padding: 8 }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
                            {user?.email?.split('@')[0]}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: isFree ? 'rgba(148, 163, 184, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                padding: '2px 8px', borderRadius: '6px', border: `1px solid ${isFree ? 'rgba(148, 163, 184, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                            }}>
                                {isFree ? <Zap size={10} className="text-slate-400" /> : <Crown size={10} className="text-amber-400" />}
                                <span style={{ fontSize: '10px', fontWeight: 700, color: isFree ? '#94a3b8' : '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {isFree ? 'Free' : 'Pro'}
                                </span>
                            </div>
                            {profile && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    {profile.invoices_sent_count}/{profile.invoice_limit} used
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navigation Items */}
                <div style={{ padding: '20px 12px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ paddingInline: 12, marginBottom: 12, fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Menu</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNav(item.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        width: '100%', padding: '12px 14px', borderRadius: '12px',
                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: isActive ? '#818cf8' : '#94a3b8' }}>
                                        <Icon size={20} />
                                        <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                                    </div>
                                    {isActive && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#818cf8' }} />}
                                    {!isActive && <ChevronRight size={14} color="#334155" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Section */}
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.03)', background: 'rgba(15, 23, 42, 0.5)' }}>
                    <button
                        onClick={() => signOut()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            padding: '14px', borderRadius: '14px', border: '1px solid rgba(239, 68, 68, 0.1)',
                            background: 'rgba(239, 68, 68, 0.05)', color: '#f87171',
                            cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                    <div style={{ marginTop: 16, textAlign: 'center', fontSize: '10px', color: '#475569', fontWeight: 500 }}>
                        InvoiceApp v1.2.4 • Antigravity OS
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileDrawer;
