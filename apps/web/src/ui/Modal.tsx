import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative card w-full max-w-2xl shadow-soft">
        {title && (
          <div className="px-6 py-4 border-b border-white/60 flex items-center justify-between">
            <div className="text-lg font-semibold text-ink">{title}</div>
            <button onClick={onClose} className="px-2 py-1 rounded-xl hover:bg-elevated transition-ui" aria-label="Close">
              ✕
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

