import React from 'react';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', children, ...rest }, ref) => (
    <select
      ref={ref}
      className={`control shadow-inset w-full px-3 py-2 border border-transparent focus-ring transition-ui text-ink ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
);

Select.displayName = 'Select';

