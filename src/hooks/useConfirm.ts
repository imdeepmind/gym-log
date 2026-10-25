import { create } from 'zustand';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolver: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  onConfirm: () => void;
  onCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: {
    title: 'Are you sure?',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
  },
  resolver: null,

  confirm: (options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const parsedOptions: ConfirmOptions =
        typeof options === 'string'
          ? {
              title: 'Confirm Action',
              message: options,
              confirmText: 'Confirm',
              cancelText: 'Cancel',
              variant: 'danger',
            }
          : {
              title: options.title || 'Confirm Action',
              message: options.message,
              confirmText: options.confirmText || 'Confirm',
              cancelText: options.cancelText || 'Cancel',
              variant: options.variant || 'danger',
            };

      set({
        isOpen: true,
        options: parsedOptions,
        resolver: resolve,
      });
    });
  },

  onConfirm: () => {
    const { resolver } = get();
    if (resolver) resolver(true);
    set({ isOpen: false, resolver: null });
  },

  onCancel: () => {
    const { resolver } = get();
    if (resolver) resolver(false);
    set({ isOpen: false, resolver: null });
  },
}));

/**
 * Universal hook for imperative, Promise-based confirmation dialogs.
 * Replaces browser window.confirm with a single shared modal.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete Workout', message: '...', variant: 'danger' })) { ... }
 */
export function useConfirm() {
  return useConfirmStore((state) => state.confirm);
}
