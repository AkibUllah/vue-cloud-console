import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { ActivityEntry, Billing } from '@/api/types';

export function sumUsage(lines: Billing['usage']): number {
  return Math.round(lines.reduce((s, l) => s + l.amount_bdt, 0) * 100) / 100;
}

export function byKind(lines: Billing['usage']): { kind: string; amount_bdt: number; share: number }[] {
  const total = sumUsage(lines) || 1;
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.kind, (map.get(l.kind) ?? 0) + l.amount_bdt);
  return [...map.entries()].map(([kind, amount]) => ({ kind, amount_bdt: amount, share: Math.round((amount / total) * 1000) / 10 })).sort((a, b) => b.amount_bdt - a.amount_bdt);
}

/** Straight-line projection of month-to-date spend to a full month of `daysInMonth`. */
export function projectMonth(daily: number[], daysInMonth: number): number {
  if (daily.length === 0) return 0;
  const avg = daily.reduce((a, b) => a + b, 0) / daily.length;
  return Math.round(avg * daysInMonth);
}

export const useBillingStore = defineStore('billing', () => {
  const data = ref<Billing | null>(null);
  const activity = ref<ActivityEntry[]>([]);
  const loading = ref(false);

  const monthToDate = computed(() => (data.value ? sumUsage(data.value.usage) : 0));
  const breakdown = computed(() => (data.value ? byKind(data.value.usage) : []));
  const projected = computed(() => (data.value ? projectMonth(data.value.daily_spend_bdt, 31) : 0));
  const outstanding = computed(() => (data.value ? data.value.invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.total_bdt, 0) : 0));

  async function load() {
    loading.value = true;
    try {
      data.value = await api().billing();
    } finally {
      loading.value = false;
    }
  }
  async function loadActivity(limit = 100) {
    activity.value = await api().activity(limit);
  }

  return { data, activity, loading, monthToDate, breakdown, projected, outstanding, load, loadActivity };
});
