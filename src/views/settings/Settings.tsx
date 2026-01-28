// src/views/settings/Settings.tsx
import { useEffect, useState, type ChangeEvent } from 'react';
import './Settings.css';
import '../dashboard/Dashboard.css';
import SideNav from '../../components/layout/SideNav';
import TopBar from '../../components/layout/TopBar';
import PrimaryButton from '../../components/buttons/PrimaryButton';
import BankAccountInput from '../../components/form/BankAccountInput';
import {
    getSettings,
    saveSettings,
    getSeller,
    saveSeller,
    type AppSettings,
    type SellerProfile,
    type PaymentMethod,
} from '../../services/settings';
import {
    getAlertSettings,
    saveAlertSettings,
    clearDismissedAlerts,
} from '../../services/fraudDetection';
import type { AlertSettings } from '../../types/fraud';

export default function Settings() {
    const [settings, setSettings] = useState<AppSettings>(getSettings());
    const [seller, setSeller] = useState<SellerProfile>(getSeller());
    const [alertSettings, setAlertSettings] = useState<AlertSettings>(getAlertSettings());
    const [info, setInfo] = useState<string | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        setSettings(getSettings());
        setSeller(getSeller());
        setAlertSettings(getAlertSettings());
    }, []);

    function validateForm(): string[] {
        const errs: string[] = [];

        if (!seller.name.trim()) errs.push('Nazwa firmy jest wymagana.');
        if (!seller.address.trim()) errs.push('Adres jest wymagany.');

        if (seller.bankAccount) {
            const digits = seller.bankAccount.replace(/[^0-9]/g, '');
            if (digits.length > 0 && digits.length !== 26) {
                errs.push('Numer konta bankowego musi mieć 26 cyfr.');
            }
        }

        return errs;
    }

    function saveAll() {
        const errs = validateForm();
        setErrors(errs);
        if (errs.length) return;

        saveSeller(seller);
        saveSettings(settings);
        saveAlertSettings(alertSettings);
        setInfo('Zapisano ustawienia.');
        setTimeout(() => setInfo(null), 1600);
    }

    function handleClearDismissedAlerts() {
        if (!confirm('Czy na pewno chcesz przywrócić wszystkie zignorowane alerty?')) return;
        clearDismissedAlerts();
        setInfo('Przywrócono zignorowane alerty.');
        setTimeout(() => setInfo(null), 1600);
    }

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
                <TopBar />
                <div className="dash-content">
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

                        <div className="card">
                            <h3>Profil firmy (Sprzedawca)</h3>
                            <p className="hint" style={{ marginBottom: '16px', color: '#6b7280' }}>
                                💡 NIP sprzedawcy jest automatycznie pobierany z sesji KSeF podczas logowania.
                            </p>
                            <label>Nazwa firmy *
                                <input
                                    type="text"
                                    value={seller.name}
                                    onChange={(e) => setSeller((s) => ({ ...s, name: e.target.value }))}
                                    placeholder="Nazwa Twojej firmy"
                                />
                            </label>
                            <label>Adres *
                                <input
                                    type="text"
                                    value={seller.address}
                                    onChange={(e) => setSeller((s) => ({ ...s, address: e.target.value }))}
                                    placeholder="Ulica, numer, kod pocztowy, miasto"
                                />
                            </label>
                            <div style={{ marginTop: '12px' }}>
                                <BankAccountInput
                                    label="Rachunek bankowy"
                                    value={seller.bankAccount || ''}
                                    onChange={(v) => setSeller((s) => ({ ...s, bankAccount: v }))}
                                />
                                <p className="hint" style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                                    Ten numer będzie domyślnie używany na fakturach jako rachunek do płatności.
                                </p>
                            </div>
                        </div>

                        <div className="card">
                            <h3>🚨 Wykrywanie podejrzanych faktur</h3>
                            <p className="hint" style={{ marginBottom: '16px', color: '#6b7280' }}>
                                System automatycznie analizuje faktury i oznacza te, które wymagają uwagi.
                            </p>

                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={alertSettings.enabled}
                                    onChange={(e) => setAlertSettings((s) => ({ ...s, enabled: e.target.checked }))}
                                />
                                Włącz wykrywanie podejrzanych faktur
                            </label>

                            {alertSettings.enabled && (
                                <>
                                    <div className="settings-divider" />

                                    <div className="two-col">
                                        <label>Próg wysokiej kwoty (PLN)
                                            <input
                                                type="number"
                                                min={0}
                                                step={100}
                                                value={alertSettings.highAmountThreshold}
                                                onChange={(e) => setAlertSettings((s) => ({
                                                    ...s,
                                                    highAmountThreshold: Number(e.target.value)
                                                }))}
                                            />
                                            <span className="input-hint">Faktury powyżej tej kwoty będą oznaczone</span>
                                        </label>
                                        <label>Próg nieznanego kontrahenta (PLN)
                                            <input
                                                type="number"
                                                min={0}
                                                step={100}
                                                value={alertSettings.unknownContractorThreshold}
                                                onChange={(e) => setAlertSettings((s) => ({
                                                    ...s,
                                                    unknownContractorThreshold: Number(e.target.value)
                                                }))}
                                            />
                                            <span className="input-hint">Alert gdy nowy kontrahent i kwota powyżej progu</span>
                                        </label>
                                    </div>

                                    <div className="settings-divider" />

                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={alertSettings.duplicateDetectionEnabled}
                                            onChange={(e) => setAlertSettings((s) => ({
                                                ...s,
                                                duplicateDetectionEnabled: e.target.checked
                                            }))}
                                        />
                                        Wykrywanie duplikatów
                                    </label>

                                    {alertSettings.duplicateDetectionEnabled && (
                                        <label className="inline-label">
                                            Okno czasowe (dni)
                                            <input
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={alertSettings.duplicateWindowDays}
                                                onChange={(e) => setAlertSettings((s) => ({
                                                    ...s,
                                                    duplicateWindowDays: Number(e.target.value)
                                                }))}
                                                className="small-input"
                                            />
                                        </label>
                                    )}

                                    <div className="settings-divider" />

                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={alertSettings.unusualHoursEnabled}
                                            onChange={(e) => setAlertSettings((s) => ({
                                                ...s,
                                                unusualHoursEnabled: e.target.checked
                                            }))}
                                        />
                                        Wykrywanie nietypowych godzin wystawienia
                                    </label>

                                    {alertSettings.unusualHoursEnabled && (
                                        <div className="two-col inline-settings">
                                            <label>Godzina rozpoczęcia (typowe)
                                                <input
                                                    type="time"
                                                    value={alertSettings.unusualHoursStart}
                                                    onChange={(e) => setAlertSettings((s) => ({
                                                        ...s,
                                                        unusualHoursStart: e.target.value
                                                    }))}
                                                />
                                            </label>
                                            <label>Godzina zakończenia (typowe)
                                                <input
                                                    type="time"
                                                    value={alertSettings.unusualHoursEnd}
                                                    onChange={(e) => setAlertSettings((s) => ({
                                                        ...s,
                                                        unusualHoursEnd: e.target.value
                                                    }))}
                                                />
                                            </label>
                                        </div>
                                    )}

                                    <div className="settings-divider" />

                                    <label className="checkbox">
                                        <input
                                            type="checkbox"
                                            checked={alertSettings.roundAmountDetectionEnabled}
                                            onChange={(e) => setAlertSettings((s) => ({
                                                ...s,
                                                roundAmountDetectionEnabled: e.target.checked
                                            }))}
                                        />
                                        Wykrywanie okrągłych kwot (np. 10 000 zł)
                                    </label>

                                    <div className="settings-divider" />

                                    <button
                                        className="btn-light"
                                        onClick={handleClearDismissedAlerts}
                                        style={{ marginTop: '8px' }}
                                    >
                                        Przywróć zignorowane alerty
                                    </button>
                                </>
                            )}
                        </div>

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
                </div>
            </main>
        </div>
    );
}