// src/views/issued/IssuedInvoices.tsx
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import '../received/ReceivedInvoices.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { listIssued, type Invoice, type ListInvoicesParams, type UpoStatus } from '../../services/ksefApi';
import SideNav from '../../components/layout/SideNav';

// Typ dla lokalnie zapisanych wysłanych faktur
interface SentInvoiceRecord {
    invoiceNumber: string;
    elementReferenceNumber: string;
    sentAt: string;
    sellerNip: string;
    buyerNip: string;
    buyerName: string;
    grossAmount: number;
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
    // Filters state
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [nip, setNip] = useState('');
    const [status, setStatus] = useState<UpoStatus | ''>('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [activeTab, setActiveTab] = useState<'ksef' | 'local'>('ksef');

    // Lokalnie zapisane wysłane faktury
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

    // Filtrowanie lokalnych faktur
    const filteredLocal = useMemo(() => {
        return sentInvoices.filter((row) => {
            if (nip && !row.buyerNip.includes(nip)) return false;
            const sentDate = row.sentAt.split('T')[0];
            if (from && sentDate < from) return false;
            if (to && sentDate > to) return false;
            return true;
        });
    }, [sentInvoices, nip, from, to]);

    const total = activeTab === 'ksef' ? filtered.length : filteredLocal.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageClamped = Math.min(page, totalPages);

    const paged = activeTab === 'ksef'
        ? filtered.slice((pageClamped - 1) * pageSize, pageClamped * pageSize)
        : filteredLocal.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

    const errorMessage = error
        ? 'Nie udało się pobrać faktur. Sprawdź, czy serwer backendu jest uruchomiony.'
        : null;

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

                    {/* Tabs */}
                    <div className="tabs" style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        borderBottom: '1px solid var(--border, #e5e7eb)',
                        paddingBottom: '8px'
                    }}>
                        <button
                            className={`tab-btn ${activeTab === 'ksef' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('ksef'); setPage(1); }}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: activeTab === 'ksef' ? 'var(--accent, #00e096)' : 'transparent',
                                color: activeTab === 'ksef' ? '#000' : 'var(--muted, #6b7280)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: activeTab === 'ksef' ? 600 : 400,
                                transition: 'all 0.2s'
                            }}
                        >
                            📥 Z KSeF ({invoices.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('local'); setPage(1); }}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: activeTab === 'local' ? 'var(--accent, #00e096)' : 'transparent',
                                color: activeTab === 'local' ? '#000' : 'var(--muted, #6b7280)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: activeTab === 'local' ? 600 : 400,
                                transition: 'all 0.2s'
                            }}
                        >
                            📤 Wysłane z aplikacji ({sentInvoices.length})
                        </button>
                    </div>

                    <div className="filters">
                        <label>Data od<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
                        <label>Data do<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
                        <label>NIP<input type="text" placeholder="np. 5250012312" value={nip} onChange={(e) => { setNip(e.target.value.replace(/\D/g, '').slice(0, 10)); setPage(1); }} /></label>
                        {activeTab === 'ksef' && (
                            <label>Status<select value={status} onChange={(e) => { setStatus(e.target.value as UpoStatus | ''); setPage(1); }}>
                                <option value="">Wszystkie</option>
                                <option value="accepted">Przyjęta</option>
                                <option value="pending">W Trakcie</option>
                                <option value="rejected">Odrzucona</option>
                            </select></label>
                        )}
                        <label>Na stronę<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                        </select></label>
                    </div>

                    <div className="table-wrap">
                        {isLoading && activeTab === 'ksef' && <div className="loading-overlay">Ładowanie...</div>}
                        {errorMessage && activeTab === 'ksef' && <div className="error-message">{errorMessage}</div>}

                        {/* Tabela KSeF */}
                        {activeTab === 'ksef' && !isLoading && !errorMessage && (
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Nr KSeF</th>
                                    <th>Nr faktury</th>
                                    <th>NIP nabywcy</th>
                                    <th>Brutto</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                                </thead>
                                <tbody>
                                {paged.length > 0 ? (
                                    (paged as Invoice[]).map((row) => (
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
                                                <Link className="btn-light small" to={`/invoices/${row.numerKsef}`}>Szczegóły</Link>
                                            </td>
                                        </tr>
                                    ))
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

                        {/* Tabela lokalnych wysłanych faktur */}
                        {activeTab === 'local' && (
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Data wysłania</th>
                                    <th>Nr referencyjny KSeF</th>
                                    <th>Nr faktury</th>
                                    <th>Nabywca</th>
                                    <th>NIP nabywcy</th>
                                    <th>Brutto</th>
                                </tr>
                                </thead>
                                <tbody>
                                {paged.length > 0 ? (
                                    (paged as SentInvoiceRecord[]).map((row, idx) => (
                                        <tr key={`${row.elementReferenceNumber}-${idx}`}>
                                            <td>{new Date(row.sentAt).toLocaleString('pl-PL')}</td>
                                            <td>
                                                <code style={{
                                                    fontSize: '11px',
                                                    background: 'rgba(0,224,150,0.1)',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    color: '#00e096',
                                                    display: 'inline-block',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                      title={row.elementReferenceNumber}
                                                >
                                                    {row.elementReferenceNumber || '-'}
                                                </code>
                                            </td>
                                            <td>{row.invoiceNumber}</td>
                                            <td>{row.buyerName}</td>
                                            <td>{row.buyerNip}</td>
                                            <td>{row.grossAmount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                                            Nie wysłałeś jeszcze żadnych faktur z tej aplikacji.
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

                    {/* Info o numerach referencyjnych */}
                    {activeTab === 'local' && sentInvoices.length > 0 && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(0, 224, 150, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 224, 150, 0.2)',
                            fontSize: '13px',
                            color: 'var(--muted)'
                        }}>
                            💡 <strong>Tip:</strong> Numer referencyjny KSeF (ElementReferenceNumber) pozwala śledzić status faktury w systemie KSeF.
                            Możesz go użyć do weryfikacji w oficjalnym portalu KSeF.
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}