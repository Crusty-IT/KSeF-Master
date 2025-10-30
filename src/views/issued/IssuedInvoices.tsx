// src/views/dashboard/IssuedInvoices.tsx
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {Link } from 'react-router-dom';
import '../received/ReceivedInvoices.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { listIssued, type Invoice, type ListInvoicesParams, type UpoStatus } from '../../services/ksefApi';
import SideNav from '../../components/layout/SideNav'; // Dodany import

export default function IssuedInvoices() {
  // Filters state
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [nip, setNip] = useState('');
  const [status, setStatus] = useState<UpoStatus | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    ? 'Nie udało się pobrać faktur. Sprawdź, czy serwer backendu (w folderze /server) jest uruchomiony.'
    : null;

  return (
    <div className="dash-root">
        <SideNav />

      <main className="dash-main">
        <header className="dash-header">
          <h1>Faktury KSeF (Wystawione)</h1>
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
            <label>Data od<input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); }} /></label>
            <label>Data do<input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); }} /></label>
            <label>NIP<input type="text" placeholder="np. 5250012312" value={nip} onChange={(e)=>{ setNip(e.target.value.replace(/\D/g,'').slice(0,10)); setPage(1); }} /></label>
            <label>Status<select value={status} onChange={(e)=>{ setStatus(e.target.value as UpoStatus | ''); setPage(1); }}>
              <option value="">Wszystkie</option>
              <option value="accepted">Przyjęta</option>
              <option value="pending">W Trakcie</option>
              <option value="rejected">Odrzucona</option>
            </select></label>
            <label>Na stronę<select value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
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
                    <th>NIP</th>
                    <th>Brutto</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length > 0 ? (
                    paged.map((row) => (
                      <tr key={row.numerKsef}>
                        <td>{row.dataWystawienia}</td>
                        <td>{row.numerKsef}</td>
                        <td>{row.numerFaktury}</td>
                        <td>{row.nipKontrahenta}</td>
                        <td>{row.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</td>
                        <td>
                          <span className={`status-dot ${row.status}`} aria-label={row.status} />
                          <span className="status-text">{row.status === 'accepted' ? 'Przyjęta' : row.status === 'rejected' ? 'Odrzucona' : 'W Trakcie'}</span>
                        </td>
                        <td><Link className="btn-light small" to={`/invoices/${row.numerKsef}`}>Szczegóły</Link></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} style={{ textAlign: 'center' }}>Brak faktur spełniających kryteria.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="pagination" style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12 }}>
            <button className="btn-light small" disabled={pageClamped <= 1} onClick={()=> setPage(p => Math.max(1, p-1))}>Poprzednia</button>
            <span style={{ alignSelf:'center', color:'var(--muted)' }}>Strona {pageClamped} / {totalPages}</span>
            <button className="btn-light small" disabled={pageClamped >= totalPages} onClick={()=> setPage(p => Math.min(totalPages, p+1))}>Następna</button>
          </div>
        </section>
      </main>
    </div>
  );
}
