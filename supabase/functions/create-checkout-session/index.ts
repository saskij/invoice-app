// create-checkout-session/index.ts
// Supabase Edge Function — Creates a Stripe Checkout Session for an invoice.
// Deploy: supabase functions deploy create-checkout-session
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Config ──────────────────────────────────────────────────────────────────
// Update these URLs to match your deployed frontend.
const SUCCESS_URL =
    "https://saskij.github.io/invoice-app/success?session_id={CHECKOUT_SESSION_ID}";
const CANCEL_URL = "https://saskij.github.io/invoice-app/cancel";

// ─── Stripe Service Layer ─────────────────────────────────────────────────────
// Isolated so it can later be swapped for Stripe Connect.
interface CreateCheckoutSessionParams {
    amountCents: number;      // e.g. 25000 for $250.00
    productName: string;      // shown on Stripe Checkout page
    invoiceId: string;        // stored as Stripe metadata
    stripeAccountId?: string; // for future Stripe Connect support
}

async function createStripeCheckoutSession(
    secretKey: string,
    params: CreateCheckoutSessionParams
): Promise<{ id: string; url: string }> {
    const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "mode": "payment",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(params.amountCents),
        "line_items[0][price_data][product_data][name]": params.productName,
        "line_items[0][quantity]": "1",
        "success_url": SUCCESS_URL,
        "cancel_url": CANCEL_URL,
        "metadata[invoice_id]": params.invoiceId,
    });

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
    };

    // Future Stripe Connect: add Stripe-Account header if stripeAccountId is set
    if (params.stripeAccountId) {
        headers["Stripe-Account"] = params.stripeAccountId;
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers,
        body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(
            `Stripe API error ${res.status}: ${data?.error?.message || JSON.stringify(data)}`
        );
    }

    return { id: data.id, url: data.url };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("[CCS] Incoming request");

        // ── 1. Auth: validate JWT using admin client ────────────────────────────
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return jsonResponse({ error: "Missing Authorization header" }, 401);
        }

        // Use service-role admin client to verify the JWT — more reliable in Edge Functions
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Extract the JWT token from the Bearer header
        const token = authHeader.replace("Bearer ", "");
        const {
            data: { user },
            error: userError,
        } = await adminClient.auth.getUser(token);

        if (userError || !user) {
            console.error("[CCS] Auth error:", userError);
            return jsonResponse({ error: "Unauthorized" }, 401);
        }

        // ── 2. Parse & validate input ───────────────────────────────────────────
        let body: { invoice_id?: string };
        try {
            body = await req.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const { invoice_id } = body;
        if (!invoice_id || typeof invoice_id !== "string") {
            return jsonResponse({ error: "invoice_id is required" }, 400);
        }

        // ── 3. Fetch invoice (service role bypasses RLS) ────────────────────────

        const { data: invoice, error: invError } = await adminClient
            .from("invoices")
            .select("id, user_id, invoice_number, total, status, line_items")
            .eq("id", invoice_id)
            .single();

        if (invError || !invoice) {
            console.error("[CCS] Invoice fetch error:", invError);
            return jsonResponse({ error: "Invoice not found" }, 404);
        }

        // ── 4. Ownership check ──────────────────────────────────────────────────
        if (invoice.user_id !== user.id) {
            return jsonResponse({ error: "Forbidden" }, 403);
        }

        // ── 5. Business rule validations ────────────────────────────────────────
        if (!invoice.total || invoice.total <= 0) {
            return jsonResponse({ error: "Invoice total must be greater than 0" }, 422);
        }

        if (invoice.status === "paid") {
            return jsonResponse({ error: "Invoice is already paid" }, 422);
        }

        // ── 6. Derive product name ──────────────────────────────────────────────
        let productName = `Invoice #${invoice.invoice_number}`;
        if (Array.isArray(invoice.line_items) && invoice.line_items.length > 0) {
            const firstDesc = invoice.line_items[0]?.description;
            if (firstDesc) productName = firstDesc;
        }

        // ── 7. Create Stripe Checkout Session ───────────────────────────────────
        const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (!stripeSecretKey) {
            console.error("[CCS] STRIPE_SECRET_KEY not set");
            return jsonResponse({ error: "Stripe is not configured on the server" }, 500);
        }

        const amountCents = Math.round(invoice.total * 100);
        console.log(`[CCS] Creating session for invoice ${invoice_id}, amount=${amountCents}`);

        const session = await createStripeCheckoutSession(stripeSecretKey, {
            amountCents,
            productName,
            invoiceId: invoice_id,
            // stripeAccountId: undefined  // plug in Stripe Connect account ID here later
        });

        console.log(`[CCS] Session created: ${session.id}`);

        // ── 8. Persist session data back to the invoice row ─────────────────────
        const { error: updateError } = await adminClient
            .from("invoices")
            .update({
                stripe_session_id: session.id,
                stripe_checkout_url: session.url,
                status: "sent",
                updated_at: new Date().toISOString(),
            })
            .eq("id", invoice_id);

        if (updateError) {
            console.error("[CCS] DB update error:", updateError);
            // Non-fatal: still return the checkout URL so user can proceed
        }

        return jsonResponse({ checkout_url: session.url });
    } catch (err: any) {
        console.error("[CCS] Unhandled error:", err);
        return jsonResponse({ error: err.message || "Internal server error" }, 500);
    }
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
