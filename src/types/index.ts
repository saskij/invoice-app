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
    subscriptionStatus: 'free' | 'pro';
    invoiceLimit: number;
    resend: {
        apiKey: string;
    };
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

export interface PaymentHistory {
    id: string;
    invoice_id: string;
    amount: number;
    payment_method?: string;
    notes?: string;
    createdAt: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'deleted' | string;

export interface Invoice {
    id: string;
    user_id?: string;
    invoiceNumber: string;
    client: InvoiceClient;
    lineItems: LineItem[];
    issueDate: string;
    dueDate: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount?: number;
    taxRate: number;
    subtotal: number;
    taxAmount: number;
    total: number;
    paidAmount?: number;
    paymentDate?: string;
    balanceDue?: number;
    displayStatus?: InvoiceStatus;
    notes: string;
    paymentTerms: string;
    paymentInfo: string;
    status: InvoiceStatus;
    createdAt: string;
    updatedAt: string;
}
