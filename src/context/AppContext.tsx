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
    defaultTaxRate: 0,
    defaultPaymentTerms: 'Payment due within 30 days of invoice date.',
    paymentInfo: '',
    invoicePrefix: 'INV',
    nextInvoiceNumber: 1001,
    subscriptionStatus: 'free',
    invoiceLimit: 5,
    resend: {
        apiKey: '',
    },
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
    reserveNextInvoiceNumber: () => Promise<string | null>;
    duplicateInvoice: (invoice: Invoice) => void;
    uploadCompanyLogo: (file: File) => Promise<string | null>;
    draftInvoice: Partial<Invoice> | null;
    setDraftInvoice: (invoice: Partial<Invoice> | null) => void;
    activePage: 'dashboard' | 'new-invoice' | 'invoices' | 'settings';
    setActivePage: (page: 'dashboard' | 'new-invoice' | 'invoices' | 'settings') => void;
    currentPage: number;
    totalCount: number;
    pageSize: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    fetchPage: (page: number, search?: string, status?: string) => Promise<void>;
    recordPayment: (invoice_id: string, amount: number, notes?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<AppSettings>(() => {
        const saved = localStorage.getItem('invoice_app_settings');
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    });
    const [catalog, setCatalog] = useState<CatalogService[]>(() => {
        const saved = localStorage.getItem('invoice_app_catalog');
        return saved ? JSON.parse(saved) : DEFAULT_CATALOG;
    });
    const [invoices, setInvoices] = useState<Invoice[]>(() => {
        const saved = localStorage.getItem('invoice_app_invoices');
        return saved ? JSON.parse(saved) : [];
    });
    const [draftInvoice, setDraftInvoice] = useState<Partial<Invoice> | null>(() => {
        const saved = localStorage.getItem('invoice_app_draft');
        return saved ? JSON.parse(saved) : null;
    });
    const [activePage, setActivePage] = useState<'dashboard' | 'new-invoice' | 'invoices' | 'settings'>(() => {
        const saved = localStorage.getItem('invoice_app_active_page');
        return (saved as any) || 'dashboard';
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const pageSize = 10;
    const [loading, setLoading] = useState(true);

    // Sync invoices to localStorage
    useEffect(() => {
        localStorage.setItem('invoice_app_invoices', JSON.stringify(invoices));
    }, [invoices]);

    // Sync catalog to localStorage
    useEffect(() => {
        localStorage.setItem('invoice_app_catalog', JSON.stringify(catalog));
    }, [catalog]);

    // Sync draft to localStorage
    useEffect(() => {
        if (draftInvoice) {
            localStorage.setItem('invoice_app_draft', JSON.stringify(draftInvoice));
        } else {
            localStorage.removeItem('invoice_app_draft');
        }
    }, [draftInvoice]);

    // Sync settings to localStorage
    useEffect(() => {
        localStorage.setItem('invoice_app_settings', JSON.stringify(settings));
    }, [settings]);

    // Sync activePage to localStorage
    useEffect(() => {
        localStorage.setItem('invoice_app_active_page', activePage);
    }, [activePage]);

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
                        defaultTaxRate: settingsData.defaultTaxRate ?? DEFAULT_SETTINGS.defaultTaxRate,
                        defaultPaymentTerms: settingsData.defaultPaymentTerms || DEFAULT_SETTINGS.defaultPaymentTerms,
                        paymentInfo: settingsData.paymentInfo || DEFAULT_SETTINGS.paymentInfo,
                        invoicePrefix: settingsData.invoicePrefix || DEFAULT_SETTINGS.invoicePrefix,
                        nextInvoiceNumber: settingsData.nextInvoiceNumber || DEFAULT_SETTINGS.nextInvoiceNumber,
                        subscriptionStatus: settingsData.subscription_status || DEFAULT_SETTINGS.subscriptionStatus,
                        invoiceLimit: settingsData.invoice_limit ?? DEFAULT_SETTINGS.invoiceLimit,
                        resend: settingsData.resend || DEFAULT_SETTINGS.resend,
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

                // Fetch Invoices (Initial Page)
                const { data: invoicesData, error: invoicesError, count } = await supabase
                    .from('invoices')
                    .select('*', { count: 'exact' })
                    .eq('user_id', user.id)
                    .order('createdAt', { ascending: false })
                    .range(0, pageSize - 1);

                if (invoicesError) throw invoicesError;
                if (invoicesData) {
                    setInvoices(invoicesData);
                }
                if (count !== null) {
                    setTotalCount(count);
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
                    defaultTaxRate: newSettings.defaultTaxRate,
                    defaultPaymentTerms: newSettings.defaultPaymentTerms,
                    paymentInfo: newSettings.paymentInfo,
                    invoicePrefix: newSettings.invoicePrefix,
                    nextInvoiceNumber: newSettings.nextInvoiceNumber,
                    subscription_status: newSettings.subscriptionStatus,
                    invoice_limit: newSettings.invoiceLimit,
                    resend: newSettings.resend,
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

    const fetchPage = useCallback(async (page: number, search?: string, status?: string) => {
        if (!user) return;
        setLoading(true);
        try {
            const currentSearch = search !== undefined ? search : searchQuery;
            const currentStatus = status !== undefined ? status : statusFilter;

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('invoices_view')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id);

            // Apply search
            if (currentSearch.trim()) {
                const s = `%${currentSearch.trim()}%`;
                query = query.or(`invoiceNumber.ilike.${s},notes.ilike.${s},client->>name.ilike.${s},client->>company.ilike.${s}`);
            }

            // Apply status filter
            if (currentStatus !== 'all') {
                if (currentStatus === 'overdue') {
                    query = query.eq('displayStatus', 'overdue');
                } else {
                    query = query.eq('status', currentStatus);
                }
            } else {
                query = query.neq('status', 'deleted'); // Default to hiding trash unless explicitly filtered
            }

            const { data, error, count } = await query
                .order('createdAt', { ascending: false })
                .range(from, to);

            if (error) throw error;
            if (data) {
                setInvoices(data);
                setCurrentPage(page);
            }
            if (count !== null) {
                setTotalCount(count);
            }
        } catch (error) {
            console.error('Error fetching page:', error);
            toast.error('Failed to load page.');
        } finally {
            setLoading(false);
        }
    }, [user, pageSize, searchQuery, statusFilter]);

    const saveInvoice = useCallback(async (invoice: Invoice) => {
        if (!user) return;

        // Optimized: Refresh the first page if it's a new invoice, 
        // or just update the local item if it's an edit of an item already on the page.
        const isNew = !invoices.find(i => i.id === invoice.id);

        try {
            const { error } = await supabase
                .from('invoices')
                .upsert({ ...invoice, user_id: user.id, updatedAt: new Date().toISOString() });
            if (error) throw error;

            if (isNew) {
                // If it's new, go to page 1 to show it
                setSearchQuery('');
                setStatusFilter('all');
                await fetchPage(1, '', 'all');
            } else {
                // If it was an edit, just refresh current page
                await fetchPage(currentPage);
            }
        } catch (error) {
            console.error('Error saving invoice:', error);
            toast.error('Failed to save invoice to cloud.');
        }
    }, [user, invoices, currentPage, fetchPage]);

    const deleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'deleted', updatedAt: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await fetchPage(currentPage);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error('Failed to delete invoice.');
        }
    }, [user, currentPage, fetchPage]);

    const hardDeleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await fetchPage(currentPage);
        } catch (error) {
            console.error('Error permanently deleting invoice:', error);
            toast.error('Failed to delete invoice permanently.');
        }
    }, [user, currentPage, fetchPage]);

    const restoreInvoice = useCallback(async (id: string) => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'draft', updatedAt: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id);
            if (error) throw error;
            await fetchPage(currentPage);
        } catch (error) {
            console.error('Error restoring invoice:', error);
            toast.error('Failed to restore invoice.');
        }
    }, [user, currentPage, fetchPage]);

    const duplicateInvoice = useCallback((invoice: Invoice) => {
        const { id, invoiceNumber, createdAt, updatedAt, ...rest } = invoice;
        const dupe: Partial<Invoice> = {
            ...rest,
            id: uuidv4(),
            invoiceNumber: '', // Will be assigned on save
            status: 'draft',
        };
        setDraftInvoice(dupe);
        setActivePage('new-invoice');
        toast.success('Invoice duplicated! Review and save.');
    }, []);

    const recordPayment = useCallback(async (invoice_id: string, amount: number, notes: string = '') => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('payment_history')
                .insert({
                    invoice_id,
                    amount,
                    notes,
                    payment_method: 'Manual'
                });

            if (error) throw error;

            toast.success('Payment recorded!');
            await fetchPage(currentPage, searchQuery, statusFilter);
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment.');
        }
    }, [user, fetchPage, currentPage, searchQuery, statusFilter]);

    const reserveNextInvoiceNumber = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        try {
            const { data, error } = await supabase.rpc('get_next_invoice_number');
            if (error) throw error;

            // Increment local settings so we stay in sync if possible, 
            // though the server is now the source of truth.
            setSettings(prev => ({
                ...prev,
                nextInvoiceNumber: (prev.nextInvoiceNumber || 1001) + 1
            }));

            return data;
        } catch (error) {
            console.error('Error reserving next invoice number:', error);
            toast.error('Failed to generate invoice number.');
            return null;
        }
    }, [user]);


    const uploadCompanyLogo = useCallback(async (file: File): Promise<string | null> => {
        if (!user) return null;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `company-logos/${fileName}`;

            // Upload the file to the 'logos' bucket
            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading logo:', error);
            toast.error('Failed to upload logo.');
            return null;
        }
    }, [user]);

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
            reserveNextInvoiceNumber, duplicateInvoice, recordPayment,
            uploadCompanyLogo,
            draftInvoice, setDraftInvoice,
            activePage, setActivePage,
            currentPage, totalCount, pageSize, fetchPage,
            searchQuery, setSearchQuery, statusFilter, setStatusFilter
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
