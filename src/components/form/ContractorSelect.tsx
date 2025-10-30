// client/src/components/form/ContractorSelect.tsx
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listContractors } from '../../services/ksefApi';
import { isValidNip, sanitizeNip } from '../../helpers/nip';

export type PartyValue = {
    nip: string;
    name: string;
    address: string;
    bankAccount?: string;
};

interface Props {
    label?: string;
    value: PartyValue;
    onChange: (v: PartyValue) => void;
    placeholderNip?: string;
    className?: string;
    required?: boolean;
    allowBank?: boolean;
}

export default function ContractorSelect({ label, value, onChange, placeholderNip = 'np. 5250000000', className, required, allowBank }: Props) {
    const [nip, setNip] = useState<string>(value?.nip || '');
    const sanitized = useMemo(() => sanitizeNip(nip), [nip]);
    const nipOk = isValidNip(sanitized);

    const { data, isFetching } = useQuery({
        queryKey: ['contractors', sanitized],
        queryFn: () => listContractors({ q: sanitized }),
        enabled: sanitized.length === 10 && nipOk,
        staleTime: 60_000
    });

    const candidates = data || [];

    useEffect(() => {
        // jeśli wartości zewnętrzne się zmieniły, zsynchronizuj NIP
        if (value?.nip !== nip) setNip(value?.nip || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.nip]);

    function apply(candidate: Partial<PartyValue>) {
        const next: PartyValue = {
            nip: candidate.nip ?? sanitized,
            name: candidate.name ?? value?.name ?? '',
            address: candidate.address ?? value?.address ?? '',
            bankAccount: candidate.bankAccount ?? value?.bankAccount ?? ''
        };
        onChange(next);
    }

    return (
        <div className={`field ${className || ''}`}>
            {label && <span className="label">{label}{required ? ' *' : ''}</span>}

            <div className="grid grid-2">
                <label className="field">
                    <span className="label small">NIP</span>
                    <input
                        className={`input ${nip && !nipOk ? 'input--error' : ''}`}
                        value={nip}
                        onChange={(e) => setNip(sanitizeNip(e.target.value))}
                        placeholder={placeholderNip}
                        inputMode="numeric"
                        maxLength={10}
                    />
                    {!nipOk && nip.length === 10 && <div className="error">Nieprawidłowy NIP</div>}
                </label>

                <div className="field">
                    <span className="label small">&nbsp;</span>
                    <button
                        type="button"
                        className="btn"
                        disabled={!nipOk || isFetching}
                        onClick={() => apply({})}
                        title="Użyj wprowadzonych danych"
                    >
                        Użyj NIP
                    </button>
                </div>
            </div>

            {nipOk && candidates.length > 0 && (
                <div className="suggestion">
                    <div className="hint">Znaleziono {candidates.length} kontrahentów — wybierz:</div>
                    <ul className="list">
                        {candidates.map((c: any) => (
                            <li key={c.nip} className="list-item">
                                <button
                                    type="button"
                                    className="link"
                                    onClick={() => apply({ nip: c.nip, name: c.nazwa ?? c.name, address: c.adres ?? c.address, bankAccount: c.bankAccount })}
                                >
                                    {c.nazwa ?? c.name} — {c.nip}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-1">
                <label className="field">
                    <span className="label small">Nazwa</span>
                    <input
                        className="input"
                        value={value?.name || ''}
                        onChange={(e) => onChange({ ...value, name: e.target.value })}
                        placeholder="Nazwa kontrahenta"
                    />
                </label>

                <label className="field">
                    <span className="label small">Adres</span>
                    <input
                        className="input"
                        value={value?.address || ''}
                        onChange={(e) => onChange({ ...value, address: e.target.value })}
                        placeholder="Ulica, nr, kod, miejscowość"
                    />
                </label>

                <label className="field">
                    <span className="label small">Rachunek bankowy (opcjonalnie)</span>
                    <input
                        className="input"
                        value={value?.bankAccount || ''}
                        onChange={(e) => onChange({ ...value, bankAccount: e.target.value })}
                        placeholder="PL.."
                    />
                </label>
            </div>
        </div>
    );
}