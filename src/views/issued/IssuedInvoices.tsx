import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import '../received/ReceivedInvoices.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { listIssued, downloadInvoicePdf, type Invoice, type ListInvoicesParams, type UpoStatus, type GeneratePdfRequest } from '../../services/ksefApi';
import SideNav from '../../components/layout/SideNav';

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
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [nip, setNip] = useState('');
    const [status, setStatus] = useState<UpoStatus | ''>('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

    const sentInvoices = useMemo(() => loadSentInvoices(), []);

    const params: ListInvoicesParams = useMemo(() => ({
        nip: nip || undefined,
        status: status || undefined,
        date: (from || to) ? { from: from || undefined, to: to || undefined } : undefined,
        page,
        pageSize,
    }), [nip, status, from, to, page, pageSize]);

    const { data: invoices = [], isLoading, isFetching, error, refetch } = useQuery<Invoice[]>({
        queryKey: ['issuedInvoices', params],
        queryFn: () => listIssued(params),
        placeholderData: keepPreviousData,
    });

    const filtered = useMemo(() => {
        return invoices.filter((row) => {
            if (nip && !row.nipKontrahenta.includes(nip)) return false;
            if (status && row.status !== status) return false;
            if (from && row.dataWystawienia < from) return false;
            if (to && row.dataWystawienia > to) return false;
            return true;
        });
    }, [invoices, nip, status, from, to]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = Math.min(page, totalPages);
    const paged = filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

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
                // Mamy pełne dane lokalne - użyj ich
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
                await downloadInvoicePdf(request);
            } else if (invoice.invoiceHash) {
                // Mamy hash z KSeF - wygeneruj uproszczony PDF
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
        } catch (error) {
            console.error('Błąd pobierania PDF:', error);
            alert(error instanceof Error ? error.message : 'Nie udało się pobrać PDF');
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
                <header className="dash-header">
                    <h1>Faktury wystawione</h1>
                    <p className="subtitle">Lista dokumentów wystawionych w KSeF</p>
                </header>

                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Wyszukaj i filtruj</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={() => refetch()} disabled={isLoading || isFetching} icon="⟳">
                                {isLoading || isFetching ? 'Odświeżanie...' : 'Odśwież'}
                            </PrimaryButton>
                        </div>
                    </div>

                    <div className="filters">
                        <label>Data od<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
                        <label>Data do<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
                        <label>NIP<input type="text" placeholder="np. 5250012312" value={nip} onChange={(e) => { setNip(e.target.value.replace(/\D/g, '').slice(0, 10)); setPage(1); }} /></label>
                        <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value as UpoStatus | ''); setPage(1); }}>
                            <option value="">Wszystkie</option>
                            <option value="accepted">Przyjęta</option>
                            <option value="pending">W Trakcie</option>
                            <option value="rejected">Odrzucona</option>
                        </select></label>
                        <label>Na stronę<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select></label>
                    </div>

                    <div className="table-wrap">
                        {isLoading && <div className="loading-overlay">Ładowanie...</div>}
                        {errorMessage && <div className="error-message">{errorMessage}</div>}

                        {!isLoading && !errorMessage && (
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Nr KSeF</th>
                                    <th>Nr faktury</th>
                                    <th>NIP nabywcy</th>
                                    <th>Brutto</th>
                                    <th>Status</th>
                                    <th>PDF</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paged.length > 0 ? (
                                    paged.map((row) => {
                                        const canPdf = canDownloadPdf(row);
                                        return (
                                            <tr key={row.numerKsef}>
                                                <td>{row.dataWystawienia}</td>
                                                <td>
                                                    <code style={{
                                                        fontSize: '11px',
                                                        background: 'rgba(0,224,150,0.1)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        color: '#00e096'
                                                    }}>
                                                        {row.numerKsef}
                                                    </code>
                                                </td>
                                                <td>{row.numerFaktury}</td>
                                                <td>{row.nipKontrahenta}</td>
                                                <td>{row.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</td>
                                                <td>
                                                    <span className={`status-dot ${row.status}`} aria-label={row.status} />
                                                    <span className="status-text">
                                                        {row.status === 'accepted' ? 'Przyjęta' : row.status === 'rejected' ? 'Odrzucona' : 'W Trakcie'}
                                                    </span>
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
                                        <td colSpan={7} style={{ textAlign: 'center' }}>
                                            Brak faktur spełniających kryteria.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="pagination" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                        <button className="btn-light small" disabled={pageClamped <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Poprzednia</button>
                        <span style={{ alignSelf: 'center', color: 'var(--muted)' }}>Strona {pageClamped} / {totalPages}</span>
                        <button className="btn-light small" disabled={pageClamped >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Następna</button>
                    </div>
                </section>
            </main>
        </div>
    );
}