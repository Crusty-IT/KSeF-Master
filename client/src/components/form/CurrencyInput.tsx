// client/src/components/form/CurrencyInput.tsx
import NumberInput from './NumberInput';
import { formatPLN } from '../../helpers/money';

interface Props {
    label?: string;
    value?: number;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
    name?: string;
    disabled?: boolean;
    required?: boolean;
    className?: string;
    showFormattedHint?: boolean;
}

export default function CurrencyInput(props: Props) {
    const { showFormattedHint = true, value } = props;
    return (
        <div className={props.className}>
            <NumberInput
                {...props}
                suffix="PLN"
                placeholder={props.placeholder ?? '0,00'}
            />
            {showFormattedHint && value !== undefined && (
                <div className="hint">{formatPLN(value)} PLN</div>
            )}
        </div>
    );
}