// src/views/issued/IssuedInvoices.tsx
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import '../received/ReceivedInvoices.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import InvoiceFilters from '../../components/filters/InvoiceFilters';
import { listIssued, downloadInvoicePdf, type Invoice, type ListInvoicesParams, type GeneratePdfRequest } from '../../services/ksefApi';
import { useInvoiceFilters } from '../../hooks/useInvoiceFilters';
import SideNav from '../../components/layout/SideNav';
import TopBar from '../../components/layout/TopBar';

interface SentInvoiceRecord {
    invoiceNumber: string;
    elementReferenceNumber: string;
    sentAt: string;
    sellerNip: string;
    buyerNip: string;
    buyerName: string;
    grossAmount: number;
    invoiceHash?: string;
    issueDate?: string;
    saleDate?: string;
    issuePlace?: string;
    sellerName?: string;
    sellerAddress?: string;
    sellerBankAccount?: string;
    buyerAddress?: string;
    items?: {
        name: string;
        unit: string;
        quantity: number;
        unitPriceNet: number;
        vatRate: string;
        netValue: number;
        vatValue: number;
        grossValue: number;
    }[];
    totals?: {
        net: number;
        vat: number;
        gross: number;
        perRate?: Record<string, { net: number; vat: number; gross: number }>;
    };
    paymentMethod?: string;
    paymentDueDate?: string;
    paymentBankAccount?: string;
}

const SENT_INVOICES_KEY = 'sentInvoices';

function loadSentInvoices(): SentInvoiceRecord[] {
    try {
        const raw = localStorage.getItem(SENT_INVOICES_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export default function IssuedInvoices() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

    const sentInvoices = useMemo(() => loadSentInvoices(), []);

    const params: ListInvoicesParams = useMemo(() => ({
        page,
        pageSize,
    }), [page, pageSize]);

    const { data: invoices = [], isLoading, isFetching, error, refetch } = useQuery<Invoice[]>({
        queryKey: ['issuedInvoices', params],
        queryFn: () => listIssued(params),
        placeholderData: keepPreviousData,
    });

    const {
        filters,
        setFilters,
        resetFilters,
        filteredInvoices,
        selection,
        toggleSelection,
        toggleSelectAll,
        selectedCount,
    } = useInvoiceFilters(invoices);

    const total = filteredInvoices.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = Math.min(page, totalPages);
    const paged = filteredInvoices.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

    const errorMessage = error
        ? 'Nie udało się pobrać faktur. Sprawdź, czy serwer backendu jest uruchomiony.'
        : null;

    function findLocalData(invoice: Invoice): SentInvoiceRecord | undefined {
        return sentInvoices.find(s => s.invoiceNumber === invoice.numerFaktury);
    }

    async function handleDownloadPdf(invoice: Invoice) {
        setDownloadingPdf(invoice.numerKsef);

        try {
            const localData = findLocalData(invoice);

            if (localData?.invoiceHash) {
                const request: GeneratePdfRequest = {
                    source: 'local',
                    invoiceNumber: localData.invoiceNumber,
                    issueDate: localData.issueDate,
                    saleDate: localData.saleDate,
                    issuePlace: localData.issuePlace,
                    invoiceHash: localData.invoiceHash,
                    ksefNumber: invoice.numerKsef,
                    seller: {
                        nip: localData.sellerNip,
                        name: localData.sellerName || '',
                        address: localData.sellerAddress || '',
                        bankAccount: localData.sellerBankAccount,
                    },
                    buyer: {
                        nip: localData.buyerNip,
                        name: localData.buyerName,
                        address: localData.buyerAddress || '',
                    },
                    items: localData.items,
                    totals: localData.totals,
                    payment: {
                        method: localData.paymentMethod || 'przelew',
                        dueDate: localData.paymentDueDate,
                        bankAccount: localData.paymentBankAccount,
                    },
                };

                console.log('=== PDF REQUEST ===');
                console.log('localData.items:', localData.items);
                console.log('request.items:', request.items);
                console.log('Full request:', JSON.stringify(request, null, 2));

                await downloadInvoicePdf(request);

            } else if (invoice.invoiceHash) {
                const request: GeneratePdfRequest = {
                    source: 'local',
                    invoiceNumber: invoice.numerFaktury,
                    issueDate: invoice.dataWystawienia,
                    invoiceHash: invoice.invoiceHash,
                    ksefNumber: invoice.numerKsef,
                    seller: {
                        nip: invoice.nipSprzedawcy || '',
                        name: invoice.nazwaSprzedawcy || '',
                        address: '',
                    },
                    buyer: {
                        nip: invoice.nipKontrahenta,
                        name: invoice.nazwaKontrahenta || '',
                        address: '',
                    },
                    totals: {
                        net: invoice.kwotaNetto || 0,
                        vat: invoice.kwotaVat || 0,
                        gross: invoice.kwotaBrutto,
                    },
                };
                await downloadInvoicePdf(request);
            } else {
                alert('Brak danych do wygenerowania PDF dla tej faktury.');
            }
        } catch (err) {
            console.error('Błąd pobierania PDF:', err);
            alert(err instanceof Error ? err.message : 'Nie udało się pobrać PDF');
        } finally {
            setDownloadingPdf(null);
        }
    }

    function canDownloadPdf(invoice: Invoice): boolean {
        const localData = findLocalData(invoice);
        return !!(localData?.invoiceHash || invoice.invoiceHash);
    }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <TopBar />
                <div className="dash-content">
                    <header className="dash-header">
                        <h1>Faktury wystawione</h1>
                        <p className="subtitle">Lista dokumentów wystawionych w KSeF</p>
                    </header>

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
                                    {isLoading || isFetching ? 'Odświeżanie...' : 'Odśwież'}
                                </PrimaryButton>
                            </div>
                        </div>

                        <InvoiceFilters
                            filters={filters}
                            onChange={setFilters}
                            onReset={resetFilters}
                            showSuspiciousFilter={false}
                        />

                        <div className="table-controls">
                            <label className="page-size-label">
                                Na stronę:
                                <select
                                    value={pageSize}
                                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="page-size-select"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </label>
                            <span className="results-count">
                                Wyników: {total}
                            </span>
                        </div>

                        <div className="table-wrap">
                            {isLoading && <div className="loading-overlay">Ładowanie...</div>}
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
                                        <th>Data</th>
                                        <th>Nr KSeF</th>
                                        <th>Nr faktury</th>
                                        <th>NIP nabywcy</th>
                                        <th>Nazwa</th>
                                        <th>Brutto</th>
                                        <th>PDF</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paged.length > 0 ? (
                                        paged.map((row) => {
                                            const canPdf = canDownloadPdf(row);
                                            return (
                                                <tr
                                                    key={row.numerKsef}
                                                    className={selection.selectedIds.has(row.numerKsef) ? 'row-selected' : ''}
                                                >
                                                    <td className="checkbox-col">
                                                        <input
                                                            type="checkbox"
                                                            checked={selection.selectedIds.has(row.numerKsef)}
                                                            onChange={() => toggleSelection(row.numerKsef)}
                                                        />
                                                    </td>
                                                    <td>{row.dataWystawienia}</td>
                                                    <td>
                                                        <code className="ksef-number">
                                                            {row.numerKsef}
                                                        </code>
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
                                                            disabled={downloadingPdf === row.numerKsef || !canPdf}
                                                            title={canPdf ? 'Pobierz PDF z kodem QR' : 'Brak danych do PDF'}
                                                        >
                                                            {downloadingPdf === row.numerKsef ? '⏳' : canPdf ? '📄' : '—'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center' }}>
                                                Brak faktur spełniających kryteria.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="pagination">
                            <button
                                className="btn-light small"
                                disabled={pageClamped <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Poprzednia
                            </button>
                            <span className="pagination-info">
                                Strona {pageClamped} / {totalPages}
                            </span>
                            <button
                                className="btn-light small"
                                disabled={pageClamped >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            >
                                Następna
                            </button>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}