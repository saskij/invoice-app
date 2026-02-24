-- FINAL ROBUST SCHEMA NORMALIZATION
-- This script renames existing camelCase columns to snake_case and ensures all tables are consistent.
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new

DO $$
BEGIN
    -- 1. FIX CLIENTS TABLE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='createdAt') THEN
        ALTER TABLE public.clients RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='updatedAt') THEN
        ALTER TABLE public.clients RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
    -- Ensure columns exist if they weren't there at all
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- 2. FIX INVOICES TABLE
    -- Make legacy columns nullable if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='customer_name') THEN
        ALTER TABLE public.invoices ALTER COLUMN customer_name DROP NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='customer_email') THEN
        ALTER TABLE public.invoices ALTER COLUMN customer_email DROP NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='createdAt') THEN
        ALTER TABLE public.invoices RENAME COLUMN "createdAt" TO created_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='updatedAt') THEN
        ALTER TABLE public.invoices RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='dueDate') THEN
        ALTER TABLE public.invoices RENAME COLUMN "dueDate" TO due_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='issueDate') THEN
        ALTER TABLE public.invoices RENAME COLUMN "issueDate" TO issue_date;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='invoiceNumber') THEN
        ALTER TABLE public.invoices RENAME COLUMN "invoiceNumber" TO invoice_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='paidAmount') THEN
        ALTER TABLE public.invoices RENAME COLUMN "paidAmount" TO paid_amount;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='lineItems') THEN
        ALTER TABLE public.invoices RENAME COLUMN "lineItems" TO line_items;
    END IF;

    -- Ensure all snake_case columns exist
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
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- 3. FIX CATALOG TABLE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='catalog' AND column_name='defaultPrice') THEN
        ALTER TABLE public.catalog RENAME COLUMN "defaultPrice" TO default_price;
    END IF;
    ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS default_price DECIMAL DEFAULT 0;
    ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.catalog ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- 4. FIX SETTINGS TABLE
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='updatedAt') THEN
        ALTER TABLE public.settings RENAME COLUMN "updatedAt" TO updated_at;
    END IF;
    ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

END $$;

-- 5. RE-CREATE VIEW (Cleanest version)
DROP VIEW IF EXISTS public.invoices_view;
CREATE OR REPLACE VIEW public.invoices_view AS
SELECT 
    i.id,
    i.user_id,
    i.invoice_number AS "invoiceNumber",
    i.client_id,
    i.line_items AS "lineItems",
    i.issue_date AS "issueDate",
    i.due_date AS "dueDate",
    i.discount_type AS "discountType",
    i.discount_value AS "discountValue",
    i.discount_amount AS "discountAmount",
    i.tax_rate AS "taxRate",
    i.subtotal,
    i.tax_amount AS "taxAmount",
    i.total,
    i.notes,
    i.status,
    i.paid_amount AS "paidAmount",
    i.created_at AS "createdAt",
    i.updated_at AS "updatedAt",
    c.name as "clientName",
    c.company as "clientCompany",
    c.email as "clientEmail",
    (COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0)) as "balanceDue",
    CASE 
        WHEN i.status = 'deleted' THEN 'deleted'
        WHEN COALESCE(i.paid_amount, 0) >= COALESCE(i.total, 0) AND i.total > 0 THEN 'paid'
        WHEN i.issue_date IS NOT NULL 
             AND (i.issue_date::DATE < CURRENT_DATE) 
             AND COALESCE(i.paid_amount, 0) < COALESCE(i.total, 0)
             THEN 'overdue'
        ELSE i.status 
    END as "displayStatus"
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;
