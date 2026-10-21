<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate } from '@/lib/format';
import { useBillingStore } from '@/stores/billing';

const billing = useBillingStore();
const query = ref('');
const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return billing.activity.filter((a) => !q || a.action.includes(q) || a.target.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q));
});
onMounted(() => void billing.loadActivity(200));
</script>

<template>
  <PageHeader title="Activity log" :subtitle="`${billing.activity.length} events this session`">
    <input v-model="query" class="input !w-64" placeholder="Filter by action, target or actor" aria-label="Filter activity" />
    <button type="button" class="btn-secondary" @click="billing.loadActivity(200)">Refresh</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table" data-testid="activity-table">
      <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Outcome</th></tr></thead>
      <tbody>
        <tr v-if="!visible.length"><td colspan="5" class="py-6 text-center text-slate-500">No activity recorded.</td></tr>
        <tr v-for="a in visible" :key="a.id">
          <td class="whitespace-nowrap text-xs text-slate-500">{{ formatDate(a.ts) }}</td>
          <td>{{ a.actor }}</td>
          <td><code class="text-xs">{{ a.action }}</code></td>
          <td>{{ a.target }}<span v-if="a.details" class="text-xs text-slate-500"> · {{ a.details }}</span></td>
          <td><StatusBadge :status="a.outcome" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
