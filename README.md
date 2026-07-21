# ALEXSOFT — Software Artist Studio

`alexsoft.co.kr`용 GitHub Pages 정적 브랜드 사이트입니다. 별도 빌드 과정이나 런타임 의존성 없이 `index.html`, `styles.css`, `app.js`만으로 동작합니다.

## 로컬 확인

```bash
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080`을 엽니다. `file://`로 직접 열어도 대부분 동작하지만, 배포와 같은 조건은 HTTP 서버에서 확인하는 편이 안전합니다.

## GitHub Pages 배포

1. 이 디렉터리를 GitHub 저장소의 기본 브랜치에 푸시합니다.
2. Repository Settings → Pages에서 `Deploy from a branch`와 루트(`/`)를 선택합니다.
3. 루트의 `CNAME`이 `alexsoft.co.kr`을 유지하는지 확인합니다.
4. DNS에서 GitHub Pages용 A/AAAA/CNAME 레코드를 연결한 뒤 Enforce HTTPS를 켭니다.

## 콘텐츠 근거

- `Cascade`: 로컬 프로젝트 README와 정적분석 엔진 Spec의 commit→screen→API→method→SQL→table 계보 설계
- `Goalboard`: SQLite의 Goal/SubGoal/Category/Note 구조와 현재 Prisma의 조직·프로젝트·다중 뷰·자동화 모델
- `The Grace`: 실제 공개 사이트 및 프로젝트 README의 시네마틱 스크롤/에디션 전환 구조
- `CareFlow`: SQLite에서 확인한 82개 도메인 테이블과 장기요양 화면 분석 기록

## 출시 전 확인

- 문의 메일 `hello@alexsoft.co.kr`의 실제 수신 설정
- GitHub Pages 도메인/DNS 연결
- 프로젝트별 공개 링크 추가 여부

## 이미지

- `assets/alexsoft-hero.webp`: ALEXSOFT 전용 AI 생성 비주얼
- `assets/brand/alexsoft-signature-hero.webp`: ALEXSOFT의 공식 대표 비주얼 웹 최적화본
- `assets/brand/alexsoft-signature-hero-master.png`: 공식 대표 비주얼 고해상도 보존 원본
- `assets/logo-mark.svg`: AI 콘셉트를 16px까지 선명하게 작동하도록 재구성한 벡터 로고
- `assets/grace-site.webp`: 더 그레이스 공개 사이트의 실제 화면

대표 비주얼의 의미와 사용 규칙은 `BRAND-ASSETS.md`를 기준으로 합니다.

모든 모션은 `prefers-reduced-motion` 환경에서 정적인 대체 경험으로 전환됩니다.
