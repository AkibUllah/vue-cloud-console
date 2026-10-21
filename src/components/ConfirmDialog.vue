<script setup lang="ts">
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
</script>

<template>
  <div v-if="ui.confirm" class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" :aria-label="ui.confirm.title">
    <div class="card w-full max-w-md space-y-4">
      <h3 class="text-base font-semibold">{{ ui.confirm.title }}</h3>
      <p class="text-sm text-slate-600 dark:text-slate-300">{{ ui.confirm.message }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="ui.answer(false)">Cancel</button>
        <button type="button" :class="ui.confirm.danger ? 'btn-danger' : 'btn-primary'" @click="ui.answer(true)">{{ ui.confirm.confirmLabel ?? 'Confirm' }}</button>
      </div>
    </div>
  </div>
</template>
