/* src/views/settings/Settings.tsx */
import { useEffect, useState, type ChangeEvent } from 'react';
import './Settings.css';
import '../dashboard/Dashboard.css';
import SideNav from '../../components/layout/SideNav';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import { isValidNip, sanitizeNip } from '../../helpers/nip';
import {
    getSettings,
    saveSettings,
    getSeller,
    saveSeller,
    type AppSettings,
    type SellerProfile,
    type PaymentMethod,
} from '../../services/settings';

export default function Settings() {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [seller, setSeller] = useState<SellerProfile>(getSeller());
    const [info, setInfo] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        setSettings(getSettings());
        setSeller(getSeller());
    }, []);

    function saveAll() {
        const errs: string[] = [];
        const nip = sanitizeNip(seller.nip);

        if (!seller.name.trim()) errs.push('Nazwa firmy jest wymagana.');
        if (!nip) errs.push('NIP jest wymagany.');
        else if (!isValidNip(nip)) errs.push('NIP jest nieprawidłowy.');
        if (!seller.address.trim()) errs.push('Adres jest wymagany.');

        setErrors(errs);
        if (errs.length) return;

        saveSeller({ ...seller, nip });
        saveSettings(settings);
        setInfo('Zapisano ustawienia.');
        setTimeout(() => setInfo(null), 1600);
    }

    // Eksport kopii (typy jawne)
    function exportBackup() {
        const snapshot: Record<string, string | null> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            snapshot[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ksef-master-backup.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Import kopii (bez any)
    function importBackup(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        file.text().then((txt) => {
            let parsed: unknown;
            try {
                parsed = JSON.parse(txt);
            } catch {
                alert('Nieprawidłowy plik backupu.');
                e.target.value = '';
                return;
            }

            if (typeof parsed !== 'object' || parsed === null) {
                alert('Nieprawidłowy plik backupu.');
                e.target.value = '';
                return;
            }

            const obj = parsed as Record<string, unknown>;
            for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'string') {
                    localStorage.setItem(k, v);
                } else if (v === null) {
                    localStorage.removeItem(k);
                }
                // inne typy pomijamy
            }
            setInfo('Zaimportowano kopię. Odśwież stronę.');
            setTimeout(() => setInfo(null), 2000);
        });

        e.target.value = '';
    }

    function clearAll() {
        if (!confirm('Wyczyścić wszystkie dane aplikacji (localStorage)?')) return;
        localStorage.clear();
        setInfo('Wyczyszczono dane. Odśwież stronę.');
        setTimeout(() => setInfo(null), 1600);
    }

    return (
        <div className="dash-root">
            <SideNav />
            <main className="dash-main">
                <header className="dash-header">
                    <h1>Ustawienia</h1>
                    <p className="subtitle">Konfiguracja aplikacji, firmy i domyślnych parametrów faktur</p>
                </header>

                <section className="ops-section">
                    <div className="ops-header">
                        <h2>Konfiguracja</h2>
                        <div className="ops-actions">
                            <PrimaryButton onClick={saveAll} icon="💾">Zapisz</PrimaryButton>
                            <button className="btn-light" onClick={exportBackup}>Eksport kopii</button>
                            <label className="btn-light file-btn">
                                Import kopii
                                <input type="file" accept="application/json" onChange={importBackup} />
                            </label>
                        </div>
                    </div>

                    {info ? <div className="info-banner">{info}</div> : null}
                    {errors.length > 0 && (
                        <div className="error-message" style={{ marginBottom: 12 }}>
                            <strong>Popraw błędy:</strong>
                            <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </div>
                    )}

                    {/* Profil firmy */}
                    <div className="card">
                        <h3>Profil firmy (Sprzedawca)</h3>
                        <div>
                            <label>Nazwa
                                <input type="text" value={seller.name} onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))} />
                            </label>
                        </div>
                        <label>Adres
                            <input type="text" value={seller.address} onChange={(e) => setSeller((s) => ({ ...s, address: e.target.value }))} />
                        </label>
                        <label>Rachunek bankowy (opcjonalnie)
                            <input type="text" value={seller.bankAccount || ''} onChange={(e) => setSeller((s) => ({ ...s, bankAccount: e.target.value }))} placeholder="PL.. lub 26 cyfr" />
                        </label>
                    </div>

                    {/* Domyślne parametry faktur */}
                    <div className="card">
                        <h3>Domyślne parametry faktur</h3>
                        <div className="two-col">
                            <label>Miejsce wystawienia
                                <input
                                    type="text"
                                    value={settings.invoicing.placeDefault}
                                    onChange={(e) =>
                                        setSettings((s) => ({ ...s, invoicing: { ...s.invoicing, placeDefault: e.target.value } }))
                                    }
                                />
                            </label>
                            <label>Termin (dni)
                                <input
                                    type="number"
                                    min={0}
                                    value={settings.invoicing.dueDaysDefault}
                                    onChange={(e) =>
                                        setSettings((s) => ({ ...s, invoicing: { ...s.invoicing, dueDaysDefault: Number(e.target.value) } }))
                                    }
                                />
                            </label>
                        </div>
                        <div className="two-col">
                            <label>Metoda płatności
                                <select
                                    value={settings.invoicing.paymentMethodDefault}
                                    onChange={(e) =>
                                        setSettings((s) => ({
                                            ...s,
                                            invoicing: { ...s.invoicing, paymentMethodDefault: e.target.value as PaymentMethod },
                                        }))
                                    }
                                >
                                    <option value="przelew">przelew</option>
                                    <option value="gotówka">gotówka</option>
                                </select>
                            </label>
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={settings.invoicing.mppDefault}
                                    onChange={(e) => setSettings((s) => ({ ...s, invoicing: { ...s.invoicing, mppDefault: e.target.checked } }))}
                                />
                                Domyślnie MPP
                            </label>
                        </div>
                        <div className="two-col">
                            <label>Wzór numeracji
                                <input
                                    type="text"
                                    value={settings.invoicing.numberingPattern}
                                    onChange={(e) => setSettings((s) => ({ ...s, invoicing: { ...s.invoicing, numberingPattern: e.target.value } }))}
                                    placeholder="FV/{YYYY}/{MM}/{seq3}"
                                />
                            </label>
                            <label>Waluta
                                <input type="text" value={settings.invoicing.currencyDefault} disabled />
                            </label>
                        </div>
                    </div>

                    {/* Druk / PDF */}
                    <div className="card">
                        <h3>Druk / PDF</h3>
                        <div className="two-col">
                            <label>Margines (mm)
                                <input
                                    type="number"
                                    min={0}
                                    value={settings.print.marginMm}
                                    onChange={(e) => setSettings((s) => ({ ...s, print: { ...s.print, marginMm: Number(e.target.value) } }))}
                                />
                            </label>
                            <label>Skala podglądu (1 = 100%)
                                <input
                                    type="number"
                                    step="0.05"
                                    min={0.5}
                                    max={1.5}
                                    value={settings.print.scale}
                                    onChange={(e) => setSettings((s) => ({ ...s, print: { ...s.print, scale: Number(e.target.value) } }))}
                                />
                            </label>
                        </div>
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                checked={settings.print.showBankOnPrint}
                                onChange={(e) => setSettings((s) => ({ ...s, print: { ...s.print, showBankOnPrint: e.target.checked } }))}
                            />
                            Pokazuj rachunek bankowy na wydruku
                        </label>
                    </div>

                    {/* Strefa ryzyka */}
                    <div className="card danger-zone">
                        <h3>Strefa ryzyka</h3>
                        <p className="hint">Operacje nieodwracalne. Wykonaj kopię przed czyszczeniem.</p>
                        <div className="danger-actions">
                            <button className="btn-light" onClick={exportBackup}>Eksportuj kopię</button>
                            <label className="btn-light file-btn">
                                Importuj kopię
                                <input type="file" accept="application/json" onChange={importBackup} />
                            </label>
                            <button className="btn-danger" onClick={clearAll}>Wyczyść wszystko</button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}