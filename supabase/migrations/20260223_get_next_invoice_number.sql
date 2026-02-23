-- Function to atomically increment the nextInvoiceNumber and return a formatted string
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    num INTEGER;
BEGIN
    -- Update the settings table and get the current values
    -- We use a single UPDATE statement to ensure atomicity
    UPDATE public.settings
    SET "nextInvoiceNumber" = "nextInvoiceNumber" + 1
    WHERE user_id = auth.uid()
    RETURNING "invoicePrefix", ("nextInvoiceNumber" - 1) INTO prefix, num;
    
    -- Format the result
    RETURN COALESCE(prefix, 'INV') || '-' || LPAD(num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number() TO authenticated;
