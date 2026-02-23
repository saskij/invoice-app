import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, Download, Trash2, Send, Edit2, Search, RotateCcw, Copy, DollarSign } from 'lucide-react';
import type { Invoice } from '../../types';
import { downloadInvoicePDF, getInvoicePDFBase64 } from '../../utils/pdfGenerator';
import { sendInvoiceEmail } from '../../utils/emailSender';
import InvoicePreviewModal from '../../components/Invoice/InvoicePreviewModal';
import toast from 'react-hot-toast';

interface InvoicesPageMobileProps {
    onEdit: (invoice: Invoice) => void;
}

const STATUS_OPTS = ['all', 'draft', 'sent', 'paid', 'overdue', 'deleted'] as const;

const InvoicesPageMobile: React.FC<InvoicesPageMobileProps> = ({ onEdit }) => {
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
            console.error('[IM-E] handleSendEmail error:', err);
            toast.error(err.message ? `[IM-E] ${err.message}` : '[IM-E] Email failed. Please check console.');
        } finally {
            setSending(null);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '16px 12px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search invoices…"
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => handleFilterChange(s)}
                            style={{
                                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                                whiteSpace: 'nowrap',
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

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {invoices.length === 0 ? (
                    <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        No invoices found.
                    </div>
                ) : (
                    invoices.map((inv) => (
                        <div key={inv.id} className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>#{inv.invoiceNumber}</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{inv.clientName || inv.client?.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{inv.clientCompany || inv.client?.company}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginBottom: 2 }}>{fmt(inv.total)}</div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: (inv.balanceDue || 0) > 0 ? '#f87171' : '#34d399', marginBottom: 6 }}>
                                        Due: {fmt(inv.balanceDue ?? inv.total)}
                                    </div>
                                    <span className={`badge badge-${inv.displayStatus || inv.status}`}>{inv.displayStatus || inv.status}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#94a3b8', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span>Issued: {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                                </div>
                                <div>
                                    <span>Due: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                                {inv.status !== 'deleted' ? (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button title="Preview" onClick={() => setPreviewInv(inv)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8' }}>
                                                <Eye size={16} />
                                            </button>
                                            <button title="Download PDF" onClick={async () => { await downloadInvoicePDF(inv, settings.company); toast.success('PDF downloaded!'); }} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8' }}>
                                                <Download size={16} />
                                            </button>
                                            <button title="Send Email" onClick={() => handleSendEmail(inv)} disabled={sending === inv.id} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#34d399', opacity: sending === inv.id ? 0.5 : 1 }}>
                                                <Send size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {(inv.balanceDue ?? inv.total) > 0 && (
                                                <button title="Record Payment" onClick={() => { setPaymentModalId(inv.id); setPaymentAmount((inv.balanceDue ?? inv.total).toString()); }} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#34d399' }}>
                                                    <DollarSign size={16} />
                                                </button>
                                            )}
                                            <button title="Duplicate" onClick={() => duplicateInvoice(inv)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#818cf8' }}>
                                                <Copy size={16} />
                                            </button>
                                            <button title="Edit" onClick={() => onEdit(inv)} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#fbbf24' }}>
                                                <Edit2 size={16} />
                                            </button>
                                            <button title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inv.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#f87171' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button title="Restore" onClick={() => { restoreInvoice(inv.id); toast.success('Invoice restored!'); }} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#34d399' }}>
                                                <RotateCcw size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button title="Permanently Delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(inv.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#f87171' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24, padding: '0 4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                        Showing <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{invoices.length}</span> of <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{totalCount}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 13 }}>
                        Page <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{currentPage}</span> of <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{Math.ceil(totalCount / pageSize) || 1}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={{ flex: 1, padding: '12px', fontSize: 13, justifyContent: 'center', opacity: currentPage <= 1 ? 0.5 : 1 }}
                    >
                        Previous
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => fetchPage(currentPage + 1)}
                        disabled={currentPage * pageSize >= totalCount}
                        style={{ flex: 1, padding: '12px', fontSize: 13, justifyContent: 'center', opacity: currentPage * pageSize >= totalCount ? 0.5 : 1 }}
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
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)} style={{ padding: 16 }}>
                    <div className="modal-box" style={{ width: '100%', padding: 24, textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                            {invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted' ? 'Permanently Delete?' : 'Delete Invoice?'}
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                            {invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted'
                                ? 'Are you sure you want to permanently delete this invoice? This action cannot be undone.'
                                : 'Are you sure you want to move this invoice to the trash? You can restore it later if needed.'}
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ flex: 1, padding: '12px 16px' }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, background: '#ef4444', border: 'none', padding: '12px 16px' }} onClick={() => {
                                const inv = invoices.find(i => i.id === deleteConfirmId);
                                if (inv?.status === 'deleted') {
                                    hardDeleteInvoice(deleteConfirmId);
                                    toast.success('Invoice permanently deleted.');
                                } else {
                                    deleteInvoice(deleteConfirmId);
                                    toast.success('Invoice moved to trash.');
                                }
                                setDeleteConfirmId(null);
                            }}>{invoices.find(i => i.id === deleteConfirmId)?.status === 'deleted' ? 'Permanently' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
            {paymentModalId && (
                <div className="modal-overlay" onClick={() => setPaymentModalId(null)} style={{ padding: 16 }}>
                    <div className="modal-box" style={{ width: '100%', padding: 24 }}>
                        <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Record Payment</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
                            Record payment for invoice #{invoices.find(i => i.id === paymentModalId)?.invoiceNumber}.
                        </p>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Amount</label>
                            <input
                                type="number"
                                className="input-field"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn-secondary" style={{ flex: 1, padding: '12px' }} onClick={() => setPaymentModalId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={async () => {
                                await recordPayment(paymentModalId, parseFloat(paymentAmount));
                                setPaymentModalId(null);
                            }}>Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoicesPageMobile;
