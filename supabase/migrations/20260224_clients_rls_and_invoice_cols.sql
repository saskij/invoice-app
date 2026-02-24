-- ============================================================
-- FIX 1: Ensure all critical invoice columns exist
-- ============================================================
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms  TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_info   TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_link   TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes          TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id      UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- ============================================================
-- FIX 2: Enable RLS on all critical tables (idempotent)
-- ============================================================
ALTER TABLE public.clients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FIX 3: RLS Policies for CLIENTS
-- Drop old/broken policies first, then recreate cleanly
-- ============================================================
DROP POLICY IF EXISTS "clients_select_own"  ON public.clients;
DROP POLICY IF EXISTS "clients_insert_own"  ON public.clients;
DROP POLICY IF EXISTS "clients_update_own"  ON public.clients;
DROP POLICY IF EXISTS "clients_delete_own"  ON public.clients;
DROP POLICY IF EXISTS "Allow users to read their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to delete their own clients" ON public.clients;

CREATE POLICY "clients_select_own"
    ON public.clients FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "clients_insert_own"
    ON public.clients FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_update_own"
    ON public.clients FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients_delete_own"
    ON public.clients FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- FIX 4: RLS Policies for INVOICES
-- ============================================================
DROP POLICY IF EXISTS "invoices_select_own"  ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert_own"  ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_own"  ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete_own"  ON public.invoices;
DROP POLICY IF EXISTS "Allow users to read their own invoices"   ON public.invoices;
DROP POLICY IF EXISTS "Allow users to insert their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow users to update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow users to delete their own invoices" ON public.invoices;

CREATE POLICY "invoices_select_own"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "invoices_insert_own"
    ON public.invoices FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_update_own"
    ON public.invoices FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoices_delete_own"
    ON public.invoices FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- FIX 5: RLS Policies for SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "settings_select_own"  ON public.settings;
DROP POLICY IF EXISTS "settings_insert_own"  ON public.settings;
DROP POLICY IF EXISTS "settings_update_own"  ON public.settings;
DROP POLICY IF EXISTS "settings_delete_own"  ON public.settings;
DROP POLICY IF EXISTS "Allow users to read their own settings"   ON public.settings;
DROP POLICY IF EXISTS "Allow users to insert their own settings" ON public.settings;
DROP POLICY IF EXISTS "Allow users to update their own settings" ON public.settings;

CREATE POLICY "settings_select_own"
    ON public.settings FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "settings_insert_own"
    ON public.settings FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "settings_update_own"
    ON public.settings FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FIX 6: RLS Policies for CATALOG
-- ============================================================
DROP POLICY IF EXISTS "catalog_select_own"  ON public.catalog;
DROP POLICY IF EXISTS "catalog_insert_own"  ON public.catalog;
DROP POLICY IF EXISTS "catalog_update_own"  ON public.catalog;
DROP POLICY IF EXISTS "catalog_delete_own"  ON public.catalog;
DROP POLICY IF EXISTS "Allow users to read their own catalog"   ON public.catalog;
DROP POLICY IF EXISTS "Allow users to insert their own catalog" ON public.catalog;
DROP POLICY IF EXISTS "Allow users to update their own catalog" ON public.catalog;
DROP POLICY IF EXISTS "Allow users to delete their own catalog" ON public.catalog;

CREATE POLICY "catalog_select_own"
    ON public.catalog FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "catalog_insert_own"
    ON public.catalog FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "catalog_update_own"
    ON public.catalog FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "catalog_delete_own"
    ON public.catalog FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- FIX 7: Refresh the invoices_view to include payment columns
-- ============================================================
DROP VIEW IF EXISTS public.invoices_view;
CREATE OR REPLACE VIEW public.invoices_view AS
SELECT 
    i.id,
    i.user_id,
    i.invoice_number        AS "invoiceNumber",
    i.client_id,
    i.line_items            AS "lineItems",
    i.issue_date            AS "issueDate",
    i.due_date              AS "dueDate",
    i.discount_type         AS "discountType",
    i.discount_value        AS "discountValue",
    i.discount_amount       AS "discountAmount",
    i.tax_rate              AS "taxRate",
    i.subtotal,
    i.tax_amount            AS "taxAmount",
    i.total,
    i.notes,
    i.payment_terms         AS "paymentTerms",
    i.payment_info          AS "paymentInfo",
    i.payment_link          AS "paymentLink",
    i.status,
    i.paid_amount           AS "paidAmount",
    i.created_at            AS "createdAt",
    i.updated_at            AS "updatedAt",
    c.name                  AS "clientName",
    c.company               AS "clientCompany",
    c.email                 AS "clientEmail",
    (COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0)) AS "balanceDue",
    CASE 
        WHEN i.status = 'deleted' THEN 'deleted'
        WHEN COALESCE(i.paid_amount, 0) >= COALESCE(i.total, 0) AND i.total > 0 THEN 'paid'
        WHEN i.due_date IS NOT NULL
             AND (i.due_date::DATE < CURRENT_DATE)
             AND i.status IN ('sent', 'draft')
             AND COALESCE(i.paid_amount, 0) < COALESCE(i.total, 0)
             THEN 'overdue'
        ELSE i.status 
    END AS "displayStatus"
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;
