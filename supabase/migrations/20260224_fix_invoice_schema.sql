-- Migration to fix schema mismatch and unify column names
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new

-- 1. FIX CLIENTS TABLE
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. FIX INVOICES TABLE
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::JSONB;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_value DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_info TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. FIX CATALOG TABLE
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS default_price DECIMAL DEFAULT 0;
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. FIX SETTINGS TABLE
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Data Migration DO Block
DO $$
BEGIN
    -- Clients
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='createdAt') THEN
        UPDATE public.clients SET created_at = "createdAt" WHERE created_at IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='updatedAt') THEN
        UPDATE public.clients SET updated_at = "updatedAt" WHERE updated_at IS NULL;
    END IF;

    -- Invoices
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='dueDate') THEN
        UPDATE public.invoices SET due_date = "dueDate" WHERE due_date IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issueDate') THEN
        UPDATE public.invoices SET issue_date = "issueDate" WHERE issue_date IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoiceNumber') THEN
        UPDATE public.invoices SET invoice_number = "invoiceNumber" WHERE invoice_number IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='lineItems') THEN
        UPDATE public.invoices SET line_items = "lineItems" WHERE line_items IS NULL OR line_items = '[]'::JSONB;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='createdAt') THEN
        UPDATE public.invoices SET created_at = "createdAt" WHERE created_at IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='updatedAt') THEN
        UPDATE public.invoices SET updated_at = "updatedAt" WHERE updated_at IS NULL;
    END IF;

    -- Catalog
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='catalog' AND column_name='defaultPrice') THEN
        UPDATE public.catalog SET default_price = "defaultPrice" WHERE default_price = 0;
    END IF;
END $$;

-- 6. Re-create the view with proper aliasing
DROP VIEW IF EXISTS public.invoices_view;
CREATE VIEW public.invoices_view AS
SELECT 
    i.id,
    i.user_id,
    COALESCE(i.invoice_number, i."invoiceNumber") as "invoiceNumber",
    i.client_id,
    COALESCE(i.line_items, i."lineItems") as "lineItems",
    COALESCE(i.issue_date, i."issueDate") as "issueDate",
    COALESCE(i.due_date, i."dueDate") as "dueDate",
    COALESCE(i.discount_type, i."discountType") as "discountType",
    COALESCE(i.discount_value, i."discountValue") as "discountValue",
    COALESCE(i.discount_amount, i."discountAmount") as "discountAmount",
    COALESCE(i.tax_rate, i."taxRate") as "taxRate",
    i.subtotal,
    COALESCE(i.tax_amount, i."taxAmount") as "taxAmount",
    i.total,
    i.notes,
    COALESCE(i.payment_terms, i."paymentTerms") as "paymentTerms",
    COALESCE(i.payment_info, i."paymentInfo") as "paymentInfo",
    i.status,
    COALESCE(i.paid_amount, i."paidAmount") as "paidAmount",
    COALESCE(i.payment_date, i."paymentDate") as "paymentDate",
    COALESCE(i.created_at, i."createdAt") AS "createdAt",
    COALESCE(i.updated_at, i."updatedAt") AS "updatedAt",
    c.name as "clientName",
    c.company as "clientCompany",
    c.email as "clientEmail",
    (COALESCE(i.total, 0) - COALESCE(i.paid_amount, i."paidAmount", 0)) as "balanceDue",
    CASE 
        WHEN i.status = 'deleted' THEN 'deleted'
        WHEN COALESCE(i.paid_amount, i."paidAmount", 0) >= COALESCE(i.total, 0) AND i.total > 0 THEN 'paid'
        WHEN COALESCE(i.issue_date, i."issueDate") IS NOT NULL 
             AND (COALESCE(i.issue_date, i."issueDate")::DATE < CURRENT_DATE) 
             AND COALESCE(i.paid_amount, i."paidAmount", 0) < COALESCE(i.total, 0)
             THEN 'overdue'
        ELSE i.status 
    END as "displayStatus"
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;
