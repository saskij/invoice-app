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
} from 'lucide-react';

interface DashboardPageProps {
    onNavigate: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
    const { dashboardData, settings, invoices } = useApp();

    if (!dashboardData) return null;

    const { totalRevenue, pendingAmount, overdueAmount, paidCount, recentInvoices } = dashboardData;

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    const stats = [
        { label: 'Total Revenue', value: fmt(totalRevenue), icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
        { label: 'Pending', value: fmt(pendingAmount), icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        { label: 'Overdue', value: fmt(overdueAmount), icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
        { label: 'Paid Invoices', value: String(paidCount), icon: CheckCircle, color: '#4f46e5', bg: 'rgba(79,70,229,0.15)' },
    ];

    return (
        <div className="animate-fade-in" style={{ padding: 28 }}>
            {/* Welcome banner */}
            <div className="glass-card" style={{
                padding: '24px 32px',
                marginBottom: 24,
                background: 'linear-gradient(135deg, rgba(79,70,229,0.2) 0%, rgba(124,58,237,0.15) 100%)',
                borderColor: 'rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
                        {settings.company.name ? `Welcome back, ${settings.company.name}` : 'Welcome to InvoiceApp'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: 14 }}>
                        {invoices.length > 0 ? `You have ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} in total.` : 'Start by creating your first invoice.'}
                    </p>
                </div>
                <button className="btn-primary" onClick={() => onNavigate('new-invoice')}>
                    <FilePlus size={16} />
                    New Invoice
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {stats.map(stat => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="glass-card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} color={stat.color} />
                                </div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>{stat.value}</div>
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
                    <div style={{ padding: 48, textAlign: 'center', color: '#475569' }}>
                        <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                        <p style={{ fontSize: 14 }}>No invoices yet. <button onClick={() => onNavigate('new-invoice')} style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Create one now →</button></p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15,23,42,0.5)' }}>
                                {['Invoice #', 'Client', 'Amount', 'Due Date', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.map((inv, i) => (
                                <tr key={inv.id} style={{ borderTop: '1px solid rgba(99,102,241,0.08)', background: i % 2 ? 'rgba(15,23,42,0.2)' : 'transparent' }}>
                                    <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 700, color: '#818cf8' }}>#{inv.invoiceNumber}</td>
                                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#e2e8f0' }}>
                                        <div style={{ fontWeight: 600 }}>{inv.clientName}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{inv.clientCompany}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.total)}
                                    </td>
                                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#94a3b8' }}>
                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                    <td style={{ padding: '14px 20px' }}>
                                        <span className={`badge badge-${inv.displayStatus}`}>{inv.displayStatus}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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

export default DashboardPage;
