import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import type { Invoice, LineItem, Client } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Eye, Send, Save, UserPlus, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';

interface NewInvoicePageMobileProps {
    editInvoice?: Invoice | null;
    onSaved?: () => void;
}

const emptyClient: Client = { id: '', name: '', email: '', company: '', address: '', city: '', state: '', zip: '', phone: '' };

const NewInvoicePageMobile: React.FC<NewInvoicePageMobileProps> = ({ editInvoice, onSaved }) => {
    const { settings, catalog, invoices, saveInvoice, reserveNextInvoiceNumber, draftInvoice, setDraftInvoice, clients, saveClient } = useApp();

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

    const nonDeletedInvoices = invoices.filter(i => i.status !== 'deleted');
    const isLimitReached = !editInvoice && settings.subscriptionStatus === 'free' && nonDeletedInvoices.length >= settings.invoiceLimit;

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
        if (!editInvoice && isLimitReached) {
            toast.error(`Limit reached! Upgrade for more.`);
            return;
        }
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
            toast.error(err.message || 'Failed to send.');
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

    return (
        <div className="animate-fade-in" style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Invoice Number & Dates */}
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Invoice #</label>
                        <input className="input-field" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="Auto-generated" />
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

            {/* Client selection */}
            <div className="glass-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Bill To</h3>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setIsAddingNewClient(!isAddingNewClient)}>
                        {isAddingNewClient ? <X size={14} /> : <><UserPlus size={14} /> New</>}
                    </button>
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
                    <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={addLineItem}><Plus size={14} />Add Item</button>
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
                        <textarea className="input-field" rows={2} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
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
        </div>
    );
};

export default NewInvoicePageMobile;
