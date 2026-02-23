import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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

        // 4. Rate Limiting Check
        const now = new Date()
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000).toISOString()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

        // Count emails in the last minute
        const { count: minuteCount, error: minuteError } = await supabaseClient
            .from('email_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', oneMinuteAgo)

        if (minuteError) throw minuteError
        if (minuteCount !== null && minuteCount >= 5) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded: Maximum 5 emails per minute.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            )
        }

        // Count emails in the last 24 hours
        const { count: dayCount, error: dayError } = await supabaseClient
            .from('email_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', twentyFourHoursAgo)

        if (dayError) throw dayError
        if (dayCount !== null && dayCount >= 50) {
            return new Response(
                JSON.stringify({ error: 'Rate limit exceeded: Maximum 50 emails per day.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
            )
        }

        // 5. Parse the request body
        const { to, subject, html, pdfBase64, filename } = await req.json()

        // 6. Validate Email Format
        const emailsToValidate = Array.isArray(to) ? to : [to]
        for (const email of emailsToValidate) {
            if (!EMAIL_REGEX.test(email)) {
                return new Response(
                    JSON.stringify({ error: `Invalid email format: ${email}` }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                )
            }
        }

        // 7. Get the Resend API Key from Environment Variables
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured in Supabase Secrets')
        }

        // 7. Send email via Resend API
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

        // 8. Log the successful send
        await supabaseClient.from('email_logs').insert({
            user_id: user.id,
            sent_to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject
        })

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
