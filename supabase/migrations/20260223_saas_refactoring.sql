-- 1. Update Invoices Table with Payment Columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "paymentDate" TIMESTAMPTZ;

-- 2. Create Payment History Table
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL CHECK (amount > 0),
    payment_method TEXT,
    notes TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy for payment_history
DROP POLICY IF EXISTS "Users can manage their own payment history" ON public.payment_history;
CREATE POLICY "Users can manage their own payment history" ON public.payment_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE id = payment_history.invoice_id
            AND user_id = auth.uid()
        )
    );

-- 3. Trigger to Update paidAmount in Invoices
CREATE OR REPLACE FUNCTION public.update_invoice_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.invoices
        SET "paidAmount" = "paidAmount" + NEW.amount,
            "paymentDate" = NEW."createdAt"
        WHERE id = NEW.invoice_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.invoices
        SET "paidAmount" = "paidAmount" - OLD.amount
        WHERE id = OLD.invoice_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_added ON public.payment_history;
CREATE TRIGGER on_payment_added
    AFTER INSERT OR DELETE ON public.payment_history
    FOR EACH ROW EXECUTE FUNCTION public.update_invoice_paid_amount();

-- 4. Create Dynamic Invoices View
-- This view calculates balanceDue and dynamic_status in real-time
CREATE OR REPLACE VIEW public.invoices_view AS
SELECT 
    i.*,
    (i.total - i."paidAmount") as "balanceDue",
    CASE 
        WHEN i.status = 'deleted' THEN 'deleted'
        WHEN i."paidAmount" >= i.total THEN 'paid'
        WHEN i."dueDate" IS NOT NULL 
             AND i."dueDate" != '' 
             AND (i."dueDate"::DATE < CURRENT_DATE) 
             AND i."paidAmount" < i.total 
             THEN 'overdue'
        ELSE i.status 
    END as "displayStatus"
FROM public.invoices i;

-- 5. Server-Side Invoice Limit Trigger
CREATE OR REPLACE FUNCTION public.check_invoice_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    user_limit INTEGER;
    sub_status TEXT;
BEGIN
    -- Get user settings
    SELECT "invoiceLimit", "subscriptionStatus" INTO user_limit, sub_status
    FROM public.settings
    WHERE user_id = NEW.user_id;

    -- Only check for free users
    IF sub_status = 'free' THEN
        SELECT COUNT(*) INTO current_count
        FROM public.invoices
        WHERE user_id = NEW.user_id AND status != 'deleted';

        IF current_count >= user_limit THEN
            RAISE EXCEPTION 'Invoice limit reached. Upgrade to Pro for unlimited invoices.'
                USING ERRCODE = 'P0001'; -- Custom error code
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_invoice_limit ON public.invoices;
CREATE TRIGGER tr_check_invoice_limit
    BEFORE INSERT ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.check_invoice_limit();

-- 6. Backfill existing 'paid' invoices
UPDATE public.invoices
SET "paidAmount" = total
WHERE status = 'paid' AND "paidAmount" = 0;
