import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Edit2, Trash2, Search, X, Package, DollarSign, Clock, Tag } from 'lucide-react';
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
    hour: <Clock size={11} />,
    project: <Package size={11} />,
    page: <Tag size={11} />,
    month: <Clock size={11} />,
    item: <Tag size={11} />,
};

const EMPTY_FORM = { name: '', description: '', defaultPrice: 0, unit: 'project' };

const CatalogPage: React.FC = () => {
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
                toast.success('Service added to catalog');
            }
            setIsModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        await removeCatalogItem(deleteConfirmId);
        toast.success('Service removed from catalog');
        setDeleteConfirmId(null);
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

    return (
        <div className="animate-fade-in" style={{ padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>Service Catalog</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                        {catalog.length} service{catalog.length !== 1 ? 's' : ''} · Click any service to add it to an invoice
                    </p>
                </div>
                <button className="btn-primary" onClick={openCreate}>
                    <Plus size={16} /> New Service
                </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 360, marginBottom: 28 }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                <input
                    className="input-field"
                    style={{ paddingLeft: 36 }}
                    placeholder="Search services…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
                <div className="glass-card" style={{ padding: '72px 40px', textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'rgba(99,102,241,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        <Package size={32} color="#6366f1" />
                    </div>
                    <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                        {searchQuery ? 'No services match your search' : 'Your catalog is empty'}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
                        {searchQuery
                            ? 'Try a different search term or clear the filter.'
                            : 'Add your first service to speed up invoice creation. Services can be added to any invoice with a single click.'}
                    </p>
                    {!searchQuery && (
                        <button className="btn-primary" onClick={openCreate}>
                            <Plus size={16} /> Add First Service
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                    {filtered.map(item => (
                        <div key={item.id} className="glass-card" style={{
                            padding: 20,
                            transition: 'all 0.2s',
                            border: '1px solid rgba(99,102,241,0.1)',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                        }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(99,102,241,0.1)')}
                        >
                            {/* Top row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                                        {item.description || <span style={{ fontStyle: 'italic' }}>No description</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button
                                        title="Edit"
                                        onClick={() => openEdit(item)}
                                        style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#fbbf24', display: 'flex' }}
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        title="Delete"
                                        onClick={() => setDeleteConfirmId(item.id)}
                                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: '#f87171', display: 'flex' }}
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Bottom row: price + unit */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DollarSign size={14} color="#10b981" />
                                    <span style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0' }}>
                                        {fmt(item.defaultPrice)}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                                    borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600
                                }}>
                                    {UNIT_ICONS[item.unit] || <Tag size={11} />}
                                    {UNIT_OPTIONS.find(u => u.value === item.unit)?.label || item.unit}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', background: 'rgba(15,23,42,0.4)', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>
                                {editingItem ? 'Edit Service' : 'New Service'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label className="label">Service Name *</label>
                                <input
                                    className="input-field"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Website Development"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    className="input-field"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    placeholder="Brief description of the service…"
                                    rows={2}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="label">Default Price ($)</label>
                                    <div style={{ position: 'relative' }}>
                                        <DollarSign size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 32 }}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.defaultPrice}
                                            onChange={e => setForm({ ...form, defaultPrice: parseFloat(e.target.value) || 0 })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Billing Unit</label>
                                    <select
                                        className="input-field"
                                        value={form.unit}
                                        onChange={e => setForm({ ...form, unit: e.target.value })}
                                    >
                                        {UNIT_OPTIONS.map(u => (
                                            <option key={u.value} value={u.value}>{u.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving…' : editingItem ? 'Update Service' : 'Add Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal-box" style={{ maxWidth: 400, padding: 28, textAlign: 'center' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Trash2 size={22} color="#f87171" />
                        </div>
                        <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Remove Service?</h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                            This service will be removed from your catalog. Existing invoices won't be affected.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ padding: '10px 24px' }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', padding: '10px 24px' }} onClick={handleDelete}>
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogPage;
