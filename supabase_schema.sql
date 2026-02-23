-- Full SQL Schema for Invoice App
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/pgqawzeejmgbwfrirtvw/sql/new

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company JSONB DEFAULT '{}'::JSONB,
    resend JSONB DEFAULT '{"apiKey": ""}'::JSONB,
    "defaultTaxRate" DECIMAL DEFAULT 0,
    "defaultPaymentTerms" TEXT DEFAULT 'Payment due within 30 days of invoice date.',
    "paymentInfo" TEXT,
    "invoicePrefix" TEXT DEFAULT 'INV',
    "nextInvoiceNumber" INTEGER DEFAULT 1001,
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Catalog Table
CREATE TABLE IF NOT EXISTS public.catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    "defaultPrice" DECIMAL DEFAULT 0,
    unit TEXT DEFAULT 'project',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "invoiceNumber" TEXT NOT NULL,
    client JSONB NOT NULL DEFAULT '{}'::JSONB,
    "lineItems" JSONB NOT NULL DEFAULT '[]'::JSONB,
    "issueDate" TEXT,
    "dueDate" TEXT,
    "discountType" TEXT DEFAULT 'percentage',
    "discountValue" DECIMAL DEFAULT 0,
    "discountAmount" DECIMAL DEFAULT 0,
    "taxRate" DECIMAL DEFAULT 0,
    subtotal DECIMAL DEFAULT 0,
    "taxAmount" DECIMAL DEFAULT 0,
    total DECIMAL DEFAULT 0,
    notes TEXT,
    "paymentTerms" TEXT,
    "paymentInfo" TEXT,
    status TEXT DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.settings;
CREATE POLICY "Users can view their own settings" ON public.settings FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own settings" ON public.settings;
CREATE POLICY "Users can update their own settings" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- Catalog
DROP POLICY IF EXISTS "Users can view their own catalog" ON public.catalog;
CREATE POLICY "Users can view their own catalog" ON public.catalog FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own catalog" ON public.catalog;
CREATE POLICY "Users can manage their own catalog" ON public.catalog FOR ALL USING (auth.uid() = user_id);

-- Invoices
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage their own invoices" ON public.invoices;
CREATE POLICY "Users can manage their own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- 7. Trigger for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Storage Buckets (Manual setup required in UI usually, but try to hint RLS)
-- Note: Buckets can be created via Supabase Dashboard -> Storage -> New Bucket "logos" (Public: Yes)
