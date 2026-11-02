import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, REGIONS, searchLinks } from '../shared/taxonomy.js';
import JobCard from './JobCard.jsx';
import { useFavorites } from './useFavorites.js';
import { SAMPLE_JOBS } from './sampleJobs.js';
import { formatDateTime } from './dates.js';

const PAGE_SIZE = 30;

function toggleIn(set, id) {
  const next = new Set(set);
  next.has(id) ? next.delete(id) : next.add(id);
  return next;
}

function Chips({ label, items, selected, onChange }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="chips">
        <button className={`chip ${selected.size === 0 ? 'on' : ''}`} onClick={() => onChange(new Set())}>
          전체
        </button>
        {items.map((it) => (
          <button key={it.id} className={`chip ${selected.has(it.id) ? 'on' : ''}`} onClick={() => onChange(toggleIn(selected, it.id))}>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [cats, setCats] = useState(new Set());
  const [regions, setRegions] = useState(new Set());
  const [newOnly, setNewOnly] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [sort, setSort] = useState('latest');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [showSample, setShowSample] = useState(false);
  const { favs, toggle } = useFavorites();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/jobs.json`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLoadError('');
    } catch (e) {
      setLoadError(`공고 데이터를 불러오지 못했습니다 (${e.message}).`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 페이지를 열어둔 동안 10분마다 새 수집 결과 확인
  useEffect(() => {
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => setLimit(PAGE_SIZE), [query, cats, regions, newOnly, favOnly, sort]);

  const jobs = data?.jobs || [];
  const liveIds = useMemo(() => new Set(jobs.map((j) => j.id)), [jobs]);
  const usingSample = jobs.length === 0 && showSample;

  const filtered = useMemo(() => {
    let list = favOnly ? Object.values(favs) : usingSample ? SAMPLE_JOBS : jobs;
    const q = query.trim().toLowerCase();
    list = list.filter((j) => {
      if (q && !`${j.company} ${j.title}`.toLowerCase().includes(q)) return false;
      if (cats.size && !j.categories.some((c) => cats.has(c))) return false;
      if (regions.size && !j.regions.some((r) => regions.has(r))) return false;
      if (newOnly && !j.newcomerOk) return false;
      return true;
    });
    const latestKey = (j) => j.postedAt || j.collectedAt || '';
    return [...list].sort((a, b) => {
      if (sort === 'deadline') {
        const da = a.deadline || '9999';
        const db = b.deadline || '9999';
        return da.localeCompare(db) || latestKey(b).localeCompare(latestKey(a));
      }
      return latestKey(b).localeCompare(latestKey(a)) || (a.deadline || '9999').localeCompare(b.deadline || '9999');
    });
  }, [jobs, favs, favOnly, usingSample, query, cats, regions, newOnly, sort]);

  const linkKeyword = query.trim() || (cats.size === 1 ? CATEGORIES.find((c) => cats.has(c.id)).search : '신입 IT');
  const autoSources = (data?.sources || []).filter((s) => s.auto);
  const linkSources = (data?.sources || []).filter((s) => !s.auto);
  const favCount = Object.keys(favs).length;

  return (
    <div className="app">
      <header className="topbar">
        <div className="wrap topbar-inner">
          <div>
            <h1 className="logo">JOB FINDER</h1>
            <p className="tagline">국내 신입 · 신입 지원 가능 채용공고 자동 모음</p>
          </div>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">최근 업데이트</span>
              <span className="stat-value">{formatDateTime(data?.updatedAt)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">전체 공고</span>
              <span className="stat-value">{jobs.length.toLocaleString()}건</span>
            </div>
          </div>
        </div>
      </header>

      <main className="wrap">
        {loadError && <div className="alert error">{loadError} 잠시 후 새로고침해 주세요.</div>}

        {data && (
          <section className="sources" aria-label="수집 출처 상태">
            <span className="filter-label">자동 수집</span>
            {autoSources.length === 0 && <span className="muted small">현재 자동 수집 중인 출처 없음</span>}
            {autoSources.map((s) => (
              <span key={s.id} className={`source ${s.ok ? 'ok' : 'fail'}`} title={s.message}>
                {s.label} · {s.ok ? `${s.count}건` : '실패'}
              </span>
            ))}
            <span className="filter-label">링크만 제공</span>
            {linkSources.map((s) => (
              <span key={s.id} className="source link" title={s.message}>
                {s.label}
              </span>
            ))}
            <details className="source-detail">
              <summary>상태 자세히</summary>
              <ul>
                {data.sources.map((s) => (
                  <li key={s.id}>
                    <b>{s.label}</b>: {s.message}
                  </li>
                ))}
                <li className="muted">마감일이 지난 공고는 자동으로 제외되며, 같은 기업·같은 제목 공고는 하나로 합쳐집니다. 자동 수집 주기: 약 {data.refreshHours}시간마다</li>
              </ul>
            </details>
          </section>
        )}

        <section className="controls">
          <div className="search-row">
            <input
              className="search"
              type="search"
              placeholder="기업명 또는 직무 검색 (예: 보안관제, 삼성, 백엔드)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
              <option value="latest">최신 등록순</option>
              <option value="deadline">마감 임박순</option>
            </select>
          </div>
          <Chips label="직무" items={CATEGORIES} selected={cats} onChange={setCats} />
          <Chips label="지역" items={REGIONS} selected={regions} onChange={setRegions} />
          <div className="toggles">
            <label className="toggle">
              <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} />
              신입 지원 가능 공고만 (신입 · 신입/경력 · 경력무관)
            </label>
            <label className="toggle">
              <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
              즐겨찾기만 보기 ({favCount})
            </label>
          </div>
        </section>

        {usingSample && !favOnly && (
          <div className="alert sample">
            <b>예시 데이터입니다.</b> 아래 카드는 화면 구성을 보여주기 위한 가상의 공고이며 실제 채용공고가 아닙니다.{' '}
            <button className="link-btn" onClick={() => setShowSample(false)}>
              예시 숨기기
            </button>
          </div>
        )}

        <div className="result-bar">
          <span>
            {favOnly ? '즐겨찾기' : usingSample ? '예시' : '검색 결과'} <b>{filtered.length.toLocaleString()}</b>건
          </span>
        </div>

        {filtered.length > 0 ? (
          <>
            <div className="grid">
              {filtered.slice(0, limit).map((job) => (
                <JobCard key={job.id} job={job} isFav={!!favs[job.id]} onToggleFav={toggle} missing={favOnly && !liveIds.has(job.id)} />
              ))}
            </div>
            {filtered.length > limit && (
              <button className="btn more" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                더 보기 ({filtered.length - limit}건 남음)
              </button>
            )}
          </>
        ) : (
          <div className="empty">
            {!data && !loadError && <p>공고를 불러오는 중…</p>}
            {data && jobs.length === 0 && !favOnly && (
              <>
                <p>
                  <b>자동 수집된 채용공고가 없습니다.</b>
                </p>
                <p className="muted">
                  위 &lsquo;상태 자세히&rsquo;에서 출처별 사유를 확인할 수 있습니다. 아래 검색 링크로 각 사이트에서 직접 확인하세요.
                </p>
                {!showSample && (
                  <button className="btn ghost" onClick={() => setShowSample(true)}>
                    예시 데이터로 화면 미리보기
                  </button>
                )}
              </>
            )}
            {data && (jobs.length > 0 || favOnly) && <p>조건에 맞는 공고가 없습니다. 필터를 줄이거나 아래 링크로 직접 검색해 보세요.</p>}
          </div>
        )}

        <section className="links">
          <h2>채용 사이트에서 직접 검색</h2>
          <p className="muted small">
            자동 수집이 아닌 외부 사이트 검색 링크입니다. 검색어: <b>{linkKeyword}</b> (검색창 또는 직무 1개 선택 시 반영)
          </p>
          <div className="link-list">
            {searchLinks(linkKeyword).map((l) => (
              <a key={l.id} className="btn ghost" href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label}
                {l.noQuery ? ' 채용정보 검색' : ` 에서 "${linkKeyword}"`} ↗
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="foot wrap muted small">
        공고 정보는 각 채용 사이트에 있으며, 지원 전 반드시 원문 공고를 확인하세요. 즐겨찾기는 이 브라우저에만 저장됩니다.
      </footer>
    </div>
  );
}
