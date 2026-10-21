export function formatBdt(amount: number, fractionDigits = 2): string {
  const fixed = amount.toFixed(fractionDigits);
  const [whole, frac] = fixed.split('.');
  const neg = whole.startsWith('-');
  const digits = neg ? whole.slice(1) : whole;
  const grouped = digits.length > 3 ? `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}` : digits;
  return `${neg ? '-' : ''}৳${grouped}${frac !== undefined ? `.${frac}` : ''}`;
}

export function formatRam(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;
}

export function formatGb(gb: number): string {
  return gb >= 1000 ? `${(gb / 1000).toFixed(1)} TB` : `${gb} GB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function hoursInMonth(month = new Date()): number {
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return days * 24;
}
