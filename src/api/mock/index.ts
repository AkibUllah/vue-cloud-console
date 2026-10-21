/**
 * In-memory implementation of CloudApi with simulated latency and realistic state
 * transitions (BUILD -> ACTIVE, REBOOT -> ACTIVE, DELETING -> gone). Mutations are
 * recorded in the activity log. State lives for the lifetime of the page.
 */
import { ApiError, type CloudApi } from '..';
import type { ActivityEntry, FloatingIp, Instance, SecurityGroup, Session, Volume } from '../types';
import * as seed from './seed';

export interface MockOptions { latencyMs?: number; seedData?: boolean; now?: () => Date }

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createMockApi(opts: MockOptions = {}): CloudApi {
  const latency = opts.latencyMs ?? 0;
  const now = opts.now ?? (() => new Date());
  const useSeed = opts.seedData ?? true;
  const delay = <T>(v: T): Promise<T> => (latency > 0 ? new Promise((r) => setTimeout(() => r(v), latency)) : Promise.resolve(v));

  let session: Session | null = null;
  const instances: Instance[] = useSeed ? clone(seed.instances) : [];
  const volumes: Volume[] = useSeed ? clone(seed.volumes) : [];
  const floatingIps: FloatingIp[] = useSeed ? clone(seed.floatingIps) : [];
  const groups: SecurityGroup[] = useSeed ? clone(seed.securityGroups) : [clone(seed.securityGroups[0])];
  const activity: ActivityEntry[] = [];
  let counter = 100;
  const nextId = (prefix: string) => `${prefix}-${(counter++).toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;

  const log = (action: string, target: string, outcome: 'success' | 'failure' = 'success', details?: string) => {
    activity.unshift({ id: nextId('act'), ts: now().toISOString(), actor: session?.user.email ?? 'system', action, target, outcome, details });
    if (activity.length > 200) activity.pop();
  };
  const requireAuth = () => {
    if (!session) throw new ApiError(401, 'not authenticated');
  };
  const find = <T extends { id: string }>(list: T[], id: string, what: string): T => {
    const item = list.find((x) => x.id === id);
    if (!item) throw new ApiError(404, `${what} ${id} not found`);
    return item;
  };
  // With latency disabled (tests) transitions complete synchronously so assertions are deterministic.
  const later = (fn: () => void, ms: number) => (latency > 0 ? setTimeout(fn, ms) : fn());

  const quota = () => {
    const used = instances.filter((i) => i.status !== 'DELETING');
    const vcpus = used.reduce((s, i) => s + (seed.flavors.find((f) => f.id === i.flavor_id)?.vcpus ?? 0), 0);
    const ram = used.reduce((s, i) => s + (seed.flavors.find((f) => f.id === i.flavor_id)?.ram_mb ?? 0), 0);
    return {
      instances: { used: used.length, limit: seed.quotaLimits.instances },
      vcpus: { used: vcpus, limit: seed.quotaLimits.vcpus },
      ram_mb: { used: ram, limit: seed.quotaLimits.ram_mb },
      volumes_gb: { used: volumes.reduce((s, v) => s + v.size_gb, 0), limit: seed.quotaLimits.volumes_gb },
      floating_ips: { used: floatingIps.length, limit: seed.quotaLimits.floating_ips },
      security_groups: { used: groups.length, limit: seed.quotaLimits.security_groups },
    };
  };

  if (useSeed) {
    log('instance.create', 'api-prod-02');
    log('volume.attach', 'media-uploads → api-prod-01');
    log('instance.stop', 'worker-bkash-recon');
  }

  return {
    async login(email, password) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 6) throw new ApiError(401, 'invalid email or password');
      session = {
        token: `mock-${Math.random().toString(36).slice(2)}`,
        user: { id: 'u-1', email, name: email.split('@')[0].replace(/[._]/g, ' '), project: 'fintech-prod', role: email.startsWith('admin') ? 'admin' : 'member' },
        expires_at: new Date(now().getTime() + 8 * 3600_000).toISOString(),
      };
      log('auth.login', email);
      return delay(clone(session));
    },
    async logout() {
      if (session) log('auth.logout', session.user.email);
      session = null;
      return delay(undefined);
    },
    async me() {
      return delay(session ? clone(session) : null);
    },

    async catalog() {
      return delay(clone({ images: seed.images, flavors: seed.flavors, networks: seed.networks, keypairs: seed.keypairs }));
    },
    async quota() {
      requireAuth();
      return delay(quota());
    },

    async listInstances() {
      requireAuth();
      return delay(clone(instances));
    },
    async createInstance(input) {
      requireAuth();
      const flavor = find(seed.flavors, input.flavor_id, 'flavor');
      const image = find(seed.images, input.image_id, 'image');
      find(seed.networks, input.network_id, 'network');
      if (instances.some((i) => i.name === input.name)) throw new ApiError(409, `an instance named ${input.name} already exists`);
      if (flavor.ram_mb < image.min_ram_mb || flavor.disk_gb < image.min_disk_gb) throw new ApiError(422, `${flavor.name} is too small for ${image.name}`);
      const q = quota();
      if (q.instances.used + 1 > q.instances.limit || q.vcpus.used + flavor.vcpus > q.vcpus.limit || q.ram_mb.used + flavor.ram_mb > q.ram_mb.limit) {
        log('instance.create', input.name, 'failure', 'quota exceeded');
        throw new ApiError(403, 'quota exceeded');
      }
      const net = seed.networks.find((n) => n.id === input.network_id)!;
      const inst: Instance = {
        id: nextId('i'),
        name: input.name,
        status: 'BUILD',
        image_id: input.image_id,
        flavor_id: input.flavor_id,
        network_id: input.network_id,
        keypair_id: input.keypair_id,
        security_group_ids: input.security_group_ids.length ? input.security_group_ids : ['sg-default'],
        private_ip: `${net.cidr.split('.').slice(0, 3).join('.')}.${100 + instances.length}`,
        floating_ip: null,
        created_at: now().toISOString(),
        task: 'spawning',
      };
      instances.push(inst);
      log('instance.create', inst.name);
      later(() => {
        inst.status = 'ACTIVE';
        inst.task = null;
      }, 3000);
      return delay(clone(inst));
    },
    async instanceAction(id, action) {
      requireAuth();
      const inst = find(instances, id, 'instance');
      if (action === 'start') {
        if (inst.status !== 'SHUTOFF') throw new ApiError(409, 'instance is not stopped');
        inst.status = 'ACTIVE';
      } else if (action === 'stop') {
        if (inst.status !== 'ACTIVE') throw new ApiError(409, 'instance is not running');
        inst.status = 'SHUTOFF';
      } else {
        if (inst.status !== 'ACTIVE') throw new ApiError(409, 'instance is not running');
        inst.status = 'REBOOT';
        inst.task = 'rebooting';
        later(() => {
          inst.status = 'ACTIVE';
          inst.task = null;
        }, 2500);
      }
      log(`instance.${action}`, inst.name);
      return delay(clone(inst));
    },
    async deleteInstance(id) {
      requireAuth();
      const inst = find(instances, id, 'instance');
      inst.status = 'DELETING';
      inst.task = 'deleting';
      for (const v of volumes) if (v.attached_to === id) (v.attached_to = null), (v.status = 'available');
      for (const f of floatingIps) if (f.instance_id === id) f.instance_id = null;
      log('instance.delete', inst.name);
      later(() => {
        const idx = instances.findIndex((i) => i.id === id);
        if (idx >= 0) instances.splice(idx, 1);
      }, 1500);
      return delay(undefined);
    },

    async listVolumes() {
      requireAuth();
      return delay(clone(volumes));
    },
    async createVolume(input) {
      requireAuth();
      const q = quota();
      if (q.volumes_gb.used + input.size_gb > q.volumes_gb.limit) throw new ApiError(403, 'volume quota exceeded');
      const vol: Volume = { id: nextId('vol'), name: input.name, size_gb: input.size_gb, status: 'creating', type: input.type, attached_to: null, created_at: now().toISOString() };
      volumes.push(vol);
      log('volume.create', vol.name);
      later(() => (vol.status = 'available'), 1500);
      return delay(clone(vol));
    },
    async attachVolume(volumeId, instanceId) {
      requireAuth();
      const vol = find(volumes, volumeId, 'volume');
      const inst = find(instances, instanceId, 'instance');
      if (vol.status !== 'available') throw new ApiError(409, 'volume is not available');
      vol.attached_to = inst.id;
      vol.status = 'in-use';
      log('volume.attach', `${vol.name} → ${inst.name}`);
      return delay(clone(vol));
    },
    async detachVolume(volumeId) {
      requireAuth();
      const vol = find(volumes, volumeId, 'volume');
      if (vol.status !== 'in-use') throw new ApiError(409, 'volume is not attached');
      vol.attached_to = null;
      vol.status = 'available';
      log('volume.detach', vol.name);
      return delay(clone(vol));
    },
    async deleteVolume(id) {
      requireAuth();
      const vol = find(volumes, id, 'volume');
      if (vol.status === 'in-use') throw new ApiError(409, 'detach the volume first');
      volumes.splice(volumes.indexOf(vol), 1);
      log('volume.delete', vol.name);
      return delay(undefined);
    },

    async listFloatingIps() {
      requireAuth();
      return delay(clone(floatingIps));
    },
    async allocateFloatingIp() {
      requireAuth();
      const q = quota();
      if (q.floating_ips.used + 1 > q.floating_ips.limit) throw new ApiError(403, 'floating IP quota exceeded');
      const used = new Set(floatingIps.map((f) => f.address));
      let host = 40;
      while (used.has(`103.108.140.${host}`)) host++;
      const fip: FloatingIp = { id: nextId('fip'), address: `103.108.140.${host}`, instance_id: null, created_at: now().toISOString() };
      floatingIps.push(fip);
      log('floating_ip.allocate', fip.address);
      return delay(clone(fip));
    },
    async associateFloatingIp(ipId, instanceId) {
      requireAuth();
      const fip = find(floatingIps, ipId, 'floating ip');
      const inst = find(instances, instanceId, 'instance');
      if (fip.instance_id) throw new ApiError(409, 'floating IP already associated');
      if (inst.floating_ip) throw new ApiError(409, `${inst.name} already has a floating IP`);
      fip.instance_id = inst.id;
      inst.floating_ip = fip.address;
      log('floating_ip.associate', `${fip.address} → ${inst.name}`);
      return delay(clone(fip));
    },
    async disassociateFloatingIp(ipId) {
      requireAuth();
      const fip = find(floatingIps, ipId, 'floating ip');
      const inst = instances.find((i) => i.id === fip.instance_id);
      if (inst) inst.floating_ip = null;
      fip.instance_id = null;
      log('floating_ip.disassociate', fip.address);
      return delay(clone(fip));
    },
    async releaseFloatingIp(ipId) {
      requireAuth();
      const fip = find(floatingIps, ipId, 'floating ip');
      if (fip.instance_id) throw new ApiError(409, 'disassociate before releasing');
      floatingIps.splice(floatingIps.indexOf(fip), 1);
      log('floating_ip.release', fip.address);
      return delay(undefined);
    },

    async listSecurityGroups() {
      requireAuth();
      return delay(clone(groups));
    },
    async createSecurityGroup(name, description) {
      requireAuth();
      if (groups.some((g) => g.name === name)) throw new ApiError(409, `security group ${name} already exists`);
      const g: SecurityGroup = {
        id: nextId('sg'), name, description,
        rules: [{ id: nextId('r'), direction: 'egress', protocol: 'any', port_min: null, port_max: null, cidr: '0.0.0.0/0', description: 'all outbound' }],
      };
      groups.push(g);
      log('security_group.create', name);
      return delay(clone(g));
    },
    async addRule(groupId, rule) {
      requireAuth();
      const g = find(groups, groupId, 'security group');
      const dup = g.rules.find((r) => r.direction === rule.direction && r.protocol === rule.protocol && r.port_min === rule.port_min && r.port_max === rule.port_max && r.cidr === rule.cidr);
      if (dup) throw new ApiError(409, 'an identical rule already exists');
      g.rules.push({ id: nextId('r'), ...rule });
      log('security_group.rule.add', `${g.name}: ${rule.direction} ${rule.protocol} ${rule.port_min ?? 'any'} from ${rule.cidr}`);
      return delay(clone(g));
    },
    async removeRule(groupId, ruleId) {
      requireAuth();
      const g = find(groups, groupId, 'security group');
      const idx = g.rules.findIndex((r) => r.id === ruleId);
      if (idx < 0) throw new ApiError(404, 'rule not found');
      g.rules.splice(idx, 1);
      log('security_group.rule.remove', g.name);
      return delay(clone(g));
    },
    async deleteSecurityGroup(groupId) {
      requireAuth();
      const g = find(groups, groupId, 'security group');
      if (g.name === 'default') throw new ApiError(403, 'the default group cannot be deleted');
      if (instances.some((i) => i.security_group_ids.includes(groupId))) throw new ApiError(409, 'group is in use by an instance');
      groups.splice(groups.indexOf(g), 1);
      log('security_group.delete', g.name);
      return delay(undefined);
    },

    async billing() {
      requireAuth();
      return delay(clone(seed.billing));
    },
    async activity(limit = 50) {
      requireAuth();
      return delay(clone(activity.slice(0, limit)));
    },
  };
}
