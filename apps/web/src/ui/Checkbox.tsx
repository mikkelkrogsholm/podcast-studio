import React from 'react';

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox({ className = '', ...rest }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded-md border border-ui bg-elevated text-[var(--accent)] focus-ring transition-ui ${className}`}
      style={{ accentColor: 'var(--accent)' }}
      {...rest}
    />
  );
}

