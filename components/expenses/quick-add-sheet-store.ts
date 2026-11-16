"use client";

/**
 * Tiny external store for the global quick-add sheet. The sheet registers as
 * "ready" once its data has loaded; until then (or with JS off) every
 * QuickAddLink is a plain link to /add, which always works.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
let open = false;
let ready = false;

const emit = () => listeners.forEach((l) => l());

export const quickAddSheet = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isOpen: () => open,
  isReady: () => ready,
  setReady(v: boolean) {
    ready = v;
    if (!v) open = false;
    emit();
  },
  open() {
    if (!ready) return false;
    open = true;
    emit();
    return true;
  },
  close() {
    open = false;
    emit();
  },
};
