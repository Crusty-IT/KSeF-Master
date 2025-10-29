// src/services/reportsData.ts
export type DocKind = 'issued' | 'received';

export interface ReportInvoice {
    id: string;
    type: DocKind; // issued=Sprzedaż, received=Zakup
    number: string;
    issueDate: string; // yyyy-mm-dd
    dueDate?: string;  // yyyy-mm-dd
    counterparty: { name: string; nip?: string };
    totals: { net: number; vat: number; gross: number };
    vatRate?: string | number; // opcjonalnie, jeśli masz
    paid?: boolean;            // opcjonalnie
}

const STORAGE_KEY = 'reports:data';

export function getAllReports(): ReportInvoice[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw) as ReportInvoice[];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}

export function replaceAllReports(list: ReportInvoice[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Dev/Prezentacja: wypełnij przykładowymi danymi, jeśli pusto
export function seedSampleReports(): ReportInvoice[] {
    if (getAllReports().length > 0) return getAllReports();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    const data: ReportInvoice[] = [
        // issued (sprzedaż)
        {
            id: 'i1',
            type: 'issued',
            number: `FV/${yyyy}/${mm}/001`,
            issueDate: `${yyyy}-${mm}-02`,
            dueDate: `${yyyy}-${mm}-16`,
            counterparty: { name: 'ACME Sp. z o.o.', nip: '5250000000' },
            totals: { net: 5000, vat: 1150, gross: 6150 },
            vatRate: '23%',
            paid: true,
        },
        {
            id: 'i2',
            type: 'issued',
            number: `FV/${yyyy}/${mm}/002`,
            issueDate: `${yyyy}-${mm}-10`,
            dueDate: `${yyyy}-${mm}-24`,
            counterparty: { name: 'Globex S.A.', nip: '5211111111' },
            totals: { net: 12000, vat: 2760, gross: 14760 },
            vatRate: '23%',
            paid: false,
        },
        {
            id: 'i3',
            type: 'issued',
            number: `FV/${yyyy}/${mm}/003`,
            issueDate: `${yyyy}-${mm}-15`,
            dueDate: `${yyyy}-${mm}-29`,
            counterparty: { name: 'Stark Industries', nip: '5272222222' },
            totals: { net: 3000, vat: 240, gross: 3240 },
            vatRate: '8%',
            paid: false,
        },
        // received (zakup)
        {
            id: 'r1',
            type: 'received',
            number: `FZ/${yyyy}/${mm}/A01`,
            issueDate: `${yyyy}-${mm}-03`,
            counterparty: { name: 'MediaTech Sp. z o.o.', nip: '1133333333' },
            totals: { net: 1500, vat: 345, gross: 1845 },
            vatRate: '23%',
        },
        {
            id: 'r2',
            type: 'received',
            number: `FZ/${yyyy}/${mm}/A02`,
            issueDate: `${yyyy}-${mm}-20`,
            counterparty: { name: 'OfficePro', nip: '5264444444' },
            totals: { net: 400, vat: 92, gross: 492 },
            vatRate: '23%',
        },
    ];
    replaceAllReports(data);
    return data;
}