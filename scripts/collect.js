// 채용공고 수집 스크립트 — GitHub Actions가 주기적으로 실행하고 결과를 public/data/jobs.json에 저장한다.
// 직전 결과(PREV_URL 또는 로컬 파일)를 읽어 최초 수집일을 유지하고, 일시적으로 실패한 출처의 공고는 유지한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCategories, classifyRegions, normalizeExperience } from '../shared/taxonomy.js';
import { kstDate, httpGet } from './util.js';
import wanted from './sources/wanted.js';
import jumpit from './sources/jumpit.js';

const SOURCES = [wanted, jumpit];

// 자동 수집하지 않는 사이트 (공개 API 없음 또는 API 키 필요)
const LINK_ONLY = [
  { id: 'saramin', label: '사람인', reason: '키 없이 쓸 수 있는 공개 API 없음 → 검색 링크 제공' },
  { id: 'jobkorea', label: '잡코리아', reason: '공개 API 없음 → 검색 링크 제공' },
  { id: 'work24', label: '고용24', reason: 'Open API는 인증키 필요 → 검색 링크 제공' },
];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'data', 'jobs.json');
const REFRESH_HOURS = Number(process.env.REFRESH_HOURS || 3);
const SOURCE_LABEL = Object.fromEntries([...SOURCES, ...LINK_ONLY].map((s) => [s.id, s.label]));

const normCompany = (s) =>
  (s || '').replace(/\(주\)|㈜|주식회사|\(유\)|유한회사|\(재\)|재단법인|\(사\)|사단법인/g, '').replace(/[^0-9a-zA-Z가-힣]/g, '').toLowerCase();
const normTitle = (s) => (s || '').replace(/[^0-9a-zA-Z가-힣]/g, '').toLowerCase();

async function loadPrevious() {
  try {
    if (process.env.PREV_URL) return JSON.parse(await httpGet(process.env.PREV_URL));
    return JSON.parse(fs.readFileSync(OUT, 'utf8'));
  } catch (e) {
    console.log(`직전 수집 결과 없음 (${e.message})`);
    return { jobs: [], sources: [] };
  }
}

function finalize(raw, today, prevById) {
  const { experience, newcomerOk } = normalizeExperience(raw.experienceText);
  const id = `${raw.source}:${raw.sourceId}`;
  return {
    id,
    source: raw.source,
    sourceLabel: SOURCE_LABEL[raw.source],
    company: raw.company || '(기업명 미기재)',
    title: raw.title,
    location: raw.location || '',
    regions: classifyRegions(raw.location),
    categories: classifyCategories(`${raw.title} ${raw.extraText || ''}`),
    experience,
    newcomerOk,
    education: raw.education || '',
    requirements: raw.requirements || '',
    salary: raw.salary || '',
    postedAt: raw.postedAt || null,
    deadline: raw.deadline || null,
    deadlineText: raw.deadlineText || '',
    url: raw.url,
    collectedAt: prevById.get(id)?.collectedAt || today,
    alsoOn: [],
  };
}

// 같은 기업 + 같은 공고 제목이면 하나로 합치고, 다른 출처 링크는 alsoOn에 보관
function dedupe(jobs) {
  const map = new Map();
  for (const j of jobs) {
    const key = `${normCompany(j.company)}|${normTitle(j.title)}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, { ...j, alsoOn: [] });
      continue;
    }
    for (const f of ['location', 'education', 'requirements', 'salary', 'postedAt', 'deadline']) if (!ex[f] && j[f]) ex[f] = j[f];
    if (ex.regions.length === 0) ex.regions = j.regions;
    ex.categories = [...new Set([...ex.categories, ...j.categories])];
    if (!ex.newcomerOk && j.newcomerOk) Object.assign(ex, { newcomerOk: true, experience: j.experience });
    if (j.collectedAt < ex.collectedAt) ex.collectedAt = j.collectedAt;
    if (ex.source !== j.source && !ex.alsoOn.some((a) => a.source === j.source)) {
      ex.alsoOn.push({ source: j.source, sourceLabel: j.sourceLabel, url: j.url });
    }
  }
  return [...map.values()];
}

async function main() {
  const today = kstDate();
  const notExpired = (j) => !j.deadline || j.deadline >= today;
  const prev = await loadPrevious();
  const prevById = new Map((prev.jobs || []).map((j) => [j.id, j]));
  const statuses = [];
  const collected = [];

  for (const src of SOURCES) {
    const base = { id: src.id, label: src.label, auto: true, checkedAt: new Date().toISOString() };
    try {
      const raw = await src.fetchJobs();
      const jobs = raw.filter((r) => r.title && r.url).map((r) => finalize(r, today, prevById));
      if (jobs.length === 0) throw new Error('수집된 공고 0건');
      collected.push(...jobs);
      const count = new Set(jobs.filter(notExpired).map((j) => j.id)).size;
      statuses.push({ ...base, ok: true, count, message: '자동 수집 정상' });
      console.log(`[${src.id}] ${count}건`);
    } catch (e) {
      // 일시적 실패 시 직전 수집분 유지 (24시간이 지나면 버림)
      const prevStatus = (prev.sources || []).find((s) => s.id === src.id);
      const lastOk = prevStatus?.lastOkAt || (prevStatus?.ok ? prevStatus.checkedAt : null);
      const fresh = lastOk && Date.now() - Date.parse(lastOk) < 24 * 3600 * 1000;
      const kept = fresh ? (prev.jobs || []).filter((j) => j.source === src.id || j.alsoOn?.some((a) => a.source === src.id)) : [];
      collected.push(...kept);
      statuses.push({ ...base, ok: false, count: kept.length, lastOkAt: lastOk, message: `수집 실패: ${e.message}${kept.length ? ' (직전 수집분 표시 중)' : ''}` });
      console.log(`[${src.id}] 실패: ${e.message}`);
      continue;
    }
    statuses[statuses.length - 1].lastOkAt = base.checkedAt;
  }
  for (const l of LINK_ONLY) statuses.push({ id: l.id, label: l.label, auto: false, ok: false, count: 0, message: l.reason });

  const byId = new Map();
  for (const j of collected) if (!byId.has(j.id)) byId.set(j.id, j);
  const jobs = dedupe([...byId.values()].filter(notExpired));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), refreshHours: REFRESH_HOURS, sources: statuses, jobs }));
  console.log(`저장 완료: ${jobs.length}건 → ${path.relative(ROOT, OUT)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
