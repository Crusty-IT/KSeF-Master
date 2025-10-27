// src/components/form/ContractorSelect.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { listContractors, type Contractor } from '../../services/ksefApi';
import { isValidNip, sanitizeNip } from '../../helpers/nip';

export interface PartyValue {
  name: string;
  nip: string;
  address: string;
  bankAccount?: string;
}

interface ContractorSelectProps {
  label: string;
  value: PartyValue;
  onChange: (party: PartyValue) => void;
  allowBank?: boolean;
}

export default function ContractorSelect({ label, value, onChange, allowBank }: ContractorSelectProps) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Contractor[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q || q.length < 3) { setResults([]); return; }
      try {
        const data = await listContractors({ q, pageSize: 10 });
        if (!cancelled) setResults(data || []);
      } catch {
        if (!cancelled) setResults([]);
      }
    };
    const t = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const nipOk = useMemo(() => isValidNip(value.nip), [value.nip]);

  return (
    <div className="party-card" ref={wrapRef}>
      <div className="field-row">
        <label className={!nipOk && value.nip ? 'invalid' : ''}>{label} – NIP
          <input
            type="text"
            placeholder="np. 5250012312"
            value={value.nip}
            onChange={(e) => onChange({ ...value, nip: sanitizeNip(e.target.value) })}
            onFocus={() => setOpen(true)}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
        </label>
        <label>Nazwa
          <input type="text" value={value.name} onChange={(e)=> onChange({ ...value, name: e.target.value })} />
        </label>
      </div>

      <label>Adres
        <input type="text" value={value.address} onChange={(e)=> onChange({ ...value, address: e.target.value })} />
      </label>

      {allowBank && (
        <label>Rachunek bankowy
          <input type="text" placeholder="PL.. lub 26 cyfr" value={value.bankAccount || ''} onChange={(e)=> onChange({ ...value, bankAccount: e.target.value })} />
        </label>
      )}

      {open && (
        <div className="dropdown">
          {results.length === 0 ? (
            <div className="dropdown-item muted">Brak podpowiedzi</div>
          ) : results.map((c) => (
            <button key={(c.id||c.nip)} type="button" className="dropdown-item" onClick={()=>{
              onChange({ name: c.name || '', nip: sanitizeNip(c.nip), address: c.address || '', bankAccount: value.bankAccount });
              setOpen(false);
            }}>
              <div className="title">{c.name}</div>
              <div className="sub">NIP: {c.nip}{c.address ? ` • ${c.address}` : ''}</div>
            </button>
          ))}
        </div>
      )}

      {!nipOk && value.nip?.length === 10 && (
        <div className="error-inline">Nieprawidłowy NIP – sprawdź sumę kontrolną.</div>
      )}
    </div>
  );
}
