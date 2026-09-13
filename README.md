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
- `insights/<slug>/`: 글 한 편. 교육자료 005의 `index.html`·`slides.html`은 articles 원고의 공개 HTML에서 `python3 .private/import_insight.py <materials 폴더> <slug> --no 005 --published YYYY-MM-DD [--modified YYYY-MM-DD]`로 만든다. 스크립트는 원본 본문·스타일·스크립트·이미지를 그대로 두고 사이트 헤더·푸터·정식 주소·OG·JSON-LD·파비콘을 넣는다. `--title`·`--dek`으로 승인된 사이트용 제목·도입 요약을 지정할 수 있다. 재가져오기 후 원문·함께 읽기 링크도 유지한다. 005의 승인 제목은 **ChatGPT로 하루 만에 홍보용 웹사이트 만들고 무료로 운영하기**, 요약은 **작은 가게의 첫 홈페이지를 직접 만들고, GitHub Pages 기본 주소로 별도 호스팅 비용 없이 운영하는 과정을 담았습니다.** 목록 카드 `cover.webp`와 공유 이미지 `og.jpg`는 기존 파일을 사용한다.
- 이전 게시글 001–004는 articles의 `posts/2026/<번호-주제>/article.md`를 원본으로 삼는다. 제목·본문 표현·게시일·강조를 보존한 정적 HTML이며, 각 글의 `images/*.png`는 원본 `images/publish/*.png`와 동일하다. 첫 이미지는 대표 이미지로 한 번만 표시하고 공유 이미지·목록 표지에도 사용한다. 원문은 네이버 링크로 표시하며, 글마다 정식 주소·BlogPosting 데이터·관련 글 링크가 있다. 읽기 스타일은 `insights/article.css`로 관리하며 005의 구성을 따른다: 전체 폭 1180px, 제목·요약·대표 이미지, 왼쪽 목차 180px와 본문 최대 720px. 좁은 화면에서는 목차를 본문 위로 배치한다. 글 001–005의 본문은 데스크톱 18px·모바일 17px, 제목은 최대 48px·모바일 32px로 맞춘다.

| 원고 | Insights 주소 |
|---|---|
| 001-ai-result-quality | `/insights/ai-result-quality/` |
| 002-senior-developer-value | `/insights/senior-developer-value/` |
| 003-automation-without-new-system | `/insights/automation-without-new-system/` |
| 004-when-spreadsheet-needs-system | `/insights/when-spreadsheet-needs-system/` |
| 005-ai-business-website | `/insights/ai-business-website/` |

글을 수정하거나 추가하면 목록·개별 글의 제목과 날짜·JSON-LD·`sitemap.xml`·`llms.txt`를 함께 맞춘다. 목록은 원래 게시일 기준 최신순이며, 001–004는 원래 블로그 게시일, 005는 기존 사이트 공개일(2026-09-10)을 유지한다. 사이트 수록·편집일은 `dateModified`로 구분한다. `/blog/`와 푸터의 Naver Blog는 네이버 채널 연결을 유지한다.

## Insights 검색 노출 관리

검색용 요약은 글의 실제 결론과 사례를 담고, 개별 글의 description·OG·Twitter·BlogPosting과 목록 카드·ItemList에 함께 반영한다. 001–004의 사이트용 요약은 원고 frontmatter와 다를 수 있으므로 재가져오기로 덮어쓰지 않는다. 005의 승인된 도입 요약과 상세 검색 설명은 각각 유지한다. 원문 본문·제목·게시일은 보존하며, 본문에서 이전 글을 언급하면 해당 Insights 정식 주소에 연결한다.

글에는 작성 주체인 알렉스소프트의 소개 링크와 게시일·수정일을 표시한다. BlogPosting의 author는 Organization으로 이름과 홈페이지를 명시하고, WebPage·BreadcrumbList·Insights 목록을 서로 연결한다. 실제 편집일만 `dateModified`와 사이트맵의 `lastmod`에 기록한다. 글을 읽는 데 JavaScript가 필요하지 않아야 한다.

005의 본문 이미지 3장은 `images/website-{owner,workflow,ownership}.webp`에 원본 바이트 그대로 보관한다. 대표 이미지는 우선 로딩하고 나머지는 지연 로딩하며, 실제 크기와 기존 대체 텍스트·AI 삽화 출처를 유지한다. BlogPosting의 image에는 실제 본문 대표 이미지 주소를, 사이트맵에는 본문에 표시하는 이미지 3개 주소를 사용한다. OG 공유 이미지는 기존 `og.jpg`를 유지한다. 교육자료를 재가져오면 이 외부 이미지 주소와 작성자·날짜·검색 미리보기 메타, 승인된 글꼴을 다시 확인한다.

`robots.txt`는 Googlebot·Bingbot·OAI-SearchBot·PerplexityBot을 포함한 검색 크롤러에 Insights 수집을 허용한다. 봇별 중복 규칙을 추가하거나 학습용 봇 정책을 임의로 바꾸지 않는다. `llms.txt`는 보조 안내이며 Google 검색·AI 검색 노출의 필수 파일이 아니다. 수집 허용·정상 HTTP 응답·구조화 데이터 유효성과 실제 색인·AI 인용 성과는 구분한다.

배포 후 Search Console에서 `/sitemap.xml` 처리 상태, 각 글의 URL 검사(색인 가능 여부·Google이 선택한 canonical), 검색 및 생성형 AI 실적을 확인한다. Bing Webmaster Tools에서도 사이트맵과 URL 검사를 확인한다. 계정에서 직접 확인하지 않은 색인·실적은 완료로 기록하지 않는다.

검토 근거(2026-09-13): [Google AI 검색 지침](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Article 구조화 데이터](https://developers.google.com/search/docs/appearance/structured-data/article), [이미지 SEO](https://developers.google.com/search/docs/appearance/google-images), [OpenAI 검색 크롤러](https://developers.openai.com/api/docs/bots).

대표 비주얼의 의미와 사용 규칙은 `BRAND-ASSETS.md`를 기준으로 합니다.

모든 모션은 `prefers-reduced-motion` 환경에서 정적인 대체 경험으로 전환됩니다.
