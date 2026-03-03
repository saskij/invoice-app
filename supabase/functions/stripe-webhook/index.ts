// stripe-webhook/index.ts
// Supabase Edge Function — Handles Stripe Webhooks to auto-update invoice status.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2022-11-15",
    httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
    try {
        const signature = req.headers.get("Stripe-Signature");
        if (!signature) {
            return new Response("Missing Stripe-Signature header", { status: 400 });
        }

        const body = await req.text();
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET is not set");
            return new Response("Webhook secret not configured", { status: 500 });
        }

        let event;
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                webhookSecret,
                undefined,
                cryptoProvider
            );
        } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        console.log(`[Stripe Webhook] Received event: ${event.type}`);

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as any;
            const invoiceId = session.metadata?.invoice_id;

            if (invoiceId) {
                console.log(`[Stripe Webhook] Processing payment for invoice: ${invoiceId}`);

                const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
                const adminClient = createClient(supabaseUrl, supabaseServiceKey);

                // Update the invoice status to paid
                const { error: updateError } = await adminClient
                    .from("invoices")
                    .update({
                        status: "paid",
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", invoiceId);

                if (updateError) {
                    console.error("[Stripe Webhook] Error updating invoice:", updateError);
                    return new Response("Error updating invoice", { status: 500 });
                }

                console.log(`[Stripe Webhook] Successfully marked invoice ${invoiceId} as paid`);
            } else {
                console.log("[Stripe Webhook] No invoice_id in session metadata, skipping.");
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (error: any) {
        console.error("[Stripe Webhook] Unhandled error:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
});
