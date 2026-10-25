import React, { useEffect } from 'react';
import { useConfirmStore } from '@/hooks/useConfirm';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ConfirmModal() {
  const { isOpen, options, onConfirm, onCancel } = useConfirmStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const isDanger = options.variant === 'danger' || !options.variant;
  const isWarning = options.variant === 'warning';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-[#181818] border border-[#2e2e2e] w-full max-w-sm sm:max-w-md rounded-lg p-5 sm:p-6 text-[#f0f0f0] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-[#252525] rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Body */}
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
              isDanger
                ? 'bg-[#d9083c]/15 text-[#d9083c] border border-[#d9083c]/30'
                : isWarning
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
            }`}
          >
            {isDanger && <AlertTriangle className="w-5 h-5 stroke-[2.2]" />}
            {isWarning && <AlertCircle className="w-5 h-5 stroke-[2.2]" />}
            {!isDanger && !isWarning && <Info className="w-5 h-5 stroke-[2.2]" />}
          </div>

          <div className="flex-1 pr-4">
            <h3
              id="confirm-modal-title"
              className="text-base font-bold text-white tracking-tight"
            >
              {options.title || 'Confirm Action'}
            </h3>
            <p className="text-xs sm:text-sm text-[#a0a0a0] mt-1.5 leading-relaxed">
              {options.message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#262626]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-white hover:bg-[#252525] rounded-md transition-colors"
          >
            {options.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors text-white ${
              isDanger
                ? 'bg-[#d9083c] hover:bg-[#b50632]'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
