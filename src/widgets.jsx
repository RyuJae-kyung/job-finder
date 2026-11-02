import { useMemo, useState } from 'react';
import { CATEGORIES, REGIONS } from '../shared/taxonomy.js';
import { STAGES } from './usePipeline.js';
import { computeMatch, hasProfile } from './profile.js';
import { daysLeft, formatDate, todayKst } from './dates.js';

const URGENT_DAYS = 3;

function toggleArr(arr, v) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function DDay({ deadline, text }) {
  const d = daysLeft(deadline);
  if (d === null) return <span className="badge">{text || '상시'}</span>;
  if (d < 0) return <span className="badge closed">마감</span>;
  return <span className={`badge ${d <= URGENT_DAYS ? 'urgent' : ''}`}>{d === 0 ? '오늘 마감' : `D-${d}`}</span>;
}

// ---------- 공통: 막대 목록 (단일 색상, 값 직접 표기) ----------
export function BarList({ rows, unit = '건', empty = '데이터 없음' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="barlist">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.value.toLocaleString()}${unit}${r.note ? ` (${r.note})` : ''}`}>
          <span className="bl-label">{r.label}</span>
          <span className="bl-track">
            <span className="bl-bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="bl-value">
            {r.value.toLocaleString()}
            {unit}
            {r.note && <em className={`bl-note ${r.noteTone || ''}`}>{r.note}</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- 매칭 점수 ----------
export function MatchMeter({ match, compact }) {
  if (match.score === null) return null;
  const tone = match.score >= 80 ? 'high' : match.score >= 50 ? 'mid' : 'low';
  return (
    <div className={`match ${compact ? 'compact' : ''}`}>
      <span className={`match-score ${tone}`}>{match.score}%</span>
      {!compact && (
        <div className="match-parts">
          {match.parts.map((p) => (
            <div key={p.key} className="mp" title={p.detail}>
              <span className="mp-label">{p.label}</span>
              <span className="mp-track">
                <span className="mp-bar" style={{ width: `${p.value * 100}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- 내 조건 설정 ----------
export function ProfilePanel({ profile, setProfile, skillOptions }) {
  const [open, setOpen] = useState(!hasProfile(profile));
  const [skillInput, setSkillInput] = useState('');
  const set = (patch) => setProfile({ ...profile, ...patch });

  function addSkill(e) {
    e.preventDefault();
    const v = skillInput.trim();
    if (v && !profile.skills.some((s) => s.toLowerCase() === v.toLowerCase())) set({ skills: [...profile.skills, v] });
    setSkillInput('');
  }

  const summary = [
    profile.categories.map((c) => CATEGORIES.find((x) => x.id === c)?.label).join(', '),
    profile.regions.map((r) => REGIONS.find((x) => x.id === r)?.label).join(', '),
    profile.skills.join(', '),
    profile.newcomer ? '신입 지원 가능' : '',
  ].filter(Boolean);

  return (
    <section className="panel profile">
      <div className="panel-head">
        <div>
          <h2>내 조건</h2>
          <p className="muted small">{summary.length ? summary.join(' · ') : '조건을 설정하면 공고마다 매칭률이 표시되고, 오늘의 추천이 만들어집니다.'}</p>
        </div>
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? '접기' : '조건 수정'}
        </button>
      </div>
      {open && (
        <div className="profile-body">
          <div className="filter-group">
            <span className="filter-label">직무</span>
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button key={c.id} className={`chip ${profile.categories.includes(c.id) ? 'on' : ''}`} onClick={() => set({ categories: toggleArr(profile.categories, c.id) })}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">지역</span>
            <div className="chips">
              {REGIONS.map((r) => (
                <button key={r.id} className={`chip ${profile.regions.includes(r.id) ? 'on' : ''}`} onClick={() => set({ regions: toggleArr(profile.regions, r.id) })}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">기술</span>
            <div className="skills-edit">
              <form onSubmit={addSkill} className="skill-form">
                <input list="skill-options" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="예: Python, AWS, Linux" aria-label="기술 스택 추가" />
                <datalist id="skill-options">
                  {skillOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <button className="btn ghost" type="submit">
                  추가
                </button>
              </form>
              <div className="chips">
                {profile.skills.map((s) => (
                  <button key={s} className="chip on" onClick={() => set({ skills: profile.skills.filter((x) => x !== s) })} title="클릭하여 삭제">
                    {s} ✕
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={profile.newcomer} onChange={(e) => set({ newcomer: e.target.checked })} />
            신입으로 지원 (신입 지원 가능 공고에 가산점)
          </label>
          <p className="muted small">
            매칭률 = 직무 35 · 기술 30 · 지역 25 · 신입 10 비중으로, 설정한 조건만 반영합니다. 기술은 내 스택 중 3개 이상 겹치면 만점입니다. 연봉은 수집 출처에 정보가 없어 반영하지 않습니다.
          </p>
        </div>
      )}
    </section>
  );
}

// ---------- 오늘의 추천 ----------
export function DailyReport({ jobs, profile, pipeline, onScrap }) {
  const { latest, picks, newCount } = useMemo(() => {
    const latest = jobs.reduce((m, j) => (j.collectedAt > m ? j.collectedAt : m), '');
    const fresh = jobs.filter((j) => j.collectedAt === latest);
    const picks = fresh
      .map((job) => ({ job, match: computeMatch(job, profile) }))
      .filter((x) => x.match.score > 0)
      .sort((a, b) => b.match.score - a.match.score || (a.job.deadline || '9999').localeCompare(b.job.deadline || '9999'))
      .slice(0, 5);
    return { latest, picks, newCount: fresh.length };
  }, [jobs, profile]);

  if (!jobs.length || !hasProfile(profile)) return null;
  const isToday = latest === todayKst();

  return (
    <section className="panel report">
      <div className="panel-head">
        <div>
          <h2>{isToday ? '오늘의 추천' : `${formatDate(latest)} 추천`}</h2>
          <p className="muted small">
            {isToday ? '오늘' : formatDate(latest)} 새로 수집된 공고 {newCount.toLocaleString()}건 중 내 조건 매칭률 상위 {picks.length}건
          </p>
        </div>
      </div>
      {picks.length === 0 ? (
        <p className="muted small">새 공고 중 조건에 맞는 공고가 없습니다.</p>
      ) : (
        <ol className="report-list">
          {picks.map(({ job, match }, i) => (
            <li key={job.id}>
              <span className="rank">{i + 1}</span>
              <MatchMeter match={match} compact />
              <div className="report-main">
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="report-title">
                  {job.title}
                </a>
                <span className="muted small">
                  {job.company} · {job.location || '지역 미기재'} · {match.parts.map((p) => p.detail).join(' / ')}
                </span>
              </div>
              <DDay deadline={job.deadline} text={job.deadlineText} />
              <button className="btn ghost sm" onClick={() => onScrap(job)} disabled={!!pipeline[job.id]}>
                {pipeline[job.id] ? '스크랩됨' : '스크랩'}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------- 지원 현황 칸반 ----------
export function Kanban({ items, move, remove, liveIds }) {
  const list = Object.entries(items);
  if (!list.length) {
    return (
      <div className="empty">
        <p>
          <b>아직 스크랩한 공고가 없습니다.</b>
        </p>
        <p className="muted">공고 카드의 &lsquo;스크랩&rsquo; 버튼을 누르면 여기에 추가되고, 지원 단계별로 옮기며 관리할 수 있습니다.</p>
      </div>
    );
  }
  return (
    <>
      <p className="muted small kanban-help">
        ◀ ▶ 버튼으로 단계를 옮깁니다. 스크랩 단계에서 마감 3일 이내이거나 마감된 공고는 빨간색으로 표시됩니다. 지원 현황은 이 브라우저에만 저장됩니다.
      </p>
      <div className="kanban">
        {STAGES.map((st, si) => {
          const cards = list
            .filter(([, v]) => v.stage === st.id)
            .sort(([, a], [, b]) => (a.job.deadline || '9999').localeCompare(b.job.deadline || '9999'));
          return (
            <section key={st.id} className="kcol">
              <h3>
                {st.label} <span className="kcount">{cards.length}</span>
              </h3>
              {cards.map(([id, v]) => {
                const d = daysLeft(v.job.deadline);
                const warn = st.id === 'scrap' && d !== null && d <= URGENT_DAYS;
                return (
                  <article key={id} className={`kcard ${warn ? 'warn' : ''}`}>
                    <div className="kcard-top">
                      <DDay deadline={v.job.deadline} text={v.job.deadlineText} />
                      {warn && <span className="badge urgent solid">{d < 0 ? '마감됨' : '서류 마감 임박'}</span>}
                    </div>
                    <p className="company">{v.job.company}</p>
                    <a className="ktitle" href={v.job.url} target="_blank" rel="noopener noreferrer">
                      {v.job.title} ↗
                    </a>
                    {!liveIds.has(id) && st.id === 'scrap' && <p className="note">현재 수집 목록에 없음 (마감되었을 수 있음)</p>}
                    <div className="kactions">
                      <button className="btn ghost sm" disabled={si === 0} onClick={() => move(id, STAGES[si - 1].id)} aria-label="이전 단계로">
                        ◀
                      </button>
                      <button className="btn ghost sm" disabled={si === STAGES.length - 1} onClick={() => move(id, STAGES[si + 1].id)} aria-label="다음 단계로">
                        ▶
                      </button>
                      <button className="btn ghost sm danger" onClick={() => remove(id)}>
                        삭제
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}

// ---------- 시장 동향 ----------
export function Market({ jobs, history, profile }) {
  const [cat, setCat] = useState(profile.categories[0] || 'all');
  const scope = cat === 'all' ? jobs : jobs.filter((j) => j.categories.includes(cat));

  const stats = useMemo(() => {
    const skillCount = new Map();
    for (const j of scope) for (const s of j.skills || []) skillCount.set(s, (skillCount.get(s) || 0) + 1);
    const topSkills = [...skillCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const regionRows = REGIONS.map((r) => ({ label: r.label, value: scope.filter((j) => j.regions.includes(r.id)).length }));
    const newcomer = scope.filter((j) => j.newcomerOk).length;

    // 추이: 3일 이상 지난 집계 중 7일 전에 가장 가까운 날과 비교 (언급 비율 변화, %p)
    const today = todayKst();
    const old = (history || [])
      .filter((h) => (Date.parse(today) - Date.parse(h.date)) / 86400000 >= 3)
      .sort((a, b) => Math.abs(7 - (Date.parse(today) - Date.parse(a.date)) / 86400000) - Math.abs(7 - (Date.parse(today) - Date.parse(b.date)) / 86400000))[0];
    const oldTotal = old?.total?.[cat];
    const oldSkills = old?.skills?.[cat] || {};
    const skillRows = topSkills.map(([s, n]) => {
      const row = { label: s, value: n };
      if (old && oldTotal && scope.length) {
        const diff = (n / scope.length - (oldSkills[s] || 0) / oldTotal) * 100;
        if (Math.abs(diff) >= 0.5) {
          row.note = `${diff > 0 ? '▲' : '▼'}${Math.abs(diff).toFixed(1)}%p`;
          row.noteTone = diff > 0 ? 'up' : 'down';
        }
      }
      return row;
    });
    return { skillRows, regionRows, newcomer, old, days: (history || []).length };
  }, [scope, history, cat]);

  return (
    <div className="market">
      <div className="chips market-cats">
        <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>
          전체 직무
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`chip ${cat === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">현재 공고</span>
          <span className="tile-value">{scope.length.toLocaleString()}건</span>
        </div>
        <div className="tile">
          <span className="tile-label">신입 지원 가능</span>
          <span className="tile-value">
            {stats.newcomer.toLocaleString()}건
            <small> ({scope.length ? Math.round((stats.newcomer / scope.length) * 100) : 0}%)</small>
          </span>
        </div>
        <div className="tile">
          <span className="tile-label">평균 연봉</span>
          <span className="tile-value muted-value">정보 없음</span>
          <span className="tile-note">수집 출처 목록에 연봉이 없음</span>
        </div>
      </div>

      <div className="market-grid">
        <section className="panel">
          <h2>많이 요구되는 기술 스택 Top 10</h2>
          <p className="muted small">
            {stats.old
              ? `괄호 안은 ${formatDate(stats.old.date)} 대비 공고 내 언급 비율 변화`
              : `기술 변화 추이는 수집 기록이 3일 이상 쌓이면 표시됩니다 (현재 ${stats.days}일치).`}
          </p>
          <BarList rows={stats.skillRows} empty="기술 스택 정보가 있는 공고가 없습니다." />
        </section>
        <section className="panel">
          <h2>근무 지역 분포</h2>
          <p className="muted small">한 공고가 여러 지역에 걸치면 각각 집계합니다.</p>
          <BarList rows={stats.regionRows} />
        </section>
      </div>
    </div>
  );
}
