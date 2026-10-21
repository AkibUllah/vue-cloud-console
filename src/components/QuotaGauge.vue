<script setup lang="ts">
import { computed } from 'vue';
import type { QuotaView } from '@/lib/quota';

const props = defineProps<{ quota: QuotaView; size?: number }>();
const size = computed(() => props.size ?? 96);
const stroke = 9;
const r = computed(() => (size.value - stroke) / 2);
const circumference = computed(() => 2 * Math.PI * r.value);
const dash = computed(() => (props.quota.percent / 100) * circumference.value);
const color = computed(() => ({ ok: '#10b981', warning: '#f59e0b', critical: '#ef4444' })[props.quota.level]);
</script>

<template>
  <div class="flex flex-col items-center gap-1" :data-level="quota.level" role="img" :aria-label="`${quota.label}: ${quota.used} of ${quota.limit} (${quota.percent}%)`">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" class="stroke-slate-200 dark:stroke-slate-800" :stroke-width="stroke" />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="r"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="`${dash} ${circumference - dash}`"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        style="transition: stroke-dasharray 0.4s ease"
      />
      <text :x="size / 2" :y="size / 2 + 1" text-anchor="middle" dominant-baseline="middle" class="fill-slate-900 font-mono text-sm font-semibold dark:fill-slate-100">{{ quota.percent }}%</text>
    </svg>
    <p class="text-xs font-medium text-slate-700 dark:text-slate-300">{{ quota.label }}</p>
    <p class="font-mono text-[11px] text-slate-500">{{ quota.used }} / {{ quota.limit }}</p>
  </div>
</template>
