import './Dashboard.css';

// Minimal demo data for KPIs and table
const demoInvoices = [
  { ksef: 'ABC-2025-000123', extNo: 'FV/01/2025', nip: '1234567890', amount: 12345.67, date: '2025-10-10', status: 'accepted' as const },
  { ksef: 'ABC-2025-000124', extNo: 'FV/02/2025', nip: '9876543210', amount: 2345.00, date: '2025-10-11', status: 'pending' as const },
  { ksef: 'ABC-2025-000125', extNo: 'FV/03/2025', nip: '5250012312', amount: 999.99, date: '2025-10-12', status: 'rejected' as const },
  { ksef: 'ABC-2025-000126', extNo: 'FV/04/2025', nip: '1112223344', amount: 5120.00, date: '2025-10-13', status: 'accepted' as const },
];

export default function Dashboard() {
  const pendingToBook = demoInvoices.filter(i => i.status === 'pending');
  const accepted = demoInvoices.filter(i => i.status === 'accepted').length;
  const rejected = demoInvoices.filter(i => i.status === 'rejected').length;

  // Fake chart numbers for last 30 days (issued vs received) – small array to draw bars
  const chartDays = Array.from({ length: 14 }).map((_, i) => ({
    day: i + 1,
    issued: Math.round(10 + 20 * Math.sin(i / 2) + (i % 3) * 3),
    received: Math.round(8 + 18 * Math.cos(i / 3) + (i % 4)),
  }));

  const balanceIssued = chartDays.reduce((sum, d) => sum + d.issued, 0);
  const balanceReceived = chartDays.reduce((sum, d) => sum + d.received, 0);

  return (
    <div className="dash-root">
      {/* Side Navigation */}
      <aside className="side-nav" aria-label="Nawigacja boczna">
        <div className="brand">
          <div className="logo-dot" aria-hidden="true" />
          <span className="brand-name">KSeF Master</span>
        </div>
        <a className="btn-accent new-invoice" href="#" onClick={(e)=>e.preventDefault()}>
          + Wystaw e-Fakturę
        </a>
        <nav className="nav-list">
          <a className="nav-item active" href="#/dashboard">
            <span className="icon" aria-hidden>🏠</span> Pulpit Główny
          </a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="icon" aria-hidden>📥</span> Faktury KSeF (Odebrane)
          </a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="icon" aria-hidden>📤</span> Faktury KSeF (Wystawione)
          </a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="icon" aria-hidden>👥</span> Klienci
          </a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="icon" aria-hidden>📊</span> Raporty
          </a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}>
            <span className="icon" aria-hidden>⚙️</span> Ustawienia
          </a>
          <a className="nav-item" href="#/" title="Powrót do ekranu startowego">↩️ Start</a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="dash-main">
        <header className="dash-header">
          <h1>Pulpit Główny</h1>
          <p className="subtitle">Szybki przegląd operacji KSeF i finansów</p>
        </header>

        {/* KPI row */}
        <section className="kpi-grid" aria-label="Szybka analiza">
          <div className="kpi-card">
            <div className="kpi-title">Faktury do Zaksięgowania</div>
            <div className="kpi-value accent">{pendingToBook.length}</div>
            <button className="btn-light small">Przejdź do Akceptacji</button>
          </div>
          <div className="kpi-card">
            <div className="kpi-title">Status Wysłanych Faktur</div>
            <div className="kpi-pills">
              <span className="pill success">Przyjęta/UPO: {accepted}</span>
              <span className="pill danger">Odrzucona: {rejected}</span>
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

        {/* Operational table */}
        <section className="ops-section">
          <div className="ops-header">
            <h2>Ostatnio Odebrane Dokumenty KSeF</h2>
            <div className="ops-actions">
              <button className="btn-accent">
                <span className="btn-icon" aria-hidden>⟳</span> Pobierz Nowe z KSeF
              </button>
              <input className="search" placeholder="Szukaj po NIP / nr faktury / nr KSeF" />
            </div>
          </div>
          <div className="filters">
            <label>
              Data
              <input type="date" />
            </label>
            <label>
              NIP Kontrahenta
              <input type="text" placeholder="np. 5250012312" />
            </label>
            <label>
              Status UPO
              <select defaultValue="">
                <option value="">Wszystkie</option>
                <option value="accepted">Przyjęta</option>
                <option value="pending">W Trakcie</option>
                <option value="rejected">Odrzucona</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Numer KSeF</th>
                  <th>Numer Faktury</th>
                  <th>NIP</th>
                  <th>Kwota Brutto</th>
                  <th>Data</th>
                  <th>Status (KSeF UPO)</th>
                </tr>
              </thead>
              <tbody>
                {demoInvoices.map((row, i) => (
                  <tr key={i}>
                    <td>{row.ksef}</td>
                    <td>{row.extNo}</td>
                    <td>{row.nip}</td>
                    <td>{row.amount.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</td>
                    <td>{row.date}</td>
                    <td>
                      <span className={`status-dot ${row.status}`} aria-label={row.status} />
                      <span className="status-text">
                        {row.status === 'accepted' ? 'Przyjęta' : row.status === 'rejected' ? 'Odrzucona' : 'W Trakcie'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="future-section">
          <h2>Szybkie Działania</h2>
          <div className="future-grid">
            <div className="future-card">
              <div className="future-icon">✏️</div>
              <div className="future-title">Wprowadź Korektę</div>
              <div className="future-badge">Dostępne wkrótce</div>
            </div>
            <div className="future-card">
              <div className="future-icon">📄</div>
              <div className="future-title">Wygeneruj JPK</div>
              <div className="future-badge">Dostępne wkrótce</div>
            </div>
            <div className="future-card">
              <div className="future-icon">💳</div>
              <div className="future-title">Moduł Płatności</div>
              <div className="future-badge">Dostępne wkrótce</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
