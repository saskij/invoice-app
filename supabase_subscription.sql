-- Add subscription fields to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS invoice_limit INTEGER DEFAULT 5;

-- Update existing records to default values if they are NULL
UPDATE public.settings 
SET subscription_status = 'free' 
WHERE subscription_status IS NULL;

UPDATE public.settings 
SET invoice_limit = 5 
WHERE invoice_limit IS NULL;
