import type { Billing, Flavor, FloatingIp, Image, Instance, Keypair, Network, SecurityGroup, Volume } from '../types';

export const images: Image[] = [
  { id: 'img-ubuntu-2204', name: 'Ubuntu 22.04 LTS', os: 'ubuntu', min_disk_gb: 10, min_ram_mb: 1024 },
  { id: 'img-ubuntu-2404', name: 'Ubuntu 24.04 LTS', os: 'ubuntu', min_disk_gb: 10, min_ram_mb: 1024 },
  { id: 'img-debian-12', name: 'Debian 12', os: 'debian', min_disk_gb: 10, min_ram_mb: 512 },
  { id: 'img-rocky-9', name: 'Rocky Linux 9', os: 'rocky', min_disk_gb: 20, min_ram_mb: 2048 },
  { id: 'img-win-2022', name: 'Windows Server 2022', os: 'windows', min_disk_gb: 60, min_ram_mb: 4096 },
];

export const flavors: Flavor[] = [
  { id: 'fl-s1', name: 's1.small', vcpus: 1, ram_mb: 1024, disk_gb: 20, hourly_bdt: 1.2 },
  { id: 'fl-s2', name: 's1.medium', vcpus: 2, ram_mb: 4096, disk_gb: 40, hourly_bdt: 3.5 },
  { id: 'fl-g4', name: 'g1.large', vcpus: 4, ram_mb: 8192, disk_gb: 80, hourly_bdt: 7.0 },
  { id: 'fl-g8', name: 'g1.xlarge', vcpus: 8, ram_mb: 16384, disk_gb: 160, hourly_bdt: 13.5 },
  { id: 'fl-m16', name: 'm1.2xlarge', vcpus: 16, ram_mb: 65536, disk_gb: 320, hourly_bdt: 38.0 },
];

export const networks: Network[] = [
  { id: 'net-private', name: 'private-dhaka-1', cidr: '10.10.0.0/24', external: false },
  { id: 'net-dmz', name: 'dmz', cidr: '10.20.0.0/24', external: false },
  { id: 'net-public', name: 'public', cidr: '103.108.140.0/24', external: true },
];

export const keypairs: Keypair[] = [
  { id: 'kp-akib', name: 'akib-laptop', fingerprint: 'SHA256:6ZxT1kQ7wP0rN3cVf9hLm2sBd8aYe4GuXjK5oR1tWqA' },
  { id: 'kp-deploy', name: 'ci-deploy', fingerprint: 'SHA256:pQ9mN2vL7kR4tX8bC1dF6hJ3sW5yZ0aE2gU4iO6nM8' },
];

const t = (daysAgo: number, hour = 9) => new Date(Date.UTC(2026, 9, 20 - daysAgo, hour)).toISOString();

export const securityGroups: SecurityGroup[] = [
  {
    id: 'sg-default', name: 'default', description: 'Default security group',
    rules: [
      { id: 'r-1', direction: 'egress', protocol: 'any', port_min: null, port_max: null, cidr: '0.0.0.0/0', description: 'all outbound' },
      { id: 'r-2', direction: 'ingress', protocol: 'tcp', port_min: 22, port_max: 22, cidr: '203.0.113.0/24', description: 'office ssh' },
    ],
  },
  {
    id: 'sg-web', name: 'web', description: 'Public web traffic',
    rules: [
      { id: 'r-3', direction: 'ingress', protocol: 'tcp', port_min: 80, port_max: 80, cidr: '0.0.0.0/0', description: 'http' },
      { id: 'r-4', direction: 'ingress', protocol: 'tcp', port_min: 443, port_max: 443, cidr: '0.0.0.0/0', description: 'https' },
      { id: 'r-5', direction: 'egress', protocol: 'any', port_min: null, port_max: null, cidr: '0.0.0.0/0', description: 'all outbound' },
    ],
  },
  {
    id: 'sg-db', name: 'database', description: 'Postgres from app tier only',
    rules: [
      { id: 'r-6', direction: 'ingress', protocol: 'tcp', port_min: 5432, port_max: 5432, cidr: '10.10.0.0/24', description: 'postgres from private' },
      { id: 'r-7', direction: 'egress', protocol: 'any', port_min: null, port_max: null, cidr: '0.0.0.0/0', description: 'all outbound' },
    ],
  },
];

export const instances: Instance[] = [
  { id: 'i-7f3a', name: 'api-prod-01', status: 'ACTIVE', image_id: 'img-ubuntu-2204', flavor_id: 'fl-g4', network_id: 'net-private', keypair_id: 'kp-deploy', security_group_ids: ['sg-default', 'sg-web'], private_ip: '10.10.0.11', floating_ip: '103.108.140.21', created_at: t(40), task: null },
  { id: 'i-9c21', name: 'api-prod-02', status: 'ACTIVE', image_id: 'img-ubuntu-2204', flavor_id: 'fl-g4', network_id: 'net-private', keypair_id: 'kp-deploy', security_group_ids: ['sg-default', 'sg-web'], private_ip: '10.10.0.12', floating_ip: null, created_at: t(40), task: null },
  { id: 'i-b0d4', name: 'pg-primary', status: 'ACTIVE', image_id: 'img-debian-12', flavor_id: 'fl-g8', network_id: 'net-private', keypair_id: 'kp-akib', security_group_ids: ['sg-default', 'sg-db'], private_ip: '10.10.0.20', floating_ip: null, created_at: t(60), task: null },
  { id: 'i-e5a7', name: 'worker-bkash-recon', status: 'SHUTOFF', image_id: 'img-ubuntu-2404', flavor_id: 'fl-s2', network_id: 'net-private', keypair_id: 'kp-deploy', security_group_ids: ['sg-default'], private_ip: '10.10.0.31', floating_ip: null, created_at: t(12), task: null },
  { id: 'i-11f9', name: 'bastion', status: 'ACTIVE', image_id: 'img-debian-12', flavor_id: 'fl-s1', network_id: 'net-dmz', keypair_id: 'kp-akib', security_group_ids: ['sg-default'], private_ip: '10.20.0.5', floating_ip: '103.108.140.9', created_at: t(90), task: null },
];

export const volumes: Volume[] = [
  { id: 'vol-01', name: 'pg-data', size_gb: 500, status: 'in-use', type: 'ssd', attached_to: 'i-b0d4', created_at: t(60) },
  { id: 'vol-02', name: 'pg-wal', size_gb: 100, status: 'in-use', type: 'ssd', attached_to: 'i-b0d4', created_at: t(60) },
  { id: 'vol-03', name: 'backups', size_gb: 1000, status: 'available', type: 'hdd', attached_to: null, created_at: t(30) },
  { id: 'vol-04', name: 'media-uploads', size_gb: 200, status: 'in-use', type: 'hdd', attached_to: 'i-7f3a', created_at: t(25) },
];

export const floatingIps: FloatingIp[] = [
  { id: 'fip-1', address: '103.108.140.21', instance_id: 'i-7f3a', created_at: t(40) },
  { id: 'fip-2', address: '103.108.140.9', instance_id: 'i-11f9', created_at: t(90) },
  { id: 'fip-3', address: '103.108.140.33', instance_id: null, created_at: t(5) },
];

export const quotaLimits = { instances: 20, vcpus: 64, ram_mb: 131072, volumes_gb: 4000, floating_ips: 6, security_groups: 10 };

export const billing: Billing = {
  month: '2026-10',
  usage: [
    { resource: 'g1.large × 2 (api-prod)', kind: 'instance', quantity: 960, unit: 'hour', unit_price_bdt: 7.0, amount_bdt: 6720 },
    { resource: 'g1.xlarge × 1 (pg-primary)', kind: 'instance', quantity: 480, unit: 'hour', unit_price_bdt: 13.5, amount_bdt: 6480 },
    { resource: 's1.medium × 1 (worker)', kind: 'instance', quantity: 212, unit: 'hour', unit_price_bdt: 3.5, amount_bdt: 742 },
    { resource: 's1.small × 1 (bastion)', kind: 'instance', quantity: 480, unit: 'hour', unit_price_bdt: 1.2, amount_bdt: 576 },
    { resource: 'SSD block storage', kind: 'volume', quantity: 600, unit: 'GB-month', unit_price_bdt: 12, amount_bdt: 7200 },
    { resource: 'HDD block storage', kind: 'volume', quantity: 1200, unit: 'GB-month', unit_price_bdt: 4, amount_bdt: 4800 },
    { resource: 'Floating IPs', kind: 'floating_ip', quantity: 3, unit: 'IP-month', unit_price_bdt: 350, amount_bdt: 1050 },
    { resource: 'Outbound bandwidth', kind: 'bandwidth', quantity: 1840, unit: 'GB', unit_price_bdt: 1.5, amount_bdt: 2760 },
  ],
  daily_spend_bdt: [1420, 1435, 1410, 1480, 1510, 1495, 1470, 1520, 1610, 1590, 1560, 1545, 1530, 1600, 1680, 1655, 1640, 1620, 1700, 1690],
  invoices: [
    { id: 'INV-2026-09', period: '2026-09', issued_at: t(20), due_at: t(5), total_bdt: 41280, status: 'paid' },
    { id: 'INV-2026-08', period: '2026-08', issued_at: t(50), due_at: t(35), total_bdt: 39760, status: 'paid' },
    { id: 'INV-2026-07', period: '2026-07', issued_at: t(81), due_at: t(66), total_bdt: 36120, status: 'paid' },
  ],
  credit_bdt: 5000,
};
