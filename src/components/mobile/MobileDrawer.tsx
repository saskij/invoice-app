import React from 'react';
import { X, Book, HelpCircle, LogOut, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
    const { user, signOut } = useAuth();
    const { setActivePage } = useApp();

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
                maxWidth: '320px',
                height: '100dvh',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: 10000,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isOpen ? '10px 0 50px rgba(0,0,0,0.5)' : 'none'
            }}>
                {/* Header */}
                <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '12px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}>
                            <User size={20} color="white" />
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.email?.split('@')[0]}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Free Plan</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Group */}
                <div style={{ padding: '24px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ px: 8, mb: 8, fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation</div>

                    <button
                        onClick={() => handleNav('catalog')}
                        className="nav-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 12px', borderRadius: '12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#94a3b8' }}>
                            <Book size={18} />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Catalog</span>
                        </div>
                        <ChevronRight size={14} color="#334155" />
                    </button>

                    <button
                        onClick={() => handleNav('settings')}
                        className="nav-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 12px', borderRadius: '12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#94a3b8' }}>
                            <HelpCircle size={18} />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Help & Contact</span>
                        </div>
                        <ChevronRight size={14} color="#334155" />
                    </button>
                </div>

                {/* Footer */}
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        onClick={() => signOut()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                            padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)', color: '#f87171',
                            cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                        }}
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                    <div style={{ marginTop: 16, textAlign: 'center', fontSize: '11px', color: '#334155' }}>
                        Version 2.1.0 • Antigravity OS
                    </div>
                </div>
            </div>
        </>
    );
};

export default MobileDrawer;
