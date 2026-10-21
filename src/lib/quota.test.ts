import { describe, expect, it } from 'vitest';
import type { Flavor, Quota } from '@/api/types';
import { canCreateVolume, canLaunch, levelFor, maxLaunchable, percentUsed, quotaViews } from './quota';

const quota: Quota = {
  instances: { used: 5, limit: 20 },
  vcpus: { used: 60, limit: 64 },
  ram_mb: { used: 40960, limit: 131072 },
  volumes_gb: { used: 1800, limit: 4000 },
  floating_ips: { used: 3, limit: 6 },
  security_groups: { used: 3, limit: 10 },
};
const large: Flavor = { id: 'fl-g4', name: 'g1.large', vcpus: 4, ram_mb: 8192, disk_gb: 80, hourly_bdt: 7 };
const small: Flavor = { id: 'fl-s1', name: 's1.small', vcpus: 1, ram_mb: 1024, disk_gb: 20, hourly_bdt: 1.2 };

describe('quota math', () => {
  it('computes percentages with one decimal and clamps', () => {
    expect(percentUsed(60, 64)).toBe(93.8);
    expect(percentUsed(5, 20)).toBe(25);
    expect(percentUsed(50, 0)).toBe(0);
    expect(percentUsed(200, 100)).toBe(100);
  });
  it('derives warning levels', () => {
    expect(levelFor(10)).toBe('ok');
    expect(levelFor(75)).toBe('warning');
    expect(levelFor(93.8)).toBe('critical');
    expect(levelFor(80, 85, 95)).toBe('ok');
  });
  it('builds labelled views in a stable order', () => {
    const views = quotaViews(quota);
    expect(views.map((v) => v.key)).toEqual(['instances', 'vcpus', 'ram_mb', 'volumes_gb', 'floating_ips', 'security_groups']);
    const cpu = views.find((v) => v.key === 'vcpus')!;
    expect(cpu).toMatchObject({ label: 'vCPUs', percent: 93.8, remaining: 4, level: 'critical' });
  });
  it('checks whether a flavor fits the remaining quota', () => {
    expect(canLaunch(quota, large)).toEqual({ ok: true, blockers: [] });
    const two = canLaunch(quota, large, 2);
    expect(two.ok).toBe(false);
    expect(two.blockers).toEqual(['vCPUs: need 8, 4 left']);
    expect(maxLaunchable(quota, large)).toBe(1);
    expect(maxLaunchable(quota, small)).toBe(4);
    expect(canCreateVolume(quota, 2000)).toEqual({ ok: true, blockers: [] });
    expect(canCreateVolume(quota, 2201).blockers[0]).toBe('block storage: need 2201 GB, 2200 GB left');
  });
});
