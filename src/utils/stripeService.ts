// src/utils/stripeService.ts
// Isolated service layer for all Stripe-related API calls.
// Swap this file's implementation to migrate to Stripe Connect later —
// no changes needed in the rest of the app.

import { supabase } from '../lib/supabaseClient';

/**
 * Calls the `create-checkout-session` Edge Function and returns the
 * Stripe Checkout URL for the given invoice.
 *
 * @param invoiceId - UUID of the invoice to generate a payment link for
 * @param stripeAccountId - Optional Stripe Connect account ID (future SaaS)
 * @returns The Stripe Checkout session URL
 * @throws Error if the function call fails or returns an error
 */
export async function generatePaymentLink(
    invoiceId: string,
    stripeAccountId?: string
): Promise<string> {
    if (!invoiceId) throw new Error('invoiceId is required');

    const body: Record<string, string> = { invoice_id: invoiceId };
    if (stripeAccountId) body.stripe_account_id = stripeAccountId;

    const { data, error } = await supabase.functions.invoke(
        'create-checkout-session',
        { body }
    );

    if (error) {
        console.error('[StripeService] Edge Function invocation error:', error);
        throw new Error(error.message || 'Failed to create payment link');
    }

    if (!data?.checkout_url) {
        const msg = data?.error || 'No checkout_url returned from server';
        console.error('[StripeService] Business error:', msg);
        throw new Error(msg);
    }

    return data.checkout_url as string;
}
