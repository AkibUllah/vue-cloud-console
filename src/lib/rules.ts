import { z } from 'zod';
import type { CreateRuleInput, SecurityRule } from '@/api/types';

const cidr = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'CIDR like 203.0.113.0/24').refine((v) => {
  const [ip, bits] = v.split('/');
  return ip.split('.').every((o) => Number(o) <= 255) && Number(bits) <= 32;
}, 'invalid CIDR');

export const ruleSchema = z
  .object({
    direction: z.enum(['ingress', 'egress']),
    protocol: z.enum(['tcp', 'udp', 'icmp', 'any']),
    port_min: z.number().int().min(1).max(65535).nullable(),
    port_max: z.number().int().min(1).max(65535).nullable(),
    cidr,
    description: z.string().max(80),
  })
  .superRefine((r, ctx) => {
    const portsAllowed = r.protocol === 'tcp' || r.protocol === 'udp';
    if (!portsAllowed && (r.port_min !== null || r.port_max !== null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port_min'], message: `${r.protocol} rules have no ports` });
    if (portsAllowed && (r.port_min === null) !== (r.port_max === null)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port_max'], message: 'give both ports or neither' });
    if (r.port_min !== null && r.port_max !== null && r.port_max < r.port_min) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port_max'], message: 'max must be ≥ min' });
  });

export function validateRule(input: CreateRuleInput): Record<string, string> {
  const res = ruleSchema.safeParse(input);
  if (res.success) return {};
  const errors: Record<string, string> = {};
  for (const i of res.error.issues) {
    const key = String(i.path[0] ?? '_');
    if (!(key in errors)) errors[key] = i.message;
  }
  return errors;
}

/** "22" | "80-443" | "" -> [min, max] */
export function parsePortRange(text: string): { port_min: number | null; port_max: number | null } | null {
  const t = text.trim();
  if (!t) return { port_min: null, port_max: null };
  const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(t);
  if (!m) return null;
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return { port_min: min, port_max: max };
}

export function describeRule(r: SecurityRule | CreateRuleInput): string {
  const ports = r.port_min === null ? 'any' : r.port_min === r.port_max ? String(r.port_min) : `${r.port_min}-${r.port_max}`;
  return `${r.direction} ${r.protocol.toUpperCase()} ${ports} ${r.direction === 'ingress' ? 'from' : 'to'} ${r.cidr}`;
}
