import { describe, expect, it } from 'vitest';
import { describeRule, parsePortRange, validateRule } from './rules';

describe('security rules', () => {
  it('parses port ranges', () => {
    expect(parsePortRange('22')).toEqual({ port_min: 22, port_max: 22 });
    expect(parsePortRange('8000 - 8100')).toEqual({ port_min: 8000, port_max: 8100 });
    expect(parsePortRange('')).toEqual({ port_min: null, port_max: null });
    expect(parsePortRange('http')).toBeNull();
  });
  it('validates protocol/port/cidr combinations', () => {
    const ok = { direction: 'ingress' as const, protocol: 'tcp' as const, port_min: 443, port_max: 443, cidr: '0.0.0.0/0', description: 'https' };
    expect(validateRule(ok)).toEqual({});
    expect(validateRule({ ...ok, protocol: 'icmp' })).toEqual({ port_min: 'icmp rules have no ports' });
    expect(validateRule({ ...ok, port_max: 80 })).toEqual({ port_max: 'max must be ≥ min' });
    expect(validateRule({ ...ok, port_max: null })).toEqual({ port_max: 'give both ports or neither' });
    expect(validateRule({ ...ok, cidr: '10.0.0.0' })).toEqual({ cidr: 'CIDR like 203.0.113.0/24' });
    expect(validateRule({ ...ok, cidr: '300.0.0.0/8' })).toEqual({ cidr: 'invalid CIDR' });
  });
  it('describes rules for humans', () => {
    expect(describeRule({ direction: 'ingress', protocol: 'tcp', port_min: 80, port_max: 443, cidr: '0.0.0.0/0', description: '' })).toBe('ingress TCP 80-443 from 0.0.0.0/0');
    expect(describeRule({ direction: 'egress', protocol: 'any', port_min: null, port_max: null, cidr: '0.0.0.0/0', description: '' })).toBe('egress ANY any to 0.0.0.0/0');
  });
});
