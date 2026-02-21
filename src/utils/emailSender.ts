import { CapacitorHttp } from '@capacitor/core';
import type { ResendConfig, Invoice, CompanyInfo } from '../types';

interface SendInvoiceEmailParams {
    config: ResendConfig;
    invoice: Invoice;
    company: CompanyInfo;
    pdfBase64: string;
}

export async function sendInvoiceEmail({
    config,
    invoice,
    company,
    pdfBase64,
}: SendInvoiceEmailParams): Promise<void> {
    if (!config.apiKey) {
        throw new Error('Resend is not configured. Please add your API Key in Settings.');
    }

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
        from: `${company.name} <onboarding@resend.dev>`, // Resend testing domain
        to: invoice.client.email,
        subject: `New Invoice #${invoice.invoiceNumber} from ${company.name}`,
        html: htmlBody,
        attachments: [
            {
                filename: `Invoice-${invoice.invoiceNumber}.pdf`,
                content: pdfBase64,
            }
        ]
    };

    const response = await CapacitorHttp.request({
        method: 'POST',
        url: 'https://api.resend.com/emails',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        data: payload
    });

    if (response.status >= 400) {
        throw new Error(response.data?.message || `Failed to send email: ${response.status}`);
    }
}
