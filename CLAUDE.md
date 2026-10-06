# React 프로젝트 가이드

리액트 프로젝트를 만들 때 이 문서의 기준을 따른다.

## 1. 프로젝트 구성

- **빌드 도구**: Vite
- **프레임워크**: React + JavaScript (TypeScript 사용 안 함)
- **CSS**: Tailwind CSS
- **Lint**: oxlint

### 프로젝트 생성

```bash
npm create vite@latest <project-name> -- --template react
```

### Tailwind CSS 적용

```bash
npm install tailwindcss @tailwindcss/vite
```

`src/index.css`

```css
@import "tailwindcss";
```

## 2. 개발 서버 설정

- 포트: **3000**
- 서버 시작 시 **브라우저 자동 열기**

`vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
  },
})
```

## 3. Lint 설정 (oxlint)

```bash
npm install -D oxlint
```

- 사용하지 않는 변수(`no-unused-vars`)는 **에러 처리하지 않는다.**

`.oxlintrc.json`

```json
{
  "rules": {
    "no-unused-vars": "off"
  }
}
```

`package.json` scripts

```json
"lint": "oxlint"
```

## 4. 폴더 구조

| 구분 | 위치 |
| --- | --- |
| View (화면) | `src/pages/` |
| Component | `src/comp/` |
| Service 로직 | `src/service/` |
| 유틸 | `src/utils/` |
| 스토어 | `src/stores/` |

```
src/
├── pages/     # View
├── comp/      # Component
├── service/   # Service 로직
├── utils/     # 유틸
└── stores/    # 스토어
```

## 5. 작업 규칙

1. 가이드에 없는 내용은 스스로 판단하지 않는다.
2. 기존 파일 또는 코드를 멋대로 수정하거나 지우지 않는다.
3. 추가적인 요건이나 생각은 반드시 확인을 받고 진행한다.
4. 생각이 필요하거나 절차가 필요한 경우 반드시 확인을 받고 진행한다.
5. 기능 구현 시 필요한 라이브러리는 스스로 설치해도 된다.
