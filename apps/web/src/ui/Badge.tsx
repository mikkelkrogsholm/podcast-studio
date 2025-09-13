import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
};

const tones = {
  neutral: 'bg-elevated text-ink',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
};

export function Badge({ className = '', tone = 'neutral', children, ...rest }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tones[tone]} ${className}`} {...rest}>
      {children}
    </span>
  );
}

