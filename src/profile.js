import { useEffect, useState } from 'react';

const KEY = 'jobfinder:profile';
const EMPTY = { categories: [], regions: [], skills: [], newcomer: false };

export function useProfile() {
  const [profile, setProfile] = useState(() => {
    try {
      return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY)) };
    } catch {
      return EMPTY;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* 저장 불가 환경 */
    }
  }, [profile]);
  return [profile, setProfile];
}

export const hasProfile = (p) => p.categories.length + p.regions.length + p.skills.length > 0 || p.newcomer;

// 가중치: 설정한 조건만 반영해 100%로 환산
const WEIGHTS = { category: 35, skills: 30, region: 25, newcomer: 10 };
const SKILL_FULL = 3; // 내 스택 중 3개 이상 겹치면 기술 점수 100%

const norm = (s) => s.toLowerCase().replace(/[\s._-]/g, '');

// 반환: { score: 0~100 | null, parts: [{ key, label, value: 0~1, detail }] }
export function computeMatch(job, p) {
  const parts = [];
  if (p.categories.length) {
    const hit = job.categories.some((c) => p.categories.includes(c));
    parts.push({ key: 'category', label: '직무', value: hit ? 1 : 0, detail: hit ? '관심 직무 일치' : '관심 직무 아님' });
  }
  if (p.skills.length) {
    const jobSkills = (job.skills || []).map(norm);
    const text = norm(job.title);
    const matched = p.skills.filter((s) => jobSkills.includes(norm(s)) || (norm(s).length >= 3 && text.includes(norm(s))));
    const need = Math.min(SKILL_FULL, p.skills.length);
    parts.push({
      key: 'skills',
      label: '기술',
      value: Math.min(1, matched.length / need),
      detail: matched.length ? `일치: ${matched.join(', ')}` : '일치하는 기술 없음',
      matched,
    });
  }
  if (p.regions.length) {
    const hit = job.regions.some((r) => p.regions.includes(r));
    parts.push({ key: 'region', label: '지역', value: hit ? 1 : 0, detail: hit ? '희망 지역' : '희망 지역 아님' });
  }
  if (p.newcomer) {
    parts.push({ key: 'newcomer', label: '신입', value: job.newcomerOk ? 1 : 0, detail: job.newcomerOk ? '신입 지원 가능' : '경력 공고' });
  }
  if (!parts.length) return { score: null, parts };
  const total = parts.reduce((a, x) => a + WEIGHTS[x.key], 0);
  const score = Math.round((parts.reduce((a, x) => a + WEIGHTS[x.key] * x.value, 0) / total) * 100);
  return { score, parts };
}
