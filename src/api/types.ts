export type InstanceStatus = 'ACTIVE' | 'SHUTOFF' | 'BUILD' | 'REBOOT' | 'ERROR' | 'DELETING';
export type VolumeStatus = 'available' | 'in-use' | 'creating' | 'deleting' | 'error';

export interface User { id: string; email: string; name: string; project: string; role: 'admin' | 'member' }
export interface Session { token: string; user: User; expires_at: string }

export interface Image { id: string; name: string; os: string; min_disk_gb: number; min_ram_mb: number }
export interface Flavor { id: string; name: string; vcpus: number; ram_mb: number; disk_gb: number; hourly_bdt: number }
export interface Network { id: string; name: string; cidr: string; external: boolean }
export interface Keypair { id: string; name: string; fingerprint: string }

export interface Instance {
  id: string;
  name: string;
  status: InstanceStatus;
  image_id: string;
  flavor_id: string;
  network_id: string;
  keypair_id: string | null;
  security_group_ids: string[];
  private_ip: string;
  floating_ip: string | null;
  created_at: string;
  task: string | null;
}

export interface Volume {
  id: string;
  name: string;
  size_gb: number;
  status: VolumeStatus;
  type: 'ssd' | 'hdd';
  attached_to: string | null;
  created_at: string;
}

export interface FloatingIp { id: string; address: string; instance_id: string | null; created_at: string }

export type RuleDirection = 'ingress' | 'egress';
export type RuleProtocol = 'tcp' | 'udp' | 'icmp' | 'any';
export interface SecurityRule {
  id: string;
  direction: RuleDirection;
  protocol: RuleProtocol;
  port_min: number | null;
  port_max: number | null;
  cidr: string;
  description: string;
}
export interface SecurityGroup { id: string; name: string; description: string; rules: SecurityRule[] }

export interface Quota {
  instances: { used: number; limit: number };
  vcpus: { used: number; limit: number };
  ram_mb: { used: number; limit: number };
  volumes_gb: { used: number; limit: number };
  floating_ips: { used: number; limit: number };
  security_groups: { used: number; limit: number };
}

export interface UsageLine { resource: string; kind: 'instance' | 'volume' | 'floating_ip' | 'bandwidth'; quantity: number; unit: string; unit_price_bdt: number; amount_bdt: number }
export interface Invoice { id: string; period: string; issued_at: string; due_at: string; total_bdt: number; status: 'paid' | 'due' | 'overdue' }
export interface Billing { month: string; usage: UsageLine[]; daily_spend_bdt: number[]; invoices: Invoice[]; credit_bdt: number }

export interface ActivityEntry { id: string; ts: string; actor: string; action: string; target: string; outcome: 'success' | 'failure'; details?: string }

export interface CreateInstanceInput { name: string; image_id: string; flavor_id: string; network_id: string; keypair_id: string | null; security_group_ids: string[] }
export interface CreateVolumeInput { name: string; size_gb: number; type: 'ssd' | 'hdd' }
export type CreateRuleInput = Omit<SecurityRule, 'id'>;
