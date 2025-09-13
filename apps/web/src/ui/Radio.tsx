import React from 'react';

type RadioProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Radio({ className = '', ...rest }: RadioProps) {
  return (
    <input
      type="radio"
      className={`h-4 w-4 rounded-full border border-ui bg-elevated text-[var(--accent)] focus-ring transition-ui ${className}`}
      style={{ accentColor: 'var(--accent)' }}
      {...rest}
    />
  );
}

