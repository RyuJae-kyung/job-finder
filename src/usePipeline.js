import { useCallback, useEffect, useState } from 'react';

export const STAGES = [
  { id: 'scrap', label: '스크랩' },
  { id: 'applied', label: '지원 완료' },
  { id: 'passed', label: '서류 통과' },
  { id: 'interview', label: '면접 대기' },
];

const KEY = 'jobfinder:pipeline';
const OLD_FAV_KEY = 'jobfinder:favorites';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved) return saved;
    // 이전 버전의 즐겨찾기는 '스크랩' 단계로 옮김
    const favs = JSON.parse(localStorage.getItem(OLD_FAV_KEY)) || {};
    return Object.fromEntries(Object.values(favs).map((j) => [j.id, { job: j, stage: 'scrap', updatedAt: j.savedAt || new Date().toISOString() }]));
  } catch {
    return {};
  }
}

// 지원 현황: { [jobId]: { job(공고 정보 사본), stage, updatedAt } } — 브라우저에만 저장
export function usePipeline() {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      localStorage.removeItem(OLD_FAV_KEY);
    } catch {
      /* 저장 불가 환경 */
    }
  }, [items]);

  const add = useCallback((job) => {
    setItems((prev) => (prev[job.id] ? prev : { ...prev, [job.id]: { job, stage: 'scrap', updatedAt: new Date().toISOString() } }));
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const move = useCallback((id, stage) => {
    setItems((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], stage, updatedAt: new Date().toISOString() } } : prev));
  }, []);

  return { items, add, remove, move };
}
