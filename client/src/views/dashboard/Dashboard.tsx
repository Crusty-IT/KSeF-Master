// src/views/dashboard/Dashboard.tsx

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import './Dashboard.css';
import { listReceived, type Invoice } from '../../services/ksefApi';
import SideNav from '../../components/layout/SideNav';

export default function Dashboard() {
    const { data: invoices = [], isLoading, isFetching, error, refetch } = useQuery<Invoice[]>({
        queryKey: ['receivedInvoices'],
        queryFn: () => listReceived(),
    });

    const errorMessage = error
        ? 'Nie udało się pobrać faktur. Sprawdź, czy serwer backendu (w folderze /server) jest uruchomiony.'
        : null;

    const { pendingToBook, accepted, rejected } = useMemo(() => {
        return {
            pendingToBook: invoices.filter(i => i.status === 'pending'),
            accepted: invoices.filter(i => i.status === 'accepted').length,
            rejected: invoices.filter(i => i.status === 'rejected').length,
        };
    }, [invoices]);

    // Dane do wykresu (zostawiamy jako statyczne na razie)
    const chartDays = Array.from({ length: 14 }).map((_, i) => ({
        day: i + 1,
        issued: Math.round(10 + 20 * Math.sin(i / 2) + (i % 3) * 3),
        received: Math.round(8 + 18 * Math.cos(i / 3) + (i % 4)),
    }));
    const balanceIssued = chartDays.reduce((sum, d) => sum + d.issued, 0);
    const balanceReceived = chartDays.reduce((sum, d) => sum + d.received, 0);

    return (
        <div className="dash-root">
            {/* === PEŁNE MENU NAWIGACYJNE === */}
            <SideNav /> {/* <-- ZASTĄPIONE */}

            {/* Główna treść */}
            <main className="dash-main">
                <header className="dash-header">
                    <h1>Pulpit Główny</h1>
                    <p className="subtitle">Szybki przegląd operacji KSeF i finansów</p>
                </header>

                {/* Sekcja KPI (teraz dynamiczna) */}
                <section className="kpi-grid" aria-label="Szybka analiza">
                    <div className="kpi-card">
                        <div className="kpi-title">Faktury do Zaksięgowania</div>
                        <div className="kpi-value accent">{isLoading ? '...' : pendingToBook.length}</div>
                        <button className="btn-light small">Przejdź do Akceptacji</button>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-title">Status Wysłanych Faktur</div>
                        <div className="kpi-pills">
                            <span className="pill success">Przyjęta/UPO: {isLoading ? '...' : accepted}</span>
                            <span className="pill danger">Odrzucona: {isLoading ? '...' : rejected}</span>
                        </div>
                    </div>
                    <div className="kpi-card wide">
                        <div className="kpi-title">Saldo KSeF (Wystawione vs. Odebrane)</div>
                        <div className="mini-chart" aria-hidden>
                            {chartDays.map((d, idx) => (
                                <div className="bar-pair" key={idx}><div className="bar issued" style={{ height: Math.min(100, d.issued) + '%' }} /><div className="bar received" style={{ height: Math.min(100, d.received) + '%' }} /></div>
                            ))}
                        </div>
                        <div className="chart-legend">
                            <span className="legend-item"><i className="dot issued" /> Wystawione: {balanceIssued}</span>
                            <span className="legend-item"><i className="dot received" /> Odebrane: {balanceReceived}</span>
                        </div>
                    </div>
                </section>

                {/* Tabela operacyjna (teraz dynamiczna) */}
                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Ostatnio Odebrane Dokumenty KSeF</h2>
                        <div className="ops-actions">
                            <button className="btn-accent" onClick={() => refetch()} disabled={isLoading || isFetching}>
                                <span className="btn-icon" aria-hidden>⟳</span>
                                {isLoading || isFetching ? 'Pobieranie...' : 'Pobierz Nowe z KSeF'}
                            </button>
                            <input className="search" placeholder="Szukaj po NIP / nr faktury / nr KSeF" />
                        </div>
                    </div>
                    <div className="filters">
                        <label>Data<input type="date" /></label>
                        <label>NIP Kontrahenta<input type="text" placeholder="np. 5250012312" /></label>
                        <label>Status UPO<select defaultValue=""><option value="">Wszystkie</option><option value="accepted">Przyjęta</option><option value="pending">W Trakcie</option><option value="rejected">Odrzucona</option></select></label>
                    </div>

                    <div className="table-wrap">
                        {isLoading && <div className="loading-overlay">Ładowanie...</div>}
                        {errorMessage && <div className="error-message">{errorMessage}</div>}
                        {!isLoading && !errorMessage && (
                            <table className="data-table">
                                <thead>
                                <tr><th>Numer KSeF</th><th>Numer Faktury</th><th>NIP</th><th>Kwota Brutto</th><th>Data</th><th>Status (KSeF UPO)</th></tr>
                                </thead>
                                <tbody>
                                {invoices.length > 0 ? (
                                    invoices.map((row) => (
                                        <tr key={row.numerKsef}>
                                            <td>{row.numerKsef}</td><td>{row.numerFaktury}</td><td>{row.nipKontrahenta}</td>
                                            <td>{row.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</td>
                                            <td>{row.dataWystawienia}</td>
                                            <td>
                                                <span className={`status-dot ${row.status}`} aria-label={row.status} />
                                                <span className="status-text">{row.status === 'accepted' ? 'Przyjęta' : row.status === 'rejected' ? 'Odrzucona' : 'W Trakcie'}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={6} style={{ textAlign: 'center' }}>Brak faktur do wyświetlenia.</td></tr>
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
                        <div className="future-card"><div className="future-icon">✏️</div><div className="future-title">Wprowadź Korektę</div><div className="future-badge">Dostępne wkrótce</div></div>
                        <div className="future-card"><div className="future-icon">📄</div><div className="future-title">Wygeneruj JPK</div><div className="future-badge">Dostępne wkrótce</div></div>
                        <div className="future-card"><div className="future-icon">💳</div><div className="future-title">Moduł Płatności</div><div className="future-badge">Dostępne wkrótce</div></div>
                    </div>
                </section>
            </main>
        </div>
    );
}