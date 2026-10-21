<script setup lang="ts">
import { onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import QuotaGauge from '@/components/QuotaGauge.vue';
import SpendChart from '@/components/SpendChart.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatBdt, formatRelative } from '@/lib/format';
import { useBillingStore } from '@/stores/billing';
import { useCatalogStore } from '@/stores/catalog';
import { useInstancesStore } from '@/stores/instances';

const catalog = useCatalogStore();
const instances = useInstancesStore();
const billing = useBillingStore();

onMounted(() => {
  void catalog.refreshQuota();
  void instances.load();
  void billing.load();
  void billing.loadActivity(8);
});
</script>

<template>
  <PageHeader title="Overview" subtitle="Project health at a glance">
    <RouterLink to="/instances/new" class="btn-primary">Launch instance</RouterLink>
  </PageHeader>

  <section class="card mb-4">
    <h2 class="mb-3 text-sm font-semibold">Quota usage</h2>
    <div v-if="catalog.views.length" class="grid grid-cols-3 gap-4 sm:grid-cols-6">
      <QuotaGauge v-for="q in catalog.views" :key="q.key" :quota="q" />
    </div>
    <p v-else class="text-sm text-slate-500">Loading quota…</p>
  </section>

  <div class="grid gap-4 lg:grid-cols-3">
    <section class="card lg:col-span-2">
      <div class="mb-2 flex items-baseline justify-between">
        <h2 class="text-sm font-semibold">Spend this month</h2>
        <p class="text-sm text-slate-500">
          <span class="font-mono font-semibold text-slate-900 dark:text-slate-100">{{ formatBdt(billing.monthToDate, 0) }}</span> to date ·
          <span class="font-mono">{{ formatBdt(billing.projected, 0) }}</span> projected
        </p>
      </div>
      <SpendChart v-if="billing.data" :values="billing.data.daily_spend_bdt" />
    </section>
    <section class="card">
      <h2 class="mb-2 text-sm font-semibold">Instances <span class="font-normal text-slate-500">· {{ instances.running }} running</span></h2>
      <ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        <li v-for="i in instances.items.slice(0, 6)" :key="i.id" class="flex items-center justify-between py-1.5">
          <span class="truncate">{{ i.name }}</span>
          <StatusBadge :status="i.status" />
        </li>
      </ul>
      <RouterLink to="/instances" class="mt-2 inline-block text-xs text-brand-600 hover:underline">All instances →</RouterLink>
    </section>
  </div>

  <section class="card mt-4">
    <h2 class="mb-2 text-sm font-semibold">Recent activity</h2>
    <ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      <li v-for="a in billing.activity" :key="a.id" class="flex items-center justify-between gap-3 py-1.5">
        <span><code class="text-xs text-slate-500">{{ a.action }}</code> {{ a.target }}</span>
        <span class="flex items-center gap-2 text-xs text-slate-500"><StatusBadge :status="a.outcome" />{{ formatRelative(a.ts) }}</span>
      </li>
    </ul>
  </section>
</template>
