import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Edit2, Trash2, Search, X, Package, Clock, Tag } from 'lucide-react';
import type { CatalogService } from '../../types';
import toast from 'react-hot-toast';

const UNIT_OPTIONS = [
    { value: 'project', label: 'Per Project' },
    { value: 'hour', label: 'Per Hour' },
    { value: 'page', label: 'Per Page' },
    { value: 'month', label: 'Per Month' },
    { value: 'item', label: 'Per Item' },
];

const UNIT_ICONS: Record<string, React.ReactNode> = {
    hour: <Clock size={10} />,
    project: <Package size={10} />,
    page: <Tag size={10} />,
    month: <Clock size={10} />,
    item: <Tag size={10} />,
};

const EMPTY_FORM = { name: '', description: '', defaultPrice: 0, unit: 'project' };

const CatalogPageMobile: React.FC = () => {
    const { catalog, addCatalogItem, updateCatalogItem, removeCatalogItem } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CatalogService | null>(null);
    const [form, setForm] = useState<Omit<CatalogService, 'id'>>(EMPTY_FORM);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const filtered = catalog.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreate = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setIsModalOpen(true);
    };

    const openEdit = (item: CatalogService) => {
        setEditingItem(item);
        setForm({ name: item.name, description: item.description, defaultPrice: item.defaultPrice, unit: item.unit });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Service name is required'); return; }
        setIsSaving(true);
        try {
            if (editingItem) {
                await updateCatalogItem({ ...editingItem, ...form });
                toast.success('Service updated');
            } else {
                await addCatalogItem(form);
                toast.success('Service added');
            }
            setIsModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        await removeCatalogItem(deleteConfirmId);
        toast.success('Service removed');
        setDeleteConfirmId(null);
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    return (
        <div style={{ padding: '16px 12px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>Catalog</h2>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{catalog.length} services</p>
                </div>
                <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={openCreate}>
                    <Plus size={15} /> Add
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 20 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                    className="input-field"
                    style={{ paddingLeft: 34, fontSize: 14 }}
                    placeholder="Search services…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                    <Package size={36} style={{ color: '#4f46e5', margin: '0 auto 14px', display: 'block' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                        {searchQuery ? 'No results' : 'Catalog is empty'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                        {searchQuery ? 'Try a different search.' : 'Add services to speed up invoicing.'}
                    </p>
                    {!searchQuery && (
                        <button className="btn-primary" style={{ fontSize: 13 }} onClick={openCreate}>
                            <Plus size={14} /> Add Service
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(item => (
                        <div key={item.id} className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{item.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                                        {item.description || <span style={{ fontStyle: 'italic' }}>No description</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => openEdit(item)} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 7, padding: '5px', cursor: 'pointer', color: '#fbbf24', display: 'flex' }}>
                                        <Edit2 size={13} />
                                    </button>
                                    <button onClick={() => setDeleteConfirmId(item.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px', cursor: 'pointer', color: '#f87171', display: 'flex' }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{fmt(item.defaultPrice)}</span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>
                                    {UNIT_ICONS[item.unit] || <Tag size={10} />}
                                    {UNIT_OPTIONS.find(u => u.value === item.unit)?.label || item.unit}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: '95vw', padding: 0, overflow: 'hidden', margin: '16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '16px 20px', background: 'rgba(15,23,42,0.4)', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16, fontWeight: 700 }}>
                                {editingItem ? 'Edit Service' : 'New Service'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label className="label">Name *</label>
                                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Service name" required autoFocus />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea className="input-field" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description…" rows={2} style={{ resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="label">Price ($)</label>
                                    <input className="input-field" type="number" min="0" step="0.01" value={form.defaultPrice} onChange={e => setForm({ ...form, defaultPrice: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="label">Unit</label>
                                    <select className="input-field" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                        {UNIT_OPTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-secondary" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" style={{ padding: '9px 16px', fontSize: 13 }} disabled={isSaving}>
                                    {isSaving ? 'Saving…' : editingItem ? 'Update' : 'Add Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal-box" style={{ maxWidth: '90vw', padding: 24, textAlign: 'center', margin: '16px' }}>
                        <Trash2 size={28} style={{ color: '#f87171', margin: '0 auto 12px', display: 'block' }} />
                        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Remove Service?</h3>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>Existing invoices won't be affected.</p>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ padding: '9px 20px', fontSize: 13 }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', padding: '9px 20px', fontSize: 13 }} onClick={handleDelete}>Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogPageMobile;
