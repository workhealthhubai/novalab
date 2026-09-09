import { useSyncExternalStore } from 'react';

/**
 * Collapsed/expanded state of the desktop sidebar, persisted per browser.
 * Kept as a tiny external store on purpose (no state library in Phase 1).
 */
const STORAGE_KEY = 'osgb.sidebar-collapsed';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSidebarCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* storage unavailable — state simply does not persist */
  }
  for (const listener of listeners) listener();
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
