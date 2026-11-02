// 점핏(사람인 운영 IT 채용 서비스) — 키 없이 공개 목록(JSON)을 조회. robots.txt 허용 시에만 수집
import { httpGet, robotsAllowed, parseDate, sleep } from '../util.js';

const BASE = 'https://jumpit-api.saramin.co.kr/api/positions';
const PAGES = 15;

export default {
  id: 'jumpit',
  label: '점핏',
  async fetchJobs() {
    const out = [];
    for (let page = 1; page <= PAGES; page++) {
      // career=0: 신입 지원 가능, sort=reg_dt: 최신 등록순
      const url = `${BASE}?sort=reg_dt&highlight=false&career=0&page=${page}`;
      if (!(await robotsAllowed(url))) throw new Error('robots.txt에서 허용되지 않은 경로 → 수집하지 않음');
      const data = JSON.parse(await httpGet(url, { headers: { Accept: 'application/json' } }));
      const list = data?.result?.positions;
      if (!Array.isArray(list)) throw new Error('응답 형식이 예상과 다름');
      console.log(`[jumpit] page ${page}: ${list.length}건 (전체 ${data?.result?.totalCount ?? '?'}건, 첫 id ${list[0]?.id})`);
      for (const j of list) {
        if (!j?.id || !j.title) continue;
        const min = j.minCareer;
        const max = j.maxCareer;
        let experienceText = j.newcomer ? '신입' : '';
        if (j.newcomer && typeof max === 'number' && max > 0) experienceText = `신입·경력 (~${max}년)`;
        else if (!j.newcomer && typeof min === 'number') experienceText = `경력 ${min}년 이상`;
        out.push({
          source: 'jumpit',
          sourceId: String(j.id),
          company: j.companyName || '',
          title: j.title,
          location: (j.locations || []).join(', '),
          experienceText,
          education: '',
          requirements: (j.techStacks || []).slice(0, 6).join(', '),
          salary: '',
          postedAt: null,
          deadline: j.alwaysOpen ? null : parseDate(j.closedAt),
          deadlineText: j.alwaysOpen ? '상시채용' : '',
          url: `https://jumpit.saramin.co.kr/position/${j.id}`,
          extraText: [j.jobCategory, ...(j.techStacks || [])].join(' '),
        });
      }
      if (list.length === 0) break;
      await sleep(1000);
    }
    return out;
  },
};
