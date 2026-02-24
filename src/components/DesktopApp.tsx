import React from 'react';
import { useApp } from '../context/AppContext';
import Sidebar from './desktop/Sidebar';
import TopBar from './desktop/TopBar';
import DashboardPage from '../pages/desktop/DashboardPage';
import NewInvoicePage from '../pages/desktop/NewInvoicePage';
import InvoicesPage from '../pages/desktop/InvoicesPage';
import SettingsPage from '../pages/desktop/SettingsPage';
import ClientsPage from '../pages/desktop/ClientsPage';
import type { Invoice } from '../types';

type Page = 'dashboard' | 'new-invoice' | 'invoices' | 'settings' | 'clients' | 'catalog';

interface DesktopAppProps {
    activePage: Page;
    editingInvoice: Invoice | null;
    handleNavigate: (page: string) => void;
    handleEditInvoice: (invoice: Invoice) => void;
    setEditingInvoice: (invoice: Invoice | null) => void;
}

const DesktopApp: React.FC<DesktopAppProps> = ({
    activePage,
    editingInvoice,
    handleNavigate,
    handleEditInvoice,
    setEditingInvoice,
}) => {
    const { settings } = useApp();

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            <Sidebar activePage={activePage} onNavigate={handleNavigate} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TopBar activePage={activePage} companyName={settings.company.name} />
                <main style={{ flex: 1, overflowY: 'auto' }}>
                    {activePage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
                    {activePage === 'new-invoice' && (
                        <NewInvoicePage
                            editInvoice={editingInvoice}
                            onSaved={() => { handleNavigate('invoices'); setEditingInvoice(null); }}
                        />
                    )}
                    {activePage === 'invoices' && <InvoicesPage onEdit={handleEditInvoice} />}
                    {activePage === 'settings' && <SettingsPage />}
                    {activePage === 'clients' && <ClientsPage />}
                    {activePage === 'catalog' && <div style={{ padding: 40, color: '#94a3b8' }}>Catalog management coming soon...</div>}
                </main>
            </div>
        </div>
    );
};

export default DesktopApp;
