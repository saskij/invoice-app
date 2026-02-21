import React from 'react';
import { Bell } from 'lucide-react';

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'white',
                    cursor: 'pointer',
                    userSelect: 'none',
                }}>
                    {companyName ? companyName.slice(0, 2).toUpperCase() : 'YC'}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
