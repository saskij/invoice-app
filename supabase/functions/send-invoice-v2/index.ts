import { serve } from "http/server.ts"
import { createClient } from "supabase"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log('[SF-v2] New request received');

        // 2. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const authHeader = req.headers.get('Authorization')!;

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // 3. Get User
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error('[SF-v2] Auth error:', userError);
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 200, // Return 200 so frontend can show the message
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 4. Parse Request
        const { to, subject, html, pdfBase64, filename } = await req.json();
        console.log(`[SF-v2] Sending invoice #${filename} to ${to}`);

        // 5. Determine API Key (DB first, then ENV)
        const { data: settings } = await supabase.from('settings').select('resend').eq('user_id', user.id).single();
        const apiKey = settings?.resend?.apiKey || Deno.env.get('RESEND_API_KEY');

        if (!apiKey) {
            console.error('[SF-v2] No API key found');
            return new Response(JSON.stringify({
                success: false,
                error: 'Resend API key missing. Please add it to your Email Settings.'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 6. Send via Resend
        const resendRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: 'Invoices <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                attachments: pdfBase64 ? [{ filename: filename || 'invoice.pdf', content: pdfBase64 }] : []
            })
        });

        const resendJson = await resendRes.json();

        if (!resendRes.ok) {
            console.error('[SF-v2] Resend failure:', resendJson);
            let msg = resendJson.message || 'Resend API error';
            if (resendRes.status === 401) msg = 'Invalid Resend API Key. Please check settings.';
            if (resendRes.status === 403) msg = 'Resend Sandbox: You can only send to your own email until you verify a domain.';

            return new Response(JSON.stringify({ success: false, error: msg, details: resendJson }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 7. Log success
        await supabase.from('email_logs').insert({
            user_id: user.id,
            sent_to: String(to),
            subject
        });

        console.log('[SF-v2] Success');
        return new Response(JSON.stringify({ success: true, data: resendJson }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('[SF-v2] Global error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
})
