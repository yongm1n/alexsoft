import { esc, fmt, fullDate, kindName } from "./format.js";
import { icon } from "./icons.js";
import { btn, link, pill, notice, avatar, empty, heading } from "./components.js";
import { postCard, pinCard, blogSection } from "./cards.js";

function renderFamilyHome({ resident: r, pinned, recent, blog }) {
  return /* HTML */ `<section class="hero family-welcome" aria-label="우리 어르신 공간">
      <div class="family-welcome-copy">
        <div class="person-cell">
          ${avatar(r)}
          <div>
            <p class="small muted">반갑습니다, 가족 여러분</p>
            <h1>${esc(r.name)} 어르신의 하루</h1>
            <p class="family-account">가족 공용 공간 · ${esc(r.familyAccountId)}</p>
          </div>
        </div>
      </div>
      <img class="family-welcome-art" src="./assets/hero.svg" alt="" />
    </section>
    ${pinned.length ? `<section class="family-pinned"><div class="section-heading"><h2>먼저 확인해주세요</h2><span class="small muted">중요메모 · 건강자료</span></div>${pinned.map(pinCard).join("")}</section>` : ""}
    <section class="family-recent">
      <div class="section-heading">
        <h2>최근 사진과 영상</h2>
        <a href="#/feed" class="text-link">전체 보기 ${icon("arrow", 15)}</a>
      </div>
      ${recent.length ? `<div class="grid three">${recent.map(postCard).join("")}</div>` : empty("아직 전해드린 소식이 없어요", "센터에서 소식을 전하면 이곳에 차곡차곡 모입니다.")}
      <p class="small muted">
        가장 최근의 사진·영상 소식 ${recent.length}건을 보여드려요.
      </p>
    </section>
    ${notice("센터에서 전할 소식이 있을 때 이곳에 올려드려요. 급한 연락이나 개별 상담은 센터에 직접 연락해주세요.")}${blogSection(blog)}`;
}

function renderFeed({ resident: r, canPost, filter, query, results }) {
  return /* HTML */ `${heading(
      `${esc(r.name)} 어르신의 소식`,
      "사진과 영상, 중요메모를 한곳에서 확인하세요.",
      canPost ? link(icon("plus", 18) + " 소식 작성", `/compose/${r.id}`, "primary") : "",
    )}
    <div class="toolbar">
      <div class="chips" role="group" aria-label="소식 종류">
        ${[
          ["all", "전체"],
          ["photo", "사진"],
          ["video", "영상"],
          ["memo", "중요메모"],
          ["health", "건강자료"],
        ]
          .map(
            ([id, t]) =>
              `<button class="chip ${filter === id ? "active" : ""}" data-action="filter" data-filter="${id}" aria-pressed="${filter === id}">${t}</button>`,
          )
          .join("")}
      </div>
      <label class="search-field"
        >${icon("search", 18)}<input
          id="post-search"
          type="search"
          value="${esc(query)}"
          placeholder="소식 제목 검색"
          aria-label="소식 제목 검색"
      /></label>
    </div>
    <p id="feed-count" class="filter-count"></p>
    <div id="feed-results">${results}</div>`;
}

function renderFeedResults(posts, query) {
  return posts.length
    ? /* HTML */ `<div class="grid three">
        ${posts
          .map((p) =>
            ["memo", "health"].includes(p.kind)
              ? /* HTML */ `<a
                  class="post-card text-post"
                  href="#/post/${encodeURIComponent(p.id)}"
                  ><div class="text-post-icon">
                    ${icon(p.pinned ? "pin" : "file", 27)}${pill(
                      kindName[p.kind],
                      "green",
                    )}
                  </div>
                  <div class="post-card-body">
                    <time class="small muted">${fmt(p.createdAt)}</time>
                    <h3>${esc(p.title)}</h3>
                    <p>${esc(p.body)}</p>
                    <span class="post-author"
                      >${
                        p.attachments.length
                          ? `첨부자료 ${p.attachments.length}개`
                          : "메모 읽기"
                      }
                      ${icon("arrow", 15)}</span
                    >
                  </div></a
                >`
              : postCard(p),
          )
          .join("")}
      </div>`
    : empty(
        query ? "검색 결과가 없어요" : "아직 이 분류의 소식이 없어요",
        query
          ? "다른 검색어를 입력하거나 전체 소식을 확인해주세요."
          : "새 소식이 게시되면 이곳에서 확인할 수 있어요.",
        btn("전체 소식 보기", "clear-filter"),
      );
}

function renderPostDetail({ post: p, resident: r, role, canPost, canDelete }) {
  return /* HTML */ `<a
      class="back-link"
      href="#${role === "staff" ? `/resident/${r.id}` : "/feed"}"
      >${icon("back", 17)} 소식 목록</a
    >
    <div class="detail-layout">
      <article class="detail-content card">
        <div class="article-heading">
          <div class="post-meta">
            ${pill(kindName[p.kind], "green")}${
              p.pinned ? pill("상단 고정", "amber") : ""
            }<time>${fmt(p.createdAt)}</time>
          </div>
          <h1>${esc(p.title)}</h1>
          <div class="person-cell">
            ${avatar(r)}
            <div>
              <strong>${esc(r.name)} 어르신</strong
              ><small>${esc(r.familyAccountId)}</small
              ><small>${esc(p.authorName)} 선생님이 전해요</small>
            </div>
          </div>
        </div>
        ${p.attachments
          .filter((a) => a.type === "image")
          .map(
            (a, i) =>
              /* HTML */ `<button
                type="button"
                class="article-cover"
                data-action="media"
                data-id="${esc(a.id)}"
              >
                <img src="${esc(a.url)}" alt="${esc(a.name)} · 샘플 이미지" /><span
                  >${icon("image", 16)} 크게 보기 ${i + 1}</span
                >
              </button>`,
          )
          .join("")}
        <div class="article-body">${esc(p.body).replace(/\n/g, "<br>")}</div>
        ${p.attachments
          .filter((a) => a.type === "video")
          .map(
            (a) =>
              /* HTML */ `<div class="inline-video">
                <video
                  controls
                  playsinline
                  preload="metadata"
                  poster="./assets/garden.svg"
                  src="${esc(a.url)}"
                  aria-label="샘플 활동 영상"
                ></video
                ><small>직접 제작한 샘플 영상 · 실제 어르신 영상이 아닙니다.</small>
              </div>`,
          )
          .join("")}
        <div class="article-footer">
          <time>게시 ${fullDate(p.createdAt)}</time>${
            p.updatedAt !== p.createdAt
              ? `<time>수정 ${fullDate(p.updatedAt)}</time>`
              : ""
          }
        </div>
      </article>
      <aside class="detail-aside">
        <section class="card">
          <h2>첨부자료 <span class="muted">${p.attachments.length}</span></h2>
          ${
            p.attachments.length
              ? p.attachments
                  .map(
                    (a) =>
                      /* HTML */ `<div class="attachment-row">
                        <span class="file-icon"
                          >${icon(
                            a.type === "pdf"
                              ? "file"
                              : a.type === "video"
                                ? "play"
                                : "image",
                          )}</span
                        ><span
                          ><button
                            type="button"
                            class="attachment-open"
                            data-action="media"
                            data-id="${esc(a.id)}"
                          >
                            ${esc(a.name)}</button
                          ><small>${a.type.toUpperCase()} · 샘플</small></span
                        >${btn(
                          icon("download", 18),
                          "download",
                          "icon-button",
                          `data-id="${esc(a.id)}" aria-label="${esc(a.name)} 다운로드"`,
                        )}
                      </div>`,
                  )
                  .join("")
              : '<p class="muted">첨부자료가 없는 메모입니다.</p>'
          }
          <p class="small muted">자료는 이 어르신의 가족 공간에 공유됩니다.</p>
        </section>
        ${
          canPost || canDelete
            ? /* HTML */ `<section class="card">
                <h2>소식 관리</h2>
                <div class="stack-actions">
                  ${
                    canPost
                      ? btn(icon("edit", 17) + " 내용 수정", "edit-post") +
                        btn(
                          icon("pin", 17) + (p.pinned ? " 고정 해제" : " 상단에 고정"),
                          "pin-post",
                        )
                      : ""
                  }${
                    canDelete
                      ? btn(icon("trash", 17) + " 소식 철회", "delete-post", "danger")
                      : ""
                  }
                </div>
              </section>`
            : ""
        }
      </aside>
    </div>`;
}

export { renderFamilyHome, renderFeed, renderFeedResults, renderPostDetail };
