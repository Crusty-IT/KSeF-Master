// src/services/settings.ts
export type PaymentMethod = 'przelew' | 'gotówka';

export interface AppSettings {
    invoicing: {
        placeDefault: string;
        dueDaysDefault: number;
        paymentMethodDefault: PaymentMethod;
        mppDefault: boolean;
        currencyDefault: 'PLN';
        numberingPattern: string; // np. "FV/{YYYY}/{MM}/{seq3}"
    };
    print: {
        marginMm: number; // margines @page
        scale: number;    // 1=100%
        showBankOnPrint: boolean;
    };
}

const SETTINGS_KEY = 'app:settings';
export const SELLER_KEY = 'sellerParty';

export interface SellerProfile {
    name: string;
    nip: string;
    address: string;
    bankAccount?: string;
}

export const defaultSettings: AppSettings = {
    invoicing: {
        placeDefault: 'Warszawa',
        dueDaysDefault: 14,
        paymentMethodDefault: 'przelew',
        mppDefault: false,
        currencyDefault: 'PLN',
        numberingPattern: 'FV/{YYYY}/{MM}/{seq3}',
    },
    print: { marginMm: 12, scale: 1, showBankOnPrint: true },
};

export function getSettings(): AppSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return defaultSettings;
        const parsed = JSON.parse(raw);
        return {
            ...defaultSettings,
            ...parsed,
            invoicing: { ...defaultSettings.invoicing, ...(parsed.invoicing || {}) },
            print: { ...defaultSettings.print, ...(parsed.print || {}) },
        };
    } catch {
        return defaultSettings;
    }
}

export function saveSettings(s: AppSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getSeller(): SellerProfile {
    try {
        const raw = localStorage.getItem(SELLER_KEY);
        if (!raw) return { name: '', nip: '', address: '', bankAccount: '' };
        const obj = JSON.parse(raw);
        return {
            name: obj.name || '',
            nip: obj.nip || '',
            address: obj.address || '',
            bankAccount: obj.bankAccount || '',
        };
    } catch {
        return { name: '', nip: '', address: '', bankAccount: '' };
    }
}

export function saveSeller(p: SellerProfile) {
    localStorage.setItem(SELLER_KEY, JSON.stringify(p));
}