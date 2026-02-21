import React from 'react';
import MobileTopBar from './mobile/MobileTopBar';
import MobileBottomNav from './mobile/MobileBottomNav';
import DashboardPageMobile from '../pages/mobile/DashboardPageMobile';
import NewInvoicePageMobile from '../pages/mobile/NewInvoicePageMobile';
import InvoicesPageMobile from '../pages/mobile/InvoicesPageMobile';
import SettingsPageMobile from '../pages/mobile/SettingsPageMobile';
import type { Invoice } from '../types';

type Page = 'dashboard' | 'new-invoice' | 'invoices' | 'settings';

interface MobileAppProps {
    activePage: Page;
    editingInvoice: Invoice | null;
    handleNavigate: (page: string) => void;
    handleEditInvoice: (invoice: Invoice) => void;
    setEditingInvoice: (invoice: Invoice | null) => void;
}

const MobileApp: React.FC<MobileAppProps> = ({
    activePage,
    editingInvoice,
    handleNavigate,
    handleEditInvoice,
    setEditingInvoice,
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }} className="bg-slate-950 text-slate-200">
            <MobileTopBar activePage={activePage} onNavigate={handleNavigate} title="Invoice App" />

            <main style={{ flex: 1, overflowY: 'auto' }}>
                {activePage === 'dashboard' && <DashboardPageMobile onNavigate={handleNavigate} />}
                {activePage === 'new-invoice' && (
                    <NewInvoicePageMobile
                        editInvoice={editingInvoice}
                        onSaved={() => { handleNavigate('invoices'); setEditingInvoice(null); }}
                    />
                )}
                {activePage === 'invoices' && <InvoicesPageMobile onEdit={handleEditInvoice} />}
                {activePage === 'settings' && <SettingsPageMobile />}
            </main>
            <MobileBottomNav activePage={activePage} onNavigate={handleNavigate} />
        </div>
    );
};

export default MobileApp;
