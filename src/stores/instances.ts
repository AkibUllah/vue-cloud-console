import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';
import type { CreateInstanceInput, Instance } from '@/api/types';
import { useCatalogStore } from './catalog';
import { useUiStore } from './ui';

export const useInstancesStore = defineStore('instances', () => {
  const items = ref<Instance[]>([]);
  const loading = ref(false);
  const busy = ref<Set<string>>(new Set());

  const running = computed(() => items.value.filter((i) => i.status === 'ACTIVE').length);
  const byId = computed(() => new Map(items.value.map((i) => [i.id, i])));
  const hasTransitional = computed(() => items.value.some((i) => ['BUILD', 'REBOOT', 'DELETING'].includes(i.status)));

  async function load() {
    loading.value = true;
    try {
      items.value = await api().listInstances();
    } finally {
      loading.value = false;
    }
  }

  function upsert(inst: Instance) {
    const idx = items.value.findIndex((i) => i.id === inst.id);
    if (idx >= 0) items.value.splice(idx, 1, inst);
    else items.value.push(inst);
  }

  async function withBusy<T>(id: string, fn: () => Promise<T>): Promise<T> {
    busy.value = new Set([...busy.value, id]);
    try {
      return await fn();
    } finally {
      const next = new Set(busy.value);
      next.delete(id);
      busy.value = next;
    }
  }

  async function create(input: CreateInstanceInput): Promise<Instance> {
    const inst = await api().createInstance(input);
    upsert(inst);
    useUiStore().notify('success', `Launching ${inst.name}`);
    void useCatalogStore().refreshQuota();
    return inst;
  }

  async function action(id: string, kind: 'start' | 'stop' | 'reboot'): Promise<void> {
    const ui = useUiStore();
    try {
      const inst = await withBusy(id, () => api().instanceAction(id, kind));
      upsert(inst);
      ui.notify('success', `${inst.name}: ${kind} requested`);
    } catch (err) {
      ui.notify('error', err instanceof Error ? err.message : `${kind} failed`);
    }
  }

  async function remove(id: string): Promise<boolean> {
    const ui = useUiStore();
    const inst = byId.value.get(id);
    const ok = await ui.ask({ title: 'Delete instance', message: `Delete ${inst?.name ?? id}? Attached volumes are detached and floating IPs released from it. This cannot be undone.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return false;
    try {
      await withBusy(id, () => api().deleteInstance(id));
      if (inst) upsert({ ...inst, status: 'DELETING', task: 'deleting' });
      ui.notify('info', `Deleting ${inst?.name ?? id}`);
      void useCatalogStore().refreshQuota();
      return true;
    } catch (err) {
      ui.notify('error', err instanceof Error ? err.message : 'delete failed');
      return false;
    }
  }

  return { items, loading, busy, running, byId, hasTransitional, load, create, action, remove, upsert };
});
