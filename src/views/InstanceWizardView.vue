<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import { formatBdt, formatRam } from '@/lib/format';
import { WIZARD_STEPS, back, canProceed, compatibleFlavors, estimate, initialWizard, next, reviewProblems, stepName, toInput, validateStep } from '@/lib/wizard';
import { useCatalogStore } from '@/stores/catalog';
import { useInstancesStore } from '@/stores/instances';
import { useNetworkStore } from '@/stores/network';
import { useUiStore } from '@/stores/ui';

const catalog = useCatalogStore();
const network = useNetworkStore();
const instances = useInstancesStore();
const ui = useUiStore();
const router = useRouter();

const state = reactive(initialWizard());
const touched = ref(false);
const submitting = ref(false);

const current = computed(() => stepName(state));
const errors = computed(() => (touched.value ? validateStep(state) : {}));
const image = computed(() => catalog.images.find((i) => i.id === state.image_id));
const flavor = computed(() => catalog.flavors.find((f) => f.id === state.flavor_id));
const flavors = computed(() => compatibleFlavors(catalog.flavors, image.value));
const cost = computed(() => estimate(flavor.value));
const problems = computed(() => (current.value === 'review' ? reviewProblems(state, catalog.flavors, catalog.images, catalog.quota) : []));

onMounted(() => {
  void catalog.load();
  void catalog.refreshQuota();
  void network.load();
});

function goNext() {
  touched.value = true;
  if (!canProceed(state)) return;
  Object.assign(state, next(state));
  touched.value = false;
  // a flavor chosen before changing image may no longer fit
  if (state.flavor_id && !flavors.value.some((f) => f.id === state.flavor_id)) state.flavor_id = null;
}
function goBack() {
  Object.assign(state, back(state));
}
function toggleGroup(id: string) {
  state.security_group_ids = state.security_group_ids.includes(id) ? state.security_group_ids.filter((g) => g !== id) : [...state.security_group_ids, id];
}
async function launch() {
  if (problems.value.length) return;
  submitting.value = true;
  try {
    await instances.create(toInput(state));
    await router.push('/instances');
  } catch (err) {
    ui.notify('error', err instanceof Error ? err.message : 'launch failed');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <PageHeader title="Launch instance" subtitle="Image → flavor → network → key pair → review">
    <RouterLink to="/instances" class="btn-secondary">Cancel</RouterLink>
  </PageHeader>

  <ol class="mb-4 flex flex-wrap gap-2 text-xs" aria-label="Steps">
    <li v-for="(s, i) in WIZARD_STEPS" :key="s" class="chip" :class="i === state.step ? 'bg-brand-600 text-white' : i < state.step ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'">
      {{ i + 1 }}. {{ s }}
    </li>
  </ol>

  <div class="grid gap-4 lg:grid-cols-[1fr_300px]">
    <section class="card space-y-4" data-testid="wizard-step" :data-step="current">
      <template v-if="current === 'image'">
        <div>
          <label class="label" for="name">Instance name</label>
          <input id="name" v-model="state.name" class="input" placeholder="api-prod-03" />
          <p v-if="errors.name" class="mt-1 text-xs text-red-600">{{ errors.name }}</p>
        </div>
        <div>
          <p class="label">Image</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <button v-for="img in catalog.images" :key="img.id" type="button" class="rounded-lg border p-3 text-left text-sm" :class="state.image_id === img.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20' : 'border-slate-200 dark:border-slate-700'" :aria-pressed="state.image_id === img.id" @click="state.image_id = img.id">
              <p class="font-medium">{{ img.name }}</p>
              <p class="text-xs text-slate-500">min {{ img.min_disk_gb }} GB disk · {{ formatRam(img.min_ram_mb) }} RAM</p>
            </button>
          </div>
          <p v-if="errors.image_id" class="mt-1 text-xs text-red-600">{{ errors.image_id }}</p>
        </div>
      </template>

      <template v-else-if="current === 'flavor'">
        <p class="label">Flavor <span class="normal-case text-slate-400">· {{ flavors.length }} compatible with {{ image?.name }}</span></p>
        <table class="table">
          <thead><tr><th></th><th>Name</th><th>vCPU</th><th>RAM</th><th>Disk</th><th class="text-right">৳ / hour</th></tr></thead>
          <tbody>
            <tr v-for="f in flavors" :key="f.id" class="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" @click="state.flavor_id = f.id">
              <td><input type="radio" name="flavor" :value="f.id" :checked="state.flavor_id === f.id" :aria-label="f.name" @change="state.flavor_id = f.id" /></td>
              <td class="font-medium">{{ f.name }}</td><td>{{ f.vcpus }}</td><td>{{ formatRam(f.ram_mb) }}</td><td>{{ f.disk_gb }} GB</td>
              <td class="text-right font-mono">{{ formatBdt(f.hourly_bdt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="errors.flavor_id" class="text-xs text-red-600">{{ errors.flavor_id }}</p>
      </template>

      <template v-else-if="current === 'network'">
        <div>
          <label class="label" for="network">Network</label>
          <select id="network" v-model="state.network_id" class="input">
            <option :value="null" disabled>Select a network</option>
            <option v-for="n in catalog.networks.filter((n) => !n.external)" :key="n.id" :value="n.id">{{ n.name }} · {{ n.cidr }}</option>
          </select>
          <p v-if="errors.network_id" class="mt-1 text-xs text-red-600">{{ errors.network_id }}</p>
        </div>
        <div>
          <p class="label">Security groups</p>
          <label v-for="g in network.groups" :key="g.id" class="flex items-center gap-2 py-1 text-sm">
            <input type="checkbox" :checked="state.security_group_ids.includes(g.id)" @change="toggleGroup(g.id)" />
            <span class="font-medium">{{ g.name }}</span><span class="text-xs text-slate-500">{{ g.description }} · {{ g.rules.length }} rules</span>
          </label>
          <p v-if="errors.security_group_ids" class="text-xs text-red-600">{{ errors.security_group_ids }}</p>
        </div>
      </template>

      <template v-else-if="current === 'keypair'">
        <p class="label">SSH key pair <span class="normal-case text-slate-400">· optional</span></p>
        <label class="flex items-center gap-2 py-1 text-sm"><input v-model="state.keypair_id" type="radio" :value="null" /> No key pair (console access only)</label>
        <label v-for="k in catalog.keypairs" :key="k.id" class="flex items-center gap-2 py-1 text-sm">
          <input v-model="state.keypair_id" type="radio" :value="k.id" />
          <span class="font-medium">{{ k.name }}</span><span class="truncate font-mono text-xs text-slate-500">{{ k.fingerprint }}</span>
        </label>
      </template>

      <template v-else>
        <dl class="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
          <dt class="text-slate-500">Name</dt><dd class="font-medium">{{ state.name }}</dd>
          <dt class="text-slate-500">Image</dt><dd>{{ image?.name }}</dd>
          <dt class="text-slate-500">Flavor</dt><dd>{{ flavor?.name }} · {{ flavor?.vcpus }} vCPU · {{ formatRam(flavor?.ram_mb ?? 0) }} · {{ flavor?.disk_gb }} GB</dd>
          <dt class="text-slate-500">Network</dt><dd>{{ catalog.networkById.get(state.network_id ?? '')?.name }}</dd>
          <dt class="text-slate-500">Security groups</dt><dd>{{ state.security_group_ids.map((id) => network.groups.find((g) => g.id === id)?.name ?? id).join(', ') }}</dd>
          <dt class="text-slate-500">Key pair</dt><dd>{{ catalog.keypairs.find((k) => k.id === state.keypair_id)?.name ?? 'none' }}</dd>
        </dl>
        <ul v-if="problems.length" class="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300" role="alert">
          <li v-for="p in problems" :key="p.message">{{ p.message }}</li>
        </ul>
      </template>

      <div class="flex justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
        <button type="button" class="btn-secondary" :disabled="state.step === 0" @click="goBack">Back</button>
        <button v-if="current !== 'review'" type="button" class="btn-primary" @click="goNext">Next</button>
        <button v-else type="button" class="btn-primary" :disabled="submitting || problems.length > 0" @click="launch">{{ submitting ? 'Launching…' : 'Launch' }}</button>
      </div>
    </section>

    <aside class="card self-start text-sm">
      <h3 class="mb-2 font-semibold">Estimated cost</h3>
      <p class="font-mono text-2xl">{{ formatBdt(cost.monthly_bdt, 0) }}<span class="text-sm text-slate-500"> / month</span></p>
      <p class="text-xs text-slate-500">{{ formatBdt(cost.hourly_bdt) }} per hour · {{ flavor?.name ?? 'no flavor selected' }}</p>
      <p class="mt-3 text-xs text-slate-500">Excludes block storage, floating IPs and bandwidth. Billed per hour while the instance exists, including when stopped.</p>
    </aside>
  </div>
</template>
