-- Create email_logs table for rate limiting and auditing
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_to TEXT NOT NULL,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own email logs" ON public.email_logs;
CREATE POLICY "Users can view their own email logs" ON public.email_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Indexes for performance (used in rate limiting queries)
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id_created_at ON public.email_logs(user_id, created_at);
