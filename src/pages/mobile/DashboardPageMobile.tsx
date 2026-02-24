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
    Layout
} from 'lucide-react';

interface DashboardPageMobileProps {
    onNavigate: (page: string) => void;
}

const DashboardPageMobile: React.FC<DashboardPageMobileProps> = ({ onNavigate }) => {
    const { dashboardData, settings, invoices, loading } = useApp();
    const { user } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="animate-fade-in" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Hero */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '6px 12px',
                        borderRadius: 16,
                        color: '#818cf8',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 16
                    }}>
                        <Zap size={12} /> Pro Dashboard
                    </div>
                    <h2 style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
                        Grow Your <span style={{ color: '#6366f1' }}>Business</span>
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                        Unlock advanced tracking, client CRM, and premium templates today.
                    </p>
                </div>

                {/* Pricing Cards Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Pro Plan (Higher Priority on Mobile) */}
                    <div className="glass-card" style={{
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        textAlign: 'left',
                        position: 'relative',
                        border: '2px solid #6366f1',
                        background: 'rgba(99, 102, 241, 0.03)'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: -12,
                            right: 16,
                            background: '#6366f1',
                            color: 'white',
                            padding: '2px 10px',
                            borderRadius: 10,
                            fontSize: 10,
                            fontWeight: 800,
                            textTransform: 'uppercase'
                        }}>
                            Popular
                        </div>
                        <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Professional</div>
                        <div style={{ color: '#f8fafc', fontSize: 24, fontWeight: 800, marginBottom: 12 }}>$20 <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ mo</span></div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: 4, color: '#10b981', fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
                            <Clock size={12} /> 3-DAY FREE TRIAL
                        </div>

                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {['Unlimited Invoices', 'Cloud Sync & Sync', 'Client CRM System', 'Premium Templates'].map((item, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontSize: 13 }}>
                                    <CheckCircle size={14} className="text-indigo-500" /> {item}
                                </li>
                            ))}
                        </ul>

                        <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Gift size={12} /> Annual Deal: Get 1 Month Free!
                        </div>

                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="btn-primary w-full justify-center py-3"
                        >
                            Start My Free Trial
                        </button>
                    </div>

                    {/* Free Plan */}
                    <div className="glass-card" style={{ padding: 20, textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Free</div>
                        <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>$0 <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>/ mo</span></div>
                        <button
                            onClick={() => setIsAuthModalOpen(true)}
                            className="btn-secondary w-full justify-center py-2 text-xs"
                        >
                            Continue with Free Plan
                        </button>
                    </div>
                </div>

                {/* Features List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {[
                        { icon: BarChart3, title: 'Analytics' },
                        { icon: Users, title: 'Clients' },
                        { icon: Layout, title: 'Templates' },
                        { icon: ShieldCheck, title: 'Security' },
                    ].map((feature, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <feature.icon size={16} className="text-indigo-400" />
                            <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{feature.title}</span>
                        </div>
                    ))}
                </div>

                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
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
