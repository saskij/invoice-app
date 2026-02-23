export interface CompanyInfo {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    taxId: string;
}


export interface AppSettings {
    company: CompanyInfo;
    defaultTaxRate: number;
    defaultPaymentTerms: string;
    paymentInfo: string;
    invoicePrefix: string;
    nextInvoiceNumber: number;
}

export interface CatalogService {
    id: string;
    name: string;
    description: string;
    defaultPrice: number;
    unit: string; // e.g. "project", "hour", "page"
}

export interface LineItem {
    id: string;
    catalogServiceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface InvoiceClient {
    name: string;
    email: string;
    company: string;
    address: string;
    city: string;
    state: string;
    zip: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'deleted';

export interface Invoice {
    id: string;
    invoiceNumber: string;
    client: InvoiceClient;
    lineItems: LineItem[];
    issueDate: string;
    dueDate: string;
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmount?: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    notes: string;
    paymentTerms: string;
    paymentInfo: string;
    status: InvoiceStatus;
    createdAt: string;
    updatedAt: string;
}
