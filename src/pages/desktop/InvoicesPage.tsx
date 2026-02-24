import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, Download, Trash2, Send, Edit2, Search, RotateCcw, Copy, DollarSign } from 'lucide-react';
import type { Invoice } from '../../types';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';
import toast from 'react-hot-toast';

interface InvoicesPageProps {
    onEdit: (invoice: Invoice) => void;
}

const STATUS_OPTS = ['all', 'draft', 'sent', 'paid', 'overdue', 'deleted'] as const;

const InvoicesPage: React.FC<InvoicesPageProps> = ({ onEdit }) => {
    const {
        invoices, deleteInvoice, hardDeleteInvoice, restoreInvoice, saveInvoice, duplicateInvoice, recordPayment, settings,
        currentPage, totalCount, pageSize, fetchPage,
        searchQuery, setSearchQuery, statusFilter, setStatusFilter
    } = useApp();
    const [previewInv, setPreviewInv] = useState<Invoice | null>(null);
    const [sending, setSending] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [paymentModalId, setPaymentModalId] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentIssueDate, setPaymentIssueDate] = useState<string>('');
    const [paymentDueDate, setPaymentDueDate] = useState<string>('');
    const [localSearch, setLocalSearch] = useState(searchQuery);

    // Search Debouncing
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchQuery) {
                setSearchQuery(localSearch);
                fetchPage(1, localSearch, statusFilter);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch, searchQuery, fetchPage, statusFilter, setSearchQuery]);

    // Filter Change Handling
    const handleFilterChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        fetchPage(1, localSearch, newStatus);
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    const handleSendEmail = async (inv: Invoice) => {
        let recipientEmail = inv.clientEmail || inv.client?.email || '';

        if (!recipientEmail.trim()) {
            const enteredEmail = window.prompt('Client email is missing. Please enter the recipient email address:', '');
            if (!enteredEmail || !enteredEmail.trim()) return;
            recipientEmail = enteredEmail.trim();
        }

        setSending(inv.id);
        try {
            const pdfBase64 = await getInvoicePDFBase64(inv, settings.company);
            await sendInvoiceEmail({
                invoice: { ...inv, clientEmail: recipientEmail },
                company: settings.company,
                pdfBase64
            });
            saveInvoice({ ...inv, status: 'sent', updatedAt: new Date().toISOString() });
            toast.success(`Invoice sent to ${recipientEmail}!`);
        } catch (err: any) {
            console.error('[IL-E] handleSendEmail error:', err);
            toast.error(err.message ? `[IL-E] ${err.message}` : '[IL-E] Email failed. Please check console.');
        } finally {
            setSending(null);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: 28 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search invoices…"
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => handleFilterChange(s)}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                                background: statusFilter === s ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(99,102,241,0.1)',
                                color: statusFilter === s ? 'white' : '#64748b',
                                transition: 'all 0.2s',
                            }}
                        >
                            {s === 'deleted' ? 'Trash' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {invoices.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        No invoices found.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15,23,42,0.6)' }}>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invoice #</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Issue Date</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due Date</th>
                                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                                <th style={{ textAlign: 'right', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</th>
                                <th style={{ textAlign: 'center', padding: '12px 16px', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv, i) => (
                                <tr key={inv.id} style={{ borderTop: '1px solid rgba(99,102,241,0.08)', background: i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent')}
                                >
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#818cf8', fontSize: 13 }}>#{inv.invoiceNumber}</td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{inv.clientName || inv.client?.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{inv.clientCompany || inv.client?.company}</div>
                                    </td>
                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#e2e8f0' }}>{fmt(inv.total)}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: (inv.balanceDue || 0) > 0 ? '#f87171' : '#34d399' }}>{fmt(inv.balanceDue ?? inv.total)}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span className={`badge badge-${inv.displayStatus || inv.status}`}>{inv.displayStatus || inv.status}</span>
                                    </td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                                            {inv.status !== 'deleted' ? (
                                                <>
                                                    <button
                                                        title="Preview"
                                                        onClick={() => setPreviewInv(inv)}
                                                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex' }}
                                                    ><Eye size={14} /></button>
                                                    <button
                                                        title="Download PDF"
                                                        onClick={async () => { await downloadInvoicePDF(inv, settings.company); toast.success('PDF downloaded!'); }}
                                                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex' }}
                                                    ><Download size={14} /></button>
                                                    <button
                                                        title="Send Email"
                                                        onClick={() => handleSendEmail(inv)}
                                                        disabled={sending === inv.id}
                                                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#34d399', display: 'flex', opacity: sending === inv.id ? 0.5 : 1 }}
                                                    ><Send size={14} /></button>
                                                    <button
                                                        title="Edit"
                                                        onClick={() => onEdit(inv)}
                                                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#fbbf24', display: 'flex' }}
                                                    ><Edit2 size={14} /></button>
                                                    <button
                                                        title="Delete"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inv.id); }}
                                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#f87171', display: 'flex' }}
                                                    ><Trash2 size={14} /></button>
                                                    <button
                                                        title="Duplicate"
                                                        onClick={() => duplicateInvoice(inv)}
                                                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#818cf8', display: 'flex' }}
                                                    ><Copy size={14} /></button>
                                                    {(inv.balanceDue ?? inv.total) > 0 && (
                                                        <button
                                                            title="Record Payment"
                                                            onClick={() => {
                                                                setPaymentModalId(inv.id);
                                                                setPaymentAmount((inv.balanceDue ?? inv.total).toString());
                                                                setPaymentIssueDate(inv.issueDate || '');
                                                                setPaymentDueDate(inv.dueDate || '');
                                                            }}
                                                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#34d399', display: 'flex' }}
                                                        ><DollarSign size={14} /></button>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        title="Restore"
                                                        onClick={() => { restoreInvoice(inv.id); toast.success('Invoice restored!'); }}
                                                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#34d399', display: 'flex' }}
                                                    ><RotateCcw size={14} /></button>
                                                    <button
                                                        title="Permanently Delete"
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inv.id); }}
                                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#f87171', display: 'flex' }}
                                                    ><Trash2 size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, padding: '0 4px' }}>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                    Showing <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{invoices.length}</span> of <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{totalCount}</span> invoices
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: 13, marginRight: 8 }}>
                        Page <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{currentPage}</span> of <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{Math.ceil(totalCount / pageSize) || 1}</span>
                    </span>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={{ padding: '8px 16px', fontSize: 13, opacity: currentPage <= 1 ? 0.5 : 1 }}
                    >
                        Previous
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchPage(currentPage + 1)}
                        disabled={currentPage * pageSize >= totalCount}
                        style={{ padding: '8px 16px', fontSize: 13, opacity: currentPage * pageSize >= totalCount ? 0.5 : 1 }}
                    >
                        Next
                    </button>
                </div>
            </div>

            {previewInv && (
                <InvoicePreviewModal
                    invoice={previewInv}
                    company={settings.company}
                    onClose={() => setPreviewInv(null)}
                    onDownload={async () => { await downloadInvoicePDF(previewInv, settings.company); toast.success('PDF downloaded!'); }}
                />
            )}

            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal-box" style={{ maxWidth: 400, padding: 28, textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                            {invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted' ? 'Permanently Delete?' : 'Delete Invoice?'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                            {invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted'
                                ? 'Are you sure you want to permanently delete this invoice? This action cannot be undone.'
                                : 'Are you sure you want to move this invoice to the trash? You can restore it later if needed.'}
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ padding: '10px 24px' }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', padding: '10px 24px' }} onClick={() => {
                                const inv = invoices.find(i => i.id === deleteConfirmId);
                                if (inv?.status === 'deleted') {
                                    hardDeleteInvoice(deleteConfirmId);
                                    toast.success('Invoice permanently deleted.');
                                } else {
                                    deleteInvoice(deleteConfirmId);
                                    toast.success('Invoice moved to trash.');
                                }
                                setDeleteConfirmId(null);
                            }}>{invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted' ? 'Permanently Delete' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Payment Modal */}
            {paymentModalId && (
                <div className="modal-overlay" onClick={() => setPaymentModalId(null)}>
                    <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: 16 }}>Record Payment</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
                            How much payment would you like to record for invoice #{invoices.find(i => i.id === paymentModalId)?.invoiceNumber}?
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Issue Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={paymentIssueDate}
                                    onChange={e => setPaymentIssueDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Due Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={paymentDueDate}
                                    onChange={e => setPaymentDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Payment Amount</label>
                            <input
                                type="number"
                                className="input-field"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setPaymentModalId(null)}>Cancel</button>
                            <button className="btn-primary" onClick={async () => {
                                await recordPayment(paymentModalId, parseFloat(paymentAmount), '', paymentIssueDate, paymentDueDate);
                                setPaymentModalId(null);
                            }}>Save Payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicesPage;
