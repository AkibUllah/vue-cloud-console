import type {
  ActivityEntry, Billing, CreateInstanceInput, CreateRuleInput, CreateVolumeInput, Flavor, FloatingIp, Image, Instance,
  Keypair, Network, Quota, SecurityGroup, Session, Volume,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The contract both the mock and the HTTP client implement. */
export interface CloudApi {
  login(email: string, password: string): Promise<Session>;
  logout(): Promise<void>;
  me(): Promise<Session | null>;

  catalog(): Promise<{ images: Image[]; flavors: Flavor[]; networks: Network[]; keypairs: Keypair[] }>;
  quota(): Promise<Quota>;

  listInstances(): Promise<Instance[]>;
  createInstance(input: CreateInstanceInput): Promise<Instance>;
  instanceAction(id: string, action: 'start' | 'stop' | 'reboot'): Promise<Instance>;
  deleteInstance(id: string): Promise<void>;

  listVolumes(): Promise<Volume[]>;
  createVolume(input: CreateVolumeInput): Promise<Volume>;
  attachVolume(volumeId: string, instanceId: string): Promise<Volume>;
  detachVolume(volumeId: string): Promise<Volume>;
  deleteVolume(id: string): Promise<void>;

  listFloatingIps(): Promise<FloatingIp[]>;
  allocateFloatingIp(): Promise<FloatingIp>;
  associateFloatingIp(ipId: string, instanceId: string): Promise<FloatingIp>;
  disassociateFloatingIp(ipId: string): Promise<FloatingIp>;
  releaseFloatingIp(ipId: string): Promise<void>;

  listSecurityGroups(): Promise<SecurityGroup[]>;
  createSecurityGroup(name: string, description: string): Promise<SecurityGroup>;
  addRule(groupId: string, rule: CreateRuleInput): Promise<SecurityGroup>;
  removeRule(groupId: string, ruleId: string): Promise<SecurityGroup>;
  deleteSecurityGroup(groupId: string): Promise<void>;

  billing(): Promise<Billing>;
  activity(limit?: number): Promise<ActivityEntry[]>;
}

export { createMockApi } from './mock';
export { createHttpApi } from './http';

import { createHttpApi } from './http';
import { createMockApi } from './mock';

export function createApiFromEnv(): CloudApi {
  const mode = (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock';
  if (mode === 'http') return createHttpApi((import.meta.env.VITE_API_BASE as string | undefined) ?? '/api');
  const latency = Number((import.meta.env.VITE_MOCK_LATENCY_MS as string | undefined) ?? '250');
  return createMockApi({ latencyMs: Number.isFinite(latency) ? latency : 250 });
}
