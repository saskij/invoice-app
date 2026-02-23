import React, { useEffect, useRef, useState } from 'react';
import type { Invoice, CompanyInfo } from '../../types';
import { X, Download } from 'lucide-react';

interface Props {
    invoice: Invoice;
    company: CompanyInfo;
    onClose: () => void;
    onDownload: () => void | Promise<void>;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmtDate = (s: string) => s ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(s)) : '—';

const InvoicePreviewModal: React.FC<Props> = ({ invoice, company, onClose, onDownload }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    // Responsive listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Keyboard ESC to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    // Simple focus trap: focus the close button on mount
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        closeBtnRef.current?.focus();
    }, []);

    const padding = isMobile ? '16px' : '28px 48px';
    const headerPadding = isMobile ? '24px 16px' : '32px 48px';

    return (
        <div
            className="modal-overlay"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className="modal-box" ref={modalRef} style={{ maxWidth: 860, width: '95%', margin: '20px auto' }}>
                {/* Modal header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: isMobile ? '12px 16px' : '14px 24px',
                    borderBottom: '1px solid rgba(99,102,241,0.12)',
                }}>
                    <span id="modal-title" style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>Invoice Preview</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn-secondary" onClick={onDownload} style={{ padding: '8px 16px', fontSize: 13 }}>
                            <Download size={14} /> {!isMobile && 'Download PDF'}
                        </button>
                        <button
                            ref={closeBtnRef}
                            onClick={onClose}
                            style={{
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#f87171',
                            }}
                            aria-label="Close Preview"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div style={{ padding: isMobile ? '12px' : '28px', overflowY: 'auto', maxHeight: 'calc(90vh - 64px)' }}>
                    <div style={{
                        background: 'white', color: '#111', borderRadius: 12,
                        overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                        fontFamily: "'Inter', sans-serif", fontSize: 13,
                        margin: '0 auto',
                    }}>
                        {/* PDF-like header band */}
                        <div style={{ background: '#0f172a', padding: headerPadding }}>
                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 20 }}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                    {company.logoUrl && (
                                        <div style={{ padding: 6, background: 'white', borderRadius: 8, flexShrink: 0 }}>
                                            <img src={company.logoUrl} alt="Logo" style={{ height: isMobile ? 40 : 56, width: isMobile ? 40 : 56, objectFit: 'contain' }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>{company.name || 'Your Company'}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.6 }}>
                                            {[company.address, company.email, company.phone].filter(Boolean).slice(0, 3).join(' · ')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                    <div style={{ fontSize: isMobile ? 24 : 32, fontWeight: 900, color: '#4f46e5', letterSpacing: '-0.03em' }}>INVOICE</div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>#{invoice.invoiceNumber}</div>
                                </div>
                            </div>
                        </div>
                        <div style={{ height: 4, background: '#4f46e5' }} />

                        {/* Bill to + Meta */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                            gap: 16,
                            padding: padding
                        }}>
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Bill To</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{invoice.clientName || invoice.client?.name}</div>
                                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                                    {(invoice.clientCompany || invoice.client?.company) && <div>{invoice.clientCompany || invoice.client?.company}</div>}
                                    {invoice.client?.address && <div>{invoice.client.address}</div>}
                                    {invoice.client?.email && <div>{invoice.client.email}</div>}
                                </div>
                            </div>
                            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Invoice Details</div>
                                {[
                                    ['Issue Date', fmtDate(invoice.issueDate)],
                                    ['Due Date', fmtDate(invoice.dueDate)],
                                    ['Status', (invoice.displayStatus || invoice.status).toUpperCase()],
                                ].map(([label, value]) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div style={{ padding: isMobile ? '0 16px 20px' : '0 48px 24px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 350 }}>
                                <thead>
                                    <tr style={{ background: '#0f172a' }}>
                                        {['Description', 'Qty', 'Price', 'Total'].map((h, idx) => (
                                            <th key={h} style={{
                                                padding: '10px', textAlign: idx > 0 ? 'right' : 'left',
                                                fontSize: 9, fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.08em',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.lineItems.map((item, idx) => (
                                        <tr key={item.id} style={{ background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                            <td style={{ padding: '10px', fontSize: 12, color: '#0f172a', fontWeight: 500 }}>{item.description}</td>
                                            <td style={{ padding: '10px', fontSize: 12, color: '#64748b', textAlign: 'right' }}>{item.quantity}</td>
                                            <td style={{ padding: '10px', fontSize: 12, color: '#64748b', textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                                            <td style={{ padding: '10px', fontSize: 12, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{fmt(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div style={{ padding: padding, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '100%', maxWidth: 260 }}>
                                {[
                                    { label: 'Subtotal', value: fmt(invoice.subtotal), show: true },
                                    { label: 'Discount', value: `-${fmt(invoice.discountAmount || 0)}`, show: !!(invoice.discountAmount && invoice.discountAmount > 0) },
                                    { label: `Tax (${invoice.taxRate}%)`, value: fmt(invoice.taxAmount), show: true },
                                ].filter(row => row.show).map((row) => (
                                    <div key={row.label} style={{
                                        display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                                    }}>
                                        <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: row.label === 'Discount' ? '#ef4444' : '#0f172a' }}>{row.value}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#4f46e5', borderRadius: '8px', marginTop: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>TOTAL DUE</span>
                                    <span style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{fmt(invoice.balanceDue ?? invoice.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ background: '#0f172a', padding: '12px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: '#64748b' }}>Thank you for your business!</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;
