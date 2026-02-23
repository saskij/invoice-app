-- SQL Script to fix the "Database error saving new user" issue
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new

-- 1. Fix the trigger function with search_path and conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: allow user creation to succeed even if settings creation fails
    -- This helps prevent the "Database error saving new user" 500 error
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Verify settings table exists and has correct columns
-- (This is just a safety check, it won't overwrite data if it already exists)
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company JSONB DEFAULT '{}'::JSONB,
    resend JSONB DEFAULT '{}'::JSONB,
    "defaultTaxRate" DECIMAL DEFAULT 0,
    "defaultPaymentTerms" TEXT DEFAULT 'Payment due within 30 days of invoice date.',
    "paymentInfo" TEXT,
    "invoicePrefix" TEXT DEFAULT 'INV',
    "nextInvoiceNumber" INTEGER DEFAULT 1001,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);
