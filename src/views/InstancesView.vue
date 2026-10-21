<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatRam, formatRelative } from '@/lib/format';
import { useCatalogStore } from '@/stores/catalog';
import { useInstancesStore } from '@/stores/instances';

const store = useInstancesStore();
const catalog = useCatalogStore();
const query = ref('');
const status = ref<string>('');

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return store.items
    .filter((i) => (!status.value || i.status === status.value) && (!q || i.name.toLowerCase().includes(q) || i.private_ip.includes(q) || (i.floating_ip ?? '').includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));
});

let poll: number | undefined;
function schedulePoll() {
  window.clearInterval(poll);
  if (store.hasTransitional) poll = window.setInterval(() => void store.load(), 1500);
}
watch(() => store.hasTransitional, schedulePoll);
onMounted(async () => {
  await Promise.all([catalog.load(), store.load()]);
  schedulePoll();
});
onBeforeUnmount(() => window.clearInterval(poll));
</script>

<template>
  <PageHeader title="Instances" :subtitle="`${store.items.length} total · ${store.running} running`">
    <input v-model="query" class="input !w-56" placeholder="Filter by name or IP" aria-label="Filter instances" />
    <select v-model="status" class="input !w-36" aria-label="Status filter">
      <option value="">All statuses</option>
      <option v-for="s in ['ACTIVE', 'SHUTOFF', 'BUILD', 'REBOOT', 'ERROR']" :key="s" :value="s">{{ s }}</option>
    </select>
    <RouterLink to="/instances/new" class="btn-primary">Launch instance</RouterLink>
  </PageHeader>

  <div class="card overflow-x-auto">
    <table class="table" data-testid="instances-table">
      <thead>
        <tr><th>Name</th><th>Status</th><th>Flavor</th><th>Image</th><th>IP addresses</th><th>Age</th><th class="text-right">Actions</th></tr>
      </thead>
      <tbody>
        <tr v-if="store.loading && !store.items.length"><td colspan="7" class="py-6 text-center text-slate-500">Loading…</td></tr>
        <tr v-else-if="!visible.length"><td colspan="7" class="py-6 text-center text-slate-500">No instances match.</td></tr>
        <tr v-for="i in visible" :key="i.id">
          <td>
            <p class="font-medium">{{ i.name }}</p>
            <p class="font-mono text-xs text-slate-500">{{ i.id }}</p>
          </td>
          <td><StatusBadge :status="i.status" /><span v-if="i.task" class="ml-1 text-xs text-slate-500">{{ i.task }}</span></td>
          <td>
            <p>{{ catalog.flavorById.get(i.flavor_id)?.name ?? i.flavor_id }}</p>
            <p class="text-xs text-slate-500">{{ catalog.flavorById.get(i.flavor_id)?.vcpus }} vCPU · {{ formatRam(catalog.flavorById.get(i.flavor_id)?.ram_mb ?? 0) }}</p>
          </td>
          <td>{{ catalog.imageById.get(i.image_id)?.name ?? i.image_id }}</td>
          <td class="font-mono text-xs">
            <p>{{ i.private_ip }}</p>
            <p v-if="i.floating_ip" class="text-brand-600">{{ i.floating_ip }}</p>
          </td>
          <td class="text-xs text-slate-500">{{ formatRelative(i.created_at) }}</td>
          <td class="text-right">
            <div class="inline-flex gap-1">
              <button v-if="i.status === 'SHUTOFF'" type="button" class="btn-secondary !px-2 !py-1" :disabled="store.busy.has(i.id)" @click="store.action(i.id, 'start')">Start</button>
              <template v-if="i.status === 'ACTIVE'">
                <button type="button" class="btn-secondary !px-2 !py-1" :disabled="store.busy.has(i.id)" @click="store.action(i.id, 'stop')">Stop</button>
                <button type="button" class="btn-secondary !px-2 !py-1" :disabled="store.busy.has(i.id)" @click="store.action(i.id, 'reboot')">Reboot</button>
              </template>
              <button type="button" class="btn-danger !px-2 !py-1" :disabled="store.busy.has(i.id) || i.status === 'DELETING'" @click="store.remove(i.id)">Delete</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
