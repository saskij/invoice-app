import React from 'react';
import type { Invoice, CompanyInfo } from '../../types';
import { X, Download } from 'lucide-react';

interface Props {
    invoice: Invoice;
    company: CompanyInfo;
    onClose: () => void;
    onDownload: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (s: string) => s ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(s)) : '—';

const InvoicePreviewModal: React.FC<Props> = ({ invoice, company, onClose, onDownload }) => {
    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-box" style={{ maxWidth: 860 }}>
                {/* Modal header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 28px', borderBottom: '1px solid rgba(99,102,241,0.12)',
                }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>Invoice Preview</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn-secondary" onClick={onDownload} style={{ padding: '8px 16px', fontSize: 13 }}>
                            <Download size={14} />Download PDF
                        </button>
                        <button onClick={onClose} style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#f87171',
                        }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div style={{ padding: 28, overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
                    <div style={{
                        background: 'white', color: '#111', borderRadius: 12,
                        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        fontFamily: "'Inter', sans-serif", fontSize: 13,
                    }}>
                        {/* PDF-like header band */}
                        <div style={{ background: '#0f172a', padding: '32px 48px 28px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                    {company.logoUrl && (
                                        <div style={{ padding: 6, background: 'white', borderRadius: 8 }}>
                                            <img src={company.logoUrl} alt="Logo" style={{ height: 60, width: 60, objectFit: 'contain' }} />
                                        </div>
                                    )}
                                    <div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 8 }}>{company.name || 'Your Company'}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8 }}>
                                            {[company.address, [company.city, company.state, company.zip].filter(Boolean).join(', '), company.phone, company.email, company.website].filter(Boolean).join(' · ')}
                                        </div>
                                        {company.taxId && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Tax ID: {company.taxId}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 36, fontWeight: 900, color: '#4f46e5', letterSpacing: '-0.03em' }}>INVOICE</div>
                                    <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>#{invoice.invoiceNumber}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ height: 4, background: '#4f46e5' }} />

                        {/* Bill to + Meta */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '28px 48px' }}>
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '18px 20px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Bill To</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{invoice.client.name}</div>
                                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                                    {invoice.client.company && <div>{invoice.client.company}</div>}
                                    {invoice.client.address && <div>{invoice.client.address}</div>}
                                    {(invoice.client.city || invoice.client.state) && <div>{[invoice.client.city, invoice.client.state, invoice.client.zip].filter(Boolean).join(', ')}</div>}
                                    {invoice.client.email && <div>{invoice.client.email}</div>}
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '18px 20px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Invoice Details</div>
                                {[
                                    ['Invoice Number', `#${invoice.invoiceNumber}`],
                                    ['Issue Date', fmtDate(invoice.issueDate)],
                                    ['Due Date', fmtDate(invoice.dueDate)],
                                    ['Status', invoice.status.toUpperCase()],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div style={{ padding: '0 48px 24px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#0f172a' }}>
                                        {['#', 'Description', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                                            <th key={h} style={{
                                                padding: '12px 14px', textAlign: i > 1 ? 'right' : 'left',
                                                fontSize: 10, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.lineItems.map((item, i) => (
                                        <tr key={item.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                                            <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', textAlign: 'center' }}>{i + 1}</td>
                                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{item.description}</td>
                                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b', textAlign: 'right' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                                            <td style={{ padding: '12px 14px', fontSize: 14, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{fmt(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div style={{ padding: '0 48px 28px', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: 260 }}>
                                {[
                                    { label: 'Subtotal', value: fmt(invoice.subtotal), highlight: false, show: true },
                                    { label: `Discount ${invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}`, value: `-${fmt(invoice.discountAmount || 0)}`, highlight: false, show: !!(invoice.discountAmount && invoice.discountAmount > 0) },
                                    { label: `Tax (${invoice.taxRate}%)`, value: fmt(invoice.taxAmount), highlight: false, show: true },
                                ].filter(row => row.show).map(row => (
                                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 16px', background: '#f1f5f9' }}>
                                        <span style={{ fontSize: 13, color: '#475569' }}>{row.label}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: row.label.startsWith('Discount') ? '#ef4444' : '#0f172a' }}>{row.value}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#4f46e5', borderRadius: '0 0 8px 8px' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>TOTAL DUE</span>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{fmt(invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes / Terms / Payment Info */}
                        {(invoice.notes || invoice.paymentTerms || invoice.paymentInfo) && (
                            <div style={{ padding: '0 48px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                                {invoice.notes && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Notes</div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
                                    </div>
                                )}
                                {invoice.paymentTerms && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Payment Terms</div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{invoice.paymentTerms}</div>
                                    </div>
                                )}
                                {invoice.paymentInfo && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>How to Pay</div>
                                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{invoice.paymentInfo}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ background: '#0f172a', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ height: 3, width: 40, background: '#4f46e5', borderRadius: 2 }} />
                            <div style={{ fontSize: 11, color: '#64748b' }}>Thank you for your business!</div>
                            <div style={{ height: 3, width: 40, background: '#4f46e5', borderRadius: 2 }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
