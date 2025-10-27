// src/components/form/VatSelect.tsx
import { SelectHTMLAttributes } from 'react';
import type { VatRate } from '../../helpers/vat';

interface VatSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: VatRate;
  onChange: (value: VatRate) => void;
}

export default function VatSelect({ value, onChange, ...rest }: VatSelectProps) {
  return (
    <select value={String(value)} onChange={(e)=> onChange((e.target.value as any) as VatRate)} {...rest}>
      <option value={0}>0%</option>
      <option value={5}>5%</option>
      <option value={8}>8%</option>
      <option value={23}>23%</option>
      <option value={'ZW'}>ZW</option>
      <option value={'NP'}>NP</option>
    </select>
  );
}
