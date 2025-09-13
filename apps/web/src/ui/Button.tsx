import React from 'react';

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base = 'transition-ui focus-ring font-medium px-4 py-2 rounded-xl';

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:brightness-110',
  subtle: 'bg-elevated text-ink hover:bg-elevated/90 shadow-soft',
  ghost: 'bg-transparent text-ink hover:bg-elevated',
  danger: 'bg-red-500 text-white hover:bg-red-600',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'subtle', className = '', children, ...rest }, ref) => {
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${className}`} {...rest}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

