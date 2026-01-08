import { useEffect, useMemo, useRef, useState } from 'react';
import './NewInvoice.css';
import '../dashboard/Dashboard.css';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import ContractorSelect, { type PartyValue } from '../../components/form/ContractorSelect';
import NumberInput from '../../components/form/NumberInput';
import CurrencyInput from '../../components/form/CurrencyInput';
import VatSelect from '../../components/form/VatSelect';
import BankAccountInput from '../../components/form/BankAccountInput';
import { formatPLN, round2 } from '../../helpers/money';
import { isValidNip, sanitizeNip } from '../../helpers/nip';
import { calcLine, type VatRate } from '../../helpers/vat';
import SideNav from '../../components/layout/SideNav';
import { useAuth } from '../../context/AuthContext';
import { sendInvoice, type CreateInvoiceRequest } from '../../services/ksefApi';
import { getSeller } from '../../services/settings';

const SENT_INVOICES_KEY = 'sentInvoices';

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

function saveSentInvoice(record: SentInvoiceRecord) {
    try {
        const raw = localStorage.getItem(SENT_INVOICES_KEY);
        const existing: SentInvoiceRecord[] = raw ? JSON.parse(raw) : [];
        existing.unshift(record);
        const trimmed = existing.slice(0, 100);
        localStorage.setItem(SENT_INVOICES_KEY, JSON.stringify(trimmed));
    } catch { /* ignore */ }
}

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
    payment: { method: 'przelew' | 'gotówka'; dueDays: number; dueDate: string; bankAccount?: string; };
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
        const sellerProfile = getSeller();
        if (sellerProfile.name || sellerProfile.address) {
            return {
                name: sellerProfile.name || '',
                nip: sessionNip || '',
                address: sellerProfile.address || '',
                bankAccount: sellerProfile.bankAccount || ''
            };
        }

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

function isValidBankAccount(account: string | undefined): boolean {
    if (!account) return false;
    const digits = account.replace(/[^0-9]/g, '');
    return digits.length === 26;
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
            payment: {
                method: 'przelew',
                dueDays: 14,
                dueDate: addDays(issue, 14),
                bankAccount: seller.bankAccount,
            },
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
        if (draft.seller.bankAccount && !draft.payment.bankAccount) {
            setDraft(prev => ({
                ...prev,
                payment: { ...prev.payment, bankAccount: prev.seller.bankAccount }
            }));
        }
    }, [draft.seller.bankAccount, draft.payment.bankAccount]);

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

        if (!draft.number.trim()) errs.push('Numer faktury jest wymagany.');
        if (!draft.issueDate) errs.push('Data wystawienia jest wymagana.');
        if (!draft.sellDate) errs.push('Data sprzedaży jest wymagana.');
        if (draft.currency !== 'PLN') errs.push('Waluta musi być PLN.');

        if (!isValidNip(draft.seller.nip)) errs.push('NIP sprzedawcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
        if (!draft.seller.name.trim()) errs.push('Nazwa sprzedawcy jest wymagana.');
        if (!draft.seller.address.trim()) errs.push('Adres sprzedawcy jest wymagany.');

        if (!isValidNip(draft.buyer.nip)) errs.push('NIP nabywcy jest nieprawidłowy (10 cyfr + suma kontrolna).');
        if (!draft.buyer.name.trim()) errs.push('Nazwa nabywcy jest wymagana.');
        if (!draft.buyer.address.trim()) errs.push('Adres nabywcy jest wymagany.');

        if (!draft.lines.length) errs.push('Dodaj co najmniej jedną pozycję.');
        draft.lines.forEach((l, idx) => {
            if (!l.name.trim()) errs.push(`Pozycja #${idx + 1}: nazwa jest wymagana.`);
            if (!(l.qty > 0)) errs.push(`Pozycja #${idx + 1}: ilość musi być dodatnia.`);
            if (!(l.priceNet > 0)) errs.push(`Pozycja #${idx + 1}: cena netto musi być dodatnia.`);
        });

        const sumNet = totals.net;
        const sumVat = totals.vat;
        const sumGross = totals.gross;
        if (Math.abs(round2(sumNet + sumVat) - sumGross) > 0.01) {
            errs.push('Suma kontrolna nie zgadza się: netto + VAT musi równać się brutto.');
        }

        if (draft.payment.method === 'przelew') {
            if (!draft.payment.bankAccount) {
                errs.push('Dla przelewu wymagany jest rachunek bankowy.');
            } else if (!isValidBankAccount(draft.payment.bankAccount)) {
                errs.push('Rachunek bankowy musi mieć 26 cyfr.');
            }
        }

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
            payment: {
                method: 'przelew',
                dueDays: 14,
                dueDate: addDays(today(), 14),
                bankAccount: seller.bankAccount,
            },
        });
        setErrors([]);
    }

    function copyBankFromSeller() {
        if (draft.seller.bankAccount) {
            setDraft(prev => ({
                ...prev,
                payment: { ...prev.payment, bankAccount: prev.seller.bankAccount }
            }));
        }
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
        setInfo('Wysyłanie faktury do KSeF...');

        try {
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
                payment: {
                    method: draft.payment.method,
                    dueDate: draft.payment.dueDate,
                    bankAccount: draft.payment.bankAccount,
                },
            };

            const sendResponse = await sendInvoice(invoiceRequest);

            console.log('Odpowiedź z KSeF:', JSON.stringify(sendResponse, null, 2));

            if (!sendResponse.success) {
                throw new Error(sendResponse.error || 'Nie udało się wysłać faktury');
            }

            const refNumber = sendResponse.data?.elementReferenceNumber || null;
            const invoiceHash = sendResponse.data?.invoiceHash || null;

            const itemsWithValues = draft.lines.map(line => {
                const res = calcLine({
                    qty: line.qty,
                    priceNet: line.priceNet,
                    discount: line.discount || 0,
                    vatRate: line.vatRate
                });
                return {
                    name: line.name,
                    unit: line.unit,
                    quantity: line.qty,
                    unitPriceNet: line.priceNet,
                    vatRate: typeof line.vatRate === 'number' ? `${line.vatRate}` : line.vatRate,
                    netValue: res.net,
                    vatValue: res.vat,
                    grossValue: res.gross,
                };
            });

            saveSentInvoice({
                invoiceNumber: draft.number,
                elementReferenceNumber: refNumber || 'oczekuje',
                sentAt: new Date().toISOString(),
                sellerNip: draft.seller.nip,
                buyerNip: draft.buyer.nip,
                buyerName: draft.buyer.name,
                grossAmount: totals.gross,
                invoiceHash: invoiceHash || undefined,
                issueDate: draft.issueDate,
                saleDate: draft.sellDate,
                issuePlace: draft.place,
                sellerName: draft.seller.name,
                sellerAddress: draft.seller.address,
                sellerBankAccount: draft.seller.bankAccount,
                buyerAddress: draft.buyer.address,
                items: itemsWithValues,
                totals: {
                    net: totals.net,
                    vat: totals.vat,
                    gross: totals.gross,
                    perRate: totals.perRate,
                },
                paymentMethod: draft.payment.method,
                paymentDueDate: draft.payment.dueDate,
                paymentBankAccount: draft.payment.bankAccount,
            });

            if (refNumber) {
                setInfo(`✅ Faktura wysłana do KSeF! Numer referencyjny: ${refNumber}`);
            } else {
                setInfo(`✅ Faktura została przyjęta do przetwarzania w KSeF.`);
            }

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
        <div className="dash-root print-hide-nav">
            <SideNav />

            <main className="dash-main">
                <header className="dash-header no-print">
                    <h1>Nowa Faktura</h1>
                    <p className="subtitle">Wystaw fakturę sprzedaży i wyślij do KSeF</p>
                </header>

                <section className="ops-section no-print">
                    <div className="ops-header">
                        <h2>Dane dokumentu</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={saveDraft} icon="💾">Zapisz szkic</PrimaryButton>
                            <button className="btn-light" onClick={clearForm}>Wyczyść</button>
                            <PrimaryButton onClick={handlePrint} icon="🖨">Podgląd / Drukuj</PrimaryButton>
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
                        <div className="warning-banner">
                            ⚠️ Nie jesteś zalogowany do KSeF. Aby wysłać fakturę, najpierw się zaloguj.
                        </div>
                    )}

                    {info && (
                        <div className={`info-banner ${info.startsWith('✅') ? 'success' : ''}`}>
                            {info}
                        </div>
                    )}
                    {errorBlock}

                    {/* Dane dokumentu */}
                    <div className="card">
                        <div className="field-row">
                            <label>Typ dokumentu
                                <input type="text" value="Faktura sprzedaży" readOnly />
                            </label>
                            <label>Numer
                                <input type="text" value={draft.number} onChange={(e) => setDraft(prev => ({ ...prev, number: e.target.value }))} />
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

                    {/* Strony */}
                    <div className="two-col">
                        <div className="card">
                            <h3>Sprzedawca</h3>

                            <div className="seller-nip-box">
                                <span className="seller-nip-label">NIP Sprzedawcy (z sesji KSeF)</span>
                                <span className="seller-nip-value">
                                    {draft.seller.nip || 'Zaloguj się do KSeF'}
                                </span>
                            </div>

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

                            <div style={{ marginTop: '12px' }}>
                                <BankAccountInput
                                    label="Rachunek bankowy"
                                    value={draft.seller.bankAccount || ''}
                                    onChange={(v) => setDraft(prev => ({
                                        ...prev,
                                        seller: { ...prev.seller, bankAccount: v }
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="card">
                            <h3>Nabywca</h3>
                            <ContractorSelect value={draft.buyer} onChange={updateBuyer} />
                        </div>
                    </div>

                    {/* Pozycje faktury */}
                    <div className="card">
                        <h3>Pozycje faktury</h3>
                        <div className="table-wrap">
                            <table className="invoice-lines-table">
                                <thead>
                                <tr>
                                    <th style={{width: '25%'}}>Nazwa towaru/usługi</th>
                                    <th style={{width: '8%'}}>PKWiU</th>
                                    <th style={{width: '6%'}}>Ilość</th>
                                    <th style={{width: '6%'}}>J.m.</th>
                                    <th style={{width: '10%'}}>Cena netto</th>
                                    <th style={{width: '8%'}}>VAT</th>
                                    <th style={{width: '7%'}}>Rabat %</th>
                                    <th className="text-right" style={{width: '10%'}}>Netto</th>
                                    <th className="text-right" style={{width: '10%'}}>VAT</th>
                                    <th className="text-right" style={{width: '10%'}}>Brutto</th>
                                    <th style={{width: '5%'}}></th>
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

                        <div className="summary-bar">
                            <span>Netto: <strong>{formatPLN(totals.net)}</strong></span>
                            <span>VAT: <strong>{formatPLN(totals.vat)}</strong></span>
                            <span>Brutto: <strong>{formatPLN(totals.gross)}</strong></span>
                        </div>
                    </div>

                    {/* Płatność */}
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
                        </div>

                        {draft.payment.method === 'przelew' && (
                            <div className="bank-account-section">
                                <BankAccountInput
                                    label="Rachunek bankowy do płatności"
                                    value={draft.payment.bankAccount || ''}
                                    onChange={(v) => setDraft(prev => ({
                                        ...prev,
                                        payment: { ...prev.payment, bankAccount: v }
                                    }))}
                                    required
                                />
                                {draft.seller.bankAccount && draft.payment.bankAccount !== draft.seller.bankAccount && (
                                    <button
                                        type="button"
                                        className="btn-link copy-bank-btn"
                                        onClick={copyBankFromSeller}
                                    >
                                        📋 Użyj rachunku z profilu sprzedawcy
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* ========== SEKCJA DO DRUKU ========== */}
                <section className="print-only">
                    <div className="print-invoice">
                        {/* Wrapper dla treści - flex: 1 */}
                        <div className="print-content">
                            {/* Nagłówek */}
                            <div className="print-header">
                                <div className="print-header-left">
                                    <h2>Krajowy System e-Faktur</h2>
                                    <div className="ksef-label">KSeF</div>
                                </div>
                                <div className="print-header-right">
                                    <div className="invoice-number-label">Numer faktury</div>
                                    <div className="invoice-number">{draft.number}</div>
                                    <div className="invoice-type">Faktura VAT</div>
                                </div>
                            </div>

                            <hr className="print-hr" />

                            {/* Strony */}
                            <div className="print-parties">
                                <div className="print-party">
                                    <h3>Sprzedawca</h3>
                                    <p>NIP: {draft.seller.nip}</p>
                                    <p>Nazwa: {draft.seller.name}</p>
                                    <p className="label">Adres</p>
                                    <p>{draft.seller.address}</p>
                                    <p>Polska</p>
                                    {draft.seller.bankAccount && (
                                        <p>Rachunek: {draft.seller.bankAccount}</p>
                                    )}
                                </div>
                                <div className="print-party">
                                    <h3>Nabywca</h3>
                                    <p>NIP: {draft.buyer.nip}</p>
                                    <p>Nazwa: {draft.buyer.name}</p>
                                    <p className="label">Adres</p>
                                    <p>{draft.buyer.address}</p>
                                    <p>Polska</p>
                                </div>
                            </div>

                            <hr className="print-hr" />

                            {/* Szczegóły */}
                            <div className="print-details">
                                <h3>Szczegóły</h3>
                                <div className="print-details-row">
                                    <span><span className="label">Data wystawienia: </span>{draft.issueDate}</span>
                                    <span><span className="label">Miejsce wystawienia: </span>{draft.place}</span>
                                </div>
                                <div className="print-details-row">
                                    <span><span className="label">Data sprzedaży: </span>{draft.sellDate}</span>
                                </div>
                            </div>

                            <hr className="print-hr" />

                            {/* Pozycje */}
                            <div className="print-items">
                                <h3>Pozycje</h3>
                                <p className="subtitle">Faktura wystawiona w cenach netto w walucie PLN</p>
                                <table className="print-table">
                                    <thead>
                                    <tr>
                                        <th>Lp.</th>
                                        <th>Nazwa towaru lub usługi</th>
                                        <th className="text-right">Cena netto</th>
                                        <th className="text-right">Ilość</th>
                                        <th>J.m.</th>
                                        <th>Stawka</th>
                                        <th className="text-right">Wartość netto</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {draft.lines.map((l, i) => {
                                        const r = calcLine({ qty: l.qty, priceNet: l.priceNet, discount: l.discount || 0, vatRate: l.vatRate });
                                        return (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{l.name}</td>
                                                <td className="text-right">{formatPLN(l.priceNet)}</td>
                                                <td className="text-right">{l.qty}</td>
                                                <td>{l.unit}</td>
                                                <td>{typeof l.vatRate === 'number' ? `${l.vatRate}%` : l.vatRate}</td>
                                                <td className="text-right">{formatPLN(r.net)}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="print-total">
                                Kwota należności ogółem: {formatPLN(totals.gross)} PLN
                            </div>

                            <hr className="print-hr" />

                            {/* Podsumowanie VAT */}
                            <div className="print-vat-summary">
                                <h3>Podsumowanie stawek podatku</h3>
                                <table className="print-vat-table">
                                    <thead>
                                    <tr>
                                        <th>Lp.</th>
                                        <th>Stawka podatku</th>
                                        <th className="text-right">Kwota netto</th>
                                        <th className="text-right">Kwota podatku</th>
                                        <th className="text-right">Kwota brutto</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {Object.keys(perRate).map((rate, i) => (
                                        <tr key={rate}>
                                            <td>{i + 1}</td>
                                            <td>{rate}</td>
                                            <td className="text-right">{formatPLN(perRate[rate].net)}</td>
                                            <td className="text-right">{formatPLN(perRate[rate].vat)}</td>
                                            <td className="text-right">{formatPLN(perRate[rate].gross)}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <hr className="print-hr" />

                            {/* Płatność */}
                            <div className="print-payment">
                                <h3>Płatność</h3>
                                <div className="print-payment-row">
                                    <span><span className="label">Metoda płatności: </span>{draft.payment.method}</span>
                                    <span><span className="label">Termin płatności: </span>{draft.payment.dueDate}</span>
                                </div>
                                {draft.payment.bankAccount && (
                                    <p><span className="label">Rachunek bankowy: </span>{draft.payment.bankAccount}</p>
                                )}
                            </div>
                        </div>

                        {/* STOPKA */}
                        <div className="print-footer">
                            <p>Wytworzona w <a href="https://ksef-master.netlify.app/"><strong>KSeF Master</strong></a></p>
                            <p className="note">To jest podgląd faktury. Po wysłaniu do KSeF dokument otrzyma oficjalny numer i kod QR.</p>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}