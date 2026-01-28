// src/components/form/CurrencyInput.tsx
import NumberInput from './NumberInput';

interface Props {
    label?: string;
    value?: number;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
}

export default function CurrencyInput(props: Props) {
    return (
        <NumberInput
            {...props}
            suffix="PLN"
            placeholder={props.placeholder ?? '0,00'}
            step={0.01}
            min={0}
            className={props.className}
        />
    );
}