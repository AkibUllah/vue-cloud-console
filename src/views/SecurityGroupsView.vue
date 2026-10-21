<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import { describeRule, parsePortRange, validateRule } from '@/lib/rules';
import type { CreateRuleInput } from '@/api/types';
import { useNetworkStore } from '@/stores/network';

const net = useNetworkStore();
const selectedId = ref<string | null>(null);
const selected = computed(() => net.groups.find((g) => g.id === selectedId.value) ?? null);
const newGroup = reactive({ name: '', description: '' });
const rule = reactive({ direction: 'ingress' as CreateRuleInput['direction'], protocol: 'tcp' as CreateRuleInput['protocol'], ports: '', cidr: '0.0.0.0/0', description: '' });
const touched = ref(false);

const draft = computed<CreateRuleInput | null>(() => {
  const range = parsePortRange(rule.ports);
  if (!range) return null;
  return { direction: rule.direction, protocol: rule.protocol, ...range, cidr: rule.cidr.trim(), description: rule.description.trim() };
});
const errors = computed(() => {
  if (!touched.value) return {};
  if (!draft.value) return { port_min: 'ports like 22 or 8000-8100' };
  return validateRule(draft.value);
});
const valid = computed(() => draft.value !== null && Object.keys(validateRule(draft.value)).length === 0);

watch(() => net.groups, (gs) => {
  if (!selectedId.value && gs.length) selectedId.value = gs[0].id;
}, { immediate: true });
onMounted(() => void net.load());

async function addRule() {
  touched.value = true;
  if (!selected.value || !draft.value || !valid.value) return;
  if (await net.addRule(selected.value.id, draft.value)) {
    rule.ports = '';
    rule.description = '';
    touched.value = false;
  }
}
async function createGroup() {
  const g = await net.createGroup(newGroup.name.trim(), newGroup.description.trim());
  if (g) {
    selectedId.value = g.id;
    newGroup.name = '';
    newGroup.description = '';
  }
}
</script>

<template>
  <PageHeader title="Security groups" :subtitle="`${net.groups.length} groups`" />
  <div class="grid gap-4 lg:grid-cols-[260px_1fr]">
    <aside class="space-y-3">
      <ul class="card divide-y divide-slate-100 !p-0 dark:divide-slate-800" aria-label="Groups">
        <li v-for="g in net.groups" :key="g.id">
          <button type="button" class="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" :class="{ 'bg-brand-50 dark:bg-brand-700/20': g.id === selectedId }" :aria-pressed="g.id === selectedId" @click="selectedId = g.id">
            <span class="font-medium">{{ g.name }}</span><span class="text-xs text-slate-500">{{ g.rules.length }} rules</span>
          </button>
        </li>
      </ul>
      <form class="card space-y-2" @submit.prevent="createGroup">
        <h3 class="text-sm font-semibold">New group</h3>
        <input v-model="newGroup.name" class="input" placeholder="name" aria-label="group name" required minlength="2" pattern="[a-z0-9-]+" />
        <input v-model="newGroup.description" class="input" placeholder="description" aria-label="group description" />
        <button type="submit" class="btn-secondary w-full" :disabled="newGroup.name.trim().length < 2">Create</button>
      </form>
    </aside>

    <section v-if="selected" class="card space-y-4">
      <div class="flex items-start justify-between">
        <div><h2 class="font-semibold">{{ selected.name }}</h2><p class="text-sm text-slate-500">{{ selected.description }}</p></div>
        <button type="button" class="btn-danger !px-2 !py-1" :disabled="selected.name === 'default'" @click="net.deleteGroup(selected.id)">Delete group</button>
      </div>
      <table class="table" data-testid="rules-table">
        <thead><tr><th>Direction</th><th>Protocol</th><th>Ports</th><th>CIDR</th><th>Description</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in selected.rules" :key="r.id">
            <td class="capitalize">{{ r.direction }}</td>
            <td class="uppercase">{{ r.protocol }}</td>
            <td class="font-mono">{{ r.port_min === null ? 'any' : r.port_min === r.port_max ? r.port_min : `${r.port_min}-${r.port_max}` }}</td>
            <td class="font-mono">{{ r.cidr }}</td>
            <td class="text-slate-500">{{ r.description }}</td>
            <td class="text-right"><button type="button" class="btn-danger !px-2 !py-0.5" :aria-label="`remove rule ${describeRule(r)}`" @click="net.removeRule(selected!.id, r.id)">×</button></td>
          </tr>
          <tr class="bg-slate-50 dark:bg-slate-800/50">
            <td><select v-model="rule.direction" class="input !py-1" aria-label="direction"><option value="ingress">ingress</option><option value="egress">egress</option></select></td>
            <td><select v-model="rule.protocol" class="input !py-1" aria-label="protocol"><option v-for="p in ['tcp', 'udp', 'icmp', 'any']" :key="p" :value="p">{{ p }}</option></select></td>
            <td><input v-model="rule.ports" class="input !py-1 font-mono" placeholder="22 or 8000-8100" aria-label="ports" :disabled="rule.protocol === 'icmp' || rule.protocol === 'any'" /></td>
            <td><input v-model="rule.cidr" class="input !py-1 font-mono" aria-label="cidr" /></td>
            <td><input v-model="rule.description" class="input !py-1" placeholder="why" aria-label="rule description" /></td>
            <td class="text-right"><button type="button" class="btn-primary !px-2 !py-1" :disabled="touched && !valid" @click="addRule">Add</button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="Object.keys(errors).length" class="text-xs text-red-600" role="alert">{{ Object.values(errors).join(' · ') }}</p>
      <p v-else-if="draft && valid" class="text-xs text-slate-500">Will add: {{ describeRule(draft) }}</p>
    </section>
  </div>
</template>
