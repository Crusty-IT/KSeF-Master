// src/views/dashboard/Dashboard.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { getInvoices, type InvoiceMetadata } from '../../services/ksefApi';
import { useAuth } from '../../context/AuthContext';
import SideNav from '../../components/layout/SideNav';

export default function Dashboard() {
    const { isAuthenticated, nip } = useAuth();
    const navigate = useNavigate();

    // Pobierz faktury odebrane (Subject2)
    const { data: receivedData, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['receivedInvoices', nip],
        queryFn: async () => {
            const now = new Date();
            const from = new Date(now);
            from.setMonth(from.getMonth() - 1);

            const response = await getInvoices({
                subjectType: 'Subject2',
                dateRange: {
                    dateType: 'PermanentStorage',
                    from: from.toISOString(),
                    to: now.toISOString(),
                },
            });

            if (!response.success) {
                throw new Error(response.error || 'Błąd pobierania faktur');
            }

            return response.data?.invoices || [];
        },
        enabled: isAuthenticated,
        staleTime: 60_000,
    });

    const invoices: InvoiceMetadata[] = receivedData || [];

    const errorMessage = error
        ? (error as Error).message || 'Nie udało się pobrać faktur.'
        : null;

    // KPI
    const stats = useMemo(() => {
        const total = invoices.length;
        const totalGross = invoices.reduce((sum, inv) => sum + (inv.grossAmount || 0), 0);
        return { total, totalGross };
    }, [invoices]);

    // Wykres (mock data - w prawdziwej aplikacji pobierane z backendu)
    const chartDays = Array.from({ length: 14 }).map((_, i) => ({
        day: i + 1,
        issued: Math.round(10 + 20 * Math.sin(i / 2) + (i % 3) * 3),
        received: Math.round(8 + 18 * Math.cos(i / 3) + (i % 4)),
    }));
    const balanceIssued = chartDays.reduce((sum, d) => sum + d.issued, 0);
    const balanceReceived = chartDays.reduce((sum, d) => sum + d.received, 0);

    return (
        <div className="dash-root">
            <SideNav />

            <main className="dash-main">
                <header className="dash-header">
                    <h1>Pulpit Główny</h1>
                    <p className="subtitle">
                        {isAuthenticated
                            ? `Zalogowano jako NIP: ${nip}`
                            : 'Tryb demonstracyjny - zaloguj się, aby pobierać faktury z KSeF'}
                    </p>
                </header>

                {/* Komunikat o braku logowania */}
                {!isAuthenticated && (
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <div>
                            <strong style={{ color: '#fcd34d' }}>Nie jesteś zalogowany</strong>
                            <p style={{ margin: '4px 0 0', color: '#fde68a', fontSize: '14px' }}>
                                Aby pobierać faktury z KSeF, musisz się zalogować.{' '}
                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#60a5fa',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Przejdź do logowania
                                </button>
                            </p>
                        </div>
                    </div>
                )}

                {/* Sekcja KPI */}
                <section className="kpi-grid" aria-label="Szybka analiza">
                    <div className="kpi-card">
                        <div className="kpi-title">Faktury odebrane (ostatni miesiąc)</div>
                        <div className="kpi-value accent">
                            {isLoading ? '...' : stats.total}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-title">Suma brutto (odebrane)</div>
                        <div className="kpi-value">
                            {isLoading ? '...' : stats.totalGross.toLocaleString('pl-PL', {
                                style: 'currency',
                                currency: 'PLN'
                            })}
                        </div>
                    </div>
                    <div className="kpi-card wide">
                        <div className="kpi-title">Saldo KSeF (Wystawione vs. Odebrane)</div>
                        <div className="mini-chart" aria-hidden>
                            {chartDays.map((d, idx) => (
                                <div className="bar-pair" key={idx}>
                                    <div className="bar issued" style={{ height: Math.min(100, d.issued) + '%' }} />
                                    <div className="bar received" style={{ height: Math.min(100, d.received) + '%' }} />
                                </div>
                            ))}
                        </div>
                        <div className="chart-legend">
                            <span className="legend-item"><i className="dot issued" /> Wystawione: {balanceIssued}</span>
                            <span className="legend-item"><i className="dot received" /> Odebrane: {balanceReceived}</span>
                        </div>
                    </div>
                </section>

                {/* Tabela faktur */}
                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Ostatnio Odebrane Dokumenty KSeF</h2>
                        <div className="ops-actions">
                            <button
                                className="btn-accent"
                                onClick={() => refetch()}
                                disabled={!isAuthenticated || isLoading || isFetching}
                            >
                                <span className="btn-icon" aria-hidden>⟳</span>
                                {isLoading || isFetching ? 'Pobieranie...' : 'Pobierz z KSeF'}
                            </button>
                        </div>
                    </div>

                    <div className="table-wrap">
                        {isLoading && <div className="loading-overlay">Ładowanie...</div>}
                        {errorMessage && <div className="error-message">{errorMessage}</div>}
                        {!isLoading && !errorMessage && (
                            <table className="data-table">
                                <thead>
                                <tr>
                                    <th>Numer KSeF</th>
                                    <th>Numer Faktury</th>
                                    <th>Sprzedawca</th>
                                    <th>NIP</th>
                                    <th>Kwota Brutto</th>
                                    <th>Data</th>
                                </tr>
                                </thead>
                                <tbody>
                                {invoices.length > 0 ? (
                                    invoices.slice(0, 10).map((row) => (
                                        <tr key={row.ksefNumber}>
                                            <td>{row.ksefNumber}</td>
                                            <td>{row.invoiceNumber || '-'}</td>
                                            <td>{row.seller?.name || '-'}</td>
                                            <td>{row.seller?.nip || '-'}</td>
                                            <td>
                                                {row.grossAmount?.toLocaleString('pl-PL', {
                                                    style: 'currency',
                                                    currency: row.currency || 'PLN'
                                                }) || '-'}
                                            </td>
                                            <td>{row.issueDate || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center' }}>
                                            {isAuthenticated
                                                ? 'Brak faktur do wyświetlenia.'
                                                : 'Zaloguj się, aby pobrać faktury z KSeF.'}
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                {/* Szybkie Działania */}
                <section className="future-section">
                    <h2>Szybkie Działania</h2>
                    <div className="future-grid">
                        <div className="future-card" onClick={() => navigate('/invoices/new')} style={{ cursor: 'pointer' }}>
                            <div className="future-icon">📄</div>
                            <div className="future-title">Wystaw fakturę</div>
                            <div className="future-badge">Dostępne</div>
                        </div>
                        <div className="future-card">
                            <div className="future-icon">✏️</div>
                            <div className="future-title">Wprowadź Korektę</div>
                            <div className="future-badge">Dostępne wkrótce</div>
                        </div>
                        <div className="future-card">
                            <div className="future-icon">📊</div>
                            <div className="future-title">Wygeneruj Raport</div>
                            <div className="future-badge">Dostępne wkrótce</div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}