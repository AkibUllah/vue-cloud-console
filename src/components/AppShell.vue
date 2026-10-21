<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import ConfirmDialog from './ConfirmDialog.vue';
import ToastList from './ToastList.vue';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();

const nav = [
  { to: '/', label: 'Overview', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { to: '/instances', label: 'Instances', icon: 'M4 6h16v5H4zM4 13h16v5H4z' },
  { to: '/volumes', label: 'Volumes', icon: 'M12 3c5 0 8 1.5 8 3v12c0 1.5-3 3-8 3s-8-1.5-8-3V6c0-1.5 3-3 8-3zM4 10c0 1.5 3 3 8 3s8-1.5 8-3' },
  { to: '/floating-ips', label: 'Floating IPs', icon: 'M12 21s6-5.5 6-11a6 6 0 10-12 0c0 5.5 6 11 6 11zM12 10h.01' },
  { to: '/security-groups', label: 'Security groups', icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z' },
  { to: '/billing', label: 'Billing', icon: 'M4 5h16v14H4zM4 10h16M8 15h4' },
  { to: '/activity', label: 'Activity', icon: 'M3 12h4l3-8 4 16 3-8h4' },
];

async function logout() {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex" :class="{ '!flex absolute inset-y-0 left-0 z-30': ui.sidebarOpen }">
      <RouterLink to="/" class="mb-6 flex items-center gap-2 text-lg font-semibold text-brand-700 dark:text-brand-100" @click="ui.sidebarOpen = false">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#1f54d6" /><path d="M10 21a4 4 0 0 1 .6-7.95A6 6 0 0 1 22 14a3.5 3.5 0 0 1 0 7z" fill="#fff" /></svg>
        Meghna Cloud
      </RouterLink>
      <nav class="flex flex-1 flex-col gap-1" aria-label="Main">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          active-class="!bg-brand-50 !text-brand-700 dark:!bg-brand-700/20 dark:!text-brand-100"
          :exact-active-class="item.to === '/' ? '!bg-brand-50 !text-brand-700 dark:!bg-brand-700/20 dark:!text-brand-100' : undefined"
          @click="ui.sidebarOpen = false"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="item.icon" /></svg>
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800">
        <p class="font-medium text-slate-700 dark:text-slate-200">{{ auth.user?.name }}</p>
        <p>{{ auth.user?.project }} · {{ auth.user?.role }}</p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="btn-secondary !px-2 !py-1" :aria-pressed="ui.dark" @click="ui.toggleDark()">{{ ui.dark ? 'Light' : 'Dark' }}</button>
          <button type="button" class="btn-secondary !px-2 !py-1" @click="logout">Sign out</button>
        </div>
      </div>
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <button type="button" class="btn-secondary !px-2 !py-1" aria-label="Toggle navigation" @click="ui.sidebarOpen = !ui.sidebarOpen">☰</button>
        <span class="font-semibold">Meghna Cloud</span>
      </div>
      <main class="flex-1 p-4 md:p-6">
        <RouterView />
      </main>
    </div>
    <ToastList />
    <ConfirmDialog />
  </div>
</template>
