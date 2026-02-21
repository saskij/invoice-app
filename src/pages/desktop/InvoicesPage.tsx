import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, Download, Trash2, Send, Edit2, Search, RotateCcw } from 'lucide-react';
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
    const { invoices, deleteInvoice, hardDeleteInvoice, restoreInvoice, saveInvoice, settings } = useApp();
    const [filter, setFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [previewInv, setPreviewInv] = useState<Invoice | null>(null);
    const [sending, setSending] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const filtered = invoices
        .filter(i => {
            if (filter === 'all') return i.status !== 'deleted';
            return i.status === filter;
        })
        .filter(i =>
            !search ||
            i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
            i.client.name.toLowerCase().includes(search.toLowerCase()) ||
            i.client.company.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    const handleSendEmail = async (inv: Invoice) => {
        if (!inv.client.email.trim()) { toast.error('Client email is missing.'); return; }
        if (!settings.resend.apiKey) { toast.error('Configure Resend API Key in Settings first.'); return; }
        setSending(inv.id);
        try {
            const pdfBase64 = getInvoicePDFBase64(inv, settings.company);
            await sendInvoiceEmail({
                config: settings.resend,
                invoice: inv,
                company: settings.company,
                pdfBase64
            });
            saveInvoice({ ...inv, status: 'sent', updatedAt: new Date().toISOString() });
            toast.success(`Invoice sent to ${inv.client.email}!`);
        } catch (err: any) {
            toast.error(err.message || 'Email failed. Check EmailJS settings.');
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
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {STATUS_OPTS.map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                                background: filter === s ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(99,102,241,0.1)',
                                color: filter === s ? 'white' : '#64748b',
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
                {filtered.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        No invoices found.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15,23,42,0.6)' }}>
                                {['Invoice #', 'Client', 'Issue Date', 'Due Date', 'Amount', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((inv, i) => (
                                <tr key={inv.id} style={{ borderTop: '1px solid rgba(99,102,241,0.08)', background: i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent')}
                                >
                                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#818cf8', fontSize: 13 }}>#{inv.invoiceNumber}</td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{inv.client.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{inv.client.company}</div>
                                    </td>
                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                    <td style={{ padding: '14px 18px', fontSize: 12, color: '#94a3b8' }}>
                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                    </td>
                                    <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{fmt(inv.total)}</td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <span className={`badge badge-${inv.status}`}>{inv.status}</span>
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
                                                        onClick={() => { downloadInvoicePDF(inv, settings.company); toast.success('PDF downloaded!'); }}
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

            {previewInv && (
                <InvoicePreviewModal
                    invoice={previewInv}
                    company={settings.company}
                    onClose={() => setPreviewInv(null)}
                    onDownload={() => { downloadInvoicePDF(previewInv, settings.company); toast.success('PDF downloaded!'); }}
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
        </div>
    );
};

export default InvoicesPage;
