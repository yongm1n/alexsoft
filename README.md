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

- `Cascade`(`/work/#cascade`): 공개 저장소 `github.com/alexsoft-hq/Cascade`의 README·CHANGELOG. 스크린샷은 저장소의 `docs/assets/screens/*.png`를 `assets/work/cascade-*.webp`로 변환한 것
- `Mokpyo`(`/work/#mokpyo`, 구 Goalboard): 로컬 프로젝트 README(다섯 뷰·자동화·역할·배포)와 데모 워크스페이스(`prisma/seed-demo.ts`, 가상 팀·가상 목표). 스크린샷은 `assets/work/mokpyo-*.webp` — 로컬 데모를 1440×900(2x)·390px로 캡처
- `The Grace`: 실제 공개 사이트 및 프로젝트 README의 시네마틱 스크롤/에디션 전환 구조
- `CareFlow`: SQLite에서 확인한 82개 도메인 테이블과 장기요양 화면 분석 기록

## 출시 전 확인

- 문의 메일 `contact@alexsoft.co.kr` 연결 완료
- GitHub Pages 도메인/DNS 연결
- 프로젝트별 공개 링크 추가 여부

## 이미지

- `assets/alexsoft-hero.webp`: ALEXSOFT 전용 AI 생성 비주얼
- `assets/brand/alexsoft-signature-hero.webp`: ALEXSOFT의 공식 대표 비주얼 웹 최적화본
- 대표 비주얼 고해상도 원본: 저장소 외부(운영 문서 폴더 `40-브랜드-원본/`)에 보관, 저장소 미추적
- `assets/logo-mark.svg`: AI 콘셉트를 16px까지 선명하게 작동하도록 재구성한 벡터 로고
- `assets/grace-site.webp`: 더 그레이스 공개 사이트의 실제 화면
- `assets/work/cascade-*.webp`, `assets/work/mokpyo-*.webp`: 자체 제품 화면(`/work/`와 홈 `#products`에서 사용)
- `insights/index.html`: 글 목록. 새 글은 `article.post` 블록을 복사해 목록 맨 앞에 넣고(최신이 위), JSON-LD `ItemList`·`sitemap.xml`·`llms.txt`를 함께 갱신한다. 홈 `#insights`는 글과 무관한 고정 소개라 글이 늘어도 고치지 않는다.
- `insights/<slug>/`: 글 한 편. `index.html`(글)·`slides.html`(있으면)은 articles 원고의 공개 HTML에서 `python3 .private/import_insight.py <materials 폴더> <slug> --no 005 --published YYYY-MM-DD [--modified YYYY-MM-DD]`로 만든다. 스크립트는 원본 본문·스타일·스크립트·이미지를 그대로 두고 사이트 헤더·푸터·정식 주소·OG·JSON-LD·파비콘만 넣는다. 원본이 바뀌면 같은 명령을 다시 실행한다. 목록 카드 `cover.webp`와 공유 이미지 `og.jpg`(1200×630)는 같은 폴더에 직접 둔다. 첫 글: `insights/ai-business-website/`(articles `posts/2026/005-ai-business-website/materials/`).

대표 비주얼의 의미와 사용 규칙은 `BRAND-ASSETS.md`를 기준으로 합니다.

모든 모션은 `prefers-reduced-motion` 환경에서 정적인 대체 경험으로 전환됩니다.
