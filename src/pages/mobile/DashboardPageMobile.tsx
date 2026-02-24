import React from 'react';
import { useApp } from '../../context/AppContext';
import {
    FileText,
    DollarSign,
    Clock,
    CheckCircle,
    TrendingUp,
    FilePlus,
    AlertCircle,
    Loader2
} from 'lucide-react';

interface DashboardPageMobileProps {
    onNavigate: (page: string) => void;
}

const DashboardPageMobile: React.FC<DashboardPageMobileProps> = ({ onNavigate }) => {
    const { dashboardData, settings, invoices, loading } = useApp();

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <AlertCircle size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
                <h3 style={{ color: '#e2e8f0', marginBottom: 8 }}>Dashboard Unavailable</h3>
                <p>We couldn't load your dashboard data. This might be due to a connection issue or missing records.</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: 16, color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                >
                    Retry Loading →
                </button>
            </div>
        );
    }

    const { totalRevenue, pendingAmount, overdueAmount, paidCount, recentInvoices } = dashboardData;

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    const stats = [
        { label: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        { label: 'Pending', value: fmt(pendingAmount), icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        { label: 'Overdue', value: fmt(overdueAmount), icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        { label: 'Paid Invoices', value: String(paidCount), icon: CheckCircle, color: '#4f46e5', bg: 'rgba(79,70,229,0.15)' },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: '16px 12px' }}>
            {/* Welcome banner */}
            <div className="glass-card" style={{
                padding: '20px',
                marginBottom: 20,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(124,58,237,0.15) 100%)',
                borderColor: 'rgba(99,102,241,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                        {settings.company.name ? `Welcome back, ${settings.company.name}` : 'Welcome to InvoiceApp'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 13 }}>
                        {invoices.length > 0 ? `You have ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} in total.` : 'Start by creating your first invoice.'}
                    </p>
                </div>
                <button className="btn-primary w-full justify-center" onClick={() => onNavigate('new-invoice')}>
                    <FilePlus size={16} />
                    New Invoice
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                {stats.map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={16} color={stat.color} />
                                </div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{stat.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Invoices */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={16} color="#4f46e5" />
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Recent Invoices</span>
                    </div>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => onNavigate('invoices')}>View All</button>
                </div>
                {recentInvoices.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#475569' }}>
                        <FileText size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                        <p style={{ fontSize: 13 }}>No invoices yet. <button onClick={() => onNavigate('new-invoice')} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create one now →</button></p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {recentInvoices.map((inv, i) => (
                            <div key={inv.id} style={{
                                padding: '16px',
                                borderTop: i === 0 ? 'none' : '1px solid rgba(99,102,241,0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                                        {inv.clientName}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ color: '#818cf8', fontWeight: 600 }}>#{inv.invoiceNumber}</span>
                                        <span>•</span>
                                        <span>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                                        {fmt(inv.total)}
                                    </div>
                                    <span className={`badge badge-${inv.displayStatus}`} style={{ fontSize: 10, padding: '2px 6px' }}>
                                        {inv.displayStatus}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick tip if no company set */}
            {!settings.company.name && (
                <div style={{
                    marginTop: 20,
                    padding: '14px 20px',
                    borderRadius: 12,
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#fbbf24',
                    fontSize: 13,
                }}>
                    <AlertCircle size={16} />
                    <span>Set up your <strong>Company Info</strong> in <button onClick={() => onNavigate('settings')} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Settings</button> to include it on your invoices.</span>
                </div>
            )}
        </div>
    );
};

export default DashboardPageMobile;
