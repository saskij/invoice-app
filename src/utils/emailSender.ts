import { supabase } from '../lib/supabaseClient';
import type { Invoice, CompanyInfo } from '../types';

interface SendInvoiceEmailParams {
    invoice: Invoice;
    company: CompanyInfo;
    pdfBase64: string;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email);
}

export async function sendInvoiceEmail({
    invoice,
    company,
    pdfBase64,
}: SendInvoiceEmailParams): Promise<void> {
    const recipientEmail = invoice.clientEmail || invoice.client?.email;
    if (!recipientEmail || !validateEmail(recipientEmail)) {
        throw new Error(`Invalid client email format: ${recipientEmail || 'missing'}`);
    }
    const clientName = invoice.clientName || invoice.client?.name || 'Client';
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">You have a new invoice from ${company.name}</h2>
          <p>Hi ${clientName},</p>
          <p>Please find attached invoice <strong>#${invoice.invoiceNumber}</strong> for the amount of <strong>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total)}</strong>.</p>
          <p>Payment is due by <strong>${invoice.dueDate ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(invoice.dueDate)) : 'N/A'}</strong>.</p>
          <br/>
          <p>Thank you for your business!</p>
          <p style="color: #666; font-size: 13px;">${company.name}<br/>${company.email}</p>
        </div>
    `;

    const payload = {
        to: recipientEmail,
        subject: `New Invoice #${invoice.invoiceNumber} from ${company.name}`,
        html: htmlBody,
        pdfBase64: pdfBase64,
        filename: `Invoice-${invoice.invoiceNumber}.pdf`
    };

    console.log('[ES] Invoking Edge Function via official invoke method...');

    // Debug: Check session before invoking
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.warn('[ES] No active session found. Function might fail if it requires auth.');
    } else {
        console.log('[ES] Active session found for user:', session.user.email);
        console.log('[ES] JWT Expiry:', new Date(session.expires_at! * 1000).toLocaleString());
    }

    const ts = new Date().getTime();
    console.log(`[ES-${ts}] Attempting to invoke "send-invoice-v2"...`);

    console.log(`[ES-${ts}] Primary attempt: invoking "send-invoice-v2" via library...`);

    try {
        const { data, error } = await supabase.functions.invoke('send-invoice-v2', {
            body: payload
        });

        if (error) {
            console.error(`[ES-${ts}] Library Invoke Error:`, error.message);
            console.log(`[ES-${ts}] Falling back to Raw Fetch...`);

            // Raw fetch attempt
            const { data: { session } } = await supabase.auth.getSession();
            const url = `https://pgqawzeejmgbwfrirtvw.supabase.co/functions/v1/send-invoice-v2`;

            const rawRes = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token || (supabase as any).supabaseAnonKey || ''}`,
                },
                body: JSON.stringify(payload)
            });

            console.log(`[ES-${ts}] Raw Fetch Status:`, rawRes.status);
            const rawData = await rawRes.json().catch(() => ({ error: 'Failed to parse JSON' }));
            console.log(`[ES-${ts}] Raw Fetch Data:`, rawData);

            if (!rawRes.ok) {
                throw new Error(rawData.error || `Raw Fetch Failed (Status: ${rawRes.status})`);
            }

            if (rawData.success === false) throw new Error(rawData.error || 'Raw Fetch Business Error');
            console.log(`[ES-${ts}] Raw Fetch Success!`);
            return;
        }

        if (data?.success === false) {
            console.error(`[ES-${ts}] Business Error:`, data.error);
            throw new Error(data.error || 'Failed to send email');
        }

        console.log(`[ES-${ts}] Library Invoke Success!`, data);
    } catch (err: any) {
        console.error(`[ES-${ts}] Final Catch:`, err);
        throw err;
    }
}
