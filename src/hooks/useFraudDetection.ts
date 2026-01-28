// src/hooks/useFraudDetection.ts
import { useMemo, useState, useCallback } from 'react';
import type { Invoice } from '../services/ksefApi';
import type { FraudAnalysisResult, AlertSettings } from '../types/fraud';
import { analyzeInvoices, getAlertSettings, getAlertsSummary } from '../services/fraudDetection';

interface UseFraudDetectionResult {
    results: Map<string, FraudAnalysisResult>;
    summary: {
        total: number;
        high: number;
        medium: number;
        low: number;
    };
    settings: AlertSettings;
    refresh: () => void;
    getResultForInvoice: (invoiceId: string) => FraudAnalysisResult | undefined;
}

export function useFraudDetection(invoices: Invoice[]): UseFraudDetectionResult {
    const [refreshKey, setRefreshKey] = useState(0);

    const settings = useMemo(() => {
        void refreshKey;
        return getAlertSettings();
    }, [refreshKey]);

    const results = useMemo(() => {
        void refreshKey;
        return analyzeInvoices(invoices, settings);
    }, [invoices, settings, refreshKey]);

    const summary = useMemo(() => {
        return getAlertsSummary(results);
    }, [results]);

    const refresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    const getResultForInvoice = useCallback((invoiceId: string) => {
        return results.get(invoiceId);
    }, [results]);

    return {
        results,
        summary,
        settings,
        refresh,
        getResultForInvoice,
    };
}