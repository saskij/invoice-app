import React from 'react';
import {
    LayoutDashboard,
    FilePlus,
    FileText,
    Settings,
    Users,
    Book,
    Zap,
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-invoice', label: 'New Invoice', icon: FilePlus },
    { id: 'invoices', label: 'All Invoices', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'catalog', label: 'Catalog', icon: Book },
    { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    return (
        <aside
            style={{
                width: 240,
                minWidth: 240,
                background: 'rgba(15, 23, 42, 0.95)',
                borderRight: '1px solid rgba(99, 102, 241, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                padding: '0 12px',
                backdropFilter: 'blur(12px)',
            }}
        >
            {/* Logo */}
            <div style={{ padding: '28px 8px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Zap size={18} color="white" fill="white" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#e2e8f0', letterSpacing: '-0.02em' }}>InvoiceApp</div>
                    <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 500 }}>Web Dev Studio</div>
                </div>
            </div>

            <div className="divider" />

            {/* Nav */}
            <nav style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.1em', padding: '4px 8px 8px', textTransform: 'uppercase' }}>
                    Main Menu
                </div>
                {NAV_ITEMS.map(item => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => onNavigate(item.id)}
                        >
                            <Icon size={17} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{ padding: '16px 8px 24px', borderTop: '1px solid rgba(99,102,241,0.12)' }}>
                <div style={{ fontSize: 11, color: '#334155', textAlign: 'center' }}>
                    InvoiceApp v1.0.0
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
