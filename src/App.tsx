import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';
import { useIsMobile } from './hooks/useMediaQuery';
import DesktopApp from './components/DesktopApp';
import MobileApp from './components/MobileApp';
import { useAuth } from './context/AuthContext';
import type { Invoice } from './types';
import { AuthPage } from './pages/AuthPage';
import { Loader2 } from 'lucide-react';

type Page = 'dashboard' | 'new-invoice' | 'invoices' | 'settings';

const AppInner: React.FC = () => {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const isMobile = useIsMobile();

  const handleNavigate = (page: string) => {
    if (page !== 'new-invoice') setEditingInvoice(null);
    setActivePage(page as Page);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setActivePage('new-invoice');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return isMobile ? (
    <MobileApp
      activePage={activePage}
      editingInvoice={editingInvoice}
      handleNavigate={handleNavigate}
      handleEditInvoice={handleEditInvoice}
      setEditingInvoice={setEditingInvoice}
    />
  ) : (
    <DesktopApp
      activePage={activePage}
      editingInvoice={editingInvoice}
      handleNavigate={handleNavigate}
      handleEditInvoice={handleEditInvoice}
      setEditingInvoice={setEditingInvoice}
    />
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppInner />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1e293b',
          color: '#e2e8f0',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '10px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
      }}
    />
  </AppProvider>
);

export default App;
