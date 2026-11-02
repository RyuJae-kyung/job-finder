// 화면 미리보기용 예시 데이터. 실제 채용공고가 아니며 링크가 없다.
const plus = (days) => {
  const d = new Date(Date.now() + 9 * 3600 * 1000 + days * 86400000);
  return d.toISOString().slice(0, 10);
};

const base = { sample: true, sourceLabel: '예시', url: null, alsoOn: [], collectedAt: plus(0) };

export const SAMPLE_JOBS = [
  { ...base, id: 's1', company: '예시기업 A', title: '[예시] 클라우드 인프라 엔지니어 신입', location: '부산 해운대구', regions: ['busan'], categories: ['cloud', 'infra'], experience: '신입', newcomerOk: true, education: '대졸(4년) 이상', requirements: '정규직', salary: '회사내규에 따름', postedAt: plus(-1), deadline: plus(2), deadlineText: '' },
  { ...base, id: 's2', company: '예시기업 B', title: '[예시] 보안관제 요원 (신입/경력)', location: '대전 유성구', regions: ['daejeon'], categories: ['security'], experience: '신입·경력', newcomerOk: true, education: '초대졸 이상', requirements: '정규직', salary: '', postedAt: plus(-3), deadline: plus(14), deadlineText: '' },
  { ...base, id: 's3', company: '예시기업 C', title: '[예시] 스마트팩토리 MES 개발', location: '경남 창원시', regions: ['gyeongnam'], categories: ['smartfactory', 'software'], experience: '경력무관', newcomerOk: true, education: '학력무관', requirements: '', salary: '', postedAt: plus(-2), deadline: null, deadlineText: '상시채용' },
];
