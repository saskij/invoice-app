// stripe-webhook/index.ts
// Supabase Edge Function — Handles Stripe webhook events.
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// IMPORTANT: JWT verification must be DISABLED for this function because
// Stripe sends requests without a Supabase JWT. Verification is done via
// the Stripe-Signature header instead.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Stripe Signature Verification ───────────────────────────────────────────
// Implements the same HMAC-SHA256 algorithm as the official Stripe SDK,
// using the Web Crypto API available in Deno — no npm dependency needed.

async function verifyStripeSignature(
    payload: string,
    header: string,
    secret: string
): Promise<boolean> {
    try {
        // Parse the Stripe-Signature header: t=timestamp,v1=signature,...
        const parts = Object.fromEntries(
            header.split(",").map((part) => {
                const [key, ...rest] = part.split("=");
                return [key.trim(), rest.join("=").trim()];
            })
        );

        const timestamp = parts["t"];
        const v1 = parts["v1"];

        if (!timestamp || !v1) return false;

        // Reject if timestamp is more than 5 minutes old
        const tsDiff = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (tsDiff > 300) {
            console.warn("[SW] Stripe timestamp too old:", tsDiff);
            return false;
        }

        // Signed payload = timestamp + "." + raw body
        const signedPayload = `${timestamp}.${payload}`;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const sig = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(signedPayload)
        );

        // Convert to hex
        const computed = Array.from(new Uint8Array(sig))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        // Constant-time comparison
        return timingSafeEqual(computed, v1);
    } catch (e) {
        console.error("[SW] Signature verification error:", e);
        return false;
    }
}

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
    try {
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
        if (!webhookSecret) {
            console.error("[SW] STRIPE_WEBHOOK_SECRET not set");
            return new Response("Webhook secret not configured", { status: 500 });
        }

        // ── 1. Read raw body (required for signature verification) ───────────────
        const rawBody = await req.text();
        const signatureHeader = req.headers.get("stripe-signature");

        if (!signatureHeader) {
            console.warn("[SW] Missing stripe-signature header");
            return new Response("Missing signature", { status: 400 });
        }

        // ── 2. Verify Stripe signature ───────────────────────────────────────────
        const isValid = await verifyStripeSignature(
            rawBody,
            signatureHeader,
            webhookSecret
        );

        if (!isValid) {
            console.error("[SW] Invalid Stripe signature");
            return new Response("Invalid signature", { status: 400 });
        }

        // ── 3. Parse event ───────────────────────────────────────────────────────
        let event: any;
        try {
            event = JSON.parse(rawBody);
        } catch {
            return new Response("Invalid JSON", { status: 400 });
        }

        console.log(`[SW] Event received: ${event.type} (${event.id})`);

        // ── 4. Handle supported events ───────────────────────────────────────────
        if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(event.data?.object);
        } else {
            console.log(`[SW] Ignoring event type: ${event.type}`);
        }

        // Always return 200 to acknowledge receipt
        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[SW] Unhandled error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

// ─── Event Handler ────────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session: any): Promise<void> {
    if (!session) {
        console.error("[SW] No session object in event");
        return;
    }

    const sessionId = session.id;
    const paymentIntentId = session.payment_intent;
    const amountTotal = session.amount_total; // in cents

    console.log(`[SW] checkout.session.completed: session=${sessionId}, pi=${paymentIntentId}, amount=${amountTotal}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ── Find the invoice by stripe_session_id ───────────────────────────────
    const { data: invoice, error: findError } = await adminClient
        .from("invoices")
        .select("id, status, total")
        .eq("stripe_session_id", sessionId)
        .single();

    if (findError || !invoice) {
        console.error("[SW] Invoice not found for session:", sessionId, findError);
        // Don't throw — return gracefully so Stripe gets a 200 and doesn't retry
        return;
    }

    if (invoice.status === "paid") {
        console.log(`[SW] Invoice ${invoice.id} already marked paid — skipping`);
        return;
    }

    // ── Update invoice as paid ───────────────────────────────────────────────
    const { error: updateError } = await adminClient
        .from("invoices")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId ?? null,
            amount_paid_cents: amountTotal ?? 0,
            // Also update the decimal paid_amount field used by the app's balance calculations
            paid_amount: invoice.total,
            updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

    if (updateError) {
        console.error("[SW] Failed to update invoice:", updateError);
        throw new Error(`DB update failed: ${updateError.message}`);
    }

    console.log(`[SW] Invoice ${invoice.id} marked as paid ✓`);
}
