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

    console.log('[ES] Sending email via direct fetch to Edge Function...');

    // Get the session to get the JWT
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
        throw new Error('Not authenticated. Please log in again.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgqawzeejmgbwfrirtvw.supabase.co';
    const functionUrl = `${supabaseUrl}/functions/v1/send-invoice`;

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z6n7RNbiclvtK4fpx8T7aw_gkgoJ0Ej'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || (result && result.error)) {
            const errorMsg = result?.error || result?.message || `HTTP ${response.status}: Failed to send email`;
            console.error('[ES] Fetch error:', { status: response.status, result });
            throw new Error(errorMsg);
        }

        console.log('[ES] Email sent successfully:', result);
    } catch (err: any) {
        console.error('[ES] Network or Logic error:', err);
        throw err;
    }
}
