import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import type { CreateRuleInput, FloatingIp, SecurityGroup } from '@/api/types';
import { useCatalogStore } from './catalog';
import { useInstancesStore } from './instances';
import { useUiStore } from './ui';

export const useNetworkStore = defineStore('network', () => {
  const floatingIps = ref<FloatingIp[]>([]);
  const groups = ref<SecurityGroup[]>([]);
  const loading = ref(false);

  async function load() {
    loading.value = true;
    try {
      [floatingIps.value, groups.value] = await Promise.all([api().listFloatingIps(), api().listSecurityGroups()]);
    } finally {
      loading.value = false;
    }
  }

  type Outcome<T> = { ok: true; value: T } | { ok: false };

  async function run<T>(label: string | null, fn: () => Promise<T>): Promise<Outcome<T>> {
    const ui = useUiStore();
    try {
      const value = await fn();
      if (label) ui.notify('success', label);
      return { ok: true, value };
    } catch (err) {
      ui.notify('error', err instanceof Error ? err.message : 'request failed');
      return { ok: false };
    }
  }

  function upsertIp(f: FloatingIp) {
    const idx = floatingIps.value.findIndex((x) => x.id === f.id);
    idx >= 0 ? floatingIps.value.splice(idx, 1, f) : floatingIps.value.push(f);
  }
  function upsertGroup(g: SecurityGroup) {
    const idx = groups.value.findIndex((x) => x.id === g.id);
    idx >= 0 ? groups.value.splice(idx, 1, g) : groups.value.push(g);
  }

  async function allocate(): Promise<FloatingIp | undefined> {
    const r = await run('Floating IP allocated', () => api().allocateFloatingIp());
    if (!r.ok) return undefined;
    upsertIp(r.value);
    void useCatalogStore().refreshQuota();
    return r.value;
  }
  async function associate(ipId: string, instanceId: string): Promise<FloatingIp | undefined> {
    const r = await run('Floating IP associated', () => api().associateFloatingIp(ipId, instanceId));
    if (!r.ok) return undefined;
    upsertIp(r.value);
    void useInstancesStore().load();
    return r.value;
  }
  async function disassociate(ipId: string): Promise<FloatingIp | undefined> {
    const r = await run('Floating IP disassociated', () => api().disassociateFloatingIp(ipId));
    if (!r.ok) return undefined;
    upsertIp(r.value);
    void useInstancesStore().load();
    return r.value;
  }
  async function release(ipId: string) {
    const ip = floatingIps.value.find((f) => f.id === ipId);
    if (!(await useUiStore().ask({ title: 'Release floating IP', message: `Release ${ip?.address ?? ipId} back to the pool?`, confirmLabel: 'Release', danger: true }))) return false;
    const r = await run('Floating IP released', () => api().releaseFloatingIp(ipId));
    if (r.ok) {
      floatingIps.value = floatingIps.value.filter((f) => f.id !== ipId);
      void useCatalogStore().refreshQuota();
      return true;
    }
    return false;
  }

  async function createGroup(name: string, description: string): Promise<SecurityGroup | undefined> {
    const r = await run(`Security group ${name} created`, () => api().createSecurityGroup(name, description));
    if (r.ok) upsertGroup(r.value);
    return r.ok ? r.value : undefined;
  }
  async function addRule(groupId: string, rule: CreateRuleInput): Promise<SecurityGroup | undefined> {
    const r = await run('Rule added', () => api().addRule(groupId, rule));
    if (r.ok) upsertGroup(r.value);
    return r.ok ? r.value : undefined;
  }
  async function removeRule(groupId: string, ruleId: string): Promise<SecurityGroup | undefined> {
    const r = await run('Rule removed', () => api().removeRule(groupId, ruleId));
    if (r.ok) upsertGroup(r.value);
    return r.ok ? r.value : undefined;
  }
  async function deleteGroup(groupId: string) {
    const g = groups.value.find((x) => x.id === groupId);
    if (!(await useUiStore().ask({ title: 'Delete security group', message: `Delete ${g?.name ?? groupId}?`, confirmLabel: 'Delete', danger: true }))) return false;
    const r = await run('Security group deleted', () => api().deleteSecurityGroup(groupId));
    if (r.ok) {
      groups.value = groups.value.filter((x) => x.id !== groupId);
      return true;
    }
    return false;
  }

  return { floatingIps, groups, loading, load, allocate, associate, disassociate, release, createGroup, addRule, removeRule, deleteGroup };
});
