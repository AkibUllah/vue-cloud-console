import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { Session } from '@/api/types';

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const restored = ref(false);

  const isAuthenticated = computed(() => session.value !== null);
  const user = computed(() => session.value?.user ?? null);

  async function restore() {
    if (restored.value) return;
    try {
      session.value = await api().me();
    } finally {
      restored.value = true;
    }
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      session.value = await api().login(email, password);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await api().logout();
    session.value = null;
  }

  return { session, user, isAuthenticated, loading, error, restored, restore, login, logout };
});
