<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { formatRelative } from '@/lib/format';
import { useInstancesStore } from '@/stores/instances';
import { useNetworkStore } from '@/stores/network';

const net = useNetworkStore();
const instances = useInstancesStore();
const target = reactive<Record<string, string>>({});
const candidates = computed(() => instances.items.filter((i) => !i.floating_ip && i.status !== 'DELETING'));

onMounted(() => {
  void net.load();
  void instances.load();
});
</script>

<template>
  <PageHeader title="Floating IPs" :subtitle="`${net.floatingIps.length} allocated · ${net.floatingIps.filter((f) => !f.instance_id).length} unassigned`">
    <button type="button" class="btn-primary" @click="net.allocate()">Allocate IP</button>
  </PageHeader>
  <div class="card overflow-x-auto">
    <table class="table">
      <thead><tr><th>Address</th><th>Associated instance</th><th>Age</th><th class="text-right">Actions</th></tr></thead>
      <tbody>
        <tr v-if="!net.floatingIps.length"><td colspan="4" class="py-6 text-center text-slate-500">No floating IPs. Allocate one to expose an instance publicly.</td></tr>
        <tr v-for="f in net.floatingIps" :key="f.id">
          <td class="font-mono">{{ f.address }}</td>
          <td>{{ instances.byId.get(f.instance_id ?? '')?.name ?? (f.instance_id ? f.instance_id : '—') }}</td>
          <td class="text-xs text-slate-500">{{ formatRelative(f.created_at) }}</td>
          <td class="text-right">
            <div class="inline-flex items-center gap-1">
              <template v-if="!f.instance_id">
                <select v-model="target[f.id]" class="input !w-44 !py-1" :aria-label="`associate ${f.address} with`">
                  <option value="" disabled selected>Associate with…</option>
                  <option v-for="i in candidates" :key="i.id" :value="i.id">{{ i.name }} ({{ i.private_ip }})</option>
                </select>
                <button type="button" class="btn-secondary !px-2 !py-1" :disabled="!target[f.id]" @click="net.associate(f.id, target[f.id])">Associate</button>
                <button type="button" class="btn-danger !px-2 !py-1" @click="net.release(f.id)">Release</button>
              </template>
              <button v-else type="button" class="btn-secondary !px-2 !py-1" @click="net.disassociate(f.id)">Disassociate</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
