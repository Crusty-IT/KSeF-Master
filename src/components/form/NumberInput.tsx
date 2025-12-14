import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { parseNumberLike } from '../../helpers/money';

interface Props {
    label?: string;
    value?: number;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    suffix?: string;
}

export default function NumberInput({
                                        label,
                                        value,
                                        onChange,
                                        placeholder,
                                        min,
                                        max,
                                        step: _step = 0.01,
                                        name,
                                        disabled,
                                        required,
                                        className,
                                        suffix
                                    }: Props) {
    const [text, setText] = useState<string>(value === undefined ? '' : String(value));

    // Używamy _step żeby uniknąć błędu unused variable
    // W przyszłości można użyć do walidacji kroków
    void _step;

    useEffect(() => {
        const v = value === undefined ? '' : String(value).replace('.', ',');
        if (v !== text) setText(v);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const t = e.target.value;
        setText(t);
        const num = parseNumberLike(t);
        if (num === undefined) {
            onChange(undefined);
            return;
        }
        if (min !== undefined && num < min) return;
        if (max !== undefined && num > max) return;
        onChange(num);
    }

    return (
        <label className={`field ${className || ''}`}>
            {label && <span className="label">{label}{required ? ' *' : ''}</span>}
            <div className="input-group">
                <input
                    name={name}
                    inputMode="decimal"
                    className="input"
                    placeholder={placeholder}
                    value={text}
                    onChange={handleChange}
                    disabled={disabled}
                />
                {suffix && <span className="suffix">{suffix}</span>}
            </div>
        </label>
    );
}