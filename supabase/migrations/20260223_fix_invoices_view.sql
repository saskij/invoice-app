-- Fix for invoices_view
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new

CREATE OR REPLACE VIEW public.invoices_view AS
SELECT 
    i.id,
    i.user_id,
    i."invoiceNumber",
    i.client,
    i.client_id,
    i."lineItems",
    i."issueDate",
    i."dueDate",
    i."discountType",
    i."discountValue",
    i."discountAmount",
    i."taxRate",
    i.subtotal,
    i."taxAmount",
    i.total,
    i.notes,
    i."paymentTerms",
    i."paymentInfo",
    i.status,
    i."paidAmount",
    i."paymentDate",
    i."createdAt",
    i."updatedAt",
    c.name as "clientName",
    c.company as "clientCompany",
    c.email as "clientEmail",
    (COALESCE(i.total, 0) - COALESCE(i."paidAmount", 0)) as "balanceDue",
    CASE 
        WHEN i.status = 'deleted' THEN 'deleted'
        WHEN COALESCE(i."paidAmount", 0) >= COALESCE(i.total, 0) AND i.total > 0 THEN 'paid'
        WHEN i."dueDate" IS NOT NULL 
             AND i."dueDate" != '' 
             AND (i."dueDate"::DATE < CURRENT_DATE) 
             AND COALESCE(i."paidAmount", 0) < COALESCE(i.total, 0)
             THEN 'overdue'
        ELSE i.status 
    END as "displayStatus"
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;
