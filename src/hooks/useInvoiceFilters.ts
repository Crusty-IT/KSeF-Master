// src/hooks/useInvoiceFilters.ts
import { useState, useMemo, useCallback } from 'react';
import type { Invoice } from '../services/ksefApi';
import type { InvoiceFilters, SelectionState } from '../types/filters';
import { defaultFilters } from '../types/filters';

interface UseInvoiceFiltersResult {
    filters: InvoiceFilters;
    setFilters: (filters: InvoiceFilters) => void;
    resetFilters: () => void;
    filteredInvoices: Invoice[];
    selection: SelectionState;
    toggleSelection: (id: string) => void;
    toggleSelectAll: () => void;
    clearSelection: () => void;
    selectedCount: number;
}

export function useInvoiceFilters(invoices: Invoice[]): UseInvoiceFiltersResult {
    const [filters, setFilters] = useState<InvoiceFilters>(defaultFilters);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const resetFilters = useCallback(() => {
        setFilters(defaultFilters);
    }, []);

    const filteredInvoices = useMemo(() => {
        return invoices.filter((invoice) => {
            if (filters.dateFrom && invoice.dataWystawienia < filters.dateFrom) {
                return false;
            }
            if (filters.dateTo && invoice.dataWystawienia > filters.dateTo) {
                return false;
            }

            if (filters.amountFrom) {
                const minAmount = parseFloat(filters.amountFrom);
                if (!isNaN(minAmount) && invoice.kwotaBrutto < minAmount) {
                    return false;
                }
            }
            if (filters.amountTo) {
                const maxAmount = parseFloat(filters.amountTo);
                if (!isNaN(maxAmount) && invoice.kwotaBrutto > maxAmount) {
                    return false;
                }
            }

            if (filters.contractorNip && !invoice.nipKontrahenta.includes(filters.contractorNip)) {
                return false;
            }

            if (filters.contractorName) {
                const searchName = filters.contractorName.toLowerCase();
                const contractorName = (invoice.nazwaKontrahenta || '').toLowerCase();
                if (!contractorName.includes(searchName)) {
                    return false;
                }
            }

            if (filters.invoiceNumber) {
                const searchNumber = filters.invoiceNumber.toLowerCase();
                const invoiceNumber = (invoice.numerFaktury || '').toLowerCase();
                if (!invoiceNumber.includes(searchNumber)) {
                    return false;
                }
            }

            return true;
        });
    }, [invoices, filters]);

    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        setSelectedIds((prev) => {
            const allFilteredIds = filteredInvoices.map((inv) => inv.numerKsef);
            const allSelected = allFilteredIds.every((id) => prev.has(id));

            if (allSelected) {
                return new Set();
            } else {
                return new Set(allFilteredIds);
            }
        });
    }, [filteredInvoices]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isAllSelected = useMemo(() => {
        if (filteredInvoices.length === 0) return false;
        return filteredInvoices.every((inv) => selectedIds.has(inv.numerKsef));
    }, [filteredInvoices, selectedIds]);

    const selection: SelectionState = {
        selectedIds,
        isAllSelected,
    };

    return {
        filters,
        setFilters,
        resetFilters,
        filteredInvoices,
        selection,
        toggleSelection,
        toggleSelectAll,
        clearSelection,
        selectedCount: selectedIds.size,
    };
}