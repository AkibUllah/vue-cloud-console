<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatGb, formatRelative } from '@/lib/format';
import { canCreateVolume } from '@/lib/quota';
import { useCatalogStore } from '@/stores/catalog';
import { useInstancesStore } from '@/stores/instances';
import { useVolumesStore } from '@/stores/volumes';

const store = useVolumesStore();
const instances = useInstancesStore();
const catalog = useCatalogStore();
const form = reactive({ name: '', size_gb: 100, type: 'ssd' as 'ssd' | 'hdd' });
const creating = ref(false);
const attachTarget = reactive<Record<string, string>>({});

const quotaCheck = computed(() => (catalog.quota ? canCreateVolume(catalog.quota, form.size_gb) : { ok: true, blockers: [] }));
const canCreate = computed(() => form.name.trim().length >= 2 && form.size_gb >= 1 && quotaCheck.value.ok);
const attachable = computed(() => instances.items.filter((i) => i.status === 'ACTIVE' || i.status === 'SHUTOFF'));

onMounted(() => {
  void store.load();
  void instances.load();
  void catalog.refreshQuota();
});

async function create() {
  creating.value = true;
  try {
    if (await store.create({ name: form.name.trim(), size_gb: Number(form.size_gb), type: form.type })) form.name = '';
  } finally {
    creating.value = false;
  }
}
</script>

<template>
  <PageHeader title="Volumes" :subtitle="`${store.items.length} volumes · ${formatGb(store.totalGb)} provisioned`" />
  <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
    <div class="card overflow-x-auto">
      <table class="table">
        <thead><tr><th>Name</th><th>Size</th><th>Type</th><th>Status</th><th>Attached to</th><th>Age</th><th class="text-right">Actions</th></tr></thead>
        <tbody>
          <tr v-for="v in store.items" :key="v.id">
            <td><p class="font-medium">{{ v.name }}</p><p class="font-mono text-xs text-slate-500">{{ v.id }}</p></td>
            <td class="font-mono">{{ formatGb(v.size_gb) }}</td>
            <td class="uppercase">{{ v.type }}</td>
            <td><StatusBadge :status="v.status" /></td>
            <td>{{ instances.byId.get(v.attached_to ?? '')?.name ?? (v.attached_to ? v.attached_to : '—') }}</td>
            <td class="text-xs text-slate-500">{{ formatRelative(v.created_at) }}</td>
            <td class="text-right">
              <div class="inline-flex items-center gap-1">
                <template v-if="v.status === 'available'">
                  <select v-model="attachTarget[v.id]" class="input !w-40 !py-1" :aria-label="`attach ${v.name} to`">
                    <option value="" disabled selected>Attach to…</option>
                    <option v-for="i in attachable" :key="i.id" :value="i.id">{{ i.name }}</option>
                  </select>
                  <button type="button" class="btn-secondary !px-2 !py-1" :disabled="!attachTarget[v.id]" @click="store.attach(v.id, attachTarget[v.id])">Attach</button>
                  <button type="button" class="btn-danger !px-2 !py-1" @click="store.remove(v.id)">Delete</button>
                </template>
                <button v-else-if="v.status === 'in-use'" type="button" class="btn-secondary !px-2 !py-1" @click="store.detach(v.id)">Detach</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <form class="card space-y-3 self-start" @submit.prevent="create">
      <h2 class="font-semibold">Create volume</h2>
      <div><label class="label" for="vname">Name</label><input id="vname" v-model="form.name" class="input" placeholder="app-data" /></div>
      <div><label class="label" for="vsize">Size (GB)</label><input id="vsize" v-model.number="form.size_gb" class="input" type="number" min="1" max="4000" step="10" /></div>
      <div>
        <label class="label" for="vtype">Type</label>
        <select id="vtype" v-model="form.type" class="input"><option value="ssd">SSD · ৳12 / GB-month</option><option value="hdd">HDD · ৳4 / GB-month</option></select>
      </div>
      <p v-if="!quotaCheck.ok" class="text-xs text-red-600">{{ quotaCheck.blockers[0] }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="!canCreate || creating">Create</button>
    </form>
  </div>
</template>
