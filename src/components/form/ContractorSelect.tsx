// src/components/form/ContractorSelect.tsx
import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listContractors, type Contractor } from '../../services/ksefApi';
import { getClients, type Client } from '../../services/clientService';
import { isValidNip, sanitizeNip } from '../../helpers/nip';
import './ContractorSelect.css';

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

export default function ContractorSelect({
                                             label,
                                             value,
                                             onChange,
                                             placeholderNip = 'np. 5250000000',
                                             className,
                                             required,
                                         }: Props) {
    const [nip, setNip] = useState<string>(value?.nip || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [localClients, setLocalClients] = useState<Client[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const sanitized = useMemo(() => sanitizeNip(nip), [nip]);
    const nipOk = isValidNip(sanitized);

    // Pobierz klientów z localStorage
    useEffect(() => {
        const loadClients = () => {
            const clients = getClients();
            setLocalClients(clients);
        };

        loadClients();

        // Nasłuchuj zmian w localStorage
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'appClients') {
                loadClients();
            }
        };

        window.addEventListener('storage', handleStorage);

        // Odświeżaj co 2 sekundy (na wypadek zmian w tej samej karcie)
        const interval = setInterval(loadClients, 2000);

        return () => {
            window.removeEventListener('storage', handleStorage);
            clearInterval(interval);
        };
    }, []);

    // Zamknij dropdown przy kliknięciu na zewnątrz
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Zapytanie do API (GUS/KSeF) gdy NIP jest poprawny
    const { data: apiContractors, isFetching } = useQuery({
        queryKey: ['contractors', sanitized],
        queryFn: () => listContractors({ q: sanitized }),
        enabled: sanitized.length === 10 && nipOk,
        staleTime: 60_000
    });

    const candidates: Contractor[] = apiContractors || [];

    // Synchronizuj NIP z zewnętrzną wartością
    useEffect(() => {
        if (value?.nip !== nip) setNip(value?.nip || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value?.nip]);

    // Filtruj lokalnych klientów
    const filteredClients = useMemo(() => {
        if (!searchTerm) return localClients;
        const term = searchTerm.toLowerCase();
        return localClients.filter(client =>
            client.name.toLowerCase().includes(term) ||
            client.nip.includes(searchTerm) ||
            (client.address?.toLowerCase().includes(term) ?? false)
        );
    }, [localClients, searchTerm]);

    function apply(candidate: Partial<PartyValue>) {
        const next: PartyValue = {
            nip: candidate.nip ?? sanitized,
            name: candidate.name ?? value?.name ?? '',
            address: candidate.address ?? value?.address ?? '',
            bankAccount: candidate.bankAccount ?? value?.bankAccount ?? ''
        };
        onChange(next);
        setShowDropdown(false);
        setSearchTerm('');
    }

    function selectLocalClient(client: Client) {
        apply({
            nip: client.nip,
            name: client.name,
            address: client.address || '',
            bankAccount: client.bankAccount || '',
        });
        setNip(client.nip);
    }

    function selectApiContractor(c: Contractor) {
        apply({
            nip: c.nip,
            name: c.nazwa ?? c.name ?? '',
            address: c.adres ?? c.address ?? '',
            bankAccount: c.bankAccount
        });
        setNip(c.nip);
    }

    return (
        <div className={`contractor-select ${className || ''}`} ref={wrapperRef}>
            {label && <span className="label">{label}{required ? ' *' : ''}</span>}

            {/* Przycisk wyboru z listy kontrahentów */}
            {localClients.length > 0 && (
                <div className="client-selector">
                    <button
                        type="button"
                        className="btn-select-client"
                        onClick={() => setShowDropdown(!showDropdown)}
                    >
                        <span className="btn-icon">📋</span>
                        <span>Wybierz z listy ({localClients.length})</span>
                        <span className="dropdown-arrow">{showDropdown ? '▲' : '▼'}</span>
                    </button>

                    {showDropdown && (
                        <div className="client-dropdown">
                            <div className="dropdown-search">
                                <input
                                    type="text"
                                    placeholder="Szukaj po nazwie lub NIP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="dropdown-list">
                                {filteredClients.length === 0 ? (
                                    <div className="dropdown-empty">
                                        {searchTerm ? `Brak wyników dla "${searchTerm}"` : 'Brak zapisanych kontrahentów'}
                                    </div>
                                ) : (
                                    filteredClients.map((client) => (
                                        <button
                                            key={client.id}
                                            type="button"
                                            className="dropdown-item"
                                            onClick={() => selectLocalClient(client)}
                                        >
                                            <div className="item-name">{client.name}</div>
                                            <div className="item-details">
                                                <span className="item-nip">NIP: {client.nip}</span>
                                                {client.address && (
                                                    <span className="item-address">{client.address}</span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            <div className="dropdown-footer">
                                <a href="/clients" className="add-client-link">
                                    + Zarządzaj kontrahentami
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {localClients.length === 0 && (
                <div className="no-clients-hint">
                    <span>Brak zapisanych kontrahentów. </span>
                    <a href="/clients">Dodaj pierwszego kontrahenta →</a>
                </div>
            )}

            <div className="divider">
                <span>lub wprowadź ręcznie</span>
            </div>

            {/* Wyszukiwanie po NIP */}
            <div className="nip-search-row">
                <label className="field nip-field">
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
                        className="btn btn-use-nip"
                        disabled={!nipOk || isFetching}
                        onClick={() => apply({})}
                        title="Użyj wprowadzonych danych"
                    >
                        {isFetching ? 'Szukam...' : 'Użyj NIP'}
                    </button>
                </div>
            </div>

            {/* Wyniki z API (GUS) */}
            {nipOk && candidates.length > 0 && (
                <div className="api-suggestions">
                    <div className="suggestion-hint">Znaleziono {candidates.length} kontrahentów w bazie — wybierz:</div>
                    <ul className="suggestion-list">
                        {candidates.map((c: Contractor) => (
                            <li key={c.nip} className="suggestion-item">
                                <button
                                    type="button"
                                    className="suggestion-btn"
                                    onClick={() => selectApiContractor(c)}
                                >
                                    <span className="suggestion-name">{c.nazwa ?? c.name}</span>
                                    <span className="suggestion-nip">NIP: {c.nip}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Pola formularza */}
            <div className="contractor-fields">
                <label className="field">
                    <span className="label small">Nazwa *</span>
                    <input
                        className="input"
                        value={value?.name || ''}
                        onChange={(e) => onChange({ ...value, name: e.target.value })}
                        placeholder="Nazwa kontrahenta"
                    />
                </label>

                <label className="field">
                    <span className="label small">Adres *</span>
                    <input
                        className="input"
                        value={value?.address || ''}
                        onChange={(e) => onChange({ ...value, address: e.target.value })}
                        placeholder="Ulica, nr, kod pocztowy, miejscowość"
                    />
                </label>

                <label className="field">
                    <span className="label small">Rachunek bankowy (opcjonalnie)</span>
                    <input
                        className="input"
                        value={value?.bankAccount || ''}
                        onChange={(e) => onChange({ ...value, bankAccount: e.target.value })}
                        placeholder="PL00 0000 0000 0000 0000 0000 0000"
                    />
                </label>
            </div>
        </div>
    );
}