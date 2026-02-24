import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

serve(async (req) => {
    console.log(`[SF] Incoming request: ${req.method} ${new URL(req.url).pathname}`);

    // 1. Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Validate Environment Variables (Diagnostic Mode)
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

        if (!RESEND_API_KEY) {
            console.error('[SF] Diagnostic Failure: RESEND_API_KEY is missing');
            return new Response(
                JSON.stringify({ error: 'RESEND_API_KEY is not configured in Supabase Secrets' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('[SF] Diagnostic Failure: Supabase internal keys are missing');
            return new Response(
                JSON.stringify({ error: 'Internal Supabase configuration error' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        // 3. Get the authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error('[SF] Authentication Failure: No Authorization header');
            return new Response(
                JSON.stringify({ error: 'No authorization header provided' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        // 4. Initialize Supabase client to verify the user
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } }
        });

        // 5. Get the user from the JWT
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) {
            console.error('[SF] Authentication Failure:', userError?.message || 'User not found');
            return new Response(
                JSON.stringify({ error: `Unauthorized: ${userError?.message || 'Invalid token'}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            );
        }

        console.log(`[SF] Authorized user: ${user.email} (${user.id})`);

        // 6. Parse and Log Request Body
        let body;
        try {
            body = await req.json();
            console.log('[SF] Request body received:', JSON.stringify(body, null, 2));
        } catch (e) {
            console.error('[SF] Payload Error: Invalid JSON');
            return new Response(
                JSON.stringify({ error: 'Invalid JSON payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const { to, subject, html, pdfBase64, filename } = body;

        // 7. Validate Required Fields
        if (!to || !subject || !html) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: to, subject, or html' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // 8. Validate Email Format
        const emailsToValidate = Array.isArray(to) ? to : [to];
        for (const email of emailsToValidate) {
            if (!EMAIL_REGEX.test(email)) {
                return new Response(
                    JSON.stringify({ error: `Invalid email format: ${email}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
            }
        }

        // 9. Send email via Resend API
        console.log(`[SF] Attempting to send email to: ${to}`);
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Invoices <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject: subject,
                html: html,
                attachments: pdfBase64 ? [
                    {
                        filename: filename || 'invoice.pdf',
                        content: pdfBase64,
                    }
                ] : [],
            }),
        });

        const resData = await resendResponse.json();
        console.log('[SF] Resend API Response Status:', resendResponse.status);
        console.log('[SF] Resend API Response Data:', JSON.stringify(resData, null, 2));

        if (!resendResponse.ok) {
            let errorMessage = resData.message || 'Failed to send email via Resend';
            if (resendResponse.status === 403 && errorMessage.includes('onboarding@resend.dev')) {
                errorMessage = 'Resend Sandbox: Verify your domain or recipient email address.';
            }
            return new Response(
                JSON.stringify({ error: errorMessage, details: resData }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: resendResponse.status }
            );
        }

        // 10. Log successful send to DB
        try {
            const { error: logError } = await supabaseClient.from('email_logs').insert({
                user_id: user.id,
                sent_to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject
            });
            if (logError) console.warn('[SF] DB Logging Warning:', logError.message);
        } catch (dbError) {
            console.error('[SF] DB Logging Exception:', dbError);
        }

        return new Response(
            JSON.stringify({ success: true, data: resData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (err: any) {
        console.error('[SF] Global Exception Catch:', err.message);
        console.error(err.stack);
        return new Response(
            JSON.stringify({
                error: 'Internal Server Error',
                message: err.message,
                details: 'See Supabase Edge Function logs for stack trace'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
