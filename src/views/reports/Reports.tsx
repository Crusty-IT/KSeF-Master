// src/views/reports/Reports.tsx
import { useEffect, useMemo, useState } from 'react';
import './Reports.css';
import '../dashboard/Dashboard.css';
import SideNav from '../../components/layout/SideNav';
import TopBar from '../../components/layout/TopBar';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { formatPLN } from '../../helpers/money';
import { getAllReports, syncFromKsefData, clearAllReports, type ReportInvoice } from '../../services/reportsData';
import { listIssued, listReceived } from '../../services/ksefApi';
import { applyFilters, sumKpis, perVatRate, agingIssued, topClients, type ReportFilters } from '../../helpers/reports';

export default function Reports() {
    const [all, setAll] = useState<ReportInvoice[]>([]);
    const [filters, setFilters] = useState<ReportFilters>({ type: 'all' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const data = getAllReports();
        setAll(data);
    }, []);

    const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
    const kpi = useMemo(() => sumKpis(filtered), [filtered]);
    const byVat = useMemo(() => perVatRate(filtered), [filtered]);
    const aging = useMemo(() => agingIssued(filtered), [filtered]);
    const tops = useMemo(() => topClients(filtered), [filtered]);

    async function syncFromKsef() {
        setIsLoading(true);
        setError(null);

        try {
            const [issued, received] = await Promise.all([
                listIssued(),
                listReceived()
            ]);

            const reports = syncFromKsefData(issued, received);
            setAll(reports);
        } catch {
            setError('Nie udało się pobrać danych z KSeF. Sprawdź czy jesteś zalogowany.');
        } finally {
            setIsLoading(false);
        }
    }

    function exportCsv() {
        const head = ['id', 'type', 'number', 'issueDate', 'dueDate', 'name', 'nip', 'net', 'vat', 'gross', 'vatRate'];
        const rows = filtered.map(r => [
            r.id, r.type, r.number, r.issueDate, r.dueDate || '',
            r.counterparty.name, r.counterparty.nip || '',
            r.totals.net, r.totals.vat, r.totals.gross, r.vatRate ?? ''
        ]);
        const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'raport.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    function handlePrint() {
        window.print();
    }

    function clearData() {
        if (confirm('Wyczyścić dane raportów?')) {
            clearAllReports();
            setAll([]);
        }
    }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <TopBar />
                <div className="dash-content">
                    <header className="dash-header">
                        <h1>Raporty</h1>
                        <p className="subtitle">Podsumowania i analityka faktur z KSeF</p>
                    </header>

                    <section className="ops-section">
                        <div className="ops-header">
                            <h2>Filtry i akcje</h2>
                            <div className="ops-actions">
                                <PrimaryButton onClick={syncFromKsef} icon="⟳" disabled={isLoading}>
                                    {isLoading ? 'Synchronizacja...' : 'Synchronizuj z KSeF'}
                                </PrimaryButton>
                                <PrimaryButton onClick={exportCsv} icon="📄" disabled={filtered.length === 0}>
                                    Eksport CSV
                                </PrimaryButton>
                                <button className="btn-light" onClick={handlePrint}>Drukuj</button>
                                <button className="btn-light" onClick={clearData}>Wyczyść</button>
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                {error}
                            </div>
                        )}

                        {all.length === 0 && !isLoading && (
                            <div className="info-banner">
                                ℹ️ Brak danych. Kliknij "Synchronizuj z KSeF" aby pobrać faktury.
                            </div>
                        )}

                        <div className="card reports-filters">
                            <label>Od
                                <input
                                    type="date"
                                    value={filters.dateFrom || ''}
                                    onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))}
                                />
                            </label>
                            <label>Do
                                <input
                                    type="date"
                                    value={filters.dateTo || ''}
                                    onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))}
                                />
                            </label>
                            <label>Typ
                                <select
                                    value={filters.type}
                                    onChange={e => setFilters(f => ({ ...f, type: e.target.value as ReportFilters['type'] }))}
                                >
                                    <option value="all">Wszystkie</option>
                                    <option value="issued">Wystawione</option>
                                    <option value="received">Odebrane</option>
                                </select>
                            </label>
                            <label style={{ flex: 1 }}>Szukaj
                                <input
                                    type="text"
                                    placeholder="Kontrahent / numer"
                                    value={filters.q || ''}
                                    onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                                />
                            </label>
                        </div>

                        <div className="kpi-grid">
                            <div className="card kpi-card">
                                <div className="kpi-title">Przychód brutto</div>
                                <div className="kpi-value">{formatPLN(kpi.gross)}</div>
                            </div>
                            <div className="card kpi-card">
                                <div className="kpi-title">Netto</div>
                                <div className="kpi-value">{formatPLN(kpi.net)}</div>
                            </div>
                            <div className="card kpi-card">
                                <div className="kpi-title">VAT</div>
                                <div className="kpi-value">{formatPLN(kpi.vat)}</div>
                            </div>
                            <div className="card kpi-card">
                                <div className="kpi-title">Liczba faktur</div>
                                <div className="kpi-value">{kpi.count}</div>
                            </div>
                        </div>

                        <div className="reports-grid">
                            <div className="card">
                                <h3>VAT wg stawek</h3>
                                <div className="table-wrap">
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Stawka</th>
                                            <th className="text-right">Netto</th>
                                            <th className="text-right">VAT</th>
                                            <th className="text-right">Brutto</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {Object.keys(byVat).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>
                                                    Brak danych.
                                                </td>
                                            </tr>
                                        ) : (
                                            Object.entries(byVat).map(([rate, v]) => (
                                                <tr key={rate}>
                                                    <td>{rate}</td>
                                                    <td className="text-right">{formatPLN(v.net)}</td>
                                                    <td className="text-right">{formatPLN(v.vat)}</td>
                                                    <td className="text-right">{formatPLN(v.gross)}</td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card">
                                <h3>Top klienci (wg brutto)</h3>
                                <div className="table-wrap">
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Kontrahent</th>
                                            <th className="text-right">Brutto</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {tops.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>
                                                    Brak danych.
                                                </td>
                                            </tr>
                                        ) : (
                                            tops.map((t, i) => (
                                                <tr key={`${t.name}-${i}`}>
                                                    <td>{t.name}</td>
                                                    <td className="text-right">{formatPLN(t.gross)}</td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card" style={{ gridColumn: '1 / -1' }}>
                                <h3>Przeterminowane należności (wystawione)</h3>
                                <div className="table-wrap">
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Przedział dni</th>
                                            <th className="text-right">Kwota brutto</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {Object.keys(aging).every(k => aging[k] === 0) ? (
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>
                                                    Brak przeterminowanych należności.
                                                </td>
                                            </tr>
                                        ) : (
                                            Object.entries(aging).map(([k, v]) => (
                                                <tr key={k}>
                                                    <td>{k}</td>
                                                    <td className="text-right">{formatPLN(v)}</td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card" style={{ gridColumn: '1 / -1' }}>
                                <h3>Lista faktur ({filtered.length})</h3>
                                <div className="table-wrap">
                                    <table className="data-table">
                                        <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Numer</th>
                                            <th>Typ</th>
                                            <th>Kontrahent</th>
                                            <th>NIP</th>
                                            <th className="text-right">Netto</th>
                                            <th className="text-right">VAT</th>
                                            <th className="text-right">Brutto</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} style={{ textAlign: 'center', opacity: 0.7, padding: 16 }}>
                                                    Brak faktur spełniających kryteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((r, i) => (
                                                <tr key={`${r.id}-${i}`}>
                                                    <td>{r.issueDate}</td>
                                                    <td>
                                                        <code style={{
                                                            fontSize: '11px',
                                                            background: r.type === 'issued'
                                                                ? 'rgba(0, 224, 150, 0.1)'
                                                                : 'rgba(59, 130, 246, 0.1)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            color: r.type === 'issued' ? '#00e096' : '#60a5fa'
                                                        }}>
                                                            {r.number}
                                                        </code>
                                                    </td>
                                                    <td>
                                                            <span className={`type-badge ${r.type}`}>
                                                                {r.type === 'issued' ? 'Wystawiona' : 'Odebrana'}
                                                            </span>
                                                    </td>
                                                    <td>{r.counterparty.name}</td>
                                                    <td>{r.counterparty.nip || '—'}</td>
                                                    <td className="text-right">{formatPLN(r.totals.net)}</td>
                                                    <td className="text-right">{formatPLN(r.totals.vat)}</td>
                                                    <td className="text-right">{formatPLN(r.totals.gross)}</td>
                                                </tr>
                                            ))
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}