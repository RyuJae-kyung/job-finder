// 서버(분류)와 화면(필터)이 함께 쓰는 직무·지역 분류 기준

export const CATEGORIES = [
  {
    id: 'cloud',
    label: '클라우드 / DevOps',
    search: '클라우드',
    keywords: ['클라우드', '데브옵스', 'cloud', 'devops', 'aws', 'azure', 'gcp', 'kubernetes', 'k8s', 'docker', 'sre', 'ci/cd', 'msp', 'terraform'],
  },
  {
    id: 'infra',
    label: 'IT 인프라 / 시스템 엔지니어',
    search: '시스템 엔지니어',
    keywords: ['인프라', '시스템 엔지니어', '시스템엔지니어', '시스템 운영', '시스템운영', '서버 운영', '서버운영', '전산', '데이터센터', 'idc', '기술지원', '리눅스', 'linux', 'system engineer', 'it운영', 'it 운영', 'dba'],
  },
  {
    id: 'security',
    label: '정보보안 / 네트워크 보안',
    search: '정보보안',
    keywords: ['보안', '관제', '침해', '모의해킹', '취약점', '방화벽', 'isms', 'security', 'soc', 'cert'],
  },
  {
    id: 'software',
    label: '소프트웨어 개발',
    search: '소프트웨어 개발',
    keywords: ['개발자', '소프트웨어', '백엔드', '프론트엔드', '풀스택', '웹개발', '웹 개발', '앱개발', '앱 개발', '프로그래머', '서버 개발', '서버개발', 'sw', 'developer', 'backend', 'frontend', 'full stack', 'fullstack', 'java', 'python', 'spring', 'react', 'node.js', 'ios', 'android', 'software'],
  },
  {
    id: 'embedded',
    label: '임베디드 / IoT',
    search: '임베디드',
    keywords: ['임베디드', '펌웨어', '사물인터넷', '회로설계', '회로 설계', '하드웨어', 'embedded', 'iot', 'firmware', 'mcu', 'rtos', 'fpga', 'bsp'],
  },
  {
    id: 'smartfactory',
    label: '스마트팩토리 / 스마트제조',
    search: '스마트팩토리',
    keywords: ['스마트팩토리', '스마트 팩토리', '스마트공장', '스마트 공장', '스마트제조', '스마트 제조', '공정자동화', '공장자동화', '자동화', '제어', 'mes', 'plc', 'scada', 'erp', 'hmi'],
  },
  {
    id: 'ict',
    label: 'ICT / 정보통신',
    search: '정보통신',
    keywords: ['정보통신', '통신', '네트워크', '무선', '유선', '전송', '방송', 'ict', '5g', 'lte', 'network'],
  },
  {
    id: 'ai',
    label: 'AI / 데이터 분석',
    search: '데이터 분석',
    keywords: ['인공지능', '머신러닝', '딥러닝', '데이터', '빅데이터', '컴퓨터비전', '컴퓨터 비전', 'ai', 'ml', 'llm', 'data', 'nlp', 'vision'],
  },
];

export const REGIONS = [
  { id: 'busan', label: '부산', match: ['부산'] },
  { id: 'gyeongnam', label: '경남', match: ['경남', '경상남도', '창원', '김해', '양산', '진주', '거제', '통영', '사천', '밀양'] },
  { id: 'ulsan', label: '울산', match: ['울산'] },
  { id: 'daegu', label: '대구', match: ['대구'] },
  { id: 'daejeon', label: '대전', match: ['대전'] },
  { id: 'gwangju', label: '광주', match: ['광주'] },
  { id: 'jeonbuk', label: '전북', match: ['전북', '전라북도', '전주', '군산', '익산'] },
  { id: 'etc', label: '기타 전국', match: [] },
  { id: 'capital', label: '수도권', match: ['서울', '경기', '인천'] },
];

const isAscii = (s) => /^[\x00-\x7f]+$/.test(s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 영문 키워드는 단어 경계로 비교("ai"가 "email"에 걸리지 않도록), 한글은 포함 여부로 비교
function hasKeyword(text, kw) {
  if (isAscii(kw)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRe(kw)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(kw);
}

export function classifyCategories(text) {
  const t = (text || '').toLowerCase();
  return CATEGORIES.filter((c) => c.keywords.some((kw) => hasKeyword(t, kw))).map((c) => c.id);
}

export function classifyRegions(location) {
  let t = location || '';
  if (!t.trim()) return [];
  const found = new Set();
  // 경기도 광주시는 광주광역시가 아니라 수도권
  if (/경기(도)?\s*광주/.test(t)) {
    found.add('capital');
    t = t.replace(/경기(도)?\s*광주(시)?/g, '');
  }
  // 지명 앞에 다른 한글이 붙은 경우는 제외 ("해운대구"의 "대구" 등)
  for (const r of REGIONS) {
    if (r.match.some((m) => new RegExp(`(^|[^가-힣])${m}`).test(t))) found.add(r.id);
  }
  if (found.size === 0) found.add('etc');
  return [...found];
}

// 경력 구분 정규화. newcomerOk = 신입이 지원 가능한 공고인지
export function normalizeExperience(text) {
  const t = (text || '').replace(/\s/g, '');
  if (!t) return { experience: '미기재', newcomerOk: false };
  if (/경력무관|관계없음|무관/.test(t)) return { experience: '경력무관', newcomerOk: true };
  const hasNew = /신입/.test(t);
  const hasCareer = /경력/.test(t);
  if (hasNew && hasCareer) return { experience: '신입·경력', newcomerOk: true };
  if (hasNew) return { experience: '신입', newcomerOk: true };
  if (hasCareer) return { experience: '경력', newcomerOk: false };
  return { experience: text.trim(), newcomerOk: false };
}

// 외부 사이트 검색 링크 (자동 수집 아님)
export function searchLinks(keyword) {
  const q = encodeURIComponent(keyword || '');
  return [
    { id: 'saramin', label: '사람인', url: `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${q}` },
    { id: 'jobkorea', label: '잡코리아', url: `https://www.jobkorea.co.kr/Search/?stext=${q}` },
    { id: 'wanted', label: '원티드', url: `https://www.wanted.co.kr/search?query=${q}&tab=position` },
    // 고용24는 검색어를 URL로 전달하는 공개 규격이 없어 채용정보 검색 페이지로 연결
    { id: 'work24', label: '고용24', url: 'https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do', noQuery: true },
  ];
}
