import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Invoice, LineItem, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Eye, Send, Save, UserPlus, Search, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';
import { AuthModal } from '../../components/Shared/AuthModal';
import { UpgradeModal } from '../../components/Shared/UpgradeModal';
import { useAuth } from '../../context/AuthContext';
import { Layout, Palette, ShoppingCart, Globe, ShieldCheck, Calendar as CalendarIcon } from 'lucide-react';

const SERVICE_TEMPLATES = [
    {
        id: 'full-stack',
        name: 'Full-Stack',
        icon: Layout,
        items: [
            { description: 'Custom Web Application Development (Frontend + Backend)', quantity: 1, unitPrice: 5000 },
            { description: 'Database Schema Design & Implementation', quantity: 1, unitPrice: 1500 },
            { description: 'API Integration & Third-party Services', quantity: 1, unitPrice: 1000 }
        ],
        notes: 'Includes 3 months of technical support and hosting setup.'
    },
    {
        id: 'landing-page',
        name: 'Landing Page',
        icon: Globe,
        items: [
            { description: 'Strategic UI/UX Design & Wireframing', quantity: 1, unitPrice: 800 },
            { description: 'Responsive Frontend Development (React/Next.js)', quantity: 1, unitPrice: 1200 },
            { description: 'SEO Framework & Performance Optimization', quantity: 1, unitPrice: 500 }
        ],
        notes: 'Optimized for mobile and fast loading speeds.'
    },
    {
        id: 'ecommerce',
        name: 'E-Commerce',
        icon: ShoppingCart,
        items: [
            { description: 'E-commerce Platform Setup & Configuration', quantity: 1, unitPrice: 2000 },
            { description: 'Payment Gateway Integration (Stripe/PayPal)', quantity: 1, unitPrice: 800 },
            { description: 'Product Catalog Management System', quantity: 1, unitPrice: 1200 }
        ],
        notes: 'Secure checkout and inventory management included.'
    },
    {
        id: 'ui-ux',
        name: 'UI/UX Design',
        icon: Palette,
        items: [
            { description: 'User Research & Persona Development', quantity: 1, unitPrice: 600 },
            { description: 'High-Fidelity UI Mockups (Figma)', quantity: 1, unitPrice: 1500 },
            { description: 'Interactive Prototyping & Feedback Loop', quantity: 1, unitPrice: 900 }
        ],
        notes: 'Includes 2 rounds of design revisions.'
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        icon: ShieldCheck,
        items: [
            { description: 'Security Updates & Dependency Management', quantity: 1, unitPrice: 300 },
            { description: 'Performance Monitoring & Monthly Backups', quantity: 1, unitPrice: 200 },
            { description: 'Technical Content Updates (up to 5 hours)', quantity: 1, unitPrice: 500 }
        ],
        paymentTerms: 'Payment due on the 1st of each month.'
    },
    {
        id: 'hosting-subscription',
        name: 'Hosting & Maintenance',
        icon: Globe,
        items: [
            { description: 'Monthly Hosting & Maintenance Subscription', quantity: 1, unitPrice: 20 },
        ],
        notes: 'Monthly subscription for hosting and basic technical maintenance. Funds will be deducted automatically each month.',
        paymentLink: 'https://buy.stripe.com/6oU7sLa6i2aifEwd2Z57W02'
    }
];

interface NewInvoicePageMobileProps {
    editInvoice?: Invoice | null;
    onSaved?: () => void;
}

const emptyClient: Client = { id: '', name: '', email: '', company: '', address: '', city: '', state: '', zip: '', phone: '' };

const NewInvoicePageMobile: React.FC<NewInvoicePageMobileProps> = ({ editInvoice, onSaved }) => {
    const { settings, catalog, saveInvoice, reserveNextInvoiceNumber, draftInvoice, setDraftInvoice, clients, saveClient, profile } = useApp();
    const { user } = useAuth();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const effectiveDraft = (draftInvoice && (editInvoice ? draftInvoice.id === editInvoice.id : !draftInvoice.id)) ? draftInvoice : null;
    const initialData = (editInvoice || effectiveDraft) as Partial<Invoice> | null;

    const [invoiceId] = useState(initialData?.id || uuidv4());
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');

    // Client selection
    const [selectedClientId, setSelectedClientId] = useState<string>(initialData?.client_id || '');
    const [tempClient, setTempClient] = useState<Client>(emptyClient);
    const [isAddingNewClient, setIsAddingNewClient] = useState(false);

    const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || []);
    const [issueDate, setIssueDate] = useState(initialData?.issueDate || today);
    const [dueDate, setDueDate] = useState(initialData?.dueDate || thirtyDays);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(initialData?.discountType || 'percentage');
    const [discountValue, setDiscountValue] = useState(initialData?.discountValue || 0);
    const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? settings.defaultTaxRate ?? 0);
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [paymentTerms, setPaymentTerms] = useState(initialData?.paymentTerms || settings.defaultPaymentTerms || '');
    const [paymentInfo] = useState(initialData?.paymentInfo || settings.paymentInfo || '');
    const [showPreview, setShowPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [status] = useState(initialData?.status || 'draft' as Invoice['status']);

    const [showExtraFields, setShowExtraFields] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [datePickerType, setDatePickerType] = useState<'issue' | 'due' | null>(null);
    const [paymentLink, setPaymentLink] = useState(initialData?.paymentLink || '');

    const isLimitReached = !editInvoice && profile?.plan === 'free' && (profile?.invoices_sent_count >= profile?.invoice_limit);

    const activeClient = clients.find(c => c.id === selectedClientId) || (initialData?.client as any as Client) || emptyClient;

    const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else {
        discountAmount = discountValue;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;

    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + taxAmount;

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    const isDirty = useMemo(() => {
        const currentData = {
            selectedClientId,
            lineItems: JSON.stringify(lineItems),
            issueDate,
            dueDate,
            discountType,
            discountValue,
            taxRate,
            notes,
            paymentTerms,
            paymentInfo
        };
        const orig = initialData || {};
        const baseLineItems = JSON.stringify(orig.lineItems || []);

        return currentData.selectedClientId !== (orig.client_id || '') ||
            currentData.lineItems !== baseLineItems ||
            currentData.issueDate !== (orig.issueDate || today) ||
            currentData.dueDate !== (orig.dueDate || thirtyDays) ||
            currentData.discountType !== (orig.discountType || 'percentage') ||
            currentData.discountValue !== (orig.discountValue || 0) ||
            currentData.taxRate !== (orig.taxRate ?? (settings.defaultTaxRate ?? 0)) ||
            currentData.notes !== (orig.notes || '') ||
            currentData.paymentTerms !== (orig.paymentTerms || settings.defaultPaymentTerms || '') ||
            currentData.paymentInfo !== (orig.paymentInfo || settings.paymentInfo || '');
    }, [selectedClientId, lineItems, issueDate, dueDate, discountType, discountValue, taxRate, notes, paymentTerms, paymentInfo, initialData, today, thirtyDays, settings]);

    // Browser unload protection
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const addLineItem = useCallback(() => {
        setLineItems(prev => [...prev, { id: uuidv4(), description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    }, []);

    const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
                updated.total = Number(updated.quantity) * Number(updated.unitPrice);
            }
            return updated;
        }));
    }, []);

    const removeLineItem = useCallback((id: string) => {
        setLineItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const applyTemplate = (templateId: string) => {
        const template = SERVICE_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        if (lineItems.length > 0 && !window.confirm('Applying a template will replace your current line items. Continue?')) return;

        const newItems = template.items.map(item => ({
            ...item,
            id: uuidv4(),
            total: item.quantity * item.unitPrice
        }));

        setLineItems(newItems);
        if (template.notes) setNotes(template.notes);
        if (template.paymentTerms) setPaymentTerms(template.paymentTerms);
        if ((template as any).paymentLink) setPaymentLink((template as any).paymentLink);
        toast.success(`${template.name} template applied!`);
    };

    const applyFromCatalog = useCallback((lineId: string, serviceId: string) => {
        const svc = catalog.find(c => c.id === serviceId);
        if (!svc) return;
        setLineItems(prev => prev.map(item => {
            if (item.id !== lineId) return item;
            return { ...item, catalogServiceId: svc.id, description: svc.name, unitPrice: svc.defaultPrice, total: item.quantity * svc.defaultPrice };
        }));
    }, [catalog]);

    const buildInvoice = (): Invoice => ({
        id: invoiceId,
        invoiceNumber,
        client_id: selectedClientId,
        client: activeClient as any,
        clientName: activeClient.name,
        clientCompany: activeClient.company,
        lineItems,
        issueDate,
        dueDate,
        discountType,
        discountValue,
        discountAmount,
        taxRate,
        subtotal,
        taxAmount,
        total,
        notes,
        paymentTerms,
        paymentInfo,
        paymentLink,
        status,
        createdAt: editInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    useEffect(() => {
        setDraftInvoice(buildInvoice());
    }, [
        invoiceId, invoiceNumber, selectedClientId, lineItems, issueDate, dueDate,
        discountType, discountValue, taxRate, notes, paymentTerms, paymentInfo, paymentLink, status,
        setDraftInvoice
    ]);

    const handleSave = async (newStatus: Invoice['status'] = status) => {
        if (!user) { setShowAuthModal(true); return; }
        if (isLimitReached) { setShowUpgradeModal(true); return; }
        if (!selectedClientId) { toast.error('Please select a client.'); return; }
        if (lineItems.length === 0) { toast.error('Add items.'); return; }

        let activeInvoiceNumber = invoiceNumber;
        if (!editInvoice && !activeInvoiceNumber) {
            const reserved = await reserveNextInvoiceNumber();
            if (!reserved) return;
            activeInvoiceNumber = reserved;
            setInvoiceNumber(reserved);
        }

        saveInvoice({ ...buildInvoice(), invoiceNumber: activeInvoiceNumber, status: newStatus });
        setDraftInvoice(null);
        onSaved?.();
    };

    const handleDownloadPDF = async () => {
        if (!selectedClientId || lineItems.length === 0) {
            toast.error('Select client and add items.');
            return;
        }
        await downloadInvoicePDF(buildInvoice(), settings.company);
        toast.success('PDF downloaded!');
    };

    const handleSendEmail = async () => {
        if (!user) { setShowAuthModal(true); return; }
        if (isLimitReached) { setShowUpgradeModal(true); return; }

        let recipientEmail = activeClient.email || '';

        if (!recipientEmail.trim()) {
            const enteredEmail = window.prompt('Client email is missing. Please enter the recipient email address:', '');
            if (!enteredEmail || !enteredEmail.trim()) return;
            recipientEmail = enteredEmail.trim();
        }

        setSending(true);
        try {
            const currentInvoice = buildInvoice();
            const pdfBase64 = await getInvoicePDFBase64(currentInvoice, settings.company);
            await sendInvoiceEmail({
                invoice: { ...currentInvoice, clientEmail: recipientEmail },
                company: settings.company,
                pdfBase64
            });
            handleSave('sent');
            toast.success('Sent!');
        } catch (err: any) {
            console.error('[NM-E] handleSendEmail error:', err);
            toast.error(err.message ? `[NM-E] ${err.message}` : '[NM-E] Failed to send. Please check console.');
        } finally {
            setSending(false);
        }
    };

    const handleCreateClient = async () => {
        if (!tempClient.name.trim()) { toast.error('Name required.'); return; }
        const newId = await saveClient({ ...tempClient, id: uuidv4() });
        if (newId) {
            setSelectedClientId(newId);
            setIsAddingNewClient(false);
            setTempClient(emptyClient);
            toast.success('Client created.');
        }
    };

    const handleClear = () => {
        if (isDirty && !window.confirm('Clear form? Changes will be lost.')) return;

        setInvoiceNumber('');
        setSelectedClientId('');
        setLineItems([]);
        setIssueDate(today);
        setDueDate(thirtyDays);
        setDiscountType('percentage');
        setDiscountValue(0);
        setTaxRate(settings.defaultTaxRate ?? 0);
        setNotes('');
        toast.success('Cleared');
    };

    return (
        <div className="animate-fade-in" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!user && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: 16,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    animation: 'slide-down 0.4s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
                            <Zap size={20} />
                        </div>
                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>5 Free Invoices Monthy</h4>
                    </div>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>Authorize now to unlock your limit and sync data across devices.</p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: 13, width: '100%', justifyContent: 'center' }}
                    >
                        Authorize Now
                    </button>
                </div>
            )}
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Quick Templates</h3>
                </div>
                <div style={{ display: 'flex', overflowX: 'auto', gap: 10, paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {SERVICE_TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => applyTemplate(t.id)}
                            style={{
                                flex: '0 0 auto',
                                width: 100,
                                padding: '12px 8px',
                                borderRadius: 12,
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: '1px solid rgba(99, 102, 241, 0.1)',
                                color: '#f8fafc',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <t.icon size={16} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoice Number & Dates */}
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Invoice #</label>
                        <input className="input-field" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Auto-generated" />
                    </div>
                    <div>
                        <label className="label">Issue Date</label>
                        <div
                            onClick={() => setDatePickerType('issue')}
                            className="input-field cursor-pointer flex items-center justify-between"
                        >
                            <span>{new Date(issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <CalendarIcon size={14} className="text-slate-400" />
                        </div>
                    </div>
                    <div>
                        <label className="label">Due Date</label>
                        <div
                            onClick={() => setDatePickerType('due')}
                            className="input-field cursor-pointer flex items-center justify-between"
                        >
                            <span>{new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <CalendarIcon size={14} className="text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Client selection */}
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Bill To</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleClear}
                            style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '4px 8px', color: '#f87171', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <Trash2 size={12} /> Clear
                        </button>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setIsAddingNewClient(!isAddingNewClient)}>
                            {isAddingNewClient ? <X size={14} /> : <><UserPlus size={14} /> New</>}
                        </button>
                    </div>
                </div>

                {!isAddingNewClient ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                            <select className="input-field" style={{ paddingLeft: 32, fontSize: 13 }} value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                                <option value="">— Select client —</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {activeClient.id && (
                            <div style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(99,102,241,0.1)', background: 'rgba(15,23,42,0.2)' }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{activeClient.name}</div>
                                <div style={{ fontSize: 12, color: '#94a3b8' }}>{activeClient.company}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <input className="input-field" value={tempClient.name} onChange={e => setTempClient({ ...tempClient, name: e.target.value })} placeholder="Name *" />
                        <input className="input-field" value={tempClient.company} onChange={e => setTempClient({ ...tempClient, company: e.target.value })} placeholder="Company" />
                        <input className="input-field" value={tempClient.email} onChange={e => setTempClient({ ...tempClient, email: e.target.value })} placeholder="Email" />
                        <button className="btn-primary w-full justify-center" onClick={handleCreateClient}>Create Client</button>
                    </div>
                )}
            </div>

            {/* Line items */}
            <div className="glass-card" style={{ padding: 0 }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Items</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 6, padding: '4px 8px', color: '#f87171', fontSize: 10, fontWeight: 700 }}
                            onClick={() => {
                                if (lineItems.length > 0 && window.confirm('Clear all items?')) setLineItems([]);
                            }}
                        >
                            <Trash2 size={12} /> Clear
                        </button>
                        <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={addLineItem}><Plus size={14} />Item</button>
                    </div>
                </div>
                {lineItems.map((item, i) => (
                    <div key={item.id} style={{ padding: '16px', borderTop: i === 0 ? 'none' : '1px solid rgba(99,102,241,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select
                                className="input-field"
                                style={{ flex: 1, fontSize: 12, height: 36 }}
                                value={item.catalogServiceId || ''}
                                onChange={e => applyFromCatalog(item.id, e.target.value)}
                            >
                                <option value="">— Pick from catalog —</option>
                                {catalog.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <button className="btn-danger" style={{ padding: 8, height: 36 }} onClick={() => removeLineItem(item.id)}><Trash2 size={16} /></button>
                        </div>
                        <input className="input-field" value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} placeholder="Description" />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input className="input-field" style={{ width: 60 }} type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))} />
                            <div style={{ flex: 1, position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 12 }}>$</span>
                                <input className="input-field" style={{ paddingLeft: 18 }} type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))} />
                            </div>
                            <div style={{ fontWeight: 700, color: '#a5b4fc', minWidth: 60, textAlign: 'right' }}>{fmt(item.total)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Extra Fields Toggle */}
            <div className="glass-card" style={{ padding: 12, cursor: 'pointer' }} onClick={() => setShowExtraFields(!showExtraFields)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Discounts, Tax & Notes {isDirty && <span style={{ color: '#fbbf24', marginLeft: 8 }}>• Unsaved</span>}</span>
                    {showExtraFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {showExtraFields && (
                <div className="animate-slide-down flex flex-col gap-4">
                    <div className="glass-card" style={{ padding: 16 }}>
                        <label className="label">Discount</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="input-field" style={{ width: 80 }} value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                                <option value="percentage">%</option>
                                <option value="fixed">$</option>
                            </select>
                            <input className="input-field" type="number" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))} />
                        </div>
                        <label className="label mt-4">Tax %</label>
                        <input className="input-field" type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
                    </div>
                    <div className="glass-card" style={{ padding: 16 }}>
                        <label className="label">Notes</label>
                        <textarea className="input-field mb-4" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                        <label className="label">Payment Terms</label>
                        <textarea className="input-field mb-4" rows={2} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                        <label className="label">Payment Link / Subscription</label>
                        <input
                            className="input-field"
                            value={paymentLink}
                            onChange={e => setPaymentLink(e.target.value)}
                            placeholder="https://buy.stripe.com/..."
                        />
                    </div>
                </div>
            )}

            {/* Floating Actions / Summary */}
            <div style={{ height: 80 }} /> {/* Spacer */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
                borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                zIndex: 50
            }}>
                <div>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>Total Due</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#818cf8' }}>{fmt(total)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ padding: 10 }} onClick={() => setShowPreview(true)}><Eye size={18} /></button>
                    <button className="btn-primary" style={{ padding: '10px 16px' }} onClick={() => handleSave('draft')}><Save size={18} /> Save</button>
                    <button className="btn-success" style={{ padding: 10 }} onClick={handleSendEmail} disabled={sending}><Send size={18} /></button>
                </div>
            </div>

            {showPreview && (
                <InvoicePreviewModal invoice={buildInvoice()} company={settings.company} onClose={() => setShowPreview(false)} onDownload={handleDownloadPDF} />
            )}

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                title="Save & Send like a Pro"
                subtitle="Join 1,000+ businesses and manage your invoices with ease."
            />

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                currentCount={profile?.invoices_sent_count}
                limit={profile?.invoice_limit}
            />

            {/* Custom English Date Picker Modal */}
            {
                datePickerType && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setDatePickerType(null)} />
                        <div className="relative w-full max-w-sm glass-card p-6 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">Select {datePickerType === 'issue' ? 'Issue' : 'Due'} Date</h3>
                                <button onClick={() => setDatePickerType(null)} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button>
                            </div>
                            <p className="text-xs text-slate-400 mb-4 uppercase font-bold tracking-widest">Universal English Calendar</p>
                            <input
                                type="date"
                                className="input-field w-full mb-6 text-lg py-3"
                                value={datePickerType === 'issue' ? issueDate : dueDate}
                                onChange={(e) => {
                                    if (datePickerType === 'issue') setIssueDate(e.target.value);
                                    else setDueDate(e.target.value);
                                    setDatePickerType(null);
                                }}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        const d = new Date();
                                        const val = d.toISOString().split('T')[0];
                                        if (datePickerType === 'issue') setIssueDate(val);
                                        else setDueDate(val);
                                        setDatePickerType(null);
                                    }}
                                    className="btn-secondary py-3 text-sm justify-center"
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setDatePickerType(null)}
                                    className="btn-primary py-3 text-sm justify-center"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default NewInvoicePageMobile;
