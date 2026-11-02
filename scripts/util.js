export const USER_AGENT = 'JobFinderBot/1.0 (+personal job search dashboard)';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function httpGet(url, { headers = {}, timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: ctrl.signal });
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} (${new URL(url).host})`);
    return body;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`시간 초과 (${new URL(url).host})`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---- 날짜 ----
const pad = (n) => String(n).padStart(2, '0');

// 한국 시간 기준 YYYY-MM-DD
export function kstDate(d = new Date()) {
  const k = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`;
}

export function fromUnix(sec) {
  const n = Number(sec);
  if (!n) return null;
  return kstDate(new Date(n * 1000));
}

// "2026-11-02", "26-11-02", "2026.11.02", "20261102" 등을 YYYY-MM-DD로
export function parseDate(text) {
  if (!text) return null;
  const s = String(text);
  let m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(?:^|\D)(\d{2})[-./](\d{1,2})[-./](\d{1,2})(?:\D|$)/);
  if (m) return `20${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(?:^|\D)(20\d{2})(\d{2})(\d{2})(?:\D|$)/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export function decodeEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .trim();
}

// ---- robots.txt (키 없이 공개 엔드포인트에 접근하는 수집기에 적용) ----
const robotsCache = new Map();

function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && 'jobfinderbot'.includes(a)));
  const star = groups.filter((g) => g.agents.includes('*'));
  return (mine.length ? mine : star).flatMap((g) => g.rules);
}

function ruleMatches(rulePath, path) {
  if (!rulePath) return false;
  const re = new RegExp(
    '^' + rulePath.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')
  );
  return re.test(path);
}

export async function robotsAllowed(urlStr) {
  const url = new URL(urlStr);
  let rules = robotsCache.get(url.origin);
  if (!rules) {
    try {
      rules = parseRobots(await httpGet(`${url.origin}/robots.txt`, { timeoutMs: 10000 }));
    } catch (e) {
      // 404 등 robots.txt가 없으면 제한 없음. 네트워크 오류는 안전하게 수집하지 않음
      if (/HTTP 4\d\d/.test(e.message)) rules = [];
      else throw new Error(`robots.txt 확인 실패: ${e.message}`);
    }
    robotsCache.set(url.origin, rules);
  }
  const path = url.pathname + url.search;
  let best = null;
  for (const r of rules) {
    if (ruleMatches(r.path, path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}
