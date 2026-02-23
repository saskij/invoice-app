import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, CompanyInfo } from '../types';
import { sanitizeInput } from './sanitization';

const BRAND_COLOR: [number, number, number] = [79, 70, 229];   // indigo-600
const DARK_COLOR: [number, number, number] = [15, 23, 42];    // slate-900
const GRAY_COLOR: [number, number, number] = [100, 116, 139]; // slate-500
const LIGHT_COLOR: [number, number, number] = [248, 250, 252]; // slate-50

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));
}

export async function generateInvoicePDF(invoice: Invoice, company: CompanyInfo): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    // ── Header Band ──────────────────────────────────────────────────────
    doc.setFillColor(...DARK_COLOR);
    doc.rect(0, 0, pageWidth, 120, 'F');

    // Accent stripe
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 118, pageWidth, 4, 'F');

    let textStartX = margin;
    const logoUrl = company.logoUrl;

    if (logoUrl) {
        try {
            let imgData = logoUrl;
            let fileType = 'PNG';

            // If it's a remote URL, we need to fetch it (best effort)
            if (logoUrl.startsWith('http')) {
                const response = await fetch(logoUrl);
                const blob = await response.blob();
                imgData = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                fileType = logoUrl.split('.').pop()?.toUpperCase() || 'PNG';
            } else if (logoUrl.startsWith('data:image')) {
                fileType = logoUrl.split(';')[0].split('/')[1].toUpperCase();
            }

            if (imgData.startsWith('data:image')) {
                const imgProps = doc.getImageProperties(imgData);
                const maxLogoHeight = 56;
                let logoWidth = (imgProps.width * maxLogoHeight) / imgProps.height;
                let logoHeight = maxLogoHeight;

                if (logoWidth > 140) {
                    logoWidth = 140;
                    logoHeight = (imgProps.height * logoWidth) / imgProps.width;
                }

                doc.addImage(imgData, fileType === 'JPG' ? 'JPEG' : fileType, margin, 34 + (maxLogoHeight - logoHeight) / 2, logoWidth, logoHeight);
                textStartX = margin + logoWidth + 20;
            }
        } catch (e) {
            console.error('Logo render error:', e);
        }
    }

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(sanitizeInput(company.name) || 'Your Company', textStartX, 52);

    // Company contact
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const companyLines: string[] = [];
    if (company.address) companyLines.push(sanitizeInput(company.address));
    if (company.city || company.state || company.zip)
        companyLines.push([sanitizeInput(company.city), sanitizeInput(company.state), sanitizeInput(company.zip)].filter(Boolean).join(', '));
    if (company.phone) companyLines.push(sanitizeInput(company.phone));
    if (company.email) companyLines.push(sanitizeInput(company.email));
    if (company.website) companyLines.push(sanitizeInput(company.website));
    doc.text(companyLines.join('  |  '), textStartX, 72);
    if (company.taxId) {
        doc.text(`Tax ID: ${sanitizeInput(company.taxId)}`, textStartX, 86);
    }

    // INVOICE label (top right)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(79, 70, 229);
    doc.text('INVOICE', pageWidth - margin, 52, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`#${sanitizeInput(invoice.invoiceNumber)}`, pageWidth - margin, 68, { align: 'right' });

    y = 140;

    // ── Invoice Meta + Bill To ────────────────────────────────────────────
    const halfW = contentWidth / 2 - 12;

    // Bill To box
    doc.setFillColor(...LIGHT_COLOR);
    doc.roundedRect(margin, y, halfW, 110, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_COLOR);
    doc.text('BILL TO', margin + 14, y + 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...DARK_COLOR);
    doc.text(sanitizeInput(invoice.client.name) || 'Client Name', margin + 14, y + 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY_COLOR);
    const clientLines: string[] = [];
    if (invoice.client.company) clientLines.push(sanitizeInput(invoice.client.company));
    if (invoice.client.address) clientLines.push(sanitizeInput(invoice.client.address));
    if (invoice.client.city || invoice.client.state || invoice.client.zip)
        clientLines.push([sanitizeInput(invoice.client.city), sanitizeInput(invoice.client.state), sanitizeInput(invoice.client.zip)].filter(Boolean).join(', '));
    if (invoice.client.email) clientLines.push(sanitizeInput(invoice.client.email));
    doc.text(clientLines, margin + 14, y + 50);

    // Invoice Details box
    const rightX = margin + halfW + 24;
    doc.setFillColor(...LIGHT_COLOR);
    doc.roundedRect(rightX, y, halfW, 110, 6, 6, 'F');

    const details: [string, string][] = [
        ['Invoice Number', `#${sanitizeInput(invoice.invoiceNumber)}`],
        ['Issue Date', formatDate(invoice.issueDate)],
        ['Due Date', formatDate(invoice.dueDate)],
        ['Status', sanitizeInput(invoice.status).toUpperCase()],
    ];
    let dy = y + 18;
    for (const [label, value] of details) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_COLOR);
        doc.text(label, rightX + 14, dy);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...DARK_COLOR);
        doc.text(value, rightX + halfW - 14, dy, { align: 'right' });
        dy += 22;
    }

    y += 128;

    // ── Line Items Table ─────────────────────────────────────────────────
    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
        body: invoice.lineItems.map((item, i) => [
            i + 1,
            sanitizeInput(item.description),
            item.quantity,
            formatCurrency(item.unitPrice),
            formatCurrency(item.total),
        ]),
        headStyles: {
            fillColor: DARK_COLOR,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: { top: 10, bottom: 10, left: 8, right: 8 },
        },
        bodyStyles: {
            textColor: DARK_COLOR,
            fontSize: 10,
            cellPadding: { top: 10, bottom: 10, left: 8, right: 8 },
        },
        alternateRowStyles: {
            fillColor: LIGHT_COLOR,
        },
        columnStyles: {
            0: { cellWidth: 30, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 80, halign: 'right' },
            4: { cellWidth: 90, halign: 'right', fontStyle: 'bold' },
        },
        theme: 'plain',
        didDrawPage: () => { },
    });

    const afterTableY = (doc as any).lastAutoTable.finalY as number;
    y = afterTableY + 20;

    // ── Totals Box ───────────────────────────────────────────────────────
    const totalsWidth = 240;
    const totalsX = pageWidth - margin - totalsWidth;
    const rowH = 28;

    const rows: { label: string; value: string; bold?: boolean; highlight?: boolean; show: boolean }[] = [
        { label: 'Subtotal', value: formatCurrency(invoice.subtotal), show: true },
        { label: `Discount ${invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}`, value: `-${formatCurrency(invoice.discountAmount || 0)}`, show: !!(invoice.discountAmount && invoice.discountAmount > 0) },
        { label: `Tax (${invoice.taxRate}%)`, value: formatCurrency(invoice.taxAmount), show: true },
        { label: 'TOTAL DUE', value: formatCurrency(invoice.total), bold: true, highlight: true, show: true },
    ];

    const activeRows = rows.filter(r => r.show);

    activeRows.forEach((row, i) => {
        const rowY = y + i * rowH;
        if (row.highlight) {
            doc.setFillColor(...BRAND_COLOR);
            doc.roundedRect(totalsX, rowY, totalsWidth, rowH, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
        } else {
            doc.setFillColor(i % 2 === 0 ? 248 : 241, i % 2 === 0 ? 250 : 245, i % 2 === 0 ? 252 : 251);
            doc.rect(totalsX, rowY, totalsWidth, rowH, 'F');
            doc.setTextColor(row.label.startsWith('Discount') ? 220 : DARK_COLOR[0], row.label.startsWith('Discount') ? 38 : DARK_COLOR[1], row.label.startsWith('Discount') ? 38 : DARK_COLOR[2]);
        }
        doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
        doc.setFontSize(row.bold ? 12 : 10);
        doc.text(row.label, totalsX + 14, rowY + rowH / 2 + 4);
        doc.setFont('helvetica', 'bold');
        doc.text(row.value, totalsX + totalsWidth - 14, rowY + rowH / 2 + 4, { align: 'right' });
    });

    y += activeRows.length * rowH + 32;

    // ── Notes / Terms / Payment Info ──────────────────────────────────────
    if (invoice.notes || invoice.paymentTerms || invoice.paymentInfo) {
        // Calculate dynamic columns based on content
        const columnData = [];
        if (invoice.notes) columnData.push({ title: 'NOTES', content: invoice.notes });
        if (invoice.paymentTerms) columnData.push({ title: 'PAYMENT TERMS', content: invoice.paymentTerms });
        if (invoice.paymentInfo) columnData.push({ title: 'HOW TO PAY', content: invoice.paymentInfo });

        const colWidth = contentWidth / columnData.length - 10;
        let startX = margin;

        let maxYOffset = 0;

        columnData.forEach((col) => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...BRAND_COLOR);
            doc.text(col.title, startX, y);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(...GRAY_COLOR);

            const sanitizedContent = sanitizeInput(col.content);
            const lines = doc.splitTextToSize(sanitizedContent, colWidth);
            doc.text(lines, startX, y + 14);

            const blockHeight = 14 + lines.length * 14;
            if (blockHeight > maxYOffset) maxYOffset = blockHeight;

            startX += colWidth + 10;
        });

        y += maxYOffset + 12;
    }

    // ── Footer ───────────────────────────────────────────────────────────
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFillColor(...DARK_COLOR);
    doc.rect(0, pageHeight - 40, pageWidth, 40, 'F');
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, pageHeight - 40, pageWidth, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 16, { align: 'center' });

    return doc;
}

export async function downloadInvoicePDF(invoice: Invoice, company: CompanyInfo): Promise<void> {
    const doc = await generateInvoicePDF(invoice, company);
    doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
}

export async function getInvoicePDFBlob(invoice: Invoice, company: CompanyInfo): Promise<Blob> {
    const doc = await generateInvoicePDF(invoice, company);
    return doc.output('blob');
}

export async function getInvoicePDFBase64(invoice: Invoice, company: CompanyInfo): Promise<string> {
    const doc = await generateInvoicePDF(invoice, company);
    return doc.output('datauristring').split(',')[1];
}
