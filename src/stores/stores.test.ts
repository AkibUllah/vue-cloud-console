import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMockApi } from '@/api/mock';
import { setApi } from '@/api/client';
import { useAuthStore } from './auth';
import { byKind, projectMonth, sumUsage, useBillingStore } from './billing';
import { useCatalogStore } from './catalog';
import { useInstancesStore } from './instances';
import { useNetworkStore } from './network';
import { useUiStore } from './ui';
import { useVolumesStore } from './volumes';

async function signIn() {
  const auth = useAuthStore();
  expect(await auth.login('akib@meghna.cloud', 'password')).toBe(true);
  return auth;
}

beforeEach(() => {
  setActivePinia(createPinia());
  setApi(createMockApi({ latencyMs: 0 }));
});

describe('auth store', () => {
  it('logs in, exposes the user and logs out', async () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(await auth.login('akib@meghna.cloud', 'short')).toBe(false);
    expect(auth.error).toBe('invalid email or password');
    await signIn();
    expect(auth.user?.project).toBe('fintech-prod');
    expect(auth.user?.role).toBe('member');
    await auth.logout();
    expect(auth.isAuthenticated).toBe(false);
  });
});

describe('instances store', () => {
  it('loads, creates and transitions instances, refreshing quota', async () => {
    await signIn();
    const store = useInstancesStore();
    const catalog = useCatalogStore();
    const ui = useUiStore();
    await store.load();
    expect(store.items).toHaveLength(5);
    expect(store.running).toBe(4);

    const inst = await store.create({ name: 'api-prod-03', image_id: 'img-ubuntu-2204', flavor_id: 'fl-s2', network_id: 'net-private', keypair_id: null, security_group_ids: ['sg-default', 'sg-web'] });
    expect(inst.status).toBe('ACTIVE'); // zero-latency mock completes the build synchronously
    expect(store.items).toHaveLength(6);
    expect(ui.toasts[0].message).toBe('Launching api-prod-03');
    await Promise.resolve();
    expect(catalog.quota?.instances.used).toBe(6);

    await store.action(inst.id, 'stop');
    expect(store.byId.get(inst.id)?.status).toBe('SHUTOFF');
    await store.action(inst.id, 'stop'); // invalid transition surfaces as an error toast
    expect(ui.toasts.at(-1)?.kind).toBe('error');
    await store.action(inst.id, 'start');
    expect(store.byId.get(inst.id)?.status).toBe('ACTIVE');
  });
  it('asks for confirmation before deleting', async () => {
    await signIn();
    const store = useInstancesStore();
    const ui = useUiStore();
    await store.load();
    const pending = store.remove('i-e5a7');
    expect(ui.confirm?.title).toBe('Delete instance');
    ui.answer(false);
    expect(await pending).toBe(false);
    expect(store.byId.get('i-e5a7')?.status).toBe('SHUTOFF');

    const pending2 = store.remove('i-e5a7');
    ui.answer(true);
    expect(await pending2).toBe(true);
    expect(store.byId.get('i-e5a7')?.status).toBe('DELETING');
  });
  it('rejects launches that exceed quota', async () => {
    await signIn();
    const store = useInstancesStore();
    await store.load();
    const huge = (n: number) => ({ name: `huge-${n}`, image_id: 'img-debian-12', flavor_id: 'fl-m16', network_id: 'net-private', keypair_id: null, security_group_ids: [] });
    await store.create(huge(1)); // RAM 37,888 + 65,536 = 103,424 MB of 131,072
    await expect(store.create(huge(2))).rejects.toThrow('quota exceeded'); // another 65,536 MB does not fit
    expect(store.items).toHaveLength(6);
  });
});

describe('volumes store', () => {
  it('creates, attaches, detaches and deletes', async () => {
    await signIn();
    const store = useVolumesStore();
    const ui = useUiStore();
    await store.load();
    expect(store.totalGb).toBe(1800);
    const vol = await store.create({ name: 'scratch', size_gb: 50, type: 'hdd' });
    expect(vol?.status).toBe('available');
    expect(store.totalGb).toBe(1850);
    expect((await store.attach(vol!.id, 'i-7f3a'))?.attached_to).toBe('i-7f3a');
    expect(await store.attach(vol!.id, 'i-9c21')).toBeUndefined(); // already in use -> error toast
    expect(ui.toasts.at(-1)).toMatchObject({ kind: 'error', message: 'volume is not available' });
    expect((await store.detach(vol!.id))?.status).toBe('available');
    const removing = store.remove(vol!.id);
    ui.answer(true);
    expect(await removing).toBe(true);
    expect(store.items.find((v) => v.id === vol!.id)).toBeUndefined();
  });
});

describe('network store', () => {
  it('manages floating IPs end to end', async () => {
    await signIn();
    const net = useNetworkStore();
    const ui = useUiStore();
    await net.load();
    const fip = await net.allocate();
    expect(fip?.address).toBe('103.108.140.40');
    expect(net.floatingIps).toHaveLength(4);
    expect((await net.associate(fip!.id, 'i-9c21'))?.instance_id).toBe('i-9c21');
    expect(await net.associate('fip-3', 'i-9c21')).toBeUndefined(); // instance already has one
    expect(ui.toasts.at(-1)?.message).toBe('api-prod-02 already has a floating IP');
    expect((await net.disassociate(fip!.id))?.instance_id).toBeNull();
    const releasing = net.release(fip!.id);
    ui.answer(true);
    expect(await releasing).toBe(true);
    expect(net.floatingIps).toHaveLength(3);
  });
  it('edits security group rules and protects the default group', async () => {
    await signIn();
    const net = useNetworkStore();
    const ui = useUiStore();
    await net.load();
    const web = net.groups.find((g) => g.name === 'web')!;
    const rule = { direction: 'ingress' as const, protocol: 'tcp' as const, port_min: 8443, port_max: 8443, cidr: '0.0.0.0/0', description: 'alt https' };
    expect((await net.addRule(web.id, rule))?.rules).toHaveLength(4);
    expect(await net.addRule(web.id, rule)).toBeUndefined();
    expect(ui.toasts.at(-1)?.message).toBe('an identical rule already exists');
    const added = net.groups.find((g) => g.id === web.id)!.rules.at(-1)!;
    expect((await net.removeRule(web.id, added.id))?.rules).toHaveLength(3);

    const deleting = net.deleteGroup('sg-default');
    ui.answer(true);
    expect(await deleting).toBe(false);
    expect(ui.toasts.at(-1)?.message).toBe('the default group cannot be deleted');
    const g = await net.createGroup('cache', 'redis tier');
    expect(g?.rules).toHaveLength(1);
    const deleting2 = net.deleteGroup(g!.id);
    ui.answer(true);
    expect(await deleting2).toBe(true);
  });
});

describe('billing', () => {
  it('sums usage, groups by kind and projects the month', () => {
    const lines = [
      { resource: 'a', kind: 'instance' as const, quantity: 1, unit: 'h', unit_price_bdt: 1, amount_bdt: 600 },
      { resource: 'b', kind: 'volume' as const, quantity: 1, unit: 'GB', unit_price_bdt: 1, amount_bdt: 300 },
      { resource: 'c', kind: 'instance' as const, quantity: 1, unit: 'h', unit_price_bdt: 1, amount_bdt: 100 },
    ];
    expect(sumUsage(lines)).toBe(1000);
    expect(byKind(lines)).toEqual([{ kind: 'instance', amount_bdt: 700, share: 70 }, { kind: 'volume', amount_bdt: 300, share: 30 }]);
    expect(projectMonth([100, 200, 300], 30)).toBe(6000);
    expect(projectMonth([], 30)).toBe(0);
  });
  it('loads the current month and activity through the store', async () => {
    await signIn();
    const billing = useBillingStore();
    await billing.load();
    await billing.loadActivity(10);
    expect(billing.monthToDate).toBe(30328);
    expect(billing.breakdown[0].kind).toBe('instance');
    expect(billing.outstanding).toBe(0);
    expect(billing.activity[0]).toMatchObject({ action: 'auth.login', target: 'akib@meghna.cloud', outcome: 'success' });
  });
});
