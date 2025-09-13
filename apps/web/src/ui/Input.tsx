import React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...rest }, ref) => (
    <input
      ref={ref}
      className={`control shadow-inset w-full px-3 py-2 border border-transparent focus-ring transition-ui text-ink placeholder:text-ink-muted ${className}`}
      {...rest}
    />
  )
);

Input.displayName = 'Input';

