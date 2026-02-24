import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const authHeader = req.headers.get('Authorization')!;
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { to, subject, html, pdfBase64, filename } = await req.json();

        // 1. Get API Key from DB or ENV
        const { data: settings } = await supabaseClient.from('settings').select('resend').eq('user_id', user.id).single();
        const apiKey = settings?.resend?.apiKey || Deno.env.get('RESEND_API_KEY');

        if (!apiKey) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Resend API key is missing. Please go to Settings and enter your API key.' 
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 2. Call Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: 'Invoices <onboarding@resend.dev>',
                to: Array.isArray(to) ? to : [to],
                subject,
                html,
                attachments: pdfBase64 ? [{ filename: filename || 'invoice.pdf', content: pdfBase64 }] : []
            })
        });

        const resData = await response.json();

        if (!response.ok) {
            let error = resData.message || 'Resend API error';
            if (response.status === 401) error = 'Invalid Resend API Key. Please update it in your Settings.';
            if (response.status === 403) error = 'Resend Sandbox restriction: You can only send to your own email until you verify a domain.';
            
            return new Response(JSON.stringify({ success: false, error, details: resData }), 
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        // 3. Log and return
        await supabaseClient.from('email_logs').insert({ user_id: user.id, sent_to: String(to), subject });

        return new Response(JSON.stringify({ success: true, data: resData }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }
});
