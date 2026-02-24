import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Invoice, LineItem, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Eye, Download, Send, Save, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';
import { AuthModal } from '../../components/Shared/AuthModal';
import { UpgradeModal } from '../../components/Shared/UpgradeModal';
import { useAuth } from '../../context/AuthContext';

interface NewInvoicePageProps {
    editInvoice?: Invoice | null;
    onSaved?: () => void;
}

const emptyClient: Client = { id: '', name: '', email: '', company: '', address: '', city: '', state: '', zip: '', phone: '' };

const NewInvoicePage: React.FC<NewInvoicePageProps> = ({ editInvoice, onSaved }) => {
    const { settings, catalog, invoices, saveInvoice, reserveNextInvoiceNumber, draftInvoice, setDraftInvoice, clients, saveClient, profile } = useApp();
    const { user } = useAuth();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const effectiveDraft = (draftInvoice && (editInvoice ? draftInvoice.id === editInvoice.id : !draftInvoice.id)) ? draftInvoice : null;
    const initialData = (editInvoice || effectiveDraft) as Partial<Invoice> | null;

    const [invoiceId] = useState(initialData?.id || uuidv4());
    const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || '');

    // Client selection state
    const [selectedClientId, setSelectedClientId] = useState<string>(initialData?.client_id || '');
    // Temp client state if creating new inline
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

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const isLimitReached = !editInvoice && profile?.plan === 'free' && (profile?.invoices_sent_count >= profile?.invoice_limit);

    // Derived client data for preview/build
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
        client: activeClient as any, // Keep for backward compatibility/preview logic
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
        status,
        createdAt: editInvoice?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    useEffect(() => {
        setDraftInvoice(buildInvoice());
    }, [
        invoiceId, invoiceNumber, selectedClientId, lineItems, issueDate, dueDate,
        discountType, discountValue, taxRate, notes, paymentTerms, paymentInfo, status,
        setDraftInvoice
    ]);

    const handleSave = async (newStatus: Invoice['status'] = status) => {
        if (!user) { setShowAuthModal(true); return; }
        if (isLimitReached) { setShowUpgradeModal(true); return; }
        if (!selectedClientId) { toast.error('Please select a client.'); return; }
        if (lineItems.length === 0) { toast.error('Add at least one item.'); return; }

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
            toast.error('Select client and add items first.');
            return;
        }
        await downloadInvoicePDF(buildInvoice(), settings.company);
        toast.success('PDF generated!');
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
            toast.success('Email sent successfully!');
        } catch (err: any) {
            console.error('[NI-E] handleSendEmail error:', err);
            toast.error(err.message ? `[NI-E] ${err.message}` : '[NI-E] Failed to send email. Please check console.');
        } finally {
            setSending(false);
        }
    };

    const handleCreateClient = async () => {
        if (!tempClient.name.trim()) { toast.error('Client name is required.'); return; }
        const newId = await saveClient({ ...tempClient, id: uuidv4() });
        if (newId) {
            setSelectedClientId(newId);
            setIsAddingNewClient(false);
            setTempClient(emptyClient);
            toast.success('Client created and selected.');
        }
    };

    const handleClear = () => {
        if (isDirty && !window.confirm('Are you sure you want to clear the form? All unsaved changes will be lost.')) return;

        setInvoiceNumber('');
        setSelectedClientId('');
        setLineItems([]);
        setIssueDate(today);
        setDueDate(thirtyDays);
        setDiscountType('percentage');
        setDiscountValue(0);
        setTaxRate(settings.defaultTaxRate ?? 0);
        setNotes('');
        toast.success('Form cleared');
    };

    return (
        <div className="animate-fade-in" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    {/* Header: Bill To & Invoice Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</h3>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={handleClear}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            background: 'rgba(239,68,68,0.05)',
                                            color: '#f87171',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6
                                        }}
                                    >
                                        <Trash2 size={12} /> Clear
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                                        onClick={() => setIsAddingNewClient(!isAddingNewClient)}
                                    >
                                        {isAddingNewClient ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Client</>}
                                    </button>
                                </div>
                            </div>

                            {!isAddingNewClient ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <select
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(e.target.value)}
                                        >
                                            <option value="">— Select a client —</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {activeClient.id && (
                                        <div className="animate-fade-in" style={{ padding: 16, borderRadius: 12, background: 'rgba(15, 23, 42, 0.3)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 15, marginBottom: 4 }}>{activeClient.name}</div>
                                            {activeClient.company && <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 2 }}>{activeClient.company}</div>}
                                            {activeClient.email && <div style={{ fontSize: 13, color: '#64748b' }}>{activeClient.email}</div>}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, animation: 'slide-down 0.2s ease-out' }}>
                                    <input className="input-field" value={tempClient.name} onChange={e => setTempClient({ ...tempClient, name: e.target.value })} placeholder="Full Name *" />
                                    <input className="input-field" value={tempClient.company} onChange={e => setTempClient({ ...tempClient, company: e.target.value })} placeholder="Company" />
                                    <input className="input-field" value={tempClient.email} onChange={e => setTempClient({ ...tempClient, email: e.target.value })} placeholder="Email address" />
                                    <input className="input-field" value={tempClient.phone} onChange={e => setTempClient({ ...tempClient, phone: e.target.value })} placeholder="Phone" />
                                    <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                                        <button className="btn-primary w-full justify-center" onClick={handleCreateClient}>Create & Select Client</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="glass-card" style={{ padding: 24 }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Info</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className="label">Invoice Number</label>
                                    <input className="input-field" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-001 (auto if empty)" />
                                </div>
                                <div>
                                    <label className="label">Issue Date</label>
                                    <input className="input-field" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="label">Due Date</label>
                                    <input className="input-field" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table: Line Items */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Services & Items</h3>
                            <button className="btn-primary" onClick={addLineItem}><Plus size={16} /> Add Line Item</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Description</th>
                                        <th style={{ padding: '12px 12px', textAlign: 'center', fontSize: 11, color: '#64748b', textTransform: 'uppercase', width: 100 }}>Qty</th>
                                        <th style={{ padding: '12px 12px', textAlign: 'right', fontSize: 11, color: '#64748b', textTransform: 'uppercase', width: 140 }}>Price</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: 11, color: '#64748b', textTransform: 'uppercase', width: 140 }}>Total</th>
                                        <th style={{ width: 60 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <select
                                                        className="input-field"
                                                        style={{ fontSize: 12, height: 32, padding: '0 8px' }}
                                                        value={item.catalogServiceId || ''}
                                                        onChange={e => applyFromCatalog(item.id, e.target.value)}
                                                    >
                                                        <option value="">Pick from catalog...</option>
                                                        {catalog.map(s => <option key={s.id} value={s.id}>{s.name} ({fmt(s.defaultPrice)})</option>)}
                                                    </select>
                                                    <input
                                                        className="input-field"
                                                        value={item.description}
                                                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                                        placeholder="What are you billing for?"
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <input
                                                    className="input-field text-center"
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                                                />
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }}>$</span>
                                                    <input
                                                        className="input-field"
                                                        style={{ paddingLeft: 22, textAlign: 'right' }}
                                                        type="number"
                                                        value={item.unitPrice}
                                                        onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                                                {fmt(item.total)}
                                            </td>
                                            <td style={{ paddingRight: 24, textAlign: 'right' }}>
                                                <button className="btn-danger" style={{ padding: 8 }} onClick={() => removeLineItem(item.id)}><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {lineItems.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                                No items added yet. Click "Add Line Item" to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer: Notes & Terms */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <label className="label">Public Notes (shown on invoice)</label>
                            <textarea
                                className="input-field"
                                rows={4}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Thanks for your business!"
                            />
                        </div>
                        <div className="glass-card" style={{ padding: 24 }}>
                            <label className="label">Terms & Payment Info</label>
                            <textarea
                                className="input-field"
                                rows={4}
                                value={paymentTerms}
                                onChange={e => setPaymentTerms(e.target.value)}
                                placeholder="e.g. Net 30, Bank Transfer details"
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar: Totals & Actions */}
                <div style={{ position: 'sticky', top: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Summary</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                <span style={{ color: '#94a3b8' }}>Subtotal</span>
                                <span style={{ color: '#f8fafc', fontWeight: 600 }}>{fmt(subtotal)}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <select
                                        className="input-field"
                                        style={{ fontSize: 11, height: 30, width: 50, padding: '0 4px' }}
                                        value={discountType}
                                        onChange={e => setDiscountType(e.target.value as any)}
                                    >
                                        <option value="percentage">%</option>
                                        <option value="fixed">$</option>
                                    </select>
                                    <span style={{ fontSize: 13, color: '#94a3b8', alignSelf: 'center' }}>Discount</span>
                                </div>
                                <input
                                    className="input-field text-right"
                                    style={{ height: 30, fontSize: 13 }}
                                    type="number"
                                    value={discountValue}
                                    onChange={e => setDiscountValue(Number(e.target.value))}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: '#94a3b8' }}>Tax Rate (%)</span>
                                <input
                                    className="input-field text-right"
                                    style={{ height: 30, fontSize: 13 }}
                                    type="number"
                                    value={taxRate}
                                    onChange={e => setTaxRate(Number(e.target.value))}
                                />
                            </div>

                            <div className="divider" style={{ margin: '8px 0' }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>Total</span>
                                <span style={{ fontSize: 24, fontWeight: 900, color: '#818cf8', letterSpacing: '-0.02em' }}>{fmt(total)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                            <button className="btn-success w-full justify-center" style={{ padding: '12px' }} onClick={handleSendEmail} disabled={sending}>
                                <Send size={18} /> {sending ? 'Sending...' : 'Send Invoice'}
                            </button>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <button className="btn-secondary justify-center" style={{ padding: '10px' }} onClick={() => setShowPreview(true)}>
                                    <Eye size={18} /> Preview
                                </button>
                                <button className="btn-primary justify-center" style={{ padding: '10px' }} onClick={() => handleSave('draft')}>
                                    <Save size={18} /> {editInvoice ? 'Update' : 'Save Draft'}
                                </button>
                            </div>
                            <button className="btn-secondary w-full justify-center" onClick={handleDownloadPDF}>
                                <Download size={18} /> Download PDF
                            </button>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 20, background: 'rgba(99, 102, 241, 0.05)' }}>
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                            <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: 4 }}>Pro Tip:</strong>
                            Invoices are automatically saved as drafts. You can always come back and edit them later.
                        </div>
                    </div>
                </div>
            </div>

            {showPreview && (
                <InvoicePreviewModal
                    invoice={buildInvoice()}
                    company={settings.company}
                    onClose={() => setShowPreview(false)}
                    onDownload={handleDownloadPDF}
                />
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
        </div>
    );
};

export default NewInvoicePage;
