import { useEffect, useMemo, useState } from 'react';
import './Reports.css';
import '../dashboard/Dashboard.css'; // dla spójności kart/typografii
import SideNav from '../../components/layout/SideNav';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { formatPLN } from '../../helpers/money';
import { getAllReports, seedSampleReports, replaceAllReports, type ReportInvoice } from '../../services/reportsData';
import { applyFilters, sumKpis, perVatRate, agingIssued, topClients, type ReportFilters } from '../../helpers/reports';

export default function Reports() {
    const [all, setAll] = useState<ReportInvoice[]>([]);
    const [filters, setFilters] = useState<ReportFilters>({ type: 'all' });

    useEffect(() => { setAll(getAllReports()); }, []);

    const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
    const kpi = useMemo(() => sumKpis(filtered), [filtered]);
    const byVat = useMemo(() => perVatRate(filtered), [filtered]);
    const aging = useMemo(() => agingIssued(filtered), [filtered]);
    const tops = useMemo(() => topClients(filtered), [filtered]);

    function exportCsv() {
        const head = ['id','type','number','issueDate','dueDate','name','nip','net','vat','gross','vatRate'];
        const rows = filtered.map(r => [
            r.id, r.type, r.number, r.issueDate, r.dueDate || '',
            r.counterparty.name, r.counterparty.nip || '',
            r.totals.net, r.totals.vat, r.totals.gross, r.vatRate ?? ''
        ]);
        const csv = [head, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'raport.csv'; a.click();
        URL.revokeObjectURL(url);
    }

    function handlePrint() { window.print(); }
    function seed() { const data = seedSampleReports(); setAll(data); }
    function clearData() { if (confirm('Wyczyścić dane raportów (localStorage)?')) { replaceAllReports([]); setAll([]); } }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <header className="dash-header">
                    <h1>Raporty</h1>
                    <p className="subtitle">Podsumowania i analityka na podstawie faktur (localStorage)</p>
                </header>

                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Filtry i akcje</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={exportCsv} icon="📄">Eksport CSV</PrimaryButton>
                            <button className="btn-light" onClick={handlePrint}>Drukuj</button>
                            <button className="btn-light" onClick={seed}>Załaduj próbkę</button>
                            <button className="btn-light" onClick={clearData}>Wyczyść</button>
                        </div>
                    </div>

                    <div className="card reports-filters">
                        <label>Od
                            <input type="date" value={filters.dateFrom || ''} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value || undefined }))} />
                        </label>
                        <label>Do
                            <input type="date" value={filters.dateTo || ''} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value || undefined }))} />
                        </label>
                        <label>Typ
                            <select value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value as any }))}>
                                <option value="all">Wszystkie</option>
                                <option value="issued">Wystawione</option>
                                <option value="received">Odebrane</option>
                            </select>
                        </label>
                        <label style={{ flex: 1 }}>Szukaj
                            <input type="text" placeholder="Kontrahent / numer" value={filters.q || ''} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
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
                                    <thead><tr><th>Stawka</th><th>Netto</th><th>VAT</th><th>Brutto</th></tr></thead>
                                    <tbody>
                                    {Object.keys(byVat).length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', opacity: .7, padding: 16 }}>Brak danych.</td></tr>
                                    ) : Object.entries(byVat).map(([rate, v]) => (
                                        <tr key={rate}><td>{rate}</td><td>{formatPLN(v.net)}</td><td>{formatPLN(v.vat)}</td><td>{formatPLN(v.gross)}</td></tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card">
                            <h3>Top klienci (wg brutto)</h3>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Kontrahent</th><th>Brutto</th></tr></thead>
                                    <tbody>
                                    {tops.length === 0 ? (
                                        <tr><td colSpan={2} style={{ textAlign: 'center', opacity: .7, padding: 16 }}>Brak danych.</td></tr>
                                    ) : tops.map(t => (
                                        <tr key={t.name}><td>{t.name}</td><td>{formatPLN(t.gross)}</td></tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="card" style={{ gridColumn: '1 / -1' }}>
                            <h3>Należności — tylko wystawione</h3>
                            <div className="table-wrap">
                                <table className="data-table">
                                    <thead><tr><th>Bucket</th><th>Brutto</th></tr></thead>
                                    <tbody>
                                    {Object.keys(aging).every(k => aging[k] === 0) ? (
                                        <tr><td colSpan={2} style={{ textAlign: 'center', opacity: .7, padding: 16 }}>Brak przeterminowanych należności.</td></tr>
                                    ) : Object.entries(aging).map(([k, v]) => (
                                        <tr key={k}><td>{k}</td><td>{formatPLN(v)}</td></tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}