# PRD: 세계 날씨 (app_weather)

## 1. 개요

| 항목 | 내용 |
|---|---|
| 제품명 | 세계 날씨 |
| 목적 | 세계지도에서 대륙을 고르고 도시를 클릭하면, 그 도시의 현재 날씨를 카드형 대시보드로 보여준다 |
| 대상 | 해외 도시 날씨를 빠르게 확인하고 싶은 일반 사용자 (PC / 모바일) |
| 기술 스택 | HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3, Leaflet 1.9, Font Awesome 6, Pretendard 폰트 — 모두 CDN |
| 데이터 | OpenWeather API (무료 플랜) — Current Weather, 5 Day / 3 Hour Forecast |
| 범위 제외 | 도시 검색, 주간 예보 화면, 즐겨찾기, 서버/DB |

## 2. 파일 구조

빌드 도구·npm 패키지는 사용하지 않는다. HTML / CSS / JS 분리.

```
weather/
├── index.html
├── .gitignore              # js/config.js 제외
├── css/
│   └── style.css
└── js/
    ├── config.example.js   # API 키 템플릿 (커밋 O)
    ├── config.js           # 실제 API 키 (커밋 X, 사용자가 복사해서 생성)
    ├── cities.js           # 대륙·도시 데이터
    └── app.js              # 지도, API 호출, 렌더링
```

- 스크립트 로드 순서: `leaflet.js` → `config.js` → `cities.js` → `app.js` (모두 `defer`)
- CDN
  - Bootstrap CSS `https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css`
  - Leaflet CSS/JS `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`, `.../leaflet.js`
  - Font Awesome `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css`
  - Pretendard `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`
- 지도 타일: OpenStreetMap `https://tile.openstreetmap.org/{z}/{x}/{y}.png` (키 불필요, 저작권 표시 필수). CSS `filter`로 채도를 낮춰 따뜻한 톤으로 보정
  - CARTO 타일은 API 키를 요구하게 바뀌어 사용하지 않음

## 3. API 키 관리

```js
// js/config.example.js → js/config.js 로 복사 후 키 입력
window.WEATHER_CONFIG = {
  API_KEY: 'YOUR_OPENWEATHER_API_KEY',
};
```

- `weather/.gitignore` 에 `js/config.js` 추가 → 키가 GitHub에 올라가지 않음
- 프론트엔드 특성상 키는 브라우저에서 보인다 (학습용 무료 키 전제)
- `config.js` 가 없거나 키가 기본값이면 대시보드 영역에 설정 안내를 표시한다

## 4. 화면 구성

최대 폭 1040px, 가운데 정렬. 배경은 흰색 계열(`#faf8f6`), 포인트는 따뜻한 그라데이션.

```
┌─────────────────────────────────────────────┐
│ [☁] 세계 날씨                                 │ ① 헤더
│     대륙을 고르고 지도에서 도시를 눌러보세요     │
├─────────────────────────────────────────────┤
│ (전체)(아시아)(유럽)(북미)(남미)(아프리카)(오세아니아) │ ② 대륙 칩
├─────────────────────────────────────────────┤
│                                             │
│         Leaflet 세계지도 + 도시 마커           │ ③ 지도
│                                             │
├─────────────────────────────────────────────┤
│ [날씨아이콘] 서울                     24°     │ ④ 날씨 요약
│            대한민국 · 맑음      현지 14:30     │
├────────┬────────┬────────┬────────┬─────────┤
│현재 온도│최고/최저│ 풍속   │ 풍향   │ 습도     │ ⑤ 카드 대시보드
│ 24°C   │ 27°/18°│ 3.2m/s │ 남서풍 │ 62%      │
└────────┴────────┴────────┴────────┴─────────┘
```

### ① 헤더
- 로고 박스 50×50, 오렌지→코랄→플럼 그라데이션, 아이콘 `fa-cloud-sun`
- 제목 "세계 날씨" (24px, 800), 부제 (14px, 보조색)

### ② 대륙 칩
- 7개: 전체 / 아시아 / 유럽 / 북미 / 남미 / 아프리카 / 오세아니아 (각 `fa-earth-*` 아이콘)
- 기본: 흰 배경 + 얇은 테두리, 선택: 오렌지→코랄 그라데이션 + 흰 글자
- 모바일에서 넘치면 줄바꿈

### ③ 지도
- 흰 카드 안 Leaflet 지도, 높이 420px (모바일 320px), 모서리 16px
- 초기 뷰: 중심 `[25, 10]`, 줌 2. 최소 줌 2, 최대 줌 8
- 마우스 휠 줌 비활성 (페이지 스크롤 방해 방지), 줌 버튼·드래그·핀치는 허용
- 마커: `L.divIcon` 원형 점 (플럼 `#8c4f7d`, 흰 테두리). 호버 시 도시명 툴팁
- 선택된 마커: 오렌지 `#ff7a59` + 퍼지는 펄스 애니메이션

### ④ 날씨 요약
- OpenWeather 아이콘 이미지 `https://openweathermap.org/img/wn/{icon}@2x.png`
- 도시명(26px, 800), "국가 · 날씨 설명"
- 우측 큰 현재 온도(52px, 오렌지→플럼 그라데이션 텍스트), 아래 "현지 HH:mm"

### ⑤ 카드 대시보드
`grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`, gap 14px. 각 카드: 그라데이션 아이콘 박스(38×38) + 라벨 + 값 + 보조 정보.

| 카드 | 아이콘 / 그라데이션 | 값 | 보조 |
|---|---|---|---|
| 현재 온도 | `fa-temperature-half` / 오렌지 | `24°C` | 체감 `23°C` |
| 최고 / 최저 | `fa-arrows-up-down` / 로즈 | `27° / 18°` (최고 주황, 최저 파랑) | 파랑→주황 온도 막대, "향후 24시간 기준" |
| 풍속 | `fa-wind` / 민트 | `3.2 m/s` | 바람 단계 (아래 표) |
| 풍향 | `fa-compass` / 라벤더 | `남서풍` | `225°` + 회전하는 나침반 화살표 |
| 습도 | `fa-droplet` / 하늘 | `62%` | 그라데이션 진행 막대 |

- 현재 온도 카드만 연한 따뜻한 그라데이션 배경으로 강조
- 카드 호버 시 살짝 떠오름 (`translateY(-3px)`)

## 5. 기능 요구사항

### F1. 대륙 선택
| ID | 요구사항 |
|---|---|
| F1-1 | 칩 클릭 시 해당 대륙 선택 상태로 변경 |
| F1-2 | 지도는 그 대륙 도시들을 모두 포함하도록 `flyToBounds` (padding 40px). "전체"는 초기 뷰로 복귀 |
| F1-3 | 다른 대륙 마커는 흐리게(opacity 0.3) 표시, 클릭은 가능 |
| F1-4 | 현재 선택 도시가 다른 대륙이면 새 대륙의 첫 번째 도시를 자동 선택해 날씨 조회 |

### F2. 도시 선택
| ID | 요구사항 |
|---|---|
| F2-1 | 마커 클릭 시 해당 도시 선택 + 날씨 조회 |
| F2-2 | 다른 대륙 마커를 클릭하면 대륙 칩도 그 대륙으로 바뀐다 (지도 이동은 하지 않음) |
| F2-3 | 첫 진입 시 "서울" 자동 선택 |

### F3. 날씨 조회
| ID | 요구사항 |
|---|---|
| F3-1 | 현재 날씨: `GET https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={KEY}&units=metric&lang=kr` |
| F3-2 | 예보: `GET https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={KEY}&units=metric&cnt=8` |
| F3-3 | 두 요청은 `Promise.all` 로 병렬 호출 |
| F3-4 | 최고/최저 = 현재 온도 + 예보 8개(24시간) `main.temp_max` / `main.temp_min` 중 최대/최소. 예보 실패 시 현재 날씨의 `temp_max`/`temp_min` 사용 |
| F3-5 | 도시별 결과를 10분간 메모리 캐시 (같은 도시 재클릭 시 API 호출 안 함) |
| F3-6 | 빠르게 다른 도시를 연달아 누르면 마지막에 누른 도시 결과만 반영 (요청 순번 비교) |

응답 필드 매핑:

| 화면 | 필드 |
|---|---|
| 현재 온도 / 체감 | `main.temp` / `main.feels_like` (반올림 정수) |
| 습도 | `main.humidity` |
| 풍속 | `wind.speed` (m/s, 소수 1자리) |
| 풍향 | `wind.deg` |
| 날씨 설명 / 아이콘 | `weather[0].description` / `weather[0].icon` |
| 현지 시각 | `dt` + `timezone`(초) → UTC 기준 계산해 `HH:mm` |

### F4. 표시 규칙
- 풍향 16방위 한글: 북, 북북동, 북동, 동북동, 동, 동남동, 남동, 남남동, 남, 남남서, 남서, 서남서, 서, 서북서, 북서, 북북서 + "풍"
  - 인덱스 = `Math.round(deg / 22.5) % 16`
- 나침반 화살표는 바람이 **불어가는** 방향을 가리킨다 (`deg + 180` 회전)
- 바람 단계

| 풍속 (m/s) | 표시 |
|---|---|
| < 0.5 | 고요 |
| < 3.4 | 약한 바람 |
| < 8.0 | 약간 강한 바람 |
| < 13.9 | 강한 바람 |
| ≥ 13.9 | 매우 강한 바람 |

### F5. 상태 처리
| 상태 | 표시 |
|---|---|
| 로딩 | 요약·카드 값 자리에 스켈레톤(반짝이는 회색 막대), 요약 우측에 스피너 |
| API 키 없음 | 대시보드 대신 안내 카드: "`js/config.example.js`를 `js/config.js`로 복사하고 API 키를 넣어주세요" |
| 401 | "API 키가 올바르지 않아요. 새로 발급한 키는 활성화까지 최대 2시간 걸릴 수 있어요." |
| 429 | "요청이 너무 많아요. 잠시 후 다시 시도해주세요." |
| 네트워크/기타 | "날씨를 불러오지 못했어요." + "다시 시도" 버튼 |

## 6. 도시 데이터 (js/cities.js)

```js
window.CONTINENTS = [
  { id: 'all', name: '전체', icon: 'fa-earth-americas' },
  { id: 'asia', name: '아시아', icon: 'fa-earth-asia' },
  ...
];
window.CITIES = [
  { id: 'seoul', name: '서울', country: '대한민국', continent: 'asia', lat: 37.5665, lon: 126.978 },
  ...
];
```

| 대륙 | 도시 |
|---|---|
| 아시아 | 서울, 도쿄, 베이징, 방콕, 싱가포르, 두바이 |
| 유럽 | 런던, 파리, 베를린, 로마, 마드리드 |
| 북미 | 뉴욕, 로스앤젤레스, 토론토, 멕시코시티 |
| 남미 | 상파울루, 부에노스아이레스, 리마 |
| 아프리카 | 카이로, 나이로비, 케이프타운 |
| 오세아니아 | 시드니, 멜버른, 오클랜드 |

## 7. 디자인 가이드

| 토큰 | 값 |
|---|---|
| 페이지 배경 | `#faf8f6` |
| 카드 배경 / 테두리 | `#ffffff` / `#f0e9e4` |
| 카드 그림자 | `0 8px 24px rgba(140, 79, 125, 0.08)` |
| 모서리 | 카드 20px, 지도 16px, 칩 999px |
| 본문 / 보조 / 흐림 | `#3b2433` / `#7a5a66` / `#a88a92` |
| 포인트 그라데이션 | `#ffb36b → #ff7a59` (칩·온도), 로고 `#ffb36b → #ff7a59 → #8c4f7d` |
| 카드 아이콘 그라데이션 | 온도 `#ffb36b→#ff7a59`, 최고최저 `#ff9a8b→#c86b98`, 풍속 `#7fd1c7→#4aa3a0`, 풍향 `#a18cd1→#7b6ccf`, 습도 `#8ec5fc→#5b8def` |
| 폰트 | Pretendard, 숫자 굵기 800 |

- `prefers-reduced-motion: reduce` 이면 펄스·호버·나침반 회전 애니메이션 제거
- 576px 미만: 요약의 큰 온도를 아래 줄로, 지도 높이 320px

## 8. 접근성
- 대륙 칩 `<button>` + `aria-pressed`
- 마커는 Leaflet `keyboard: true` 기본값 유지, `title`/`alt` 에 도시명
- 대시보드 영역 `aria-live="polite"`, 에러는 `role="alert"`
- 날씨 아이콘 `alt` = 날씨 설명

## 9. 수용 기준
- [ ] 첫 진입 시 서울 날씨가 표시된다
- [ ] "유럽" 클릭 → 지도가 유럽으로 이동, 다른 대륙 마커 흐림, 런던 날씨 자동 표시
- [ ] 파리 마커 클릭 → 파리 날씨로 갱신, 파리 마커 오렌지 펄스
- [ ] 유럽 선택 상태에서 시드니 클릭 → 칩이 오세아니아로 바뀌고 시드니 날씨 표시
- [ ] 카드 5개(현재 온도·최고/최저·풍속·풍향·습도) 값이 API 응답과 일치
- [ ] 풍향 225° → "남서풍", 화살표는 북동쪽을 가리킴
- [ ] 같은 도시를 10분 안에 다시 누르면 네트워크 요청이 없다
- [ ] config.js 없음 → 설정 안내 카드, 잘못된 키 → 401 안내
- [ ] 모바일(375px)에서 가로 스크롤 없음, 카드가 1~2열로 재배치

## 10. 실행 방법
1. https://openweathermap.org 가입 → API keys 에서 키 발급
2. `weather/js/config.example.js` 를 `weather/js/config.js` 로 복사 후 키 입력
3. 로컬 서버로 열기: `python -m http.server 5520 --directory weather` → `http://localhost:5520`
