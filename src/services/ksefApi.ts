// src/services/ksefApi.ts
import axios, { AxiosError } from 'axios';

// ===== Konfiguracja =====
// URL backendu - ustaw w zmiennej środowiskowej VITE_API_URL na Netlify
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/ksef`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 sekund (KSeF może być wolny)
});

// ===== Typy =====

export interface LoginRequest {
    nip: string;
    ksefToken: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: {
        nip: string;
        referenceNumber: string;
        accessTokenValidUntil: string;
        refreshTokenValidUntil: string;
    };
}

export interface SessionStatus {
    server: string;
    timestamp: string;
    environment: string;
    version?: string;
    session: {
        isAuthenticated: boolean;
        nip: string | null;
        accessTokenValidUntil: string | null;
        refreshTokenValidUntil: string | null;
        hasActiveOnlineSession: boolean;
        sessionReferenceNumber: string | null;
        sessionValidUntil: string | null;
    };
}

export interface InvoiceQueryRequest {
    subjectType: 'Subject1' | 'Subject2'; // Subject1 = wystawione, Subject2 = odebrane
    dateRange: {
        dateType: 'PermanentStorage' | 'InvoicingDate' | 'AcquisitionDate';
        from: string; // ISO date
        to: string;
    };
}

export interface InvoiceMetadata {
    ksefNumber: string;
    invoiceNumber: string | null;
    issueDate: string | null;
    invoicingDate: string | null;
    acquisitionDate: string | null;
    permanentStorageDate: string | null;
    seller: {
        nip: string | null;
        name: string | null;
    } | null;
    buyer: {
        identifier: {
            type: string;
            value: string;
        } | null;
        name: string | null;
    } | null;
    netAmount: number | null;
    grossAmount: number | null;
    vatAmount: number | null;
    currency: string | null;
    invoicingMode: string | null;
    invoiceType: string | null;
    formCode: {
        systemCode: string;
        schemaVersion: string;
        value: string;
    } | null;
    isSelfInvoicing: boolean;
    hasAttachment: boolean;
    invoiceHash: string | null;
}

export interface InvoiceQueryResponse {
    success: boolean;
    error?: string;
    data?: {
        hasMore: boolean;
        isTruncated: boolean;
        permanentStorageHwmDate: string | null;
        invoices: InvoiceMetadata[];
    };
}

export interface OpenSessionResponse {
    success: boolean;
    error?: string;
    message?: string;
    data?: {
        sessionReferenceNumber: string;
        validUntil: string;
    };
}

export interface CreateInvoiceRequest {
    invoiceNumber: string;
    issueDate: string; // YYYY-MM-DD
    saleDate: string;  // YYYY-MM-DD
    seller: {
        nip: string;
        name: string;
        countryCode?: string;
        addressLine1: string;
        addressLine2?: string;
    };
    buyer: {
        nip: string;
        name: string;
        countryCode?: string;
        addressLine1: string;
        addressLine2?: string;
    };
    items: {
        name: string;
        unit: string;
        quantity: number;
        unitPriceNet: number;
        vatRate: string; // "23", "8", "5", "0", "zw", "np"
    }[];
    currency?: string;
    issuePlace?: string;
}

export interface SendInvoiceResponse {
    success: boolean;
    error?: string;
    message?: string;
    data?: {
        elementReferenceNumber: string;
        processingCode: number;
        processingDescription: string;
    };
}

// ===== API Functions =====

/**
 * Sprawdza status serwera i sesji
 */
export async function getStatus(): Promise<SessionStatus> {
    const response = await apiClient.get<SessionStatus>('/status');
    return response.data;
}

/**
 * Logowanie do KSeF
 */
export async function login(request: LoginRequest): Promise<LoginResponse> {
    try {
        const response = await apiClient.post<LoginResponse>('/login', request);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError && error.response) {
            return error.response.data as LoginResponse;
        }
        throw error;
    }
}

/**
 * Wylogowanie z KSeF
 */
export async function logout(): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post('/logout');
    return response.data;
}

/**
 * Pobiera faktury z KSeF
 */
export async function getInvoices(request: InvoiceQueryRequest): Promise<InvoiceQueryResponse> {
    try {
        const response = await apiClient.post<InvoiceQueryResponse>('/invoices', request);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError && error.response) {
            return error.response.data as InvoiceQueryResponse;
        }
        throw error;
    }
}

/**
 * Otwiera sesję do wysyłki faktur
 */
export async function openSession(): Promise<OpenSessionResponse> {
    try {
        const response = await apiClient.post<OpenSessionResponse>('/session/open');
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError && error.response) {
            return error.response.data as OpenSessionResponse;
        }
        throw error;
    }
}

/**
 * Zamyka sesję wysyłkową
 */
export async function closeSession(): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post('/session/close');
    return response.data;
}

/**
 * Wysyła fakturę do KSeF
 */
export async function sendInvoice(invoice: CreateInvoiceRequest): Promise<SendInvoiceResponse> {
    try {
        const response = await apiClient.post<SendInvoiceResponse>('/invoice/send', invoice);
        return response.data;
    } catch (error) {
        if (error instanceof AxiosError && error.response) {
            return error.response.data as SendInvoiceResponse;
        }
        throw error;
    }
}

// ===== Legacy compatibility (dla istniejących komponentów) =====

export type UpoStatus = 'accepted' | 'pending' | 'rejected';

export interface Invoice {
    numerKsef: string;
    numerFaktury: string;
    nazwaKontrahenta?: string;
    nipKontrahenta: string;
    kwotaBrutto: number;
    dataWystawienia: string;
    status: UpoStatus;
}

/**
 * Mapuje nowy format na stary (dla kompatybilności)
 */
function mapToLegacyInvoice(invoice: InvoiceMetadata, type: 'issued' | 'received'): Invoice {
    return {
        numerKsef: invoice.ksefNumber,
        numerFaktury: invoice.invoiceNumber || '',
        nazwaKontrahenta: type === 'issued'
            ? invoice.buyer?.name || ''
            : invoice.seller?.name || '',
        nipKontrahenta: type === 'issued'
            ? invoice.buyer?.identifier?.value || ''
            : invoice.seller?.nip || '',
        kwotaBrutto: invoice.grossAmount || 0,
        dataWystawienia: invoice.issueDate || invoice.invoicingDate?.split('T')[0] || '',
        status: 'accepted' as UpoStatus, // KSeF nie zwraca statusu w query
    };
}

/**
 * Pobiera faktury wystawione (Subject1) - legacy API
 */
export async function listIssued(): Promise<Invoice[]> {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);

    const response = await getInvoices({
        subjectType: 'Subject1',
        dateRange: {
            dateType: 'PermanentStorage',
            from: from.toISOString(),
            to: now.toISOString(),
        },
    });

    if (!response.success || !response.data) {
        console.warn('Failed to fetch issued invoices:', response.error);
        return [];
    }

    return response.data.invoices.map(inv => mapToLegacyInvoice(inv, 'issued'));
}

/**
 * Pobiera faktury odebrane (Subject2) - legacy API
 */
export async function listReceived(): Promise<Invoice[]> {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);

    const response = await getInvoices({
        subjectType: 'Subject2',
        dateRange: {
            dateType: 'PermanentStorage',
            from: from.toISOString(),
            to: now.toISOString(),
        },
    });

    if (!response.success || !response.data) {
        console.warn('Failed to fetch received invoices:', response.error);
        return [];
    }

    return response.data.invoices.map(inv => mapToLegacyInvoice(inv, 'received'));
}

// Legacy exports for compatibility
export const getReceivedInvoices = listReceived;

export interface ListInvoicesParams {
    page?: number;
    pageSize?: number;
    nip?: string;
    status?: UpoStatus | '';
    date?: { from?: string; to?: string };
}

// Placeholder functions (nie używane z prawdziwym KSeF)
export async function listContractors(): Promise<never[]> {
    return [];
}

export async function upsertContractor(): Promise<never> {
    throw new Error('Not implemented');
}