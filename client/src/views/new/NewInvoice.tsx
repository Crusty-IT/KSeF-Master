// src/views/dashboard/NewInvoice.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import './NewInvoice.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import ContractorSelect, { type PartyValue } from '../../components/form/ContractorSelect';
import NumberInput from '../../components/form/NumberInput';
import CurrencyInput from '../../components/form/CurrencyInput';
import VatSelect from '../../components/form/VatSelect';
import { formatPLN, round2 } from '../../helpers/money';
import { isValidNip, sanitizeNip } from '../../helpers/nip';
import { calcLine, sumTotals, type VatRate } from '../../helpers/vat';
import { NavLink, useNavigate } from 'react-router-dom';

// ===== Types =====
export type { VatRate } from '../../helpers/vat';

export interface InvoiceLineDraft {
  name: string;
  pkwiu?: string;
  qty: number;
  unit: string;
  priceNet: number;
  vatRate: VatRate;
  discount?: number;
}

export interface Party { name: string; nip: string; address: string; bankAccount?: string; }

export interface InvoiceDraft {
  number: string;
  place: string;
  issueDate: string; // yyyy-mm-dd
  sellDate: string;  // yyyy-mm-dd
  currency: 'PLN';
  seller: Party;
  buyer: Party;
  lines: InvoiceLineDraft[];
  payment: { method: 'przelew' | 'gotówka'; dueDays: number; dueDate: string; bankAccount?: string; mpp: boolean; };
  notes?: string;
}

const DRAFT_KEY = 'invoiceDraft';
const SELLER_KEY = 'sellerParty';

function today(): string {
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso || today());
  d.setDate(d.getDate() + (days||0));
  return d.toISOString().slice(0,10);
}

function suggestNumber(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `FV/${yyyy}/${mm}/001`;
}

const emptyParty: Party = { name: '', nip: '', address: '', bankAccount: '' };
const emptyLine: InvoiceLineDraft = { name: '', qty: 1, unit: 'szt.', priceNet: 0, vatRate: 23, pkwiu: '', discount: 0 };

function loadSellerFromStorage(): Party {
  try {
    const raw = localStorage.getItem(SELLER_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      return { name: obj.name||'', nip: sanitizeNip(obj.nip||''), address: obj.address||'', bankAccount: obj.bankAccount||'' };
    }
  } catch {}
  return { ...emptyParty };
}

function loadDraft(): InvoiceDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj as InvoiceDraft;
  } catch { return null; }
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const mountedRef = useRef(false);

  const initial: InvoiceDraft = useMemo(() => {
    const fromDraft = loadDraft();
    if (fromDraft) return fromDraft;
    const seller = loadSellerFromStorage();
    const issue = today();
    return {
      number: suggestNumber(),
      place: 'Warszawa',
      issueDate: issue,
      sellDate: issue,
      currency: 'PLN',
      seller,
      buyer: { ...emptyParty },
      lines: [{ ...emptyLine }],
      payment: { method: 'przelew', dueDays: 14, dueDate: addDays(issue, 14), bankAccount: seller.bankAccount, mpp: false },
      notes: '',
    };
  }, []);

  const [draft, setDraft] = useState<InvoiceDraft>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);

  // Autosave every 1s after changes
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        // keep seller cached for prefill next time
        localStorage.setItem(SELLER_KEY, JSON.stringify(draft.seller));
      } catch {}
    }, 1000);
    return () => clearTimeout(t);
  }, [draft]);

  // Recompute due date when issueDate or dueDays changes
  useEffect(() => {
    setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDate: addDays(prev.issueDate, prev.payment.dueDays) } }));
  }, [draft.issueDate, draft.payment.dueDays]);

  // Enforce MPP -> przelew
  useEffect(() => {
    setDraft(prev => prev.payment.mpp && prev.payment.method !== 'przelew'
      ? { ...prev, payment: { ...prev.payment, method: 'przelew' } }
      : prev);
  }, [draft.payment.mpp]);

  const totals = useMemo(() => sumTotals(draft.lines.map(l => ({ qty: l.qty, priceNet: l.priceNet, discount: l.discount || 0, vatRate: l.vatRate }))), [draft.lines]);

  function validate(): string[] {
    const errs: string[] = [];
    if (!draft.issueDate) errs.push('Data wystawienia jest wymagana.');
    if (!draft.sellDate) errs.push('Data sprzedaży jest wymagana.');
    if (draft.currency !== 'PLN') errs.push('Waluta musi być PLN.');
    // Parties
    if (!isValidNip(draft.seller.nip)) errs.push('NIP sprzedawcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
    if (!isValidNip(draft.buyer.nip)) errs.push('NIP nabywcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
    if (!draft.seller.name) errs.push('Nazwa sprzedawcy jest wymagana.');
    if (!draft.buyer.name) errs.push('Nazwa nabywcy jest wymagana.');
    if (!draft.seller.address) errs.push('Adres sprzedawcy jest wymagany.');
    if (!draft.buyer.address) errs.push('Adres nabywcy jest wymagany.');
    // Lines
    if (!draft.lines.length) errs.push('Dodaj co najmniej jedną pozycję.');
    draft.lines.forEach((l, idx) => {
      if (!l.name) errs.push(`Pozycja #${idx+1}: nazwa jest wymagana.`);
      if (!(l.qty > 0)) errs.push(`Pozycja #${idx+1}: ilość musi być dodatnia.`);
      if (!(l.priceNet > 0)) errs.push(`Pozycja #${idx+1}: cena netto musi być dodatnia.`);
    });
    // Totals check
    const sumNet = totals.net;
    const sumVat = totals.vat;
    const sumGross = totals.gross;
    if (Math.abs(round2(sumNet + sumVat) - sumGross) > 0.01) errs.push('Suma kontrolna nie zgadza się: netto + VAT musi równać się brutto.');
    // Payment
    if (draft.payment.mpp && draft.payment.method !== 'przelew') errs.push('Dla MPP metoda płatności musi być przelew.');
    if (draft.payment.method === 'przelew' && !draft.payment.bankAccount) errs.push('Dla przelewu wymagany jest rachunek bankowy.');
    return errs;
  }

  function updateSeller(v: PartyValue) {
    setDraft(prev => ({ ...prev, seller: { name: v.name, nip: sanitizeNip(v.nip), address: v.address, bankAccount: v.bankAccount } }));
  }
  function updateBuyer(v: PartyValue) {
    setDraft(prev => ({ ...prev, buyer: { name: v.name, nip: sanitizeNip(v.nip), address: v.address, bankAccount: v.bankAccount } }));
  }

  function updateLine(index: number, patch: Partial<InvoiceLineDraft>) {
    setDraft(prev => ({ ...prev, lines: prev.lines.map((l,i)=> i===index ? { ...l, ...patch } : l) }));
  }
  function addLine() {
    setDraft(prev => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
  }
  function removeLine(index: number) {
    setDraft(prev => ({ ...prev, lines: prev.lines.filter((_,i)=> i!==index) }));
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      localStorage.setItem(SELLER_KEY, JSON.stringify(draft.seller));
      setInfo('Szkic zapisany lokalnie.');
      setTimeout(()=> setInfo(null), 2000);
    } catch {}
  }

  function clearForm() {
    localStorage.removeItem(DRAFT_KEY);
    setDraft({
      number: suggestNumber(),
      place: 'Warszawa',
      issueDate: today(),
      sellDate: today(),
      currency: 'PLN',
      seller: loadSellerFromStorage(),
      buyer: { ...emptyParty },
      lines: [{ ...emptyLine }],
      payment: { method: 'przelew', dueDays: 14, dueDate: addDays(today(), 14), bankAccount: loadSellerFromStorage().bankAccount, mpp: false },
      notes: '',
    });
    setErrors([]);
  }

  function handlePrint() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    setTimeout(() => window.print(), 100);
  }

  const errorBlock = errors.length > 0 ? (
    <div className="error-message" style={{ marginBottom: 12 }}>
      <strong>Popraw poniższe błędy, aby wygenerować PDF:</strong>
      <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
    </div>
  ) : null;

  const { byRate } = totals;

  return (
    <div className="dash-root">
      <aside className="side-nav" aria-label="Nawigacja boczna">
        <div className="brand">
          <div className="logo-dot" aria-hidden="true" />
          <span className="brand-name">KSeF Master</span>
        </div>
        <a className="btn-accent new-invoice" href="#" onClick={(e)=>{e.preventDefault(); navigate('/invoices/new');}}>+ Wystaw e-Fakturę</a>
        <nav className="nav-list">
          <NavLink className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} to="/dashboard"><span className="icon" aria-hidden>🏠</span> Pulpit Główny</NavLink>
          <NavLink className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} to="/invoices/received"><span className="icon" aria-hidden>📥</span> Faktury KSeF (Odebrane)</NavLink>
          <NavLink className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} to="/invoices/issued"><span className="icon" aria-hidden>📤</span> Faktury KSeF (Wystawione)</NavLink>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}><span className="icon" aria-hidden>👥</span> Klienci</a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}><span className="icon" aria-hidden>📊</span> Raporty</a>
          <a className="nav-item" href="#" onClick={(e)=>e.preventDefault()}><span className="icon" aria-hidden>⚙️</span> Ustawienia</a>
          <NavLink className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`} to="/"><span className="icon" aria-hidden>↩️</span> Start</NavLink>
        </nav>
      </aside>

      <main className="dash-main">
        <header className="dash-header">
          <h1>Nowa Faktura</h1>
          <p className="subtitle">MVP – wystaw fakturę sprzedaży i wygeneruj PDF</p>
        </header>

        <section className="ops-section">
          <div className="ops-header">
            <h2>Dane dokumentu</h2>
            <div className="ops-actions">
              <PrimaryButton onClick={saveDraft} icon="💾">Zapisz szkic</PrimaryButton>
              <button className="btn-light" onClick={clearForm}>Wyczyść</button>
              <PrimaryButton onClick={handlePrint} icon="🖨">Generuj PDF</PrimaryButton>
              <button className="btn-light" disabled title="Dostępne wkrótce">Wyślij do KSeF</button>
            </div>
          </div>

          {info ? <div className="info-banner">{info}</div> : null}
          {errorBlock}

          {/* Krok 1: Dane dokumentu */}
          <div className="card">
            <div className="field-row">
              <label>Typ dokumentu
                <input type="text" value="Faktura sprzedaży" readOnly />
              </label>
              <label>Numer
                <input type="text" value={draft.number} onChange={(e)=> setDraft(prev => ({ ...prev, number: e.target.value }))} />
                <div className="hint">Sugestia: <button className="link" onClick={(e)=>{e.preventDefault(); setDraft(prev => ({ ...prev, number: suggestNumber() }));}}>Użyj sugestii</button></div>
              </label>
              <label>Miejsce wystawienia
                <input type="text" value={draft.place} onChange={(e)=> setDraft(prev => ({ ...prev, place: e.target.value }))} />
              </label>
            </div>
            <div className="field-row">
              <label>Data wystawienia
                <input type="date" value={draft.issueDate} onChange={(e)=> setDraft(prev => ({ ...prev, issueDate: e.target.value }))} />
              </label>
              <label>Data sprzedaży
                <input type="date" value={draft.sellDate} onChange={(e)=> setDraft(prev => ({ ...prev, sellDate: e.target.value }))} />
              </label>
              <label>Waluta
                <select value={draft.currency} onChange={(e)=> setDraft(prev => ({ ...prev, currency: e.target.value as any }))}>
                  <option value="PLN">PLN</option>
                </select>
              </label>
            </div>
          </div>

          {/* Krok 2: Strony */}
          <div className="two-col">
            <div>
              <h3>Sprzedawca</h3>
              <ContractorSelect label="Sprzedawca" value={draft.seller} onChange={updateSeller} allowBank />
            </div>
            <div>
              <h3>Nabywca</h3>
              <ContractorSelect label="Nabywca" value={draft.buyer} onChange={updateBuyer} />
            </div>
          </div>

          {/* Krok 3: Pozycje i płatność */}
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{minWidth:200}}>Nazwa</th>
                    <th>PKWiU</th>
                    <th>Ilość</th>
                    <th>j.m.</th>
                    <th>Cena netto</th>
                    <th>VAT</th>
                    <th>Rabat %</th>
                    <th>Netto</th>
                    <th>VAT</th>
                    <th>Brutto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.lines.map((l, idx) => {
                    const res = calcLine({ qty: l.qty, priceNet: l.priceNet, discount: l.discount||0, vatRate: l.vatRate });
                    return (
                      <tr key={idx}>
                        <td><input type="text" value={l.name} onChange={(e)=> updateLine(idx, { name: e.target.value })} placeholder="Nazwa towaru/usługi" /></td>
                        <td><input type="text" value={l.pkwiu || ''} onChange={(e)=> updateLine(idx, { pkwiu: e.target.value })} placeholder="opcjonalnie" /></td>
                        <td style={{width:90}}><NumberInput value={l.qty} onChange={(v)=> updateLine(idx, { qty: v })} min={0} /></td>
                        <td style={{width:80}}><input type="text" value={l.unit} onChange={(e)=> updateLine(idx, { unit: e.target.value })} /></td>
                        <td style={{width:130}}><CurrencyInput value={l.priceNet} onChange={(v)=> updateLine(idx, { priceNet: v })} /></td>
                        <td style={{width:100}}><VatSelect value={l.vatRate} onChange={(v)=> updateLine(idx, { vatRate: v })} /></td>
                        <td style={{width:100}}><NumberInput value={l.discount || 0} onChange={(v)=> updateLine(idx, { discount: v })} min={0} /></td>
                        <td>{formatPLN(res.net)}</td>
                        <td>{formatPLN(res.vat)}</td>
                        <td>{formatPLN(res.gross)}</td>
                        <td><button className="btn-light small" onClick={()=> removeLine(idx)}>Usuń</button></td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={11}>
                      <button className="btn-light" onClick={addLine}>+ Dodaj pozycję</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pasek sumaryczny */}
            <div className="summary-bar">Netto: <strong>{formatPLN(totals.net)}</strong> | VAT: <strong>{formatPLN(totals.vat)}</strong> | Brutto: <strong>{formatPLN(totals.gross)}</strong></div>

            {/* Płatność */}
            <div className="field-row">
              <label>Metoda płatności
                <select value={draft.payment.method} onChange={(e)=> setDraft(prev => ({ ...prev, payment: { ...prev.payment, method: e.target.value as any } }))}>
                  <option value="przelew">przelew</option>
                  <option value="gotówka">gotówka</option>
                </select>
              </label>
              <label>Termin (dni)
                <NumberInput value={draft.payment.dueDays} onChange={(v)=> setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDays: v } }))} min={0} />
              </label>
              <label>Termin płatności
                <input type="date" value={draft.payment.dueDate} onChange={(e)=> setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDate: e.target.value } }))} />
              </label>
              <label>Rachunek bankowy
                <input type="text" value={draft.payment.bankAccount || ''} onChange={(e)=> setDraft(prev => ({ ...prev, payment: { ...prev.payment, bankAccount: e.target.value } }))} placeholder="PL.. lub 26 cyfr" />
              </label>
              <label className="checkbox"><input type="checkbox" checked={draft.payment.mpp} onChange={(e)=> setDraft(prev => ({ ...prev, payment: { ...prev.payment, mpp: e.target.checked } }))} /> MPP (Mechanizm Podzielonej Płatności)</label>
            </div>

            <label>Uwagi do faktury
              <textarea value={draft.notes || ''} onChange={(e)=> setDraft(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
            </label>
          </div>
        </section>

        {/* PRINT AREA */}
        <section className="print-only">
          <div className="print-a4">
            <header className="print-header">
              <h1>Faktura VAT {draft.number}</h1>
              <div>Data wystawienia: {draft.issueDate} • Data sprzedaży: {draft.sellDate} • Miejsce: {draft.place}</div>
            </header>

            <div className="print-parties">
              <div>
                <h3>Sprzedawca</h3>
                <div>{draft.seller.name}</div>
                <div>NIP: {draft.seller.nip}</div>
                <div>{draft.seller.address}</div>
                {draft.seller.bankAccount ? <div>Rachunek: {draft.seller.bankAccount}</div> : null}
              </div>
              <div>
                <h3>Nabywca</h3>
                <div>{draft.buyer.name}</div>
                <div>NIP: {draft.buyer.nip}</div>
                <div>{draft.buyer.address}</div>
              </div>
            </div>

            <table className="print-table">
              <thead>
                <tr><th>#</th><th>Nazwa</th><th>PKWiU</th><th>Ilość</th><th>j.m.</th><th>Cena netto</th><th>VAT</th><th>Netto</th><th>VAT</th><th>Brutto</th></tr>
              </thead>
              <tbody>
                {draft.lines.map((l, i) => {
                  const r = calcLine({ qty: l.qty, priceNet: l.priceNet, discount: l.discount||0, vatRate: l.vatRate });
                  return (
                    <tr key={i}>
                      <td>{i+1}</td>
                      <td>{l.name}</td>
                      <td>{l.pkwiu || ''}</td>
                      <td>{l.qty}</td>
                      <td>{l.unit}</td>
                      <td>{formatPLN(l.priceNet)}</td>
                      <td>{typeof l.vatRate === 'number' ? `${l.vatRate}%` : l.vatRate}</td>
                      <td>{formatPLN(r.net)}</td>
                      <td>{formatPLN(r.vat)}</td>
                      <td>{formatPLN(r.gross)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="print-totals">
              <div className="by-rate">
                <h4>Podsumowanie VAT wg stawek</h4>
                <table>
                  <thead><tr><th>Stawka</th><th>Netto</th><th>VAT</th><th>Brutto</th></tr></thead>
                  <tbody>
                    {Object.keys(byRate).map((rate) => (
                      <tr key={rate}><td>{rate}</td><td>{formatPLN(byRate[rate].net)}</td><td>{formatPLN(byRate[rate].vat)}</td><td>{formatPLN(byRate[rate].gross)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grand">
                <div>Razem netto: {formatPLN(totals.net)}</div>
                <div>Razem VAT: {formatPLN(totals.vat)}</div>
                <div>Razem brutto: {formatPLN(totals.gross)}</div>
              </div>
            </div>

            <footer className="print-footer">
              <div>Metoda płatności: {draft.payment.method} • Termin płatności: {draft.payment.dueDate} • Rachunek: {draft.payment.bankAccount || '-'}</div>
              {draft.payment.mpp ? <div><strong>MPP:</strong> Mechanizm Podzielonej Płatności</div> : null}
              {draft.notes ? <div>Uwagi: {draft.notes}</div> : null}
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
