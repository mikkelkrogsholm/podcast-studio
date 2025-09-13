import React from 'react';

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = '', rows = 4, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={`control shadow-inset w-full px-3 py-2 border border-transparent focus-ring transition-ui text-ink placeholder:text-ink-muted ${className}`}
      {...rest}
    />
  )
);

TextArea.displayName = 'TextArea';

