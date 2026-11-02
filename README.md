# JOB FINDER

국내 신입 · 신입 지원 가능 채용공고를 자동으로 모아 한 화면에서 보는 웹사이트입니다.
API 키나 서버가 필요 없습니다. GitHub Actions가 3시간마다 공고를 수집하고 GitHub Pages에 다시 배포합니다.

## 공고 출처

| 사이트 | 방식 |
|---|---|
| 원티드 | 키 없이 공개 목록(JSON)을 자동 수집합니다. 사이트의 `robots.txt`가 허용할 때만 수집합니다 |
| 점핏 | 키 없이 공개 목록(JSON)을 자동 수집합니다. 사이트의 `robots.txt`가 허용할 때만 수집합니다 |
| 사람인 · 잡코리아 · 고용24 | 키 없이 쓸 수 있는 공개 API가 없습니다. 무리하게 크롤링하지 않고 검색 링크만 제공합니다 |

출처별 수집 상태와 실패 사유는 사이트 상단의 "상태 자세히"에서 볼 수 있습니다.

## 배포 (최초 1회)

1. 이 코드를 GitHub 공개 저장소의 `main` 브랜치에 올립니다.
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 지정합니다.
3. **Actions** 탭의 "채용공고 수집 및 배포" 워크플로가 끝나면 `https://<사용자명>.github.io/<저장소명>/` 주소로 누구나 접속할 수 있습니다.

배포한 뒤에는 3시간마다 자동으로 수집하고 다시 배포합니다. 바로 수집하고 싶으면 Actions 탭에서 **Run workflow**를 누르면 됩니다.

## 동작 방식

- **중복 제거**: 같은 기업에 같은 제목인 공고는 하나로 합칩니다. 다른 출처에 올라온 같은 공고는 "○○에서 보기" 버튼으로 함께 보여줍니다.
- **마감 공고**: 마감일이 지난 공고는 제외합니다. 마감 3일 이내 공고는 빨간색으로 강조합니다.
- **최초 수집일 유지**: 수집할 때마다 직전에 배포된 `data/jobs.json`을 읽어서, 공고를 처음 수집한 날짜를 그대로 유지합니다.
- **수집 실패 시**: 어느 출처가 일시적으로 실패하면 직전 수집분을 최대 24시간 동안 계속 보여줍니다.
- **즐겨찾기**: 방문자 각자의 브라우저(LocalStorage)에 저장됩니다.

## 로컬 실행

```bash
npm install
npm run collect   # public/data/jobs.json 생성
npm run dev
```

## 구조

```
scripts/collect.js         수집 → 정규화 → 중복 제거 → 마감 제외 → jobs.json 저장
scripts/sources/*.js       출처별 수집기 (wanted, jumpit)
scripts/util.js            HTTP, 날짜 처리, robots.txt 확인
shared/taxonomy.js         직무·지역 분류 기준, 외부 검색 링크
src/                       React 화면
.github/workflows/deploy.yml  3시간마다 수집 + Pages 배포
```
