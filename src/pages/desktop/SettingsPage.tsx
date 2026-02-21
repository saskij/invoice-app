import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { AppSettings, CatalogService } from '../../types';
import { Save, Plus, Trash2, Briefcase, Mail, Building2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const defaultNewService: Omit<CatalogService, 'id'> = {
    name: '',
    description: '',
    defaultPrice: 0,
    unit: 'project',
};

const SettingsPage: React.FC = () => {
    const { settings, updateSettings, catalog, addCatalogItem, updateCatalogItem, removeCatalogItem } = useApp();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [newService, setNewService] = useState<Omit<CatalogService, 'id'>>(defaultNewService);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBuf, setEditBuf] = useState<CatalogService | null>(null);
    const [activeTab, setActiveTab] = useState<'company' | 'catalog' | 'emailjs'>('company');

    const saveSettings = () => {
        updateSettings(localSettings);
        toast.success('Settings saved!');
    };

    const handleCompanyChange = (field: string, value: string | number) => {
        setLocalSettings(prev => ({
            ...prev,
            company: { ...prev.company, [field]: value },
        }));
    };


    const handleSettingsChange = (field: string, value: string | number) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2MB'); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                handleCompanyChange('logoUrl', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddService = () => {
        if (!newService.name.trim()) { toast.error('Service name is required.'); return; }
        addCatalogItem(newService);
        setNewService(defaultNewService);
        toast.success('Service added to catalog!');
    };

    const handleResendChange = (field: string, value: string) => {
        setLocalSettings(prev => ({
            ...prev,
            resend: { ...prev.resend, [field]: value },
        }));
    };

    const tabs = [
        { id: 'company', label: 'Company Info', icon: Building2 },
        { id: 'catalog', label: 'Service Catalog', icon: Tag },
        { id: 'resend', label: 'Email (Resend)', icon: Mail },
    ] as const;

    return (
        <div className="animate-fade-in" style={{ padding: 28, maxWidth: 860, margin: '0 auto' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(15,23,42,0.6)', padding: 4, borderRadius: 12, border: '1px solid rgba(99,102,241,0.12)', width: 'fit-content' }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 600,
                                background: activeTab === tab.id ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : '#64748b',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Icon size={14} />{tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Company Info ── */}
            {activeTab === 'company' && (
                <div className="glass-card animate-slide-in" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <Building2 size={18} color="#4f46e5" />
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Company Information</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {[
                            { label: 'LLC / Company Name', field: 'name', placeholder: 'Acme Web Studio LLC' },
                            { label: 'Email Address', field: 'email', placeholder: 'hello@acmewebstudio.com' },
                            { label: 'Phone Number', field: 'phone', placeholder: '+1 (555) 000-0000' },
                            { label: 'Website', field: 'website', placeholder: 'https://acmewebstudio.com' },
                            { label: 'Street Address', field: 'address', placeholder: '123 Main St' },
                            { label: 'City', field: 'city', placeholder: 'New York' },
                            { label: 'State', field: 'state', placeholder: 'NY' },
                            { label: 'ZIP Code', field: 'zip', placeholder: '10001' },
                            { label: 'Tax ID / EIN', field: 'taxId', placeholder: '12-3456789' },
                        ].map(f => (
                            <div key={f.field} style={f.field === 'address' ? { gridColumn: '1 / -1' } : {}}>
                                <label className="label">{f.label}</label>
                                <input
                                    className="input-field"
                                    value={(localSettings.company as any)[f.field] || ''}
                                    onChange={e => handleCompanyChange(f.field, e.target.value)}
                                    placeholder={f.placeholder}
                                />
                            </div>
                        ))}

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="label">Company Logo (max 2MB)</label>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
                                {localSettings.company.logoUrl && (
                                    <div style={{ padding: 4, background: 'white', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <img src={localSettings.company.logoUrl} alt="Logo" style={{ height: 48, maxWidth: 120, objectFit: 'contain' }} />
                                    </div>
                                )}
                                <label className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 13, margin: 0 }}>
                                    Upload Image
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                                </label>
                                {localSettings.company.logoUrl && (
                                    <button className="btn-secondary" style={{ padding: '8px 16px', color: '#f87171', margin: 0 }} onClick={() => handleCompanyChange('logoUrl', '')}>
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="label">Invoice Prefix</label>
                            <input className="input-field" value={localSettings.invoicePrefix || 'INV'} onChange={e => handleSettingsChange('invoicePrefix', e.target.value)} placeholder="INV" />
                        </div>
                        <div>
                            <label className="label">Next Invoice Number</label>
                            <input className="input-field" type="number" value={localSettings.nextInvoiceNumber || 1001} onChange={e => handleSettingsChange('nextInvoiceNumber', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="label">Default Tax Rate (%)</label>
                            <input className="input-field" type="number" min="0" max="100" step="0.1" value={localSettings.defaultTaxRate ?? 0} onChange={e => handleSettingsChange('defaultTaxRate', Number(e.target.value))} />
                        </div>
                        <div>
                            <label className="label">Default Payment Terms</label>
                            <input className="input-field" value={localSettings.defaultPaymentTerms || ''} onChange={e => handleSettingsChange('defaultPaymentTerms', e.target.value)} placeholder="Payment due within 30 days..." />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="label">Default Payment Instructions (Zelle, Venmo, PayPal, etc.)</label>
                            <textarea
                                className="input-field"
                                style={{ minHeight: 80, resize: 'vertical' }}
                                value={localSettings.paymentInfo || ''}
                                onChange={e => handleSettingsChange('paymentInfo', e.target.value)}
                                placeholder="E.g. Zelle: your@email.com&#10;Venmo: @your-username"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={saveSettings}><Save size={15} />Save Settings</button>
                    </div>
                </div>
            )}

            {/* ── Service Catalog ── */}
            {activeTab === 'catalog' && (
                <div className="animate-slide-in">
                    {/* Add new service */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <Briefcase size={16} color="#4f46e5" />
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Add New Service</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
                            <div>
                                <label className="label">Service Name</label>
                                <input className="input-field" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="Website Development" />
                            </div>
                            <div>
                                <label className="label">Default Price ($)</label>
                                <input className="input-field" type="number" min="0" value={newService.defaultPrice} onChange={e => setNewService(p => ({ ...p, defaultPrice: Number(e.target.value) }))} />
                            </div>
                            <div>
                                <label className="label">Unit</label>
                                <select className="input-field" value={newService.unit} onChange={e => setNewService(p => ({ ...p, unit: e.target.value }))}>
                                    {['project', 'hour', 'page', 'month', 'item'].map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn-primary" onClick={handleAddService} style={{ width: '100%', justifyContent: 'center' }}>
                                    <Plus size={15} />Add
                                </button>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="label">Description (optional)</label>
                                <input className="input-field" value={newService.description} onChange={e => setNewService(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the service..." />
                            </div>
                        </div>
                    </div>

                    {/* Catalog list */}
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>Service Catalog ({catalog.length})</span>
                        </div>
                        {catalog.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: '#475569', fontSize: 14 }}>No services yet. Add your first service above.</div>
                        ) : (
                            catalog.map((svc, i) => (
                                <div key={svc.id} style={{
                                    padding: '14px 24px',
                                    borderTop: i === 0 ? 'none' : '1px solid rgba(99,102,241,0.08)',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    background: i % 2 ? 'rgba(15,23,42,0.2)' : 'transparent',
                                }}>
                                    {editingId === svc.id && editBuf ? (
                                        <>
                                            <input className="input-field" style={{ flex: 2 }} value={editBuf.name} onChange={e => setEditBuf(b => b ? { ...b, name: e.target.value } : b)} />
                                            <input className="input-field" style={{ flex: 1 }} value={editBuf.description} onChange={e => setEditBuf(b => b ? { ...b, description: e.target.value } : b)} placeholder="Description" />
                                            <input className="input-field" type="number" style={{ width: 100 }} value={editBuf.defaultPrice} onChange={e => setEditBuf(b => b ? { ...b, defaultPrice: Number(e.target.value) } : b)} />
                                            <select className="input-field" style={{ width: 90 }} value={editBuf.unit} onChange={e => setEditBuf(b => b ? { ...b, unit: e.target.value } : b)}>
                                                {['project', 'hour', 'page', 'month', 'item'].map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn-success" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => { updateCatalogItem(editBuf); setEditingId(null); toast.success('Service updated!'); }}>Save</button>
                                                <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>{svc.name}</div>
                                                {svc.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{svc.description}</div>}
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 100 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: '#a5b4fc' }}>
                                                    ${svc.defaultPrice.toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: 11, color: '#475569' }}>per {svc.unit}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => { setEditingId(svc.id); setEditBuf({ ...svc }); }}>Edit</button>
                                                <button className="btn-danger" style={{ padding: '7px 10px' }} onClick={() => { removeCatalogItem(svc.id); toast.success('Service removed.'); }}><Trash2 size={14} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Resend ── */}
            {activeTab === 'resend' as any && (
                <div className="glass-card animate-slide-in" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Mail size={18} color="#4f46e5" />
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Resend Email API</h2>
                    </div>
                    <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
                        Configure <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Resend</a> to send elegant emails with PDF attachments. Create a free account, generate an API key, and paste it below.
                    </p>

                    <div style={{ display: 'grid', gap: 18 }}>
                        <div>
                            <label className="label">Resend API Key</label>
                            <input
                                className="input-field"
                                value={localSettings.resend?.apiKey || ''}
                                onChange={e => handleResendChange('apiKey', e.target.value)}
                                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                type="password"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" onClick={saveSettings}><Save size={15} />Save Resend Config</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
