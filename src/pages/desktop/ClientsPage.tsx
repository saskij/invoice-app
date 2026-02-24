import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, Edit2, Trash2, Plus, X, User, Building, Mail, Phone, MapPin } from 'lucide-react';
import type { Client } from '../../types';
import toast from 'react-hot-toast';

const ClientsPage: React.FC = () => {
    const { clients, saveClient, deleteClient, fetchClients } = useApp();
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Initial fetch to ensure data is fresh
    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (client: Client) => {
        setEditingClient({ ...client });
        setIsEditModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;
        if (!editingClient.name.trim()) {
            toast.error('Client name is required');
            return;
        }

        setIsSaving(true);
        try {
            const result = await saveClient(editingClient);
            if (result) {
                setIsEditModalOpen(false);
                setEditingClient(null);
                toast.success(editingClient.id ? 'Client updated' : 'Client created');
            }
        } catch (error) {
            console.error('Error saving client:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteClient(deleteConfirmId);
            setDeleteConfirmId(null);
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    };

    const openCreateModal = () => {
        setEditingClient({
            id: '',
            name: '',
            email: '',
            phone: '',
            company: '',
            address: '',
            city: '',
            state: '',
            zip: ''
        });
        setIsEditModalOpen(true);
    };

    return (
        <div className="animate-fade-in" style={{ padding: 28 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: 36 }}
                        placeholder="Search clients…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> New Client
                </button>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {filteredClients.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        {searchQuery ? 'No clients match your search.' : 'No clients found.'}
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15,23,42,0.6)' }}>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Client Name</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact Info</th>
                                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</th>
                                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map((client, i) => (
                                <tr key={client.id || i} style={{ borderTop: '1px solid rgba(99,102,241,0.08)', background: i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = i % 2 ? 'rgba(15,23,42,0.25)' : 'transparent')}
                                >
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{client.name}</div>
                                    </td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontSize: 13, color: client.company ? '#94a3b8' : '#475569', fontStyle: client.company ? 'normal' : 'italic' }}>
                                            {client.company || 'No Company'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {client.email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                                    <Mail size={12} /> {client.email}
                                                </div>
                                            )}
                                            {client.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                                    <Phone size={12} /> {client.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>
                                            {client.city && client.state ? `${client.city}, ${client.state}` : client.city || client.state || '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '6px 10px', fontSize: 12 }}
                                                onClick={() => handleEdit(client)}
                                            >
                                                <Edit2 size={14} /> Edit
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                style={{ padding: '6px 10px', fontSize: 12, color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                                onClick={() => setDeleteConfirmId(client.id)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit/Create Modal */}
            {isEditModalOpen && editingClient && (
                <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
                    <div className="modal-box" style={{ maxWidth: 600, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 700 }}>
                                {editingClient.id ? 'Edit Client' : 'New Client'}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ padding: 24 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                <div>
                                    <label className="label">Full Name *</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            value={editingClient.name}
                                            onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Company</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            value={editingClient.company}
                                            onChange={e => setEditingClient({ ...editingClient, company: e.target.value })}
                                            placeholder="Acme Corp"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Email Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            type="email"
                                            value={editingClient.email}
                                            onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Phone Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            value={editingClient.phone}
                                            onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label className="label">Billing Address</label>
                                    <div style={{ position: 'relative' }}>
                                        <MapPin size={14} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
                                        <input
                                            className="input-field"
                                            style={{ paddingLeft: 36 }}
                                            value={editingClient.address}
                                            onChange={e => setEditingClient({ ...editingClient, address: e.target.value })}
                                            placeholder="123 Business St"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">City</label>
                                    <input
                                        className="input-field"
                                        value={editingClient.city}
                                        onChange={e => setEditingClient({ ...editingClient, city: e.target.value })}
                                        placeholder="San Francisco"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label className="label">State</label>
                                        <input
                                            className="input-field"
                                            value={editingClient.state}
                                            onChange={e => setEditingClient({ ...editingClient, state: e.target.value })}
                                            placeholder="CA"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">ZIP Code</label>
                                        <input
                                            className="input-field"
                                            value={editingClient.zip}
                                            onChange={e => setEditingClient({ ...editingClient, zip: e.target.value })}
                                            placeholder="94103"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : editingClient.id ? 'Update Client' : 'Create Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal-box" style={{ maxWidth: 400, padding: 28, textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                            Delete Client?
                        </h3>
                        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                            Are you sure you want to delete this client? This will not delete their existing invoices, but they will no longer appear in your active client list.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-secondary" style={{ padding: '10px 24px' }} onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                            <button className="btn-primary" style={{ background: '#ef4444', border: 'none', padding: '10px 24px' }} onClick={handleDelete}>
                                Delete Client
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsPage;
