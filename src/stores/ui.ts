import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; message: string }
export interface ConfirmRequest { title: string; message: string; confirmLabel?: string; danger?: boolean; resolve: (ok: boolean) => void }

const THEME_KEY = 'console.theme';

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([]);
  const confirm = ref<ConfirmRequest | null>(null);
  const dark = ref<boolean>(readTheme());
  const sidebarOpen = ref(false);
  let seq = 0;

  function readTheme(): boolean {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v) return v === 'dark';
      return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  }

  function applyTheme() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', dark.value);
    try {
      localStorage.setItem(THEME_KEY, dark.value ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }

  function toggleDark() {
    dark.value = !dark.value;
    applyTheme();
  }

  function notify(kind: Toast['kind'], message: string, ttl = 4000) {
    const id = ++seq;
    toasts.value.push({ id, kind, message });
    if (ttl > 0) setTimeout(() => dismiss(id), ttl);
    return id;
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function ask(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => {
      confirm.value = { ...opts, resolve };
    });
  }
  function answer(ok: boolean) {
    confirm.value?.resolve(ok);
    confirm.value = null;
  }

  return { toasts, confirm, dark, sidebarOpen, notify, dismiss, ask, answer, toggleDark, applyTheme };
});
