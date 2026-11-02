const pad = (n) => String(n).padStart(2, '0');

export function todayKst() {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

// 마감까지 남은 일수 (오늘 마감 = 0)
export function daysLeft(deadline) {
  if (!deadline) return null;
  const a = Date.parse(`${todayKst()}T00:00:00Z`);
  const b = Date.parse(`${deadline}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function formatDate(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}`;
}

export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
