import { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string | React.ReactNode;
}

export default function PrimaryButton({ icon, children, className = '', ...rest }: PropsWithChildren<PrimaryButtonProps>) {
  return (
    <button className={`btn-accent ${className}`.trim()} {...rest}>
      {icon ? <span className="btn-icon" aria-hidden>{icon}</span> : null}
      {children}
    </button>
  );
}
