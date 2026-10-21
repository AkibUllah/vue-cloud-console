/**
 * HTTP client for a JSON gateway that mirrors the mock's shapes. It is the production
 * swap-in for the mock: same CloudApi interface, bearer token from localStorage.
 * Not exercised by tests; the mock covers the UI contract.
 */
import { ApiError, type CloudApi } from '..';
import type { Session } from '../types';

const TOKEN_KEY = 'console.token';

export function createHttpApi(base: string): CloudApi {
  const token = () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  };
  const setToken = (t: string | null) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;
    const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 204) return undefined as T;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, typeof data.detail === 'string' ? data.detail : typeof data.message === 'string' ? data.message : res.statusText);
    return data as T;
  }

  return {
    async login(email, password) {
      const s = await request<Session>('POST', '/auth/login', { email, password });
      setToken(s.token);
      return s;
    },
    async logout() {
      await request<void>('POST', '/auth/logout').catch(() => undefined);
      setToken(null);
    },
    me: () => (token() ? request<Session>('GET', '/auth/me').catch(() => null) : Promise.resolve(null)),

    catalog: () => request('GET', '/catalog'),
    quota: () => request('GET', '/quota'),

    listInstances: () => request('GET', '/instances'),
    createInstance: (input) => request('POST', '/instances', input),
    instanceAction: (id, action) => request('POST', `/instances/${id}/action`, { action }),
    deleteInstance: (id) => request('DELETE', `/instances/${id}`),

    listVolumes: () => request('GET', '/volumes'),
    createVolume: (input) => request('POST', '/volumes', input),
    attachVolume: (volumeId, instanceId) => request('POST', `/volumes/${volumeId}/attach`, { instance_id: instanceId }),
    detachVolume: (volumeId) => request('POST', `/volumes/${volumeId}/detach`),
    deleteVolume: (id) => request('DELETE', `/volumes/${id}`),

    listFloatingIps: () => request('GET', '/floating-ips'),
    allocateFloatingIp: () => request('POST', '/floating-ips'),
    associateFloatingIp: (ipId, instanceId) => request('POST', `/floating-ips/${ipId}/associate`, { instance_id: instanceId }),
    disassociateFloatingIp: (ipId) => request('POST', `/floating-ips/${ipId}/disassociate`),
    releaseFloatingIp: (ipId) => request('DELETE', `/floating-ips/${ipId}`),

    listSecurityGroups: () => request('GET', '/security-groups'),
    createSecurityGroup: (name, description) => request('POST', '/security-groups', { name, description }),
    addRule: (groupId, rule) => request('POST', `/security-groups/${groupId}/rules`, rule),
    removeRule: (groupId, ruleId) => request('DELETE', `/security-groups/${groupId}/rules/${ruleId}`),
    deleteSecurityGroup: (groupId) => request('DELETE', `/security-groups/${groupId}`),

    billing: () => request('GET', '/billing/current'),
    activity: (limit = 50) => request('GET', `/activity?limit=${limit}`),
  };
}
