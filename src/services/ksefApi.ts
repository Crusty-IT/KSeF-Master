// src/services/ksefApi.ts

import axios from 'axios';

// UWAGA: Adres URL dla Render, który musisz ustawić na Netlify, to:
// https://ksef-master-backend.onrender.com/api
// Lokalnie używany będzie 'http://localhost:3001/api'.

// ===== Types (Typy Danych) =====
export type UpoStatus = 'accepted' | 'pending' | 'rejected'

export interface Pagination {
    page?: number;
    pageSize?: number;
}

export interface DateRange {
    from?: string; // ISO date
    to?: string;   // ISO date
}

export interface Invoice {
    numerKsef: string;
    numerFaktury: string;
    nazwaKontrahenta?: string;
    nipKontrahenta: string;
    kwotaBrutto: number;
    dataWystawienia: string;
    status: UpoStatus;
}

export interface Contractor {
    id?: string;
    nip: string;
    name: string;
    address?: string;
}

// ===== API Client (Klient API) =====
// Używa zmiennej środowiskowej VITE_API_URL zdefiniowanej w Netlify/Vite,
// lub domyślnego adresu lokalnego.
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const apiClient = axios.create({ baseURL: API_URL });

// ===== Invoices (Faktury) =====
export interface ListInvoicesParams extends Pagination {
    q?: string;
    nip?: string;
    date?: DateRange;
    status?: UpoStatus | '';
    sort?: string;
}

function toQuery(params?: ListInvoicesParams) {
    if (!params) return undefined;
    const query: Record<string, any> = {};
    if (params.nip) query.nip = params.nip;
    if (params.status) query.status = params.status;
    if (params.date?.from) query.from = params.date.from;
    if (params.date?.to) query.to = params.date.to;
    if (typeof params.page === 'number') query.page = params.page;
    if (typeof params.pageSize === 'number') query.pageSize = params.pageSize;
    if (params.q) query.q = params.q;
    if (params.sort) query.sort = params.sort;
    return { params: query };
}

export const listReceived = async (params?: ListInvoicesParams): Promise<Invoice[]> => {
    // Pełny URL: ${API_URL}/faktury-odebrane
    const response = await apiClient.get<Invoice[]>('/faktury-odebrane', toQuery(params));
    return response.data;
};

export const listIssued = async (params?: ListInvoicesParams): Promise<Invoice[]> => {
    // Pełny URL: ${API_URL}/faktury-wystawione
    const response = await apiClient.get<Invoice[]>('/faktury-wystawione', toQuery(params));
    return response.data;
};

export interface SendInvoiceResult { ref: string }
export const sendInvoice = async (_xml: string): Promise<SendInvoiceResult> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.post<SendInvoiceResult>('/send-invoice', { xml: _xml });
    // return response.data;

    // Mock: return fake reference
    return { ref: 'REF-' + Math.random().toString(36).slice(2, 10).toUpperCase() };
}

export interface SubmissionStatus { status: UpoStatus }
export const checkSubmissionStatus = async (_ref: string): Promise<SubmissionStatus> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.get<SubmissionStatus>(`/submission-status/${_ref}`);
    // return response.data;

    // Mock random status for now
    const statuses: UpoStatus[] = ['pending', 'accepted', 'rejected']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    return { status };
}

export const getInvoiceXml = async (_ksefId: string): Promise<string> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.get<string>(`/invoice-xml/${_ksefId}`);
    // return response.data;

    // Mock XML content
    return `<Invoice id="${_ksefId}"><Total>0.00</Total></Invoice>`
}

export interface UpoResponse { status: UpoStatus; upoId?: string }
export const getUpo = async (_ksefId: string): Promise<UpoResponse> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.get<UpoResponse>(`/upo/${_ksefId}`);
    // return response.data;

    // Mock UPO
    return { status: 'accepted', upoId: 'UPO-' + _ksefId }
}

export interface ListContractorsQuery extends Pagination { q?: string }
export const listContractors = async (_query?: ListContractorsQuery): Promise<Contractor[]> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.get<Contractor[]>('/contractors', toQuery(_query));
    // return response.data;

    // Mock: empty list for now
    return []
}

export const upsertContractor = async (payload: Contractor): Promise<Contractor> => {
    // UWAGA: W środowisku produkcyjnym zamień to na:
    // const response = await apiClient.post<Contractor>('/contractors', payload); // lub PUT/PATCH
    // return response.data;

    // Mock: assign id
    return { ...payload, id: payload.id || Math.random().toString(36).slice(2) }
}

// Backward compatibility with early prototype
export const getReceivedInvoices = listReceived;