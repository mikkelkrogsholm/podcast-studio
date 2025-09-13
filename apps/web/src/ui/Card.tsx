import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

export function Card({ className = '', header, footer, children, ...rest }: CardProps) {
  return (
    <div className={`card shadow-soft border border-white/50 ${className}`} {...rest}>
      {header && (
        <div className="px-6 py-4 border-b border-white/60">
          {header}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/60">
          {footer}
        </div>
      )}
    </div>
  );
}

