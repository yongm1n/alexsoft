import { icon } from "./icons.js";
import { esc, fmt, kindName } from "./format.js";
import { pill, notice } from "./components.js";

const cover = (post) =>
  post.attachments?.find((a) => a.type === "image")?.url ||
  (post.kind === "video" ? "./assets/garden.svg" : "./assets/flowers.svg");

function postCard(p) {
  return /* HTML */ `<a
    class="post-card"
    href="#/post/${encodeURIComponent(p.id)}"
    ><div class="post-art">
      <img
        src="${esc(cover(p))}"
        alt="${esc(p.title)} · 샘플 일러스트"
        loading="lazy"
      />${p.kind === "video"
        ? `<span class="play-badge">${icon("play", 19)} 영상</span>`
        : ""}<span class="art-label">샘플 이미지</span>
    </div>
    <div class="post-card-body">
      <div class="post-meta">
        <span>${esc(kindName[p.kind] || "소식")}</span
        ><time>${fmt(p.createdAt)}</time>
      </div>
      <h3 class="post-title">${esc(p.title)}</h3>
      <p>${esc(p.body)}</p>
      <span class="post-author"
        >${esc(p.authorName)} 선생님 ${icon("arrow", 15)}</span
      >
    </div></a
  >`;
}

function pinCard(p) {
  return /* HTML */ `<a
    class="pin-card"
    href="#/post/${encodeURIComponent(p.id)}"
    ><div class="pin-icon">${icon("pin", 22)}</div>
    <div>
      <div class="post-meta">
        ${pill("고정 안내", "green")}<span>${fmt(p.createdAt)}</span>
      </div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.body)}</p>
      ${p.attachments?.length
        ? `<small>${icon("file", 14)} 첨부 ${p.attachments.length}개</small>`
        : ""}
    </div>
    ${icon("arrow", 19)}</a
  >`;
}

function blogSection(blog) {
  return /* HTML */ `<section class="blog-section">
    <div class="section-heading">
      <div>
        <p class="eyebrow">FROM OUR CENTER</p>
        <h2>센터의 이야기</h2>
      </div>
      ${pill("모든 가족에게 전하는 소식")}
    </div>
    ${blog.status === "error" || blog.status === "cached"
      ? notice(
          "새 소식을 확인하지 못해 마지막으로 불러온 샘플 글을 보여드려요.",
          "warning",
        )
      : ""}
    <div class="grid two">
      ${blog.items
        .slice(0, 2)
        .map(
          (p, i) =>
            /* HTML */ `<button
              type="button"
              class="blog-card"
              data-action="blog-article"
              data-index="${i}"
            >
              <img
                src="./assets/${p.art === "flowers"
                  ? "flowers"
                  : p.art === "garden"
                    ? "garden"
                    : "autumn"}.svg"
                alt="센터 이야기 샘플 일러스트"
                loading="lazy"
              /><span
                ><small>센터 블로그 · 샘플 글</small
                ><strong>${esc(p.title)}</strong
                ><time>${fmt(p.date)}</time></span
              >${icon("arrow", 18)}
            </button>`,
        )
        .join("")}
    </div>
    <p class="small muted">
      블로그 연동 체험용 샘플입니다. 실제 최신 글을 수집하지 않습니다.
    </p>
  </section>`;
}

export { postCard, pinCard, blogSection };
