# 삼봉 배드민턴 — 학급 배드민턴 관리 앱 (React / Vite)

**라이브:** [https://dmlwjd85.github.io/badminton-sim/](https://dmlwjd85.github.io/badminton-sim/)  
**저장소:** [github.com/dmlwjd85/badminton-sim](https://github.com/dmlwjd85/badminton-sim)

[삼봉 FC](https://github.com/dmlwjd85/sambong-FC)를 배드민턴으로 바꾼 버전입니다. 선생님(마스터)이 능력치를 관리하고, 출석한 선수로 팀을 나누고, **모의경기**로 실제 배드민턴 전술 흐름을 보여 줍니다.

- **포지션:** 전위(네트) · 후위(공격) · 올라운더 · 단식 전문
- **능력치 12개:** 풋워크·스매시·클리어·드롭·수비·체력·반응 속도·네트·위치 선정·서브·평정심·드라이브
- **모의경기:** 단체전(복식 → 단식 → 복식, 2승 먼저) / 복식 / 단식. 점수는 2027년 1월부터 BWF 표준이 되는 **15점 랠리포인트**(14-14부터 2점 차, 최대 21점) 또는 예전 21점
  - 서브는 서브하는 쪽 점수가 짝수면 오른쪽, 홀수면 왼쪽. 복식은 서브 팀이 이기면 같은 사람이 코트를 바꿔 다시 서브
  - 랠리는 서브·클리어·로브·스매시·드롭·헤어핀·네트 킬·드라이브·푸시·블록으로 이어지고, 샷마다 친 사람 vs 받는 사람 능력으로 판정
  - 복식 진형: 셔틀을 아래로 치면 **앞뒤(공격)**, 위로 올리면 **나란히(수비)**
  - 랠리 중 **📘 전술 노트**가 왜 그렇게 치는지 알려 주고, 경기 후 '오늘 나온 전술'을 정리
- **전술판:** 배드민턴 코트 위에서 선수·셔틀을 옮기고 화살표를 그려 장면을 저장·재생. 예시 작전(스매시 → 네트 킬) 내장
- 데이터는 풋살과 따로: Firestore `artifacts/sambong-badminton/...`

UI 마크업은 `src/app-shell.html`, 게임·Firebase 로직은 `src/game/` 아래 기능별 모듈에 있습니다. 모의경기는 `src/game/sim/rally.js`(랠리 계산), `court.js`(코트 애니메이션), `match.js`(진행·중계)입니다.

## 개발

```bash
npm install
npm run dev
npm test   # 도우미 함수 테스트
```

### 진짜 서버 없이 미리 보기

```bash
npm run dev:mock
```

진짜 Firebase 대신 메모리 가짜 서버(`dev/mock-firebase/`)로 띄워요. 선수 31명이 미리 들어 있고, 새로고침하면 처음으로 돌아가요. 감독으로 들어가려면 로그인 화면에서 **선생님 → PIN 1234**.

## 프로덕션 빌드

```bash
npm run build
```

결과물은 `dist/` 입니다.

## GitHub Pages 배포

### Jekyll vs Static HTML — 뭘 고르나요?

**아무것도 고르지 않아도 됩니다.** 화면에 그런 선택이 보인다면 예전 **“브랜치에서 배포 + Jekyll 테마”** 흐름일 수 있습니다. 이 Vite/React 앱은:

- **Settings → Pages → Build and deployment → Source** 에서 **`GitHub Actions`** 만 선택합니다.
- Jekyll 테마·Static HTML 마법사는 사용하지 않습니다. Actions가 `npm run build`로 만든 **정적 파일(`dist/`)** 을 그대로 올립니다.
- `public/.nojekyll` 이 빌드 결과에 포함되어, Pages가 Jekyll로 파일을 가공하는 일을 피합니다.

### 설정 순서

1. **Settings → Pages → Build and deployment**: **Source: GitHub Actions** (워크플로 “Deploy to GitHub Pages” 연결).
2. 저장소 루트에 `.github/workflows/deploy-pages.yml` 이 있어야 합니다.  
   - `badminton-sim`만 따로 저장소로 둘 때: 이 폴더 **내용이 저장소 루트**가 되도록 올리세요.
3. 워크플로는 `VITE_BASE=/<저장소이름>/` 로 빌드합니다 (`https://아이디.github.io/저장소이름/` 형태).

모노레포(상위 `Project` 전체가 git 루트)면 루트의 `.github/workflows/deploy-sambong-fc.yml` 을 사용하고, Pages 소스는 동일하게 **GitHub Actions** 입니다.

### 수동 배포

Actions 탭에서 **Deploy to GitHub Pages** 워크플로 → **Run workflow** (`workflow_dispatch`).

## 환경 변수

`.env.example` 을 복사해 `.env` 로 두고 필요 시 수정합니다. Firebase 키를 넣지 않으면 앱에 포함된 기본 프로젝트 설정이 사용됩니다.

프로덕션 빌드는 `.env.production` 의 `VITE_BASE=/badminton-sim/` 로 [배포 URL](https://dmlwjd85.github.io/badminton-sim/) 과 맞춥니다.

## Git / 소스 제어

**이 프로젝트의 Git 루트는 `c:\Project\badminton-sim` 입니다.** (상위 `Project`와 별도 저장소)

- `user.name`: dmlwjd85  
- `user.email`: dmlwjd85@gmail.com  
- `remote origin`: `https://github.com/dmlwjd85/badminton-sim.git`

Cursor/VS Code에서 폴더를 **`badminton-sim`만** 열면 소스 제어가 이 저장소만 표시됩니다.  
상위 `c:\Project`에도 `.git`이 있을 수 있으며, 그 경우 `Project\.gitignore`에 `badminton-sim/`가 있어 중복 추적을 막습니다.

### 다른 PC에서 클론만 하려면

```bash
git clone https://github.com/dmlwjd85/badminton-sim.git
cd badminton-sim
npm install
npm run dev
```
