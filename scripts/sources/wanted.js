// 원티드 — 키 없이 공개 웹 목록(JSON)을 조회. robots.txt에서 허용된 경우에만 수집한다.
// 허용되지 않거나 응답 형식이 바뀌면 이 출처는 "검색 링크 제공"으로 전환된다.
import { httpGet, robotsAllowed, parseDate, sleep } from '../util.js';

const BASE = 'https://www.wanted.co.kr/api/v4/jobs';
const PAGES = 3; // 100건 × 3페이지, 서버 부담을 줄이기 위해 페이지 사이 1초 대기

export default {
  id: 'wanted',
  label: '원티드',
  async fetchJobs() {
    const out = [];
    for (let page = 0; page < PAGES; page++) {
      // tag_type_ids=518: 개발 직군, years=0: 신입 지원 가능
      const url = `${BASE}?country=kr&tag_type_ids=518&job_sort=job.latest_order&locations=all&years=0&limit=100&offset=${page * 100}`;
      if (!(await robotsAllowed(url))) {
        throw new Error('robots.txt에서 허용되지 않은 경로 → 수집하지 않음');
      }
      const data = JSON.parse(await httpGet(url, { headers: { Accept: 'application/json' } }));
      const list = Array.isArray(data?.data) ? data.data : null;
      if (!list) throw new Error('응답 형식이 예상과 다름');
      for (const j of list) {
        if (!j?.id || !j.position) continue;
        const addr = j.address || {};
        const location = addr.full_location || [addr.location, addr.district].filter(Boolean).join(' ');
        const from = j.annual_from;
        const to = j.annual_to;
        let experienceText = '신입';
        if (typeof from === 'number' && typeof to === 'number' && to > 0) experienceText = `신입·경력 (${from}~${to}년)`;
        out.push({
          source: 'wanted',
          sourceId: String(j.id),
          company: j.company?.name || '',
          title: j.position,
          location,
          experienceText,
          education: '',
          requirements: '',
          salary: '',
          postedAt: null, // 목록 응답에 등록일이 없음
          deadline: parseDate(j.due_time),
          deadlineText: j.due_time ? '' : '상시채용',
          url: `https://www.wanted.co.kr/wd/${j.id}`,
          extraText: [j.company?.industry_name, ...(j.category_tags || []).map((t) => t?.title || '')].join(' '),
        });
      }
      if (list.length < 100 || !data?.links?.next) break;
      await sleep(1000);
    }
    return out;
  },
};
