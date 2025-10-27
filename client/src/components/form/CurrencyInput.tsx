// src/components/form/CurrencyInput.tsx
import { InputHTMLAttributes, useState } from 'react';
import { parseNumber, round2 } from '../../helpers/money';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
}

export default function CurrencyInput({ value, onChange, ...rest }: CurrencyInputProps) {
  const [text, setText] = useState(value.toFixed(2));

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onBlur={() => setText((Number.isFinite(value) ? value : 0).toFixed(2))}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        const n = round2(parseNumber(t));
        onChange(isFinite(n) ? n : 0);
      }}
      {...rest}
    />
  );
}
