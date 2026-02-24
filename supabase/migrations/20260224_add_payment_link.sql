-- 1. ADD PAYMENT LINK COLUMN
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- 2. UPDATE VIEW
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
    i.payment_link AS "paymentLink",
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

-- 3. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
