import type { Flavor, Quota } from '@/api/types';

export type QuotaKey = keyof Quota;
export type QuotaLevel = 'ok' | 'warning' | 'critical';

export interface QuotaView { key: QuotaKey; label: string; used: number; limit: number; percent: number; remaining: number; level: QuotaLevel }

export const QUOTA_LABELS: Record<QuotaKey, string> = {
  instances: 'Instances',
  vcpus: 'vCPUs',
  ram_mb: 'RAM (MB)',
  volumes_gb: 'Block storage (GB)',
  floating_ips: 'Floating IPs',
  security_groups: 'Security groups',
};

export function percentUsed(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 1000) / 10));
}

export function levelFor(percent: number, warnAt = 75, criticalAt = 90): QuotaLevel {
  if (percent >= criticalAt) return 'critical';
  if (percent >= warnAt) return 'warning';
  return 'ok';
}

export function quotaViews(q: Quota): QuotaView[] {
  return (Object.keys(QUOTA_LABELS) as QuotaKey[]).map((key) => {
    const { used, limit } = q[key];
    const percent = percentUsed(used, limit);
    return { key, label: QUOTA_LABELS[key], used, limit, percent, remaining: Math.max(0, limit - used), level: levelFor(percent) };
  });
}

export interface QuotaCheck { ok: boolean; blockers: string[] }

/** Would launching `count` instances of `flavor` fit inside the remaining quota? */
export function canLaunch(q: Quota, flavor: Flavor, count = 1): QuotaCheck {
  const blockers: string[] = [];
  const need = (key: QuotaKey, amount: number, label: string) => {
    const remaining = q[key].limit - q[key].used;
    if (amount > remaining) blockers.push(`${label}: need ${amount}, ${Math.max(0, remaining)} left`);
  };
  need('instances', count, 'instances');
  need('vcpus', flavor.vcpus * count, 'vCPUs');
  need('ram_mb', flavor.ram_mb * count, 'RAM (MB)');
  return { ok: blockers.length === 0, blockers };
}

export function canCreateVolume(q: Quota, sizeGb: number): QuotaCheck {
  const remaining = q.volumes_gb.limit - q.volumes_gb.used;
  return sizeGb <= remaining ? { ok: true, blockers: [] } : { ok: false, blockers: [`block storage: need ${sizeGb} GB, ${Math.max(0, remaining)} GB left`] };
}

/** Largest number of `flavor` instances that still fits. */
export function maxLaunchable(q: Quota, flavor: Flavor): number {
  const byInstances = q.instances.limit - q.instances.used;
  const byCpu = Math.floor((q.vcpus.limit - q.vcpus.used) / flavor.vcpus);
  const byRam = Math.floor((q.ram_mb.limit - q.ram_mb.used) / flavor.ram_mb);
  return Math.max(0, Math.min(byInstances, byCpu, byRam));
}
