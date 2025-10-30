// src/helpers/reports.ts
import type { ReportInvoice } from '../services/reportsData';

export type ReportTypeFilter = 'all' | 'issued' | 'received';
export interface ReportFilters {
    dateFrom?: string;
    dateTo?: string;
    type: ReportTypeFilter;
    q?: string; // szukaj po kontrahencie/numerze
}

export function applyFilters(list: ReportInvoice[], f: ReportFilters): ReportInvoice[] {
    const from = f.dateFrom ? new Date(f.dateFrom) : null;
    const to = f.dateTo ? new Date(f.dateTo) : null;
    const q = (f.q || '').trim().toLowerCase();

    return list.filter(r => {
        if (f.type !== 'all' && r.type !== f.type) return false;
        if (from && new Date(r.issueDate) < from) return false;
        if (to && new Date(r.issueDate) > to) return false;
        if (q) {
            const hay = `${r.number} ${r.counterparty.name} ${r.counterparty.nip || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });
}

export function sumKpis(list: ReportInvoice[]) {
    const net = list.reduce((s, r) => s + (r.totals?.net || 0), 0);
    const vat = list.reduce((s, r) => s + (r.totals?.vat || 0), 0);
    const gross = list.reduce((s, r) => s + (r.totals?.gross || 0), 0);
    return { count: list.length, net, vat, gross };
}

export function perVatRate(list: ReportInvoice[]) {
    const map: Record<string, { net: number; vat: number; gross: number }> = {};
    for (const r of list) {
        const key = (r.vatRate ?? '—') + '';
        if (!map[key]) map[key] = { net: 0, vat: 0, gross: 0 };
        map[key].net += r.totals.net || 0;
        map[key].vat += r.totals.vat || 0;
        map[key].gross += r.totals.gross || 0;
    }
    return map;
}

export function agingIssued(list: ReportInvoice[]) {
    // tylko sprzedaż (issued) i tylko po dueDate
    const issued = list.filter(r => r.type === 'issued' && r.dueDate);
    const buckets = {
        '0–7': 0,
        '8–14': 0,
        '15–30': 0,
        '30+': 0,
        'bez terminu': 0,
    } as Record<string, number>;

    const today = new Date();
    for (const r of issued) {
        const due = r.dueDate ? new Date(r.dueDate) : null;
        if (!due) { buckets['bez terminu'] += r.totals.gross; continue; }
        const days = Math.floor((+today - +due) / (1000 * 60 * 60 * 24));
        if (days <= 0) continue; // nieprzeterminowane
        if (days <= 7) buckets['0–7'] += r.totals.gross;
        else if (days <= 14) buckets['8–14'] += r.totals.gross;
        else if (days <= 30) buckets['15–30'] += r.totals.gross;
        else buckets['30+'] += r.totals.gross;
    }
    return buckets;
}

export function topClients(list: ReportInvoice[], topN = 5) {
    const map: Record<string, number> = {};
    for (const r of list) {
        const key = r.counterparty.name || '—';
        map[key] = (map[key] || 0) + (r.totals.gross || 0);
    }
    return Object.entries(map)
        .map(([name, gross]) => ({ name, gross }))
        .sort((a, b) => b.gross - a.gross)
        .slice(0, topN);
}