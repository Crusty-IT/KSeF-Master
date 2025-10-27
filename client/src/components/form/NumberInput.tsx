// src/components/form/NumberInput.tsx
import { InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | 'any';
}

export default function NumberInput({ value, onChange, min, step = 'any', ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e)=> onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      min={min}
      step={step as any}
      {...rest}
    />
  );
}
