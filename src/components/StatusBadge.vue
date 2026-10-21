<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

const styles: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  SHUTOFF: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  BUILD: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 animate-pulse',
  REBOOT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse',
  DELETING: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 animate-pulse',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'in-use': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  creating: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  failure: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};
const cls = computed(() => styles[props.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300');
</script>

<template>
  <span class="chip" :class="cls" :data-status="status">{{ status }}</span>
</template>
