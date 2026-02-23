-- 1. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients" ON public.clients
    FOR ALL USING (auth.uid() = user_id);

-- 2. Add client_id to Invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- 3. Data Migration: Extract unique clients and link them to invoices
-- We use a CTE to find unique clients per user and insert them
DO $$
DECLARE
    r RECORD;
    new_client_id UUID;
BEGIN
    FOR r IN (
        SELECT DISTINCT ON (user_id, client->>'name', client->>'email') 
            user_id, 
            client->>'name' as name, 
            client->>'email' as email,
            client->>'phone' as phone,
            client->>'company' as company,
            client->>'address' as address,
            client->>'city' as city,
            client->>'state' as state,
            client->>'zip' as zip
        FROM public.invoices
        WHERE client IS NOT NULL
    ) LOOP
        -- Insert into clients
        INSERT INTO public.clients (user_id, name, email, phone, company, address, city, state, zip)
        VALUES (r.user_id, r.name, r.email, r.phone, r.company, r.address, r.city, r.state, r.zip)
        ON CONFLICT DO NOTHING
        RETURNING id INTO new_client_id;

        -- If inserted or found, update invoices
        IF new_client_id IS NULL THEN
            SELECT id INTO new_client_id FROM public.clients 
            WHERE user_id = r.user_id AND name = r.name AND (email = r.email OR (email IS NULL AND r.email IS NULL))
            LIMIT 1;
        END IF;

        UPDATE public.invoices
        SET client_id = new_client_id
        WHERE user_id = r.user_id 
          AND client->>'name' = r.name 
          AND (client->>'email' = r.email OR (client->>'email' IS NULL AND r.email IS NULL));
    END LOOP;
END $$;

-- 4. Update invoices_view to include client details from the new table
CREATE OR REPLACE VIEW public.invoices_view AS
SELECT 
    i.*,
    c.name as "clientName",
    c.company as "clientCompany",
    c.email as "clientEmail",
    c.phone as "clientPhone",
    c.address as "clientAddress",
    c.city as "clientCity",
    c.state as "clientState",
    c.zip as "clientZip",
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
FROM public.invoices i
LEFT JOIN public.clients c ON i.client_id = c.id;

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
