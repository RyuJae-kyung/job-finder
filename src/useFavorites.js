import { useCallback, useEffect, useState } from 'react';

const KEY = 'jobfinder:favorites';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

// 즐겨찾기: 공고 정보를 함께 저장해 목록에서 사라진 뒤에도 확인 가능
export function useFavorites() {
  const [favs, setFavs] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(favs));
    } catch {
      /* 저장 불가 환경(시크릿 모드 등) */
    }
  }, [favs]);

  const toggle = useCallback((job) => {
    setFavs((prev) => {
      const next = { ...prev };
      if (next[job.id]) delete next[job.id];
      else next[job.id] = { ...job, savedAt: new Date().toISOString() };
      return next;
    });
  }, []);

  return { favs, toggle };
}
