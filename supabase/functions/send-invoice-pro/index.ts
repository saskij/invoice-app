import { serve } from "http/server.ts"
import { createClient } from "supabase"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const authHeader = req.headers.get('Authorization')!;

        // 1. Initialize Supabase with Service Role to bypass RLS for counters
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Verify User JWT (MANDATORY)
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

        if (authError || !user) {
            console.error('[PRO-SEND] Auth Error:', authError);
            return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3. Fetch User Profile & Enforcement Data
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('plan, invoices_sent_count, invoice_limit')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('[PRO-SEND] Profile Fetch Error:', profileError);
            return new Response(JSON.stringify({ error: 'Profile not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Server-Side Limit Enforcement
        if (profile.plan === 'free' && profile.invoices_sent_count >= profile.invoice_limit) {
            console.warn(`[PRO-SEND] Limit reached for user ${user.id}`);
            return new Response(JSON.stringify({
                error: 'Free plan limit reached',
                code: 'LIMIT_REACHED',
                limit: profile.invoice_limit,
                current: profile.invoices_sent_count
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. Parse Payload
        const { to, subject, html, pdfBase64, filename } = await req.json();

        // 6. Get Resend API Key (Priority: Profile > Env)
        const { data: settings } = await supabaseAdmin.from('profiles').select('resend_api_key').eq('id', user.id).single();
        const apiKey = settings?.resend_api_key || Deno.env.get('RESEND_API_KEY');

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Resend API key missing' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 7. Send via Resend
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'Invoices <onboarding@resend.dev>', // Use verified domain in prod
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                attachments: pdfBase64 ? [{ filename: filename || 'invoice.pdf', content: pdfBase64 }] : []
            })
        });

        const resendJson = await resendRes.json();

        if (!resendRes.ok) {
            return new Response(JSON.stringify({ error: 'Email delivery failed', details: resendJson }), {
                status: resendRes.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 8. Increment Counter & Log (Atomic Operation)
        await supabaseAdmin.rpc('increment_invoice_count', { user_uuid: user.id });

        return new Response(JSON.stringify({ success: true, message: 'Invoice sent successfully' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('[PRO-SEND] Internal Error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})
