// src/views/received/ReceivedInvoices.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import './ReceivedInvoices.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import InvoiceFilters from '../../components/filters/InvoiceFilters';
import FraudBadge from '../../components/alerts/FraudBadge';
import { listReceived, downloadInvoicePdf, type Invoice, type GeneratePdfRequest } from '../../services/ksefApi';
import { useInvoiceFilters } from '../../hooks/useInvoiceFilters';
import { useFraudDetection } from '../../hooks/useFraudDetection';
import SideNav from '../../components/layout/SideNav';
import TopBar from '../../components/layout/TopBar';

function buildPageNumbers(current: number, total: number): (number | 'dots')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'dots')[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);
    if (left > 2) pages.push('dots');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push('dots');
    pages.push(total);
    return pages;
}

export default function ReceivedInvoices() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

    const query = useQuery<Invoice[], Error>({
        queryKey: ['receivedInvoices'],
        queryFn: () => listReceived(),
        staleTime: 60_000,
    });

    const data: Invoice[] = query.data ?? [];
    const { isLoading, isFetching, error, refetch } = query;

    const {
        filters,
        setFilters,
        resetFilters,
        filteredInvoices,
        selection,
        toggleSelection,
        toggleSelectAll,
        selectedCount,
    } = useInvoiceFilters(data);

    const { results: fraudResults, summary: fraudSummary, refresh: refreshFraud } = useFraudDetection(filteredInvoices);

    const finalFilteredInvoices = useMemo(() => {
        if (!filters.showOnlySuspicious) return filteredInvoices;
        return filteredInvoices.filter(inv => {
            const result = fraudResults.get(inv.numerKsef);
            return result && result.alertLevel !== 'none';
        });
    }, [filteredInvoices, filters.showOnlySuspicious, fraudResults]);

    const total = finalFilteredInvoices.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = Math.min(page, totalPages);
    const paged = finalFilteredInvoices.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);
    const pageNumbers = buildPageNumbers(pageClamped, totalPages);

    const errorMessage = error
        ? 'Nie udało się pobrać faktur. Sprawdź, czy serwer backendu jest uruchomiony.'
        : null;

    async function handleDownloadPdf(invoice: Invoice) {
        if (!invoice.invoiceHash) {
            alert('Brak danych do wygenerowania PDF dla tej faktury.');
            return;
        }

        setDownloadingPdf(invoice.numerKsef);

        try {
            const request: GeneratePdfRequest = {
                source: 'local',
                invoiceNumber: invoice.numerFaktury,
                issueDate: invoice.dataWystawienia,
                invoiceHash: invoice.invoiceHash,
                ksefNumber: invoice.numerKsef,
                seller: {
                    nip: invoice.nipSprzedawcy || invoice.nipKontrahenta,
                    name: invoice.nazwaSprzedawcy || invoice.nazwaKontrahenta || '',
                    address: '',
                },
                buyer: {
                    nip: '',
                    name: '',
                    address: '',
                },
                totals: {
                    net: invoice.kwotaNetto || 0,
                    vat: invoice.kwotaVat || 0,
                    gross: invoice.kwotaBrutto,
                },
            };

            await downloadInvoicePdf(request);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Nie udało się pobrać PDF');
        } finally {
            setDownloadingPdf(null);
        }
    }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <TopBar />
                <div className="dash-content">
                    <header className="dash-header">
                        <h1>Faktury KSeF (Odebrane)</h1>
                        <p className="subtitle">Lista dokumentów odebranych w KSeF</p>
                    </header>

                    {fraudSummary.total > 0 && (
                        <div className="alert-summary">
                            <span className="alert-summary-icon">🚨</span>
                            <span className="alert-summary-text">
                                Wykryto <strong>{fraudSummary.total}</strong> podejrzanych faktur
                                {fraudSummary.high > 0 && <span className="alert-count high"> ({fraudSummary.high} wysokich)</span>}
                                {fraudSummary.medium > 0 && <span className="alert-count medium"> ({fraudSummary.medium} średnich)</span>}
                            </span>
                        </div>
                    )}

                    <section className="ops-section">
                        <div className="ops-header">
                            <h2>Wyszukaj i filtruj</h2>
                            <div className="ops-actions">
                                {selectedCount > 0 && (
                                    <span className="selection-count">
                                        Zaznaczono: {selectedCount}
                                    </span>
                                )}
                                <PrimaryButton onClick={() => refetch()} disabled={isLoading || isFetching} icon="⟳">
                                    {isLoading || isFetching ? 'Pobieranie...' : 'Odśwież'}
                                </PrimaryButton>
                            </div>
                        </div>

                        <InvoiceFilters
                            filters={filters}
                            onChange={setFilters}
                            onReset={resetFilters}
                            showSuspiciousFilter={true}
                        />

                        <div className="table-controls">
                            <label className="page-size-label">
                                Na stronę:
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="page-size-select"
                                >
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </label>
                            <span className="results-count">
                                {isFetching && !isLoading ? '⟳ ' : ''}Wyników: {total}
                            </span>
                        </div>

                        <div className="table-wrap">
                            {isLoading && (
                                <div className="loading-spinner">
                                    <span className="loading-spinner-text">Pobieranie faktur z KSeF...</span>
                                </div>
                            )}
                            {errorMessage && <div className="error-message">{errorMessage}</div>}
                            {!isLoading && !errorMessage && (
                                <table className="data-table">
                                    <thead>
                                    <tr>
                                        <th className="checkbox-col">
                                            <input
                                                type="checkbox"
                                                checked={selection.isAllSelected && paged.length > 0}
                                                onChange={toggleSelectAll}
                                                title="Zaznacz wszystkie"
                                            />
                                        </th>
                                        <th className="alert-col">Status</th>
                                        <th>Data</th>
                                        <th>Nr KSeF</th>
                                        <th>Nr faktury</th>
                                        <th>NIP sprzedawcy</th>
                                        <th>Nazwa</th>
                                        <th>Brutto</th>
                                        <th>PDF</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paged.length > 0 ? (
                                        paged.map((row) => {
                                            const fraudResult = fraudResults.get(row.numerKsef);
                                            return (
                                                <tr
                                                    key={row.numerKsef}
                                                    className={`
                                                        ${selection.selectedIds.has(row.numerKsef) ? 'row-selected' : ''}
                                                        ${fraudResult?.alertLevel === 'high' ? 'row-alert-high' : ''}
                                                        ${fraudResult?.alertLevel === 'medium' ? 'row-alert-medium' : ''}
                                                    `}
                                                >
                                                    <td className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={selection.selectedIds.has(row.numerKsef)}
                                                            onChange={() => toggleSelection(row.numerKsef)}
                                                        />
                                                    </td>
                                                    <td className="alert-col">
                                                        {fraudResult && (
                                                            <FraudBadge
                                                                result={fraudResult}
                                                                contractorNip={row.nipKontrahenta}
                                                                onDismiss={refreshFraud}
                                                            />
                                                        )}
                                                    </td>
                                                    <td>{row.dataWystawienia}</td>
                                                    <td>
                                                        <code className="ksef-number">{row.numerKsef}</code>
                                                    </td>
                                                    <td>{row.numerFaktury}</td>
                                                    <td>{row.nipKontrahenta}</td>
                                                    <td className="contractor-name">{row.nazwaKontrahenta || '—'}</td>
                                                    <td className="amount-cell">
                                                        {row.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn-light small"
                                                            onClick={() => handleDownloadPdf(row)}
                                                            disabled={downloadingPdf === row.numerKsef || !row.invoiceHash}
                                                            title={row.invoiceHash ? 'Pobierz PDF z kodem QR' : 'Brak danych do PDF'}
                                                        >
                                                            {downloadingPdf === row.numerKsef ? '⏳' : row.invoiceHash ? '📄' : '—'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={9}>
                                                <div className="empty-state">
                                                    <span className="empty-state-icon">📭</span>
                                                    <span className="empty-state-text">Brak faktur spełniających kryteria</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-nav"
                                    disabled={pageClamped <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    ‹ <span>Poprzednia</span>
                                </button>

                                {pageNumbers.map((p, i) =>
                                    p === 'dots' ? (
                                        <span key={`dots-${i}`} className="pagination-dots">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`pagination-page ${p === pageClamped ? 'active' : ''}`}
                                            onClick={() => setPage(p)}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    className="pagination-nav"
                                    disabled={pageClamped >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <span>Następna</span> ›
                                </button>

                                <span className="pagination-info">
                                    {(pageClamped - 1) * pageSize + 1}–{Math.min(pageClamped * pageSize, total)} z {total}
                                </span>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}