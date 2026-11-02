import { CATEGORIES } from '../shared/taxonomy.js';
import { daysLeft, formatDate } from './dates.js';

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));
export const URGENT_DAYS = 3;

function DeadlineBadge({ job }) {
  const d = daysLeft(job.deadline);
  if (d === null) return <span className="badge">{job.deadlineText || '상시채용'}</span>;
  if (d === 0) return <span className="badge urgent">오늘 마감</span>;
  if (d < 0) return <span className="badge closed">마감</span>;
  return <span className={`badge ${d <= URGENT_DAYS ? 'urgent' : ''}`}>D-{d}</span>;
}

function Row({ label, value }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd className={value ? '' : 'muted'}>{value || '정보 없음'}</dd>
    </div>
  );
}

export default function JobCard({ job, isFav, onToggleFav, missing }) {
  const d = daysLeft(job.deadline);
  const urgent = d !== null && d >= 0 && d <= URGENT_DAYS;
  const deadline = job.deadline ? formatDate(job.deadline) : job.deadlineText || '상시채용';
  const edu = [job.education, job.requirements].filter(Boolean).join(' · ');

  return (
    <article className={`card ${urgent ? 'is-urgent' : ''} ${job.sample ? 'is-sample' : ''}`}>
      <header className="card-head">
        <div className="badges">
          <span className={`badge src src-${job.source || 'sample'}`}>{job.sourceLabel}</span>
          <span className={`badge ${job.newcomerOk ? 'new' : ''}`}>{job.experience}</span>
          <DeadlineBadge job={job} />
          {urgent && <span className="badge urgent solid">마감 임박</span>}
        </div>
        {!job.sample && (
          <button
            className={`fav ${isFav ? 'on' : ''}`}
            onClick={() => onToggleFav(job)}
            aria-pressed={isFav}
            aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            title={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isFav ? '★' : '☆'}
          </button>
        )}
      </header>

      <p className="company">{job.company}</p>
      <h3 className="title">{job.title}</h3>

      <dl className="info">
        <Row label="근무지역" value={job.location} />
        <Row label="학력·요건" value={edu} />
        <Row label="연봉" value={job.salary} />
        <Row label="등록일" value={formatDate(job.postedAt)} />
        <Row label="마감일" value={deadline} />
        <Row label="수집일" value={formatDate(job.collectedAt)} />
      </dl>

      {job.categories?.length > 0 && (
        <div className="tags">
          {job.categories.map((c) => (
            <span key={c} className="tag">{CAT_LABEL[c]}</span>
          ))}
        </div>
      )}

      {missing && <p className="note">현재 수집 목록에 없음 (마감되었거나 출처에서 내려갔을 수 있음)</p>}

      <footer className="card-foot">
        {job.sample ? (
          <span className="muted small">예시 데이터 — 실제 공고 링크 없음</span>
        ) : (
          <>
            <a className="btn primary" href={job.url} target="_blank" rel="noopener noreferrer">
              공고 상세 보기 ↗
            </a>
            {job.alsoOn?.map((a) => (
              <a key={a.source} className="btn ghost" href={a.url} target="_blank" rel="noopener noreferrer">
                {a.sourceLabel}에서 보기
              </a>
            ))}
          </>
        )}
      </footer>
    </article>
  );
}
