import React, { useState } from 'react';
import MobileTopBar from './mobile/MobileTopBar';
import MobileBottomNav from './mobile/MobileBottomNav';
import MobileDrawer from './mobile/MobileDrawer';
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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    return (
        <div className="mobile-app-layout" style={{ minHeight: '100dvh', background: '#0f172a', paddingBottom: 80 }}>
            <MobileTopBar
                activePage={activePage}
                onNavigate={handleNavigate}
                onOpenMenu={() => setIsDrawerOpen(true)}
                title="Invoice App"
            />
            <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

            <main style={{ padding: '0 4px' }}>
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
