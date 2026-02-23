-- Performance Audit & Tuning
-- Added on 2026-02-23

-- 1. Index for Dashboard Recent Invoices (Speed up sorting by date)
CREATE INDEX IF NOT EXISTS idx_invoices_user_date ON public.invoices(user_id, "createdAt" DESC);

-- 2. Index for Dashboard Counters (Speed up filtering by status)
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON public.invoices(user_id, status);

-- 3. Index for Payment History Lookups (Speed up joins and invoice detail views)
CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON public.payment_history(invoice_id);

-- 4. Index for Client Searching (Speed up client dropdowns)
CREATE INDEX IF NOT EXISTS idx_clients_user_name ON public.clients(user_id, name);

-- 5. Index for Catalog Searching (Speed up service picking)
CREATE INDEX IF NOT EXISTS idx_catalog_user_id ON public.catalog(user_id);

-- 6. Index for Settings Lookup
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);
