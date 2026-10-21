<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const styles = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  info: 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
};
</script>

<template>
  <div class="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2" aria-live="polite" data-testid="toasts">
    <button v-for="t in ui.toasts" :key="t.id" type="button" class="pointer-events-auto rounded-md border px-4 py-3 text-left text-sm shadow" :class="styles[t.kind]" @click="ui.dismiss(t.id)">
      {{ t.message }}
    </button>
  </div>
</template>
