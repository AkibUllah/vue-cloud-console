import { describe, expect, it } from 'vitest';
import { flavors, images } from '@/api/mock/seed';
import type { Quota } from '@/api/types';
import { back, canProceed, compatibleFlavors, estimate, initialWizard, next, reviewProblems, stepName, toInput, validateStep } from './wizard';

const quota: Quota = {
  instances: { used: 19, limit: 20 }, vcpus: { used: 60, limit: 64 }, ram_mb: { used: 100000, limit: 131072 },
  volumes_gb: { used: 0, limit: 1 }, floating_ips: { used: 0, limit: 1 }, security_groups: { used: 0, limit: 1 },
};

describe('instance wizard', () => {
  it('validates the name and image on the first step', () => {
    const s = initialWizard();
    expect(stepName(s)).toBe('image');
    expect(validateStep(s)).toEqual({ name: 'at least 3 characters', image_id: 'pick an image' });
    expect(validateStep({ ...s, name: 'Api_Prod', image_id: 'img-debian-12' })).toEqual({ name: 'lowercase letters, digits and hyphens; must start and end alphanumeric' });
    expect(validateStep({ ...s, name: 'api-prod-03', image_id: 'img-debian-12' })).toEqual({});
  });
  it('only advances when the current step is valid', () => {
    let s = initialWizard();
    expect(next(s)).toBe(s); // blocked
    s = { ...s, name: 'api-prod-03', image_id: 'img-debian-12' };
    s = next(s);
    expect(stepName(s)).toBe('flavor');
    expect(canProceed(s)).toBe(false);
    s = next({ ...s, flavor_id: 'fl-s2' });
    expect(stepName(s)).toBe('network');
    expect(validateStep({ ...s, security_group_ids: [] })).toEqual({ network_id: 'pick a network', security_group_ids: 'at least one security group' });
    s = next({ ...s, network_id: 'net-private' });
    expect(stepName(s)).toBe('keypair');
    s = next(s); // keypair is optional
    expect(stepName(s)).toBe('review');
    expect(next(s).step).toBe(4); // cannot go past review
    expect(stepName(back(s))).toBe('keypair');
    expect(back(initialWizard()).step).toBe(0);
  });
  it('filters flavors by the image minimums', () => {
    const windows = images.find((i) => i.id === 'img-win-2022')!;
    expect(compatibleFlavors(flavors, windows).map((f) => f.name)).toEqual(['g1.large', 'g1.xlarge', 'm1.2xlarge']);
    expect(compatibleFlavors(flavors, undefined)).toHaveLength(5);
  });
  it('estimates monthly cost from the hourly rate', () => {
    const october = new Date(2026, 9, 1);
    expect(estimate(flavors[0], october)).toEqual({ hourly_bdt: 1.2, monthly_bdt: 892.8 }); // 744 h
    expect(estimate(undefined)).toEqual({ hourly_bdt: 0, monthly_bdt: 0 });
  });
  it('reports review problems for incompatible flavors and quota', () => {
    const base = { ...initialWizard(), name: 'win-box', image_id: 'img-win-2022', network_id: 'net-private', step: 4 };
    expect(reviewProblems({ ...base, flavor_id: 'fl-s1' }, flavors, images, null)[0].message).toMatch(/below Windows Server 2022's minimum/);
    const msgs = reviewProblems({ ...base, flavor_id: 'fl-g8' }, flavors, images, quota).map((p) => p.message);
    expect(msgs).toEqual(['quota: vCPUs: need 8, 4 left']);
    expect(reviewProblems({ ...base, flavor_id: 'fl-g4' }, flavors, images, quota)).toEqual([]);
    expect(reviewProblems({ ...base, flavor_id: null }, flavors, images, quota)).toEqual([{ message: 'image and flavor are required' }]);
  });
  it('produces the API payload', () => {
    const s = { ...initialWizard(), name: ' api-03 ', image_id: 'img-debian-12', flavor_id: 'fl-s1', network_id: 'net-private', keypair_id: null };
    expect(toInput(s)).toEqual({ name: 'api-03', image_id: 'img-debian-12', flavor_id: 'fl-s1', network_id: 'net-private', keypair_id: null, security_group_ids: ['sg-default'] });
    expect(() => toInput(initialWizard())).toThrow(/incomplete/);
  });
});
