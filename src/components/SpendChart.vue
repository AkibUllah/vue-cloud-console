<script setup lang="ts">
import { computed } from 'vue';
import { formatBdt } from '@/lib/format';

const props = defineProps<{ values: number[]; width?: number; height?: number }>();
const w = computed(() => props.width ?? 560);
const h = computed(() => props.height ?? 160);
const pad = { l: 44, r: 8, t: 8, b: 20 };

const max = computed(() => Math.max(1, ...props.values) * 1.1);
const points = computed(() => {
  const n = props.values.length;
  if (n === 0) return [] as { x: number; y: number; v: number }[];
  const innerW = w.value - pad.l - pad.r;
  const innerH = h.value - pad.t - pad.b;
  return props.values.map((v, i) => ({ x: pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW), y: pad.t + innerH - (v / max.value) * innerH, v }));
});
const path = computed(() => points.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
const area = computed(() => (points.value.length ? `${path.value} L${points.value[points.value.length - 1].x.toFixed(1)},${h.value - pad.b} L${pad.l},${h.value - pad.b} Z` : ''));
const ticks = computed(() => [0, 0.5, 1].map((f) => ({ y: pad.t + (h.value - pad.t - pad.b) * (1 - f), label: formatBdt(max.value * f, 0) })));
</script>

<template>
  <svg :viewBox="`0 0 ${w} ${h}`" class="w-full" role="img" :aria-label="`Daily spend, ${values.length} days`">
    <defs>
      <linearGradient id="spend-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f6bff" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#2f6bff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <g v-for="t in ticks" :key="t.y">
      <line :x1="pad.l" :x2="w - pad.r" :y1="t.y" :y2="t.y" class="stroke-slate-200 dark:stroke-slate-800" stroke-dasharray="3 3" />
      <text :x="pad.l - 6" :y="t.y + 3" text-anchor="end" class="fill-slate-500 text-[10px]">{{ t.label }}</text>
    </g>
    <path v-if="area" :d="area" fill="url(#spend-fill)" />
    <path v-if="path" :d="path" fill="none" stroke="#2f6bff" stroke-width="2" stroke-linejoin="round" />
    <circle v-for="(p, i) in points" :key="i" :cx="p.x" :cy="p.y" r="2.5" fill="#2f6bff">
      <title>Day {{ i + 1 }}: {{ formatBdt(p.v, 0) }}</title>
    </circle>
    <text :x="pad.l" :y="h - 6" class="fill-slate-500 text-[10px]">day 1</text>
    <text :x="w - pad.r" :y="h - 6" text-anchor="end" class="fill-slate-500 text-[10px]">day {{ values.length }}</text>
  </svg>
</template>
