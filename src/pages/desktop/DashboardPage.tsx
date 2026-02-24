import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../../components/Shared/AuthModal';
import {
    FileText,
    DollarSign,
    Clock,
    CheckCircle,
    TrendingUp,
    FilePlus,
    AlertCircle,
    Loader2,
    Users,
    BarChart3,
    ShieldCheck,
    Zap,
    Gift,
    Layout,
} from 'lucide-react';

interface DashboardPageProps {
    onNavigate: (page: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
    const { dashboardData, settings, invoices, loading } = useApp();
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="animate-fade-in" style={{ padding: '60px 40px', maxWidth: 1200, margin: '0 auto' }}>
                {/* Hero Section */}
                <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '8px 16px',
                        borderRadius: 20,
                        color: '#818cf8',
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 24
                    }}>
                        <Zap size={14} /> Power Your Business
                    </div>
                    <h2 style={{ color: '#f8fafc', fontSize: 42, fontWeight: 900, marginBottom: 16, letterSpacing: '-0.02em' }}>
                        Transform Your <span style={{ color: '#6366f1' }}>Invoicing</span> into Growth
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 18, maxWidth: 650, margin: '0 auto', lineHeight: 1.6 }}>
                        Join thousands of professionals who track revenue, manage clients, and get paid faster with our automated insights and professional templates.
                    </p>
                </div>

                {/* Features Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 80 }}>
                    {[
                        { icon: BarChart3, title: 'Real-time Analytics', desc: 'Monitor your revenue growth, pending payments, and business health at a glance.' },
                        { icon: Users, title: 'Client Management', desc: 'Securely store client data, history, and preferred payment terms in one place.' },
                        { icon: Layout, title: 'Premium Templates', desc: 'Access high-conversion invoice templates designed specifically for web developers.' },
                        { icon: ShieldCheck, title: 'Cloud Persistence', desc: 'Never lose an invoice. Your data is securely backed up and synced across all devices.' },
                        { icon: TrendingUp, title: 'Revenue Tracking', desc: 'Get detailed reports on your monthly and annual earnings performance.' },
                        { icon: Clock, title: 'Payment Reminders', desc: 'Stay on top of overdue invoices and automate your payment follow-ups.' },
                    ].map((feature, i) => (
                        <div key={i} className="glass-card" style={{ padding: 24, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <feature.icon size={22} />
                            </div>
                            <h4 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{feature.title}</h4>
                            <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{feature.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Pricing Section */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <h3 style={{ color: '#f8fafc', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>Choose the Plan That Scales With You</h3>
                    <div style={{ display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'stretch' }}>
                        {/* Free Plan */}
                        <div className="glass-card" style={{ width: 340, padding: 32, display: 'flex', flexDirection: 'column', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ color: '#64748b', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Individual</div>
                            <div style={{ color: '#f8fafc', fontSize: 32, fontWeight: 800, marginBottom: 24 }}>$0 <span style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>/ mo</span></div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['Create 5 invoices / mo', 'Standard Templates', 'Local Storage Only', 'PDF Downloads'].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 14 }}>
                                        <CheckCircle size={14} className="text-slate-600" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="btn-secondary"
                                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                            >
                                Get Started Free
                            </button>
                        </div>

                        {/* Pro Plan */}
                        <div className="glass-card" style={{
                            width: 360,
                            padding: 32,
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'left',
                            position: 'relative',
                            border: '2px solid #6366f1',
                            background: 'rgba(99, 102, 241, 0.03)'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: -14,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: '#6366f1',
                                color: 'white',
                                padding: '4px 16px',
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
                            }}>
                                Recommended
                            </div>
                            <div style={{ color: '#818cf8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Professional</div>
                            <div style={{ color: '#f8fafc', fontSize: 32, fontWeight: 800, marginBottom: 8 }}>$20 <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ mo</span></div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 4, color: '#10b981', fontSize: 11, fontWeight: 700, marginBottom: 20 }}>
                                <Clock size={10} /> 3-DAY FREE TRIAL
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['Unlimited Invoices', 'Advanced Analytics Dashboard', 'Cloud Sync & Persistence', 'Client CRM System', 'Web Dev Template Packs', 'Priority Email Support'].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#e2e8f0', fontSize: 14 }}>
                                        <CheckCircle size={14} className="text-indigo-500" /> {item}
                                    </li>
                                ))}
                            </ul>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                                    <Gift size={14} /> Annual Deal: $220/year (1 Month Free)
                                </div>
                                <button
                                    onClick={() => setIsAuthModalOpen(true)}
                                    className="btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                                >
                                    Start Your Trial Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <p style={{ textAlign: 'center', color: '#475569', fontSize: 13 }}>
                    No credit card required for the free version. Cancel Pro anytime.
                </p>

                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
            </div>
        );
    }

    if (!dashboardData) {
        // ... (existing error state)
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
