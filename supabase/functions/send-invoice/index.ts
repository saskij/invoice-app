import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Get the authorization header from the request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        // 2. Initialize Supabase client to verify the user
        // Note: SUPABASE_URL and SUPABASE_ANON_KEY are automatically injected into Edge Functions
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // 3. Get the user from the JWT
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) {
            throw new Error('Unauthorized')
        }

        // 4. Parse the request body
        const { to, subject, html, pdfBase64, filename } = await req.json()

        // 5. Get the Resend API Key from Environment Variables
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured in Supabase Secrets')
        }

        // 6. Send email via Resend API
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Invoices <onboarding@resend.dev>', // You should update this after domain verification
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
        })

        const resData = await res.json()

        if (!res.ok) {
            throw new Error(resData.message || 'Failed to send email via Resend')
        }

        return new Response(
            JSON.stringify(resData),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
