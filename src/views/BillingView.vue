<script setup lang="ts">
import { onMounted } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import SpendChart from '@/components/SpendChart.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatBdt, formatDate } from '@/lib/format';
import { useBillingStore } from '@/stores/billing';

const billing = useBillingStore();
onMounted(() => void billing.load());
</script>

<template>
  <PageHeader title="Billing" :subtitle="billing.data ? `Usage for ${billing.data.month} · credit ${formatBdt(billing.data.credit_bdt, 0)}` : ''" />
  <div v-if="billing.data" class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-4">
      <div class="card"><p class="label">Month to date</p><p class="font-mono text-2xl">{{ formatBdt(billing.monthToDate, 0) }}</p></div>
      <div class="card"><p class="label">Projected</p><p class="font-mono text-2xl">{{ formatBdt(billing.projected, 0) }}</p></div>
      <div class="card"><p class="label">Outstanding</p><p class="font-mono text-2xl">{{ formatBdt(billing.outstanding, 0) }}</p></div>
      <div class="card"><p class="label">Largest category</p><p class="text-lg font-medium capitalize">{{ billing.breakdown[0]?.kind.replace('_', ' ') }} · {{ billing.breakdown[0]?.share }}%</p></div>
    </div>
    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card lg:col-span-2"><h2 class="mb-2 text-sm font-semibold">Daily spend</h2><SpendChart :values="billing.data.daily_spend_bdt" /></section>
      <section class="card">
        <h2 class="mb-2 text-sm font-semibold">By category</h2>
        <ul class="space-y-2 text-sm">
          <li v-for="b in billing.breakdown" :key="b.kind">
            <div class="flex justify-between"><span class="capitalize">{{ b.kind.replace('_', ' ') }}</span><span class="font-mono">{{ formatBdt(b.amount_bdt, 0) }}</span></div>
            <div class="mt-1 h-1.5 rounded bg-slate-200 dark:bg-slate-800"><div class="h-full rounded bg-brand-500" :style="{ width: `${b.share}%` }" /></div>
          </li>
        </ul>
      </section>
    </div>
    <section class="card overflow-x-auto">
      <h2 class="mb-2 text-sm font-semibold">Usage lines</h2>
      <table class="table" data-testid="usage-table">
        <thead><tr><th>Resource</th><th>Quantity</th><th class="text-right">Unit price</th><th class="text-right">Amount</th></tr></thead>
        <tbody>
          <tr v-for="u in billing.data.usage" :key="u.resource">
            <td>{{ u.resource }}</td><td class="font-mono">{{ u.quantity }} {{ u.unit }}</td>
            <td class="text-right font-mono">{{ formatBdt(u.unit_price_bdt) }}</td><td class="text-right font-mono">{{ formatBdt(u.amount_bdt) }}</td>
          </tr>
          <tr class="font-semibold"><td colspan="3">Total</td><td class="text-right font-mono">{{ formatBdt(billing.monthToDate) }}</td></tr>
        </tbody>
      </table>
    </section>
    <section class="card overflow-x-auto">
      <h2 class="mb-2 text-sm font-semibold">Invoices</h2>
      <table class="table">
        <thead><tr><th>Invoice</th><th>Period</th><th>Issued</th><th>Due</th><th>Status</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          <tr v-for="inv in billing.data.invoices" :key="inv.id">
            <td class="font-mono">{{ inv.id }}</td><td>{{ inv.period }}</td><td>{{ formatDate(inv.issued_at) }}</td><td>{{ formatDate(inv.due_at) }}</td>
            <td><StatusBadge :status="inv.status" /></td><td class="text-right font-mono">{{ formatBdt(inv.total_bdt, 0) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
  <p v-else class="text-sm text-slate-500">Loading…</p>
</template>
