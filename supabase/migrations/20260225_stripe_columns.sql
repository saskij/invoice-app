-- ============================================================
-- STRIPE INTEGRATION — ADD PAYMENT COLUMNS
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new
-- Safe to re-run (uses IF NOT EXISTS).
-- ============================================================

-- 1. ADD STRIPE COLUMNS TO INVOICES TABLE
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_session_id        TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_checkout_url      TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid_cents        INTEGER DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at                  TIMESTAMPTZ;

-- 2. DROP & RECREATE VIEW WITH NEW COLUMNS
DROP VIEW IF EXISTS public.invoices_view;

CREATE OR REPLACE VIEW public.invoices_view AS
SELECT
    i.id,
    i.user_id,
    i.invoice_number              AS "invoiceNumber",
    i.client_id,
    i.line_items                  AS "lineItems",
    i.issue_date                  AS "issueDate",
    i.due_date                    AS "dueDate",
    i.discount_type               AS "discountType",
    i.discount_value              AS "discountValue",
    i.discount_amount             AS "discountAmount",
    i.tax_rate                    AS "taxRate",
    i.subtotal,
    i.tax_amount                  AS "taxAmount",
    i.total,
    i.notes,
    i.status,
    i.paid_amount                 AS "paidAmount",
    -- Stripe-specific columns
    i.stripe_session_id           AS "stripeSessionId",
    i.stripe_checkout_url         AS "stripeCheckoutUrl",
    i.stripe_payment_intent_id    AS "stripePaymentIntentId",
    i.amount_paid_cents           AS "amountPaidCents",
    i.paid_at                     AS "paidAt",
    -- payment_link maps to stripe_checkout_url for PDF compatibility
    COALESCE(i.stripe_checkout_url, i.payment_link) AS "paymentLink",
    i.created_at                  AS "createdAt",
    i.updated_at                  AS "updatedAt",
    -- Client join
    c.name                        AS "clientName",
    c.company                     AS "clientCompany",
    c.email                       AS "clientEmail",
    (COALESCE(i.total, 0) - COALESCE(i.paid_amount, 0)) AS "balanceDue",
    -- Computed display status
    CASE
        WHEN i.status = 'deleted'                                                                                      THEN 'deleted'
        WHEN i.status = 'paid'                                                                                         THEN 'paid'
        WHEN COALESCE(i.paid_amount, 0) >= COALESCE(i.total, 0) AND i.total > 0                                        THEN 'paid'
        WHEN i.issue_date IS NOT NULL
             AND (i.issue_date::DATE < CURRENT_DATE)
             AND COALESCE(i.paid_amount, 0) < COALESCE(i.total, 0)                                                    THEN 'overdue'
        ELSE i.status
    END AS "displayStatus"
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;

-- 3. CREATE INDEXES FOR STRIPE LOOKUPS
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_session_id ON public.invoices (stripe_session_id)
    WHERE stripe_session_id IS NOT NULL;

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
