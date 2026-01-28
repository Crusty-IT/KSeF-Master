// src/services/fraudDetection.ts
import type { Invoice } from './ksefApi';
import type { AlertSettings, FraudAlert, FraudAnalysisResult, AlertLevel } from '../types/fraud';

const ALERT_SETTINGS_KEY = 'app:alertSettings';
const DISMISSED_ALERTS_KEY = 'app:dismissedAlerts';
const KNOWN_CONTRACTORS_KEY = 'app:knownContractors';

export function getAlertSettings(): AlertSettings {
    try {
        const raw = localStorage.getItem(ALERT_SETTINGS_KEY);
        if (!raw) {
            return {
                enabled: true,
                highAmountThreshold: 10000,
                unknownContractorThreshold: 1000,
                unusualHoursEnabled: true,
                unusualHoursStart: '06:00',
                unusualHoursEnd: '22:00',
                duplicateDetectionEnabled: true,
                duplicateWindowDays: 7,
                roundAmountDetectionEnabled: true,
            };
        }
        return JSON.parse(raw);
    } catch {
        return {
            enabled: true,
            highAmountThreshold: 10000,
            unknownContractorThreshold: 1000,
            unusualHoursEnabled: true,
            unusualHoursStart: '06:00',
            unusualHoursEnd: '22:00',
            duplicateDetectionEnabled: true,
            duplicateWindowDays: 7,
            roundAmountDetectionEnabled: true,
        };
    }
}

export function saveAlertSettings(settings: AlertSettings): void {
    localStorage.setItem(ALERT_SETTINGS_KEY, JSON.stringify(settings));
}

export function getDismissedAlerts(): Set<string> {
    try {
        const raw = localStorage.getItem(DISMISSED_ALERTS_KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw));
    } catch {
        return new Set();
    }
}

export function dismissAlert(alertId: string): void {
    const dismissed = getDismissedAlerts();
    dismissed.add(alertId);
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...dismissed]));
}

export function undismissAlert(alertId: string): void {
    const dismissed = getDismissedAlerts();
    dismissed.delete(alertId);
    localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...dismissed]));
}

export function clearDismissedAlerts(): void {
    localStorage.removeItem(DISMISSED_ALERTS_KEY);
}

export function getKnownContractors(): Set<string> {
    try {
        const raw = localStorage.getItem(KNOWN_CONTRACTORS_KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw));
    } catch {
        return new Set();
    }
}

export function addKnownContractor(nip: string): void {
    const known = getKnownContractors();
    known.add(nip);
    localStorage.setItem(KNOWN_CONTRACTORS_KEY, JSON.stringify([...known]));
}

function generateAlertId(invoiceId: string, alertType: string): string {
    return `${invoiceId}:${alertType}`;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
}

function isTimeInRange(date: Date, startTime: string, endTime: string): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const startMinutes = start.hours * 60 + start.minutes;
    const endMinutes = end.hours * 60 + end.minutes;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

function isRoundAmount(amount: number): boolean {
    if (amount >= 1000 && amount % 1000 === 0) return true;
    if (amount >= 100 && amount % 100 === 0 && amount >= 5000) return true;
    return false;
}

export function analyzeInvoice(
    invoice: Invoice,
    allInvoices: Invoice[],
    settings: AlertSettings,
    knownContractors: Set<string>
): FraudAnalysisResult {
    const alerts: FraudAlert[] = [];
    const dismissedAlerts = getDismissedAlerts();

    if (!settings.enabled) {
        return {
            invoiceId: invoice.numerKsef,
            alertLevel: 'none',
            alerts: [],
        };
    }

    if (
        settings.unknownContractorThreshold > 0 &&
        invoice.kwotaBrutto >= settings.unknownContractorThreshold &&
        invoice.nipKontrahenta &&
        !knownContractors.has(invoice.nipKontrahenta)
    ) {
        const alertId = generateAlertId(invoice.numerKsef, 'unknown_contractor');
        if (!dismissedAlerts.has(alertId)) {
            const otherInvoicesFromContractor = allInvoices.filter(
                inv => inv.nipKontrahenta === invoice.nipKontrahenta && inv.numerKsef !== invoice.numerKsef
            );

            if (otherInvoicesFromContractor.length === 0) {
                alerts.push({
                    type: 'unknown_contractor',
                    level: 'high',
                    message: `Faktura od nieznanego kontrahenta (${invoice.nazwaKontrahenta || invoice.nipKontrahenta}) na kwotę ${invoice.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}`,
                });
            }
        }
    }

    if (settings.duplicateDetectionEnabled) {
        const alertId = generateAlertId(invoice.numerKsef, 'duplicate');
        if (!dismissedAlerts.has(alertId)) {
            const invoiceDate = new Date(invoice.dataWystawienia);
            const windowMs = settings.duplicateWindowDays * 24 * 60 * 60 * 1000;

            const potentialDuplicates = allInvoices.filter(inv => {
                if (inv.numerKsef === invoice.numerKsef) return false;
                if (inv.nipKontrahenta !== invoice.nipKontrahenta) return false;
                if (Math.abs(inv.kwotaBrutto - invoice.kwotaBrutto) > 0.01) return false;

                const otherDate = new Date(inv.dataWystawienia);
                const timeDiff = Math.abs(invoiceDate.getTime() - otherDate.getTime());
                return timeDiff <= windowMs;
            });

            if (potentialDuplicates.length > 0) {
                alerts.push({
                    type: 'duplicate',
                    level: 'medium',
                    message: `Potencjalny duplikat - znaleziono ${potentialDuplicates.length} podobne faktury (ta sama kwota i kontrahent)`,
                });
            }
        }
    }

    if (settings.highAmountThreshold > 0 && invoice.kwotaBrutto >= settings.highAmountThreshold) {
        const alertId = generateAlertId(invoice.numerKsef, 'high_amount');
        if (!dismissedAlerts.has(alertId)) {
            alerts.push({
                type: 'high_amount',
                level: 'low',
                message: `Faktura o wysokiej wartości: ${invoice.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}`,
            });
        }
    }

    if (settings.unusualHoursEnabled && invoice.dataWystawienia) {
        const alertId = generateAlertId(invoice.numerKsef, 'unusual_hour');
        if (!dismissedAlerts.has(alertId)) {
            const invoiceDate = new Date(invoice.dataWystawienia);
            if (!isNaN(invoiceDate.getTime()) && !isTimeInRange(invoiceDate, settings.unusualHoursStart, settings.unusualHoursEnd)) {
                const hours = invoiceDate.getHours();
                const minutes = invoiceDate.getMinutes();
                alerts.push({
                    type: 'unusual_hour',
                    level: 'low',
                    message: `Faktura wystawiona o nietypowej godzinie: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
                });
            }
        }
    }

    if (settings.roundAmountDetectionEnabled && isRoundAmount(invoice.kwotaBrutto)) {
        const alertId = generateAlertId(invoice.numerKsef, 'round_amount');
        if (!dismissedAlerts.has(alertId)) {
            alerts.push({
                type: 'round_amount',
                level: 'low',
                message: `Okrągła kwota faktury: ${invoice.kwotaBrutto.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}`,
            });
        }
    }

    let alertLevel: AlertLevel = 'none';
    if (alerts.some(a => a.level === 'high')) {
        alertLevel = 'high';
    } else if (alerts.some(a => a.level === 'medium')) {
        alertLevel = 'medium';
    } else if (alerts.length > 0) {
        alertLevel = 'low';
    }

    return {
        invoiceId: invoice.numerKsef,
        alertLevel,
        alerts,
    };
}

export function analyzeInvoices(
    invoices: Invoice[],
    settings: AlertSettings
): Map<string, FraudAnalysisResult> {
    const results = new Map<string, FraudAnalysisResult>();
    const knownContractors = getKnownContractors();

    for (const invoice of invoices) {
        const result = analyzeInvoice(invoice, invoices, settings, knownContractors);
        results.set(invoice.numerKsef, result);
    }

    return results;
}

export function getAlertsSummary(results: Map<string, FraudAnalysisResult>): {
    total: number;
    high: number;
    medium: number;
    low: number;
} {
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const result of results.values()) {
        if (result.alertLevel === 'high') high++;
        else if (result.alertLevel === 'medium') medium++;
        else if (result.alertLevel === 'low') low++;
    }

    return {
        total: high + medium + low,
        high,
        medium,
        low,
    };
}