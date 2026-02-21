import React, { createContext, useContext, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { AppSettings, CatalogService, Invoice } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    const [settings, setSettings] = useLocalStorage<AppSettings>('invoiceapp_settings', DEFAULT_SETTINGS);
    const [catalog, setCatalog] = useLocalStorage<CatalogService[]>('invoiceapp_catalog', DEFAULT_CATALOG);
    const [invoices, setInvoices] = useLocalStorage<Invoice[]>('invoiceapp_invoices', []);

    const updateSettings = useCallback((newSettings: AppSettings) => {
        setSettings(newSettings);
    }, [setSettings]);

    const addCatalogItem = useCallback((item: Omit<CatalogService, 'id'>) => {
        setCatalog(prev => [...prev, { ...item, id: uuidv4() }]);
    }, [setCatalog]);

    const updateCatalogItem = useCallback((item: CatalogService) => {
        setCatalog(prev => prev.map(s => s.id === item.id ? item : s));
    }, [setCatalog]);

    const removeCatalogItem = useCallback((id: string) => {
        setCatalog(prev => prev.filter(s => s.id !== id));
    }, [setCatalog]);

    const saveInvoice = useCallback((invoice: Invoice) => {
        setInvoices(prev => {
            const idx = prev.findIndex(i => i.id === invoice.id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = invoice;
                return updated;
            }
            return [invoice, ...prev];
        });
    }, [setInvoices]);

    const deleteInvoice = useCallback((id: string) => {
        setInvoices(prev => {
            const idx = prev.findIndex(i => i.id === id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], status: 'deleted', updatedAt: new Date().toISOString() };
                return updated;
            }
            return prev;
        });
    }, [setInvoices]);

    const hardDeleteInvoice = useCallback((id: string) => {
        setInvoices(prev => prev.filter(i => i.id !== id));
    }, [setInvoices]);

    const restoreInvoice = useCallback((id: string) => {
        setInvoices(prev => {
            const idx = prev.findIndex(i => i.id === id);
            if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = { ...updated[idx], status: 'draft', updatedAt: new Date().toISOString() };
                return updated;
            }
            return prev;
        });
    }, [setInvoices]);

    const getNextInvoiceNumber = useCallback(() => {
        const prefix = settings.invoicePrefix || 'INV';
        const num = settings.nextInvoiceNumber || 1001;
        return `${prefix}-${String(num).padStart(4, '0')}`;
    }, [settings.invoicePrefix, settings.nextInvoiceNumber]);

    const bumpInvoiceNumber = useCallback(() => {
        setSettings(prev => ({
            ...prev,
            nextInvoiceNumber: (prev.nextInvoiceNumber || 1001) + 1,
        }));
    }, [setSettings]);

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
