"use client";
import React from 'react';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  return (
    <div className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {React.cloneElement(children as any, { 'aria-describedby': id })}
      {open && (
        <div id={id} role="tooltip" className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-[rgba(0,0,0,0.75)] text-white text-xs whitespace-nowrap shadow-soft">
          {label}
        </div>
      )}
    </div>
  );
}

