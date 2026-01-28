// src/types/filters.ts
export interface InvoiceFilters {
    dateFrom: string;
    dateTo: string;
    amountFrom: string;
    amountTo: string;
    contractorNip: string;
    contractorName: string;
    invoiceNumber: string;
    currency: string;
    showOnlySuspicious: boolean;
}

export const defaultFilters: InvoiceFilters = {
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
    contractorNip: '',
    contractorName: '',
    invoiceNumber: '',
    currency: '',
    showOnlySuspicious: false,
};

export interface SelectionState {
    selectedIds: Set<string>;
    isAllSelected: boolean;
}