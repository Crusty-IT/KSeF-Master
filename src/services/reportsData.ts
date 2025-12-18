// src/services/reportsData.ts

export type DocKind = 'issued' | 'received';

export interface ReportInvoice {
    id: string;
    type: DocKind;
    number: string;
    issueDate: string;
    dueDate?: string;
    counterparty: { name: string; nip?: string };
    totals: { net: number; vat: number; gross: number };
    vatRate?: string | number;
    paid?: boolean;
}

const STORAGE_KEY = 'reports:data';

export function getAllReports(): ReportInvoice[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

export function replaceAllReports(list: ReportInvoice[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function clearAllReports() {
    localStorage.removeItem(STORAGE_KEY);
}

export function addReport(report: ReportInvoice) {
    const existing = getAllReports();
    // Unikaj duplikatów po numerze
    if (!existing.find(r => r.number === report.number)) {
        existing.unshift(report);
        replaceAllReports(existing);
    }
}

export function syncFromKsefData(issuedInvoices: any[], receivedInvoices: any[]) {
    const reports: ReportInvoice[] = [];

    // Konwertuj wystawione
    for (const inv of issuedInvoices) {
        const gross = inv.kwotaBrutto || 0;
        const net = inv.kwotaNetto || Math.round((gross / 1.23) * 100) / 100;
        const vat = inv.kwotaVat || Math.round((gross - net) * 100) / 100;

        reports.push({
            id: inv.numerKsef || `issued-${inv.numerFaktury}-${Date.now()}`,
            type: 'issued',
            number: inv.numerFaktury,
            issueDate: inv.dataWystawienia,
            counterparty: {
                name: inv.nazwaKontrahenta || 'Nieznany',
                nip: inv.nipKontrahenta,
            },
            totals: { net, vat, gross },
            vatRate: '23%',
        });
    }

    // Konwertuj odebrane
    for (const inv of receivedInvoices) {
        const gross = inv.kwotaBrutto || 0;
        const net = inv.kwotaNetto || Math.round((gross / 1.23) * 100) / 100;
        const vat = inv.kwotaVat || Math.round((gross - net) * 100) / 100;

        reports.push({
            id: inv.numerKsef || `received-${inv.numerFaktury}-${Date.now()}`,
            type: 'received',
            number: inv.numerFaktury,
            issueDate: inv.dataWystawienia,
            counterparty: {
                name: inv.nazwaKontrahenta || inv.nazwaSprzedawcy || 'Nieznany',
                nip: inv.nipKontrahenta || inv.nipSprzedawcy,
            },
            totals: { net, vat, gross },
            vatRate: '23%',
        });
    }

    // Sortuj po dacie (najnowsze pierwsze)
    reports.sort((a, b) => b.issueDate.localeCompare(a.issueDate));

    replaceAllReports(reports);
    return reports;
}