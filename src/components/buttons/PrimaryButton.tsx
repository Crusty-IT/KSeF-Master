import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: string;
}

export default function PrimaryButton({
                                          children,
                                          icon,
                                          className = '',
                                          ...rest
                                      }: PropsWithChildren<Props>) {
    return (
        <button className={`btn-primary ${className}`} {...rest}>
            {icon && <span className="btn-icon">{icon}</span>}
            {children}
        </button>
    );
}