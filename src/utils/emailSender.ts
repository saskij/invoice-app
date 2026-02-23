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

    try {
        const { data, error } = await supabase.functions.invoke('send-invoice', {
            body: payload
        });

        if (error) {
            console.error('[ES] Supabase invoke error:', error);
            throw new Error(error.message || 'Supabase Function invocation failed');
        }

        // The Edge Function now returns errors in the data body with 200 OK to avoid masking
        if (data?.error) {
            console.error('[ES] Edge Function logic error:', data.error);
            throw new Error(data.error);
        }

        console.log('[ES] Email sent successfully:', data);
    } catch (err: any) {
        console.error('[ES] Network or Logic error:', err);
        throw err;
    }
}
