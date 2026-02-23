import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import type { AppSettings, CatalogService, Invoice, Client } from '../types';
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

interface DashboardData {
    totalRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    paidCount: number;
    recentInvoices: Invoice[];
}

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
    clients: Client[];
    saveClient: (client: Client) => Promise<string | null>;
    deleteClient: (id: string) => Promise<void>;
    fetchClients: () => Promise<void>;
    activePage: 'dashboard' | 'new-invoice' | 'invoices' | 'settings' | 'clients';
    setActivePage: (page: 'dashboard' | 'new-invoice' | 'invoices' | 'settings' | 'clients') => void;
    currentPage: number;
    totalCount: number;
    pageSize: number;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    fetchPage: (page: number, search?: string, status?: string) => Promise<void>;
    recordPayment: (invoice_id: string, amount: number, notes?: string) => Promise<void>;
    dashboardData: DashboardData | null;
    fetchDashboardData: () => Promise<void>;
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
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [draftInvoice, setDraftInvoice] = useState<Partial<Invoice> | null>(() => {
        const saved = localStorage.getItem('invoice_app_draft');
        return saved ? JSON.parse(saved) : null;
    });
    const [activePage, setActivePage] = useState<'dashboard' | 'new-invoice' | 'invoices' | 'settings' | 'clients'>(() => {
        const saved = localStorage.getItem('invoice_app_active_page');
        return (saved as any) || 'dashboard';
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const pageSize = 10;
    const [loading, setLoading] = useState(true);

    // Sync localStorage
    useEffect(() => { localStorage.setItem('invoice_app_catalog', JSON.stringify(catalog)); }, [catalog]);
    useEffect(() => { localStorage.setItem('invoice_app_settings', JSON.stringify(settings)); }, [settings]);
    useEffect(() => { localStorage.setItem('invoice_app_active_page', activePage); }, [activePage]);
    useEffect(() => {
        if (draftInvoice) localStorage.setItem('invoice_app_draft', JSON.stringify(draftInvoice));
        else localStorage.removeItem('invoice_app_draft');
    }, [draftInvoice]);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        try {
            // Stats from invoices_view
            const { data: statsData, error: statsError } = await supabase
                .from('invoices_view')
                .select('total, displayStatus')
                .eq('user_id', user.id);

            if (statsError) throw statsError;

            const revenue = statsData.filter(i => i.displayStatus === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);
            const pending = statsData.filter(i => i.displayStatus === 'sent').reduce((sum, i) => sum + (i.total || 0), 0);
            const overdue = statsData.filter(i => i.displayStatus === 'overdue').reduce((sum, i) => sum + (i.total || 0), 0);
            const paidCount = statsData.filter(i => i.displayStatus === 'paid').length;

            // Recent invoices (limit 5)
            const { data: recent, error: recentError } = await supabase
                .from('invoices_view')
                .select('*')
                .eq('user_id', user.id)
                .order('createdAt', { ascending: false })
                .limit(5);

            if (recentError) throw recentError;

            setDashboardData({
                totalRevenue: revenue,
                pendingAmount: pending,
                overdueAmount: overdue,
                paidCount,
                recentInvoices: recent || []
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }, [user]);

    const fetchClients = useCallback(async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('user_id', user.id)
                .order('name');
            if (error) throw error;
            if (data) setClients(data);
        } catch (error) {
            console.error('Error fetching clients:', error);
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

            if (currentSearch.trim()) {
                const s = `%${currentSearch.trim()}%`;
                query = query.or(`invoiceNumber.ilike.${s},notes.ilike.${s},clientName.ilike.${s},clientCompany.ilike.${s}`);
            }

            if (currentStatus !== 'all') {
                query = query.eq('displayStatus', currentStatus);
            } else {
                query = query.neq('status', 'deleted');
            }

            const { data, error, count } = await query
                .order('createdAt', { ascending: false })
                .range(from, to);

            if (error) throw error;
            if (data) {
                setInvoices(data);
                setCurrentPage(page);
            }
            if (count !== null) setTotalCount(count);
        } catch (error) {
            console.error('Error fetching page:', error);
            toast.error('Failed to load page.');
        } finally {
            setLoading(false);
        }
    }, [user, pageSize, searchQuery, statusFilter]);

    // Initial Fetch
    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const init = async () => {
            setLoading(true);
            try {
                // Settings
                const { data: sData } = await supabase.from('settings').select('*').eq('user_id', user.id).single();
                if (sData) {
                    setSettings({
                        company: sData.company || DEFAULT_SETTINGS.company,
                        defaultTaxRate: sData.defaultTaxRate ?? DEFAULT_SETTINGS.defaultTaxRate,
                        defaultPaymentTerms: sData.defaultPaymentTerms || DEFAULT_SETTINGS.defaultPaymentTerms,
                        paymentInfo: sData.paymentInfo || DEFAULT_SETTINGS.paymentInfo,
                        invoicePrefix: sData.invoicePrefix || DEFAULT_SETTINGS.invoicePrefix,
                        nextInvoiceNumber: sData.nextInvoiceNumber || DEFAULT_SETTINGS.nextInvoiceNumber,
                        subscriptionStatus: sData.subscription_status || DEFAULT_SETTINGS.subscriptionStatus,
                        invoiceLimit: sData.invoice_limit ?? DEFAULT_SETTINGS.invoiceLimit,
                        resend: sData.resend || DEFAULT_SETTINGS.resend,
                    });
                }
                // Catalog
                const { data: cData } = await supabase.from('catalog').select('*').eq('user_id', user.id);
                if (cData) setCatalog(cData);

                await Promise.all([
                    fetchClients(),
                    fetchDashboardData(),
                    fetchPage(1)
                ]);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user, fetchClients, fetchDashboardData, fetchPage]);

    const updateSettings = useCallback(async (newSettings: AppSettings) => {
        if (!user) return;
        setSettings(newSettings);
        try {
            await supabase.from('settings').upsert({
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
        } catch (error) { toast.error('Failed to save settings.'); }
    }, [user]);

    const addCatalogItem = useCallback(async (item: Omit<CatalogService, 'id'>) => {
        if (!user) return;
        const newItem = { ...item, id: uuidv4(), user_id: user.id };
        setCatalog(prev => [...prev, newItem]);
        await supabase.from('catalog').insert(newItem);
    }, [user]);

    const updateCatalogItem = useCallback(async (item: CatalogService) => {
        if (!user) return;
        setCatalog(prev => prev.map(s => s.id === item.id ? item : s));
        await supabase.from('catalog').update({ ...item }).eq('id', item.id).eq('user_id', user.id);
    }, [user]);

    const removeCatalogItem = useCallback(async (id: string) => {
        if (!user) return;
        setCatalog(prev => prev.filter(s => s.id !== id));
        await supabase.from('catalog').delete().eq('id', id).eq('user_id', user.id);
    }, [user]);

    const saveInvoice = useCallback(async (invoice: Invoice) => {
        if (!user) return;
        const isNew = !invoices.find(i => i.id === invoice.id);
        try {
            const { error } = await supabase.from('invoices').upsert({ ...invoice, user_id: user.id, updatedAt: new Date().toISOString() });
            if (error) throw error;
            toast.success(`Invoice ${isNew ? 'created' : 'saved'}!`);
            await Promise.all([fetchDashboardData(), fetchPage(isNew ? 1 : currentPage)]);
        } catch (error) { toast.error('Failed to save invoice.'); }
    }, [user, invoices, currentPage, fetchPage, fetchDashboardData]);

    const deleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        await supabase.from('invoices').update({ status: 'deleted', updatedAt: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
        await Promise.all([fetchDashboardData(), fetchPage(currentPage)]);
    }, [user, currentPage, fetchPage, fetchDashboardData]);

    const hardDeleteInvoice = useCallback(async (id: string) => {
        if (!user) return;
        await supabase.from('invoices').delete().eq('id', id).eq('user_id', user.id);
        await Promise.all([fetchDashboardData(), fetchPage(currentPage)]);
    }, [user, currentPage, fetchPage, fetchDashboardData]);

    const restoreInvoice = useCallback(async (id: string) => {
        if (!user) return;
        await supabase.from('invoices').update({ status: 'draft', updatedAt: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
        await Promise.all([fetchDashboardData(), fetchPage(currentPage)]);
    }, [user, currentPage, fetchPage, fetchDashboardData]);

    const duplicateInvoice = useCallback((invoice: Invoice) => {
        const { id, invoiceNumber, createdAt, updatedAt, ...rest } = invoice;
        setDraftInvoice({ ...rest, id: uuidv4(), invoiceNumber: '', status: 'draft' });
        setActivePage('new-invoice');
        toast.success('Invoice duplicated!');
    }, []);

    const recordPayment = useCallback(async (invoice_id: string, amount: number, notes: string = '') => {
        if (!user) return;
        await supabase.from('payment_history').insert({ invoice_id, amount, notes, payment_method: 'Manual' });
        toast.success('Payment recorded!');
        await Promise.all([fetchDashboardData(), fetchPage(currentPage)]);
    }, [user, fetchPage, currentPage, fetchDashboardData]);

    const saveClient = useCallback(async (client: Client): Promise<string | null> => {
        if (!user) return null;
        try {
            const { data, error } = await supabase.from('clients').upsert({ ...client, user_id: user.id, updatedAt: new Date().toISOString() }).select().single();
            if (error) throw error;
            await fetchClients();
            return data.id;
        } catch (error) { toast.error('Failed to save client.'); return null; }
    }, [user, fetchClients]);

    const deleteClient = useCallback(async (id: string) => {
        if (!user) return;
        await supabase.from('clients').delete().eq('id', id).eq('user_id', user.id);
        await fetchClients();
        toast.success('Client deleted.');
    }, [user, fetchClients]);

    const reserveNextInvoiceNumber = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        const { data } = await supabase.rpc('get_next_invoice_number');
        if (data) setSettings(prev => ({ ...prev, nextInvoiceNumber: (prev.nextInvoiceNumber || 1001) + 1 }));
        return data;
    }, [user]);

    const uploadCompanyLogo = useCallback(async (file: File): Promise<string | null> => {
        if (!user) return null;
        const fileExt = file.name.split('.').pop();
        const filePath = `company-logos/${user.id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
        await supabase.storage.from('logos').upload(filePath, file, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
        return publicUrl;
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
            clients, saveClient, deleteClient, fetchClients,
            uploadCompanyLogo,
            draftInvoice, setDraftInvoice,
            activePage, setActivePage,
            currentPage, totalCount, pageSize, fetchPage,
            searchQuery, setSearchQuery, statusFilter, setStatusFilter,
            dashboardData, fetchDashboardData
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
