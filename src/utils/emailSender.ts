import { supabase } from '../lib/supabaseClient';
import type { Invoice, CompanyInfo } from '../types';

interface SendInvoiceEmailParams {
    invoice: Invoice;
    company: CompanyInfo;
    pdfBase64: string;
}

export async function sendInvoiceEmail({
    invoice,
    company,
    pdfBase64,
}: SendInvoiceEmailParams): Promise<void> {
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #4f46e5;">You have a new invoice from ${company.name}</h2>
          <p>Hi ${invoice.client.name},</p>
          <p>Please find attached invoice <strong>#${invoice.invoiceNumber}</strong> for the amount of <strong>${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.total)}</strong>.</p>
          <p>Payment is due by <strong>${new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(invoice.dueDate))}</strong>.</p>
          <br/>
          <p>Thank you for your business!</p>
          <p style="color: #666; font-size: 13px;">${company.name}<br/>${company.email}</p>
        </div>
    `;

    const payload = {
        to: invoice.client.email,
        subject: `New Invoice #${invoice.invoiceNumber} from ${company.name}`,
        html: htmlBody,
        pdfBase64: pdfBase64,
        filename: `Invoice-${invoice.invoiceNumber}.pdf`
    };

    const { data, error } = await supabase.functions.invoke('send-invoice', {
        body: payload
    });

    if (error) {
        throw new Error(error.message || 'Failed to send email via Supabase Function');
    }

    if (data?.error) {
        throw new Error(data.error);
    }
}
