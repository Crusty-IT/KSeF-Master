// src/components/alerts/FraudBadge.tsx
import { useState } from 'react';
import type { FraudAnalysisResult, AlertLevel } from '../../types/fraud';
import { dismissAlert, addKnownContractor } from '../../services/fraudDetection';
import './FraudBadge.css';

interface FraudBadgeProps {
    result: FraudAnalysisResult;
    contractorNip?: string;
    onDismiss?: () => void;
}

export default function FraudBadge({ result, contractorNip, onDismiss }: FraudBadgeProps) {
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);

    if (result.alertLevel === 'none' || result.alerts.length === 0) {
        return <span className="fraud-badge fraud-badge-ok" title="Brak alertów">✓</span>;
    }

    const levelClass = `fraud-badge-${result.alertLevel}`;
    const icon = result.alertLevel === 'high' ? '🚨' : result.alertLevel === 'medium' ? '⚠️' : '💡';

    const handleDismissAlert = (alertType: string) => {
        dismissAlert(`${result.invoiceId}:${alertType}`);
        onDismiss?.();
    };

    const handleMarkAsKnown = () => {
        if (contractorNip) {
            addKnownContractor(contractorNip);
            onDismiss?.();
        }
    };

    return (
        <div
            className="fraud-badge-container"
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={() => setIsTooltipVisible(false)}
        >
            <span className={`fraud-badge ${levelClass}`}>
                {icon}
            </span>

            {isTooltipVisible && (
                <div className="fraud-tooltip">
                    <div className="fraud-tooltip-header">
                        <span className="fraud-tooltip-icon">{icon}</span>
                        <span className="fraud-tooltip-title">
                            {result.alertLevel === 'high' && 'Wysoki poziom alertu'}
                            {result.alertLevel === 'medium' && 'Średni poziom alertu'}
                            {result.alertLevel === 'low' && 'Niski poziom alertu'}
                        </span>
                    </div>
                    <ul className="fraud-tooltip-list">
                        {result.alerts.map((alert, index) => (
                            <li key={index} className={`fraud-alert-item fraud-alert-${alert.level}`}>
                                <span className="fraud-alert-message">{alert.message}</span>
                                <button
                                    className="fraud-alert-dismiss"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDismissAlert(alert.type);
                                    }}
                                    title="Ignoruj ten alert"
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ul>
                    {contractorNip && result.alerts.some(a => a.type === 'unknown_contractor') && (
                        <button
                            className="fraud-tooltip-action"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsKnown();
                            }}
                        >
                            Oznacz kontrahenta jako zaufanego
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export function AlertLevelIndicator({ level }: { level: AlertLevel }) {
    if (level === 'none') return null;

    const config = {
        high: { icon: '🚨', label: 'Wysoki', className: 'alert-indicator-high' },
        medium: { icon: '⚠️', label: 'Średni', className: 'alert-indicator-medium' },
        low: { icon: '💡', label: 'Niski', className: 'alert-indicator-low' },
    };

    const { icon, label, className } = config[level];

    return (
        <span className={`alert-indicator ${className}`}>
            {icon} {label}
        </span>
    );
}