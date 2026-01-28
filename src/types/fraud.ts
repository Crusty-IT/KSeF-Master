// src/types/fraud.ts
export type AlertLevel = 'none' | 'low' | 'medium' | 'high';

export type AlertType =
    | 'unknown_contractor'
    | 'duplicate'
    | 'high_amount'
    | 'unusual_hour'
    | 'round_amount';

export interface FraudAlert {
    type: AlertType;
    level: AlertLevel;
    message: string;
}

export interface FraudAnalysisResult {
    invoiceId: string;
    alertLevel: AlertLevel;
    alerts: FraudAlert[];
}

export interface AlertSettings {
    enabled: boolean;
    highAmountThreshold: number;
    unknownContractorThreshold: number;
    unusualHoursEnabled: boolean;
    unusualHoursStart: string;
    unusualHoursEnd: string;
    duplicateDetectionEnabled: boolean;
    duplicateWindowDays: number;
    roundAmountDetectionEnabled: boolean;
}

export const defaultAlertSettings: AlertSettings = {
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