// src/components/form/BankAccountInput.tsx
import { useState, useEffect } from 'react';
import './BankAccountInput.css';

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    label?: string;
    showLabel?: boolean;
}

/**
 * Formatuje numer IBAN: PL00 0000 0000 0000 0000 0000 0000
 */
function formatIBAN(raw: string): string {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

    const hasCountryCode = /^[A-Z]{2}/.test(clean);
    let result = '';
    let digits = clean;

    if (hasCountryCode) {
        const countryCode = clean.slice(0, 2);
        digits = clean.slice(2).replace(/[^0-9]/g, '');
        result = countryCode;

        // Dodaj pierwsze 2 cyfry kontrolne
        if (digits.length > 0) {
            result += digits.slice(0, 2);
            digits = digits.slice(2);
        }

        // Reszta w grupach po 4
        for (let i = 0; i < digits.length && i < 24; i++) {
            if (i % 4 === 0) {
                result += ' ';
            }
            result += digits[i];
        }
    } else {
        // Bez kodu kraju - tylko cyfry w grupach
        const onlyDigits = clean.replace(/[^0-9]/g, '');
        for (let i = 0; i < onlyDigits.length && i < 26; i++) {
            if (i > 0 && i % 4 === 0) {
                result += ' ';
            }
            result += onlyDigits[i];
        }
    }

    return result.trim();
}

function extractDigits(formatted: string): string {
    return formatted.replace(/[^0-9]/g, '');
}

function validatePolishIBAN(value: string): { valid: boolean; error?: string } {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!clean) {
        return { valid: true };
    }

    const startsWithPL = clean.startsWith('PL');
    const digits = startsWithPL ? clean.slice(2) : clean;
    const onlyDigits = digits.replace(/[^0-9]/g, '');

    if (onlyDigits.length > 0 && onlyDigits.length < 26) {
        return { valid: false, error: `Wprowadź 26 cyfr (obecnie: ${onlyDigits.length})` };
    }

    if (onlyDigits.length > 26) {
        return { valid: false, error: 'Za dużo cyfr' };
    }

    return { valid: true };
}

export default function BankAccountInput({
                                             value,
                                             onChange,
                                             placeholder,
                                             required,
                                             label,
                                             showLabel = true
                                         }: Props) {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatIBAN(value || ''));
        }
    }, [value, isFocused]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const rawInput = e.target.value;
        const formatted = formatIBAN(rawInput);
        setDisplayValue(formatted);

        const digits = extractDigits(formatted);
        const hasCountryCode = rawInput.toUpperCase().startsWith('PL');
        const fullValue = hasCountryCode ? 'PL' + digits : digits;

        onChange(fullValue);
        setValidation(validatePolishIBAN(formatted));
    }

    function handleBlur() {
        setIsFocused(false);
        setValidation(validatePolishIBAN(displayValue));
    }

    function handleFocus() {
        setIsFocused(true);
    }

    const digits = extractDigits(displayValue);
    const showError = !validation.valid && !isFocused && digits.length > 0;
    const showValid = validation.valid && digits.length === 26;

    return (
        <div className="bank-input-wrapper">
            {showLabel && label && (
                <span className="bank-input-label">
                    {label}{required && ' *'}
                </span>
            )}

            <div className={`bank-input-container ${showError ? 'has-error' : ''} ${showValid ? 'is-valid' : ''}`}>
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                    placeholder={placeholder || 'PL00 0000 0000 0000 0000 0000 0000'}
                    className="bank-input"
                    autoComplete="off"
                    spellCheck={false}
                />

                {digits.length > 0 && (
                    <span className={`bank-counter ${digits.length === 26 ? 'complete' : ''}`}>
                        {digits.length}/26
                    </span>
                )}
            </div>

            {showError && (
                <span className="bank-error">{validation.error}</span>
            )}

            {showValid && (
                <span className="bank-valid">✓ Poprawny numer konta</span>
            )}
        </div>
    );
}