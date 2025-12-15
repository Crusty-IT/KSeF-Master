// src/views/new/NewInvoice.tsx
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
import { calcLine, type VatRate } from '../../helpers/vat';
import SideNav from '../../components/layout/SideNav';
import { useAuth } from '../../context/AuthContext';
import { sendInvoice, openSession, closeSession, type CreateInvoiceRequest } from '../../services/ksefApi';

// Klucz do przechowywania wysłanych faktur
const SENT_INVOICES_KEY = 'sentInvoices';

interface SentInvoiceRecord {
    invoiceNumber: string;
    elementReferenceNumber: string;
    sentAt: string;
    sellerNip: string;
    buyerNip: string;
    buyerName: string;
    grossAmount: number;
}

function saveSentInvoice(record: SentInvoiceRecord) {
    try {
        const raw = localStorage.getItem(SENT_INVOICES_KEY);
        const existing: SentInvoiceRecord[] = raw ? JSON.parse(raw) : [];
        existing.unshift(record);
        const trimmed = existing.slice(0, 100);
        localStorage.setItem(SENT_INVOICES_KEY, JSON.stringify(trimmed));
    } catch { /* ignore */ }
}

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
    issueDate: string;
    sellDate: string;
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
    return d.toISOString().slice(0, 10);
}

function addDays(dateIso: string, days: number): string {
    const d = new Date(dateIso || today());
    d.setDate(d.getDate() + (days || 0));
    return d.toISOString().slice(0, 10);
}

function suggestNumber(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `FV/${yyyy}/${mm}/001`;
}

const emptyParty: Party = { name: '', nip: '', address: '', bankAccount: '' };
const emptyLine: InvoiceLineDraft = { name: '', qty: 1, unit: 'szt.', priceNet: 0, vatRate: 23, pkwiu: '', discount: 0 };

function loadSellerFromStorage(sessionNip?: string | null): Party {
    try {
        const raw = localStorage.getItem(SELLER_KEY);
        if (raw) {
            const obj = JSON.parse(raw);
            return {
                name: obj.name || '',
                nip: sessionNip || sanitizeNip(obj.nip || ''),
                address: obj.address || '',
                bankAccount: obj.bankAccount || ''
            };
        }
    } catch { /* ignore */ }
    return { ...emptyParty, nip: sessionNip || '' };
}

function loadDraft(sessionNip?: string | null): InvoiceDraft | null {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw) as InvoiceDraft;
        if (sessionNip) {
            obj.seller.nip = sessionNip;
        }
        return obj;
    } catch { return null; }
}

function mapVatRateToKsef(vatRate: VatRate): string {
    if (typeof vatRate === 'number') {
        return String(vatRate);
    }
    return vatRate.toLowerCase();
}

export default function NewInvoice() {
    const mountedRef = useRef(false);
    const { nip: sessionNip, isAuthenticated } = useAuth();

    const initial: InvoiceDraft = useMemo(() => {
        const fromDraft = loadDraft(sessionNip);
        if (fromDraft) return fromDraft;
        const seller = loadSellerFromStorage(sessionNip);
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
    }, [sessionNip]);

    const [draft, setDraft] = useState<InvoiceDraft>(initial);
    const [errors, setErrors] = useState<string[]>([]);
    const [info, setInfo] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (sessionNip && draft.seller.nip !== sessionNip) {
            setDraft(prev => ({
                ...prev,
                seller: { ...prev.seller, nip: sessionNip }
            }));
        }
    }, [sessionNip, draft.seller.nip]);

    useEffect(() => {
        if (!mountedRef.current) { mountedRef.current = true; return; }
        const t = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
                localStorage.setItem(SELLER_KEY, JSON.stringify(draft.seller));
            } catch { /* ignore */ }
        }, 1000);
        return () => clearTimeout(t);
    }, [draft]);

    useEffect(() => {
        setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDate: addDays(prev.issueDate, prev.payment.dueDays) } }));
    }, [draft.issueDate, draft.payment.dueDays]);

    useEffect(() => {
        setDraft(prev => prev.payment.mpp && prev.payment.method !== 'przelew'
            ? { ...prev, payment: { ...prev.payment, method: 'przelew' } }
            : prev);
    }, [draft.payment.mpp]);

    const totals = useMemo(() => {
        let totalNet = 0;
        let totalVat = 0;
        let totalGross = 0;
        const perRate: { [rate: string]: { net: number, vat: number, gross: number } } = {};

        draft.lines.forEach(line => {
            const { net, vat, gross } = calcLine({
                qty: line.qty,
                priceNet: line.priceNet,
                discount: line.discount || 0,
                vatRate: line.vatRate,
            });

            totalNet += net;
            totalVat += vat;
            totalGross += gross;

            const rateKey = typeof line.vatRate === 'number' ? `${line.vatRate}%` : line.vatRate;
            if (!perRate[rateKey]) {
                perRate[rateKey] = { net: 0, vat: 0, gross: 0 };
            }
            perRate[rateKey].net += net;
            perRate[rateKey].vat += vat;
            perRate[rateKey].gross += gross;
        });

        return {
            net: round2(totalNet),
            vat: round2(totalVat),
            gross: round2(totalGross),
            perRate,
        };
    }, [draft.lines]);

    function validate(): string[] {
        const errs: string[] = [];
        if (!draft.issueDate) errs.push('Data wystawienia jest wymagana.');
        if (!draft.sellDate) errs.push('Data sprzedaży jest wymagana.');
        if (draft.currency !== 'PLN') errs.push('Waluta musi być PLN.');
        if (!isValidNip(draft.seller.nip)) errs.push('NIP sprzedawcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
        if (!isValidNip(draft.buyer.nip)) errs.push('NIP nabywcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
        if (!draft.seller.name) errs.push('Nazwa sprzedawcy jest wymagana.');
        if (!draft.buyer.name) errs.push('Nazwa nabywcy jest wymagana.');
        if (!draft.seller.address) errs.push('Adres sprzedawcy jest wymagany.');
        if (!draft.buyer.address) errs.push('Adres nabywcy jest wymagany.');
        if (!draft.lines.length) errs.push('Dodaj co najmniej jedną pozycję.');
        draft.lines.forEach((l, idx) => {
            if (!l.name) errs.push(`Pozycja #${idx + 1}: nazwa jest wymagana.`);
            if (!(l.qty > 0)) errs.push(`Pozycja #${idx + 1}: ilość musi być dodatnia.`);
            if (!(l.priceNet > 0)) errs.push(`Pozycja #${idx + 1}: cena netto musi być dodatnia.`);
        });
        const sumNet = totals.net;
        const sumVat = totals.vat;
        const sumGross = totals.gross;
        if (Math.abs(round2(sumNet + sumVat) - sumGross) > 0.01) errs.push('Suma kontrolna nie zgadza się: netto + VAT musi równać się brutto.');
        if (draft.payment.mpp && draft.payment.method !== 'przelew') errs.push('Dla MPP metoda płatności musi być przelew.');
        if (draft.payment.method === 'przelew' && !draft.payment.bankAccount) errs.push('Dla przelewu wymagany jest rachunek bankowy.');
        return errs;
    }

    function updateBuyer(v: PartyValue) {
        setDraft(prev => ({ ...prev, buyer: { name: v.name, nip: sanitizeNip(v.nip), address: v.address, bankAccount: v.bankAccount } }));
    }

    function updateLine(index: number, patch: Partial<InvoiceLineDraft>) {
        setDraft(prev => ({ ...prev, lines: prev.lines.map((l, i) => i === index ? { ...l, ...patch } : l) }));
    }

    function addLine() {
        setDraft(prev => ({ ...prev, lines: [...prev.lines, { ...emptyLine }] }));
    }

    function removeLine(index: number) {
        setDraft(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));
    }

    function saveDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
            localStorage.setItem(SELLER_KEY, JSON.stringify(draft.seller));
            setInfo('Szkic zapisany lokalnie.');
            setTimeout(() => setInfo(null), 2000);
        } catch { /* ignore */ }
    }

    function clearForm() {
        localStorage.removeItem(DRAFT_KEY);
        const seller = loadSellerFromStorage(sessionNip);
        setDraft({
            number: suggestNumber(),
            place: 'Warszawa',
            issueDate: today(),
            sellDate: today(),
            currency: 'PLN',
            seller,
            buyer: { ...emptyParty },
            lines: [{ ...emptyLine }],
            payment: { method: 'przelew', dueDays: 14, dueDate: addDays(today(), 14), bankAccount: seller.bankAccount, mpp: false },
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

    async function handleSendToKsef() {
        if (!isAuthenticated) {
            setErrors(['Musisz być zalogowany do KSeF, aby wysłać fakturę.']);
            return;
        }

        const errs = validate();
        setErrors(errs);
        if (errs.length > 0) {
            return;
        }

        setIsSending(true);
        setInfo('Otwieranie sesji KSeF...');

        try {
            const sessionResponse = await openSession();
            if (!sessionResponse.success) {
                throw new Error(sessionResponse.error || 'Nie udało się otworzyć sesji KSeF');
            }

            setInfo('Wysyłanie faktury do KSeF...');

            const invoiceRequest: CreateInvoiceRequest = {
                invoiceNumber: draft.number,
                issueDate: draft.issueDate,
                saleDate: draft.sellDate,
                seller: {
                    nip: draft.seller.nip,
                    name: draft.seller.name,
                    countryCode: 'PL',
                    addressLine1: draft.seller.address,
                },
                buyer: {
                    nip: draft.buyer.nip,
                    name: draft.buyer.name,
                    countryCode: 'PL',
                    addressLine1: draft.buyer.address,
                },
                items: draft.lines.map(line => ({
                    name: line.name,
                    unit: line.unit,
                    quantity: line.qty,
                    unitPriceNet: line.priceNet,
                    vatRate: mapVatRateToKsef(line.vatRate),
                })),
                currency: draft.currency,
                issuePlace: draft.place,
            };

            const sendResponse = await sendInvoice(invoiceRequest);

            if (!sendResponse.success) {
                throw new Error(sendResponse.error || 'Nie udało się wysłać faktury');
            }

            saveSentInvoice({
                invoiceNumber: draft.number,
                elementReferenceNumber: sendResponse.data?.elementReferenceNumber || '',
                sentAt: new Date().toISOString(),
                sellerNip: draft.seller.nip,
                buyerNip: draft.buyer.nip,
                buyerName: draft.buyer.name,
                grossAmount: totals.gross,
            });

            await closeSession();

            const refNumber = sendResponse.data?.elementReferenceNumber;
            setInfo(`✅ Faktura wysłana do KSeF! Numer referencyjny: ${refNumber || 'brak'}`);

            setTimeout(() => {
                if (window.confirm('Faktura została wysłana. Czy chcesz wyczyścić formularz?')) {
                    clearForm();
                }
            }, 1500);

        } catch (error) {
            console.error('Błąd wysyłki do KSeF:', error);
            const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
            setErrors([`Błąd wysyłki do KSeF: ${errorMessage}`]);
            setInfo(null);
        } finally {
            setIsSending(false);
        }
    }

    const errorBlock = errors.length > 0 ? (
        <div className="error-message" style={{ marginBottom: 12 }}>
            <strong>Popraw poniższe błędy:</strong>
            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
    ) : null;

    const { perRate } = totals;

    return (
        <div className="dash-root print-only-container">
            <SideNav />

            <main className="dash-main">
                <header className="dash-header">
                    <h1>Nowa Faktura</h1>
                    <p className="subtitle">Wystaw fakturę sprzedaży i wyślij do KSeF</p>
                </header>

                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Dane dokumentu</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={saveDraft} icon="💾">Zapisz szkic</PrimaryButton>
                            <button className="btn-light" onClick={clearForm}>Wyczyść</button>
                            <PrimaryButton onClick={handlePrint} icon="🖨">Generuj PDF</PrimaryButton>
                            <PrimaryButton
                                onClick={handleSendToKsef}
                                icon="📤"
                                disabled={isSending || !isAuthenticated}
                                title={!isAuthenticated ? 'Zaloguj się do KSeF, aby wysłać fakturę' : undefined}
                            >
                                {isSending ? 'Wysyłanie...' : 'Wyślij do KSeF'}
                            </PrimaryButton>
                        </div>
                    </div>

                    {!isAuthenticated && (
                        <div className="warning-banner" style={{
                            padding: '12px',
                            marginBottom: '12px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '4px',
                            color: '#856404',
                            border: '1px solid #ffc107'
                        }}>
                            ⚠️ Nie jesteś zalogowany do KSeF. Aby wysłać fakturę, najpierw się zaloguj.
                        </div>
                    )}

                    {info ? <div className="info-banner" style={{
                        padding: '12px',
                        marginBottom: '12px',
                        backgroundColor: info.startsWith('✅') ? '#d4edda' : '#cce5ff',
                        borderRadius: '4px',
                        color: info.startsWith('✅') ? '#155724' : '#004085'
                    }}>{info}</div> : null}
                    {errorBlock}

                    {/* Krok 1: Dane dokumentu */}
                    <div className="card">
                        <div className="field-row">
                            <label>Typ dokumentu
                                <input type="text" value="Faktura sprzedaży" readOnly />
                            </label>
                            <label>Numer
                                <input type="text" value={draft.number} onChange={(e) => setDraft(prev => ({ ...prev, number: e.target.value }))} />
                                <div className="hint">Sugestia: <button className="link" onClick={(e) => { e.preventDefault(); setDraft(prev => ({ ...prev, number: suggestNumber() })); }}>Użyj sugestii</button></div>
                            </label>
                            <label>Miejsce wystawienia
                                <input type="text" value={draft.place} onChange={(e) => setDraft(prev => ({ ...prev, place: e.target.value }))} />
                            </label>
                        </div>
                        <div className="field-row">
                            <label>Data wystawienia
                                <input type="date" value={draft.issueDate} onChange={(e) => setDraft(prev => ({ ...prev, issueDate: e.target.value }))} />
                            </label>
                            <label>Data sprzedaży
                                <input type="date" value={draft.sellDate} onChange={(e) => setDraft(prev => ({ ...prev, sellDate: e.target.value }))} />
                            </label>
                            <label>Waluta
                                <select value={draft.currency} onChange={(e) => setDraft(prev => ({ ...prev, currency: e.target.value as 'PLN' }))}>
                                    <option value="PLN">PLN</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* Krok 2: Strony */}
                    <div className="two-col">
                        <div className="card">
                            <h3>Sprzedawca</h3>

                            {/* NIP sprzedawcy - zablokowany, pobierany z sesji */}
                            <div className="seller-nip-box">
                                <span className="seller-nip-label">NIP Sprzedawcy (z sesji KSeF)</span>
                                <span className="seller-nip-value">
                                    {draft.seller.nip || 'Zaloguj się do KSeF'}
                                </span>
                            </div>

                            {/* Pozostałe pola sprzedawcy - używamy tego samego stylu co reszta formularza */}
                            <label>
                                Nazwa firmy *
                                <input
                                    type="text"
                                    value={draft.seller.name}
                                    onChange={(e) => setDraft(prev => ({
                                        ...prev,
                                        seller: { ...prev.seller, name: e.target.value }
                                    }))}
                                    placeholder="Nazwa sprzedawcy"
                                />
                            </label>

                            <label>
                                Adres *
                                <input
                                    type="text"
                                    value={draft.seller.address}
                                    onChange={(e) => setDraft(prev => ({
                                        ...prev,
                                        seller: { ...prev.seller, address: e.target.value }
                                    }))}
                                    placeholder="Ulica, numer, kod pocztowy, miasto"
                                />
                            </label>

                            <label>
                                Rachunek bankowy
                                <input
                                    type="text"
                                    value={draft.seller.bankAccount || ''}
                                    onChange={(e) => setDraft(prev => ({
                                        ...prev,
                                        seller: { ...prev.seller, bankAccount: e.target.value }
                                    }))}
                                    placeholder="PL00 0000 0000 0000 0000 0000 0000"
                                />
                            </label>
                        </div>

                        <div className="card">
                            <h3>Nabywca</h3>
                            <ContractorSelect value={draft.buyer} onChange={updateBuyer} />
                        </div>
                    </div>

                    {/* Krok 3: Pozycje faktury */}
                    <div className="card">
                        <h3>Pozycje faktury</h3>
                        <div className="table-wrap">
                            <table className="data-table invoice-lines-table">
                                <thead>
                                <tr>
                                    <th>Nazwa towaru/usługi</th>
                                    <th>PKWiU</th>
                                    <th>Ilość</th>
                                    <th>J.m.</th>
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
                                    const res = calcLine({ qty: l.qty, priceNet: l.priceNet, discount: l.discount || 0, vatRate: l.vatRate });
                                    return (
                                        <tr key={idx}>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={l.name}
                                                    onChange={(e) => updateLine(idx, { name: e.target.value })}
                                                    placeholder="Nazwa towaru/usługi"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={l.pkwiu || ''}
                                                    onChange={(e) => updateLine(idx, { pkwiu: e.target.value })}
                                                    placeholder="opcjonalnie"
                                                />
                                            </td>
                                            <td>
                                                <NumberInput
                                                    value={l.qty}
                                                    onChange={(v) => updateLine(idx, { qty: v ?? 0 })}
                                                    min={0}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={l.unit}
                                                    onChange={(e) => updateLine(idx, { unit: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <CurrencyInput
                                                    value={l.priceNet}
                                                    onChange={(v) => updateLine(idx, { priceNet: v ?? 0 })}
                                                />
                                            </td>
                                            <td>
                                                <VatSelect
                                                    value={l.vatRate}
                                                    onChange={(v) => updateLine(idx, { vatRate: v })}
                                                />
                                            </td>
                                            <td>
                                                <NumberInput
                                                    value={l.discount || 0}
                                                    onChange={(v) => updateLine(idx, { discount: v })}
                                                    min={0}
                                                />
                                            </td>
                                            <td className="text-right">{formatPLN(res.net)}</td>
                                            <td className="text-right">{formatPLN(res.vat)}</td>
                                            <td className="text-right">{formatPLN(res.gross)}</td>
                                            <td>
                                                <button
                                                    className="btn-light small danger"
                                                    onClick={() => removeLine(idx)}
                                                    title="Usuń pozycję"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                                <tfoot>
                                <tr>
                                    <td colSpan={11}>
                                        <button className="btn-light" onClick={addLine}>+ Dodaj pozycję</button>
                                    </td>
                                </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Pasek sumaryczny */}
                        <div className="summary-bar">
                            <span>Netto: <strong>{formatPLN(totals.net)}</strong></span>
                            <span>VAT: <strong>{formatPLN(totals.vat)}</strong></span>
                            <span>Brutto: <strong>{formatPLN(totals.gross)}</strong></span>
                        </div>
                    </div>

                    {/* Krok 4: Płatność */}
                    <div className="card">
                        <h3>Płatność</h3>
                        <div className="field-row">
                            <label>Metoda płatności
                                <select value={draft.payment.method} onChange={(e) => setDraft(prev => ({ ...prev, payment: { ...prev.payment, method: e.target.value as InvoiceDraft['payment']['method'] } }))}>
                                    <option value="przelew">przelew</option>
                                    <option value="gotówka">gotówka</option>
                                </select>
                            </label>
                            <label>Termin (dni)
                                <NumberInput value={draft.payment.dueDays} onChange={(v) => setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDays: v ?? 0 } }))} min={0} />
                            </label>
                            <label>Termin płatności
                                <input type="date" value={draft.payment.dueDate} onChange={(e) => setDraft(prev => ({ ...prev, payment: { ...prev.payment, dueDate: e.target.value } }))} />
                            </label>
                            <label>Rachunek bankowy
                                <input type="text" value={draft.payment.bankAccount || ''} onChange={(e) => setDraft(prev => ({ ...prev, payment: { ...prev.payment, bankAccount: e.target.value } }))} placeholder="PL.. lub 26 cyfr" />
                            </label>
                        </div>
                        <label className="checkbox">
                            <input type="checkbox" checked={draft.payment.mpp} onChange={(e) => setDraft(prev => ({ ...prev, payment: { ...prev.payment, mpp: e.target.checked } }))} />
                            MPP (Mechanizm Podzielonej Płatności)
                        </label>

                        <label style={{ marginTop: '16px', display: 'block' }}>
                            Uwagi do faktury
                            <textarea value={draft.notes || ''} onChange={(e) => setDraft(prev => ({ ...prev, notes: e.target.value }))} rows={3} />
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
                                const r = calcLine({ qty: l.qty, priceNet: l.priceNet, discount: l.discount || 0, vatRate: l.vatRate });
                                return (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
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
                                    {Object.keys(perRate).map((rate) => (
                                        <tr key={rate}><td>{rate}</td><td>{formatPLN(perRate[rate].net)}</td><td>{formatPLN(perRate[rate].vat)}</td><td>{formatPLN(perRate[rate].gross)}</td></tr>
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