import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { AppSettings, CatalogService, Invoice } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: AppSettings = {
    company: {
        name: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        taxId: '',
    },
    resend: {
        apiKey: '',
    },
    defaultTaxRate: 0,
    defaultPaymentTerms: 'Payment due within 30 days of invoice date.',
    paymentInfo: '',
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1001,
};

const DEFAULT_CATALOG: CatalogService[] = [
    { id: uuidv4(), name: 'Website Development', description: 'Full custom website design and development', defaultPrice: 3500, unit: 'project' },
    { id: uuidv4(), name: 'Landing Page Design', description: 'High-converting single landing page', defaultPrice: 1200, unit: 'page' },
    { id: uuidv4(), name: 'Website Support & Maintenance', description: 'Monthly website updates, backups, and monitoring', defaultPrice: 150, unit: 'month' },
    { id: uuidv4(), name: 'SEO Optimization', description: 'On-page and technical SEO audit and implementation', defaultPrice: 800, unit: 'project' },
    { id: uuidv4(), name: 'E-Commerce Integration', description: 'Shopify / WooCommerce setup and configuration', defaultPrice: 2000, unit: 'project' },
    { id: uuidv4(), name: 'Hourly Consulting', description: 'Strategy, troubleshooting, or technical consulting', defaultPrice: 125, unit: 'hour' },
];

interface AppContextType {
    settings: AppSettings;
    updateSettings: (settings: AppSettings) => void;
    catalog: CatalogService[];
    addCatalogItem: (item: Omit<CatalogService, 'id'>) => void;
    updateCatalogItem: (item: CatalogService) => void;
    removeCatalogItem: (id: string) => void;
    invoices: Invoice[];
    saveInvoice: (invoice: Invoice) => void;
    deleteInvoice: (id: string) => void;
    hardDeleteInvoice: (id: string) => void;
    restoreInvoice: (id: string) => void;
    getNextInvoiceNumber: () => string;
    bumpInvoiceNumber: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [catalog, setCatalog] = useState<CatalogService[]>(DEFAULT_CATALOG);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch Initial Data
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Settings
                const { data: settingsData, error: settingsError } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
                if (settingsData) {
                    setSettings({
                        company: settingsData.company || DEFAULT_SETTINGS.company,
                        resend: settingsData.resend || DEFAULT_SETTINGS.resend,
                        defaultTaxRate: settingsData.defaultTaxRate ?? DEFAULT_SETTINGS.defaultTaxRate,
                        defaultPaymentTerms: settingsData.defaultPaymentTerms || DEFAULT_SETTINGS.defaultPaymentTerms,
                        paymentInfo: settingsData.paymentInfo || DEFAULT_SETTINGS.paymentInfo,
                        invoicePrefix: settingsData.invoicePrefix || DEFAULT_SETTINGS.invoicePrefix,
                        nextInvoiceNumber: settingsData.nextInvoiceNumber || DEFAULT_SETTINGS.nextInvoiceNumber,
                    });
                }

                // Fetch Catalog
                const { data: catalogData, error: catalogError } = await supabase
                    .from('catalog')
                    .select('*')
                    .eq('user_id', user.id);

                if (catalogError) throw catalogError;
                if (catalogData && catalogData.length > 0) {
                    setCatalog(catalogData);
                }

                // Fetch Invoices
                const { data: invoicesData, error: invoicesError } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('createdAt', { ascending: false });

                if (invoicesError) throw invoicesError;
                if (invoicesData) {
                    setInvoices(invoicesData);
                }
            } catch (error: any) {
                console.error('Error fetching data:', error);
                toast.error('Failed to load data from cloud.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const updateSettings = useCallback(async (newSettings: AppSettings) => {
        if (!user) return;
        setSettings(newSettings);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    company: newSettings.company,
                    resend: newSettings.resend,
                    defaultTaxRate: newSettings.defaultTaxRate,
                    defaultPaymentTerms: newSettings.defaultPaymentTerms,
                    paymentInfo: newSettings.paymentInfo,
                    invoicePrefix: newSettings.invoicePrefix,
                    nextInvoiceNumber: newSettings.nextInvoiceNumber,
                    updatedAt: new Date().toISOString(),
                });
            if (error) throw error;
        } catch (error) {
            console.error('Error updating settings:', error);
            toast.error('Failed to save settings.');
        }
    }, [user]);

    const addCatalogItem = useCallback(async (item: Omit<CatalogService, 'id'>) => {
        if (!user) return;
        const newItem = { ...item, id: uuidv4(), user_id: user.id };
        setCatalog(prev => [...prev, newItem]);
        try {
            const { error } = await supabase.from('catalog').insert(newItem);
            if (error) throw error;
        } catch (error) {
            console.error('Error adding catalog item:', error);
            toast.error('Failed to add catalog item.');
        }
    }, [user]);

    const updateCatalogItem = useCallback(async (item: CatalogService) => {
        if (!user) return;
        setCatalog(prev => prev.map(s => s.id === item.id ? item : s));
        try {
            const { error } = await supabase
                .from('catalog')
                .update({ ...item })
                .eq('id', item.id)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating catalog item:', error);
            toast.error('Failed to update catalog item.');
        }
    }, [user]);

    const removeCatalogItem = useCallback(async (id: string) => {
        if (!user) return;
        setCatalog(prev => prev.filter(s => s.id !== id));
        try {
            const { error } = await supabase
                .from('catalog')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error removing catalog item:', error);
            toast.error('Failed to remove catalog item.');
        }
    }, [user]);

    const saveInvoice = useCallback(async (invoice: Invoice) => {
        if (!user) return;

        setInvoices(prev => {
            const idx = prev.findIndex(i => i.id === invoice.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = invoice;
                return updated;
            }
            return [invoice, ...prev];
        });

        try {
            const { error } = await supabase
                .from('invoices')
                .upsert({ ...invoice, user_id: user.id, updatedAt: new Date().toISOString() });
            if (error) throw error;
        } catch (error) {
            console.error('Error saving invoice:', error);
            toast.error('Failed to save invoice to cloud.');
        }
    }, [user]);

    const deleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'deleted', updatedAt: new Date().toISOString() } : i));
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'deleted', updatedAt: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Failed to delete invoice.');
        }
    }, [user]);

    const hardDeleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        setInvoices(prev => prev.filter(i => i.id !== id));
        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error permanently deleting invoice:', error);
            toast.error('Failed to delete invoice permanently.');
        }
    }, [user]);

    const restoreInvoice = useCallback(async (id: string) => {
        if (!user) return;
        setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: 'draft', updatedAt: new Date().toISOString() } : i));
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'draft', updatedAt: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
        } catch (error) {
            console.error('Error restoring invoice:', error);
            toast.error('Failed to restore invoice.');
        }
    }, [user]);

    const getNextInvoiceNumber = useCallback(() => {
        const prefix = settings.invoicePrefix || 'INV';
        const num = settings.nextInvoiceNumber || 1001;
        return `${prefix}-${String(num).padStart(4, '0')}`;
    }, [settings.invoicePrefix, settings.nextInvoiceNumber]);

    const bumpInvoiceNumber = useCallback(() => {
        const newNextNumber = (settings.nextInvoiceNumber || 1001) + 1;
        updateSettings({ ...settings, nextInvoiceNumber: newNextNumber });
    }, [settings, updateSettings]);

    if (loading && user) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{
            settings, updateSettings,
            catalog, addCatalogItem, updateCatalogItem, removeCatalogItem,
            invoices, saveInvoice, deleteInvoice, hardDeleteInvoice, restoreInvoice,
            getNextInvoiceNumber, bumpInvoiceNumber,
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};
