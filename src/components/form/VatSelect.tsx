import type { VatRate } from '../../helpers/vat';

interface Props {
    label?: string;
    value: VatRate;
    onChange: (v: VatRate) => void;
    name?: string;
    className?: string;
}

const OPTIONS: { value: VatRate; label: string }[] = [
    { value: 23, label: '23%' },
    { value: 8, label: '8%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0%' },
    { value: 'ZW', label: 'ZW' },
    { value: 'NP', label: 'NP' }
];

export default function VatSelect({ label, value, onChange, name, className }: Props) {
    return (
        <label className={`field ${className || ''}`}>
            {label && <span className="label">{label}</span>}
            <select
                className="select"
                name={name}
                value={String(value)}
                onChange={(e) => {
                    const val = e.target.value;
                    const v = val === 'ZW' || val === 'NP' ? (val as VatRate) : (Number(val) as VatRate);
                    onChange(v);
                }}
            >
                {OPTIONS.map(o => (
                    <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
                ))}
            </select>
        </label>
    );
}