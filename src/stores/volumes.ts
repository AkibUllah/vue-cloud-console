import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { CreateVolumeInput, Volume } from '@/api/types';
import { useCatalogStore } from './catalog';
import { useUiStore } from './ui';

export const useVolumesStore = defineStore('volumes', () => {
  const items = ref<Volume[]>([]);
  const loading = ref(false);

  const totalGb = computed(() => items.value.reduce((s, v) => s + v.size_gb, 0));
  const available = computed(() => items.value.filter((v) => v.status === 'available'));

  function upsert(v: Volume) {
    const idx = items.value.findIndex((x) => x.id === v.id);
    if (idx >= 0) items.value.splice(idx, 1, v);
    else items.value.push(v);
  }

  async function load() {
    loading.value = true;
    try {
      items.value = await api().listVolumes();
    } finally {
      loading.value = false;
    }
  }

  type Outcome<T> = { ok: true; value: T } | { ok: false };

  async function run<T>(label: string, fn: () => Promise<T>): Promise<Outcome<T>> {
    const ui = useUiStore();
    try {
      const value = await fn();
      ui.notify('success', label);
      return { ok: true, value };
    } catch (err) {
      ui.notify('error', err instanceof Error ? err.message : `${label} failed`);
      return { ok: false };
    }
  }

  async function create(input: CreateVolumeInput): Promise<Volume | undefined> {
    const r = await run(`Creating ${input.name} (${input.size_gb} GB)`, () => api().createVolume(input));
    if (!r.ok) return undefined;
    upsert(r.value);
    void useCatalogStore().refreshQuota();
    return r.value;
  }
  async function attach(volumeId: string, instanceId: string): Promise<Volume | undefined> {
    const r = await run('Volume attached', () => api().attachVolume(volumeId, instanceId));
    if (r.ok) upsert(r.value);
    return r.ok ? r.value : undefined;
  }
  async function detach(volumeId: string): Promise<Volume | undefined> {
    const r = await run('Volume detached', () => api().detachVolume(volumeId));
    if (r.ok) upsert(r.value);
    return r.ok ? r.value : undefined;
  }
  async function remove(id: string) {
    const ui = useUiStore();
    const vol = items.value.find((v) => v.id === id);
    if (!(await ui.ask({ title: 'Delete volume', message: `Delete ${vol?.name ?? id} and all data on it?`, confirmLabel: 'Delete', danger: true }))) return false;
    const r = await run('Volume deleted', () => api().deleteVolume(id));
    if (r.ok) {
      items.value = items.value.filter((v) => v.id !== id);
      void useCatalogStore().refreshQuota();
      return true;
    }
    return false;
  }

  return { items, loading, totalGb, available, load, create, attach, detach, remove, upsert };
});
