// src/components/filters/InvoiceFilters.tsx
import { useState } from 'react';
import type { InvoiceFilters as IInvoiceFilters } from '../../types/filters';
import './InvoiceFilters.css';

interface InvoiceFiltersProps {
    filters: IInvoiceFilters;
    onChange: (filters: IInvoiceFilters) => void;
    onReset: () => void;
    showSuspiciousFilter?: boolean;
}

export default function InvoiceFilters({
                                           filters,
                                           onChange,
                                           onReset,
                                           showSuspiciousFilter = false
                                       }: InvoiceFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field: keyof IInvoiceFilters, value: string | boolean) => {
        onChange({ ...filters, [field]: value });
    };

    const hasActiveFilters =
        filters.dateFrom ||
        filters.dateTo ||
        filters.amountFrom ||
        filters.amountTo ||
        filters.contractorNip ||
        filters.contractorName ||
        filters.invoiceNumber ||
        filters.currency ||
        filters.showOnlySuspicious;

    return (
        <div className="invoice-filters">
            <div className="filters-header">
                <button
                    className="filters-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                    type="button"
                >
                    <span className="filters-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
                    <span>Zaawansowane filtry</span>
                    {hasActiveFilters && <span className="filters-badge">Aktywne</span>}
                </button>
                {hasActiveFilters && (
                    <button className="filters-reset" onClick={onReset} type="button">
                        Wyczyść filtry
                    </button>
                )}
            </div>

            <div className={`filters-content ${isExpanded ? 'expanded' : ''}`}>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label className="filter-label">Data od</label>
                        <input
                            type="date"
                            className="filter-input"
                            value={filters.dateFrom}
                            onChange={(e) => handleChange('dateFrom', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Data do</label>
                        <input
                            type="date"
                            className="filter-input"
                            value={filters.dateTo}
                            onChange={(e) => handleChange('dateTo', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Kwota od (PLN)</label>
                        <input
                            type="number"
                            className="filter-input"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={filters.amountFrom}
                            onChange={(e) => handleChange('amountFrom', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Kwota do (PLN)</label>
                        <input
                            type="number"
                            className="filter-input"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            value={filters.amountTo}
                            onChange={(e) => handleChange('amountTo', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">NIP kontrahenta</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="np. 5252161248"
                            maxLength={10}
                            value={filters.contractorNip}
                            onChange={(e) => handleChange('contractorNip', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Nazwa kontrahenta</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Szukaj po nazwie..."
                            value={filters.contractorName}
                            onChange={(e) => handleChange('contractorName', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Numer faktury</label>
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="np. FV/2025/01/001"
                            value={filters.invoiceNumber}
                            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Waluta</label>
                        <select
                            className="filter-input"
                            value={filters.currency}
                            onChange={(e) => handleChange('currency', e.target.value)}
                        >
                            <option value="">Wszystkie</option>
                            <option value="PLN">PLN</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                            <option value="GBP">GBP</option>
                        </select>
                    </div>

                    {showSuspiciousFilter && (
                        <div className="filter-group filter-group-checkbox">
                            <label className="filter-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={filters.showOnlySuspicious}
                                    onChange={(e) => handleChange('showOnlySuspicious', e.target.checked)}
                                />
                                <span>Tylko podejrzane</span>
                                <span className="filter-suspicious-icon">⚠️</span>
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}