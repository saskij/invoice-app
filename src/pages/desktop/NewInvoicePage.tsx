import React, { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import type { Invoice, LineItem, InvoiceClient } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Eye, Download, Send, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';

interface NewInvoicePageProps {
    editInvoice?: Invoice | null;
    onSaved?: () => void;
}

const emptyClient: InvoiceClient = { name: '', email: '', company: '', address: '', city: '', state: '', zip: '' };

const NewInvoicePage: React.FC<NewInvoicePageProps> = ({ editInvoice, onSaved }) => {
    const { settings, catalog, saveInvoice, getNextInvoiceNumber, bumpInvoiceNumber } = useApp();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [invoiceId] = useState(editInvoice?.id || uuidv4());
    const [invoiceNumber, setInvoiceNumber] = useState(editInvoice?.invoiceNumber || getNextInvoiceNumber());
    const [client, setClient] = useState<InvoiceClient>(editInvoice?.client || emptyClient);
    const [lineItems, setLineItems] = useState<LineItem[]>(editInvoice?.lineItems || []);
    const [issueDate, setIssueDate] = useState(editInvoice?.issueDate || today);
    const [dueDate, setDueDate] = useState(editInvoice?.dueDate || thirtyDays);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(editInvoice?.discountType || 'percentage');
    const [discountValue, setDiscountValue] = useState(editInvoice?.discountValue || 0);
    const [taxRate, setTaxRate] = useState(editInvoice?.taxRate ?? settings.defaultTaxRate ?? 0);
    const [notes, setNotes] = useState(editInvoice?.notes || '');
    const [paymentTerms, setPaymentTerms] = useState(editInvoice?.paymentTerms || settings.defaultPaymentTerms || '');
    const [paymentInfo, setPaymentInfo] = useState(editInvoice?.paymentInfo || settings.paymentInfo || '');
    const [showPreview, setShowPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState(editInvoice?.status || 'draft' as Invoice['status']);

    const subtotal = lineItems.reduce((s, l) => s + l.total, 0);

    // Calculate discounts
    let discountAmount = 0;
    if (discountType === 'percentage') {
        discountAmount = subtotal * (discountValue / 100);
    } else {
        discountAmount = discountValue;
    }

    // Prevent negative totals
    if (discountAmount > subtotal) discountAmount = subtotal;

    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = discountedSubtotal * (taxRate / 100);
    const total = discountedSubtotal + taxAmount;

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

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
        client,
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

    const handleSave = (newStatus: Invoice['status'] = status) => {
        if (!client.name.trim()) { toast.error('Client name is required.'); return; }
        if (lineItems.length === 0) { toast.error('Add at least one line item.'); return; }
        const inv = { ...buildInvoice(), status: newStatus };
        saveInvoice(inv);
        if (!editInvoice) bumpInvoiceNumber();
        toast.success(`Invoice ${newStatus === 'draft' ? 'saved as draft' : 'saved'}!`);
        onSaved?.();
    };

    const handleDownloadPDF = () => {
        if (!client.name.trim() || lineItems.length === 0) {
            toast.error('Please fill in client info and add line items first.');
            return;
        }
        downloadInvoicePDF(buildInvoice(), settings.company);
        toast.success('PDF downloaded!');
    };

    const handleSendEmail = async () => {
        if (!client.email.trim()) { toast.error('Client email is required to send invoice.'); return; }
        if (!settings.resend.apiKey.trim()) { toast.error('Configure Resend API Key in Settings first.'); return; }
        setSending(true);
        try {
            const pdfBase64 = getInvoicePDFBase64(buildInvoice(), settings.company);
            await sendInvoiceEmail({
                config: settings.resend,
                invoice: buildInvoice(),
                company: settings.company,
                pdfBase64
            });
            handleSave('sent');
            toast.success(`Invoice sent to ${client.email}!`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to send email. Check Resend settings.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            {/* Left: Main form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Invoice meta */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label">Invoice Number</label>
                            <input className="input-field" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
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

                {/* Client info */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bill To</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {([
                            { label: 'Client Name *', field: 'name', span: false, placeholder: 'Jane Smith' },
                            { label: 'Company', field: 'company', span: false, placeholder: 'Acme Corp' },
                            { label: 'Email Address', field: 'email', span: true, placeholder: 'jane@acme.com' },
                            { label: 'Street Address', field: 'address', span: true, placeholder: '456 Oak Ave' },
                            { label: 'City', field: 'city', span: false, placeholder: 'Los Angeles' },
                            { label: 'State / ZIP', field: 'state', span: false, placeholder: 'CA 90001' },
                        ] as { label: string; field: keyof InvoiceClient; span: boolean; placeholder: string }[]).map(f => (
                            <div key={f.field} style={f.span ? { gridColumn: '1 / -1' } : {}}>
                                <label className="label">{f.label}</label>
                                <input
                                    className="input-field"
                                    value={client[f.field]}
                                    onChange={e => setClient(prev => ({ ...prev, [f.field]: e.target.value }))}
                                    placeholder={f.placeholder}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Line items */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Line Items</h3>
                        <button className="btn-primary" style={{ padding: '7px 16px', fontSize: 13 }} onClick={addLineItem}>
                            <Plus size={14} />Add Item
                        </button>
                    </div>

                    {lineItems.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>
                            No line items yet. Click "Add Item" to start.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 110px 110px 36px', gap: 0, padding: '10px 20px', background: 'rgba(15,23,42,0.5)' }}>
                                {['Description', 'Qty', 'Unit Price', 'Total', ''].map(h => (
                                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
                                ))}
                            </div>
                            {lineItems.map((item, i) => (
                                <div key={item.id} style={{
                                    display: 'grid', gridTemplateColumns: '2fr 100px 110px 110px 36px', gap: 8,
                                    padding: '10px 16px', alignItems: 'center',
                                    borderTop: '1px solid rgba(99,102,241,0.08)',
                                    background: i % 2 ? 'rgba(15,23,42,0.2)' : 'transparent',
                                }}>
                                    {/* Description + catalog selector */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                className="input-field"
                                                style={{ fontSize: 12, padding: '7px 28px 7px 10px', color: item.catalogServiceId ? '#a5b4fc' : '#64748b' }}
                                                value={item.catalogServiceId || ''}
                                                onChange={e => applyFromCatalog(item.id, e.target.value)}
                                            >
                                                <option value="">— Pick from catalog —</option>
                                                {catalog.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name} (${s.defaultPrice}/{s.unit})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <input
                                            className="input-field"
                                            style={{ fontSize: 13 }}
                                            value={item.description}
                                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                            placeholder="Custom description…"
                                        />
                                    </div>
                                    <input
                                        className="input-field"
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }}>$</span>
                                        <input
                                            className="input-field"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            style={{ paddingLeft: 22 }}
                                            value={item.unitPrice}
                                            onChange={e => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                                        />
                                    </div>
                                    <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: 14, textAlign: 'right', paddingRight: 4 }}>
                                        {fmt(item.total)}
                                    </div>
                                    <button className="btn-danger" style={{ padding: '7px 8px', justifyContent: 'center' }} onClick={() => removeLineItem(item.id)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                        </>
                    )}

                    {/* Discounts & Tax */}
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 24px', borderTop: '1px solid rgba(99,102,241,0.1)', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                            <label className="label" style={{ margin: 0 }}>Discount</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <select
                                    className="input-field"
                                    style={{ width: 60, padding: '8px', textAlign: 'center' }}
                                    value={discountType}
                                    onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                                >
                                    <option value="percentage">%</option>
                                    <option value="fixed">$</option>
                                </select>
                                <input
                                    className="input-field"
                                    type="number"
                                    min="0"
                                    step={discountType === 'percentage' ? "1" : "0.01"}
                                    style={{ width: 90 }}
                                    value={discountValue}
                                    onChange={e => setDiscountValue(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                            <label className="label" style={{ margin: 0 }}>Tax %</label>
                            <input
                                className="input-field"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                style={{ width: 160 }}
                                value={taxRate}
                                onChange={e => setTaxRate(Number(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        <div>
                            <label className="label">Notes (Internal or Client-facing)</label>
                            <textarea className="input-field" style={{ minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special notes for this invoice…" />
                        </div>
                        <div>
                            <label className="label">Payment Terms</label>
                            <textarea className="input-field" style={{ minHeight: 80 }} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Payment due within 30 days…" />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="label">Payment Instructions (How to pay - Zelle, Venmo, etc.)</label>
                            <textarea className="input-field" style={{ minHeight: 80 }} value={paymentInfo} onChange={e => setPaymentInfo(e.target.value)} placeholder="E.g. Please send Zelle to email@address.com..." />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Summary + Actions */}
            <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Totals */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: '0 0 18px', fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Summary</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,0.08)', fontSize: 14, color: '#94a3b8' }}>
                        <span>Subtotal</span>
                        <span style={{ fontWeight: 600, color: '#c7d2fe' }}>{fmt(subtotal)}</span>
                    </div>

                    {discountAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,0.08)', fontSize: 14, color: '#94a3b8' }}>
                            <span>Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                            <span style={{ fontWeight: 600, color: '#f87171' }}>-{fmt(discountAmount)}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(99,102,241,0.08)', fontSize: 14, color: '#94a3b8' }}>
                        <span>{`Tax (${taxRate}%)`}</span>
                        <span style={{ fontWeight: 600, color: '#c7d2fe' }}>{fmt(taxAmount)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0', fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
                        <span>Total</span>
                        <span style={{ color: '#818cf8' }}>{fmt(total)}</span>
                    </div>
                </div>

                {/* Status */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <label className="label">Invoice Status</label>
                    <select className="input-field" value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => setShowPreview(true)} style={{ justifyContent: 'center' }}>
                        <Eye size={15} />Preview Invoice
                    </button>
                    <button className="btn-secondary" onClick={handleDownloadPDF} style={{ justifyContent: 'center' }}>
                        <Download size={15} />Download PDF
                    </button>
                    <button className="btn-success" onClick={handleSendEmail} disabled={sending} style={{ justifyContent: 'center', opacity: sending ? 0.7 : 1 }}>
                        <Send size={15} />{sending ? 'Sending…' : 'Send to Client'}
                    </button>
                    <div className="divider" />
                    <button className="btn-primary" onClick={() => handleSave('draft')} style={{ justifyContent: 'center' }}>
                        <Save size={15} />Save Invoice
                    </button>
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
        </div>
    );
};

export default NewInvoicePage;
