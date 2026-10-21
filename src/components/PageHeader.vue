<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <header class="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 class="text-xl font-semibold">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
    </div>
    <div class="flex items-center gap-2"><slot /></div>
  </header>
</template>
