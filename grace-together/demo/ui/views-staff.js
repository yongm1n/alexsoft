import { POST_LIMITS } from "../domain/content-policy.js";
import { esc, fmt, kindName } from "./format.js";
import { icon } from "./icons.js";
import { btn, link, pill, notice, avatar, empty, heading, field } from "./components.js";

function renderStaffHome({ residents, savedDraft: d, canPost }) {
  return /* HTML */ `${heading("담당 어르신", "전하고 싶은 소식이 있을 때 가족에게 남겨주세요.", canPost ? link(icon("plus", 18) + " 새 소식 작성", "/compose", "primary") : "")}
    ${d ? `<div class="notice info draft-resume">${icon("edit")}<span><strong>작성 중인 소식</strong> ${esc(d.title || "제목 없는 소식")}</span>${btn("이어서 작성", "resume-draft", "secondary")}</div>` : ""}
    <section class="staff-residents" data-list-scope="staff-residents">
      <div class="resident-search-controls">
        <label class="search-field"
          >${icon("search", 18)}<input
            type="search"
            data-list-search
            placeholder="어르신 이름 · 가족 계정 검색"
            aria-label="담당 어르신 이름 또는 가족 계정 검색"
        /></label>
        <output class="filter-count" data-list-count aria-live="polite"
          >담당 어르신 ${residents.length}명</output
        >
      </div>
      ${
        residents.length
          ? `<div class="grid two resident-list">${residents
              .map(
                (
                  r,
                ) => `<article class="resident-card card" data-list-row data-search="${esc((r.name + " " + r.familyAccountId).toLowerCase())}">
        <div class="person-cell">${avatar(r)}<div><h2>${esc(r.name)} 어르신</h2><small>${esc(r.familyAccountId)}</small></div>${pill("이용 중", "green")}</div>
        <div class="resident-facts"><span>마지막 소식 <strong>${fmt(r.lastPostAt)}</strong></span><span>소식 ${r.postCount}건</span></div>
        <div class="form-actions">${link("소식 보기", `/resident/${r.id}`)}${canPost ? link(icon("plus", 17) + " 작성하기", `/compose/${r.id}`, "primary") : ""}</div>
      </article>`,
              )
              .join(
                "",
              )}</div><p class="empty-state" data-list-empty hidden>검색 결과가 없어요. 이름이나 가족 계정을 다시 확인해주세요.</p>`
          : empty(
              "아직 담당 어르신이 없어요",
              "센터 관리자가 담당자를 배정하면 이곳에 표시됩니다.",
            )
      }
    </section>`;
}

function renderCompose({ residents, draft }) {
  return /* HTML */ `<a class="back-link workflow-back" href="#/residents"
      >${icon("back", 17)} 담당 어르신으로</a
    >${heading(draft.editId ? "소식 수정" : "가족에게 소식 전하기", "전달할 어르신을 확인하고 자료를 골라주세요.")}
    <div class="stepper">
      <span class="step active"><b>1</b> 내용 작성</span
      ><span class="step"><b>2</b> 대상·자료 확인</span
      ><span class="step"><b>3</b> 가족에게 공유</span>
    </div>
    <form class="form compose-form" data-form="compose">
      <div class="grid compose-columns">
        <section class="card compose-metadata" aria-label="대상과 소식 제목">
          <label class="field"
            ><span>전달할 어르신 <em>필수</em></span
            ><select name="residentId" ${draft.editId ? "disabled" : ""}>
              ${residents.map((r) => `<option value="${r.id}" ${draft.residentId === r.id ? "selected" : ""}>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</option>`).join("")}</select
            ><small class="compose-recipient-account"
              >가족 공용 계정 ·
              ${esc(residents.find((r) => r.id === draft.residentId)?.familyAccountId || "")}</small
            ></label
          >
          <div class="compose-target-row">
            <label class="field"
              ><span>소식 종류</span
              ><select name="kind">
                ${Object.entries(kindName)
                  .map(
                    ([v, n]) =>
                      `<option value="${v}" ${draft.kind === v ? "selected" : ""}>${n}</option>`,
                  )
                  .join("")}
              </select></label
            >
            ${field("제목 <em>필수</em>", "title", draft.title, `required maxlength="${POST_LIMITS.title}" placeholder="예: 함께 완성한 봄빛 꽃 한 송이"`)}
          </div>
          <p id="draft-status" class="draft-status small muted">
            ${draft.editId ? "게시된 소식 수정 중" : "게시 전까지 가족에게 보이지 않아요."}
          </p>
        </section>
        <section class="card compose-media">
          <div class="section-heading">
            <h2>사진·영상·첨부</h2>
            <span class="small muted">샘플 자료</span>
          </div>
          <div class="upload-zone">
            <p>준비된 샘플 자료를 골라 첨부해주세요.</p>
            <div class="sample-picker">
              ${[
                ["flowers", "꽃 만들기", "image"],
                ["garden", "정원 산책", "image"],
                ["autumn", "가을 풍경", "image"],
                ["video", "영상", "play"],
                ["pdf", "안내 PDF", "file"],
              ]
                .map(([v, l, i]) =>
                  btn(
                    icon(i, 17) + " " + l,
                    "add-sample",
                    "secondary",
                    `data-sample="${v}"`,
                  ),
                )
                .join("")}
            </div>
          </div>
          <div id="draft-attachments" class="attachment-list">
            ${renderDraftAttachments(draft)}
          </div>
          <p class="small muted attachment-guidance">
            최대 ${POST_LIMITS.attachments}개까지 체험할 수 있어요. 실제 파일 규격·한도는
            아직 확정하지 않았습니다.
          </p>
          ${notice("모든 첨부가 준비된 뒤 게시할 수 있어요. 실패한 자료는 재시도하거나 제거해주세요.")}
        </section>
        <section class="card compose-story">
          <label class="field"
            ><span>전하고 싶은 이야기 <small>선택</small></span
            ><textarea
              name="body"
              rows="4"
              maxlength="${POST_LIMITS.body}"
              placeholder="함께한 순간이나 가족에게 전할 내용을 남겨주세요. 실제 개인정보는 입력하지 마세요."
            >
${esc(draft.body)}</textarea
            ><small
              >이야기 또는 첨부자료를 하나 이상 준비해주세요. 본문은
              ${POST_LIMITS.body.toLocaleString("ko-KR")}자 이내입니다.</small
            ></label
          >
          <label class="check-row"
            ><input type="checkbox" name="pinned" ${draft.pinned ? "checked" : ""} /><span
              ><strong>가족 홈 상단에 고정</strong
              ><small>꼭 확인할 중요메모·안내에 사용해주세요.</small></span
            ></label
          >
        </section>
      </div>
      <div class="form-error" id="compose-error" role="alert"></div>
      <div class="sticky-actions">
        <div class="form-actions">
          ${btn("임시저장", "save-draft")}${btn("게시 전 확인 " + icon("arrow", 17), "review-draft", "primary")}
        </div>
      </div>
    </form>`;
}

function renderDraftAttachments(draft) {
  return draft.attachments.length
    ? draft.attachments
        .map(
          (a, i) =>
            /* HTML */ `<div class="attachment-row">
              <span class="attachment-thumb"
                >${
                  a.type === "image"
                    ? `<img src="${esc(a.url || "./assets/flowers.svg")}" alt="샘플 첨부">`
                    : icon(a.type === "video" ? "play" : "file", 22)
                }</span
              ><span
                ><strong>${esc(a.name)}</strong
                ><small
                  >${
                    a.status === "processing"
                      ? "처리 중…"
                      : a.status === "failed"
                        ? "처리 실패 · 다시 시도할 수 있어요"
                        : "준비 완료"
                  }</small
                ></span
              >${
                a.status === "failed"
                  ? btn("재시도", "retry-upload", "ghost", `data-index="${i}"`)
                  : ""
              }${
                a.status === "processing"
                  ? '<span class="spinner" aria-label="처리 중"></span>'
                  : btn(
                      icon("close", 16),
                      "remove-attachment",
                      "icon-button",
                      `data-index="${i}" aria-label="${esc(a.name)} 제거"`,
                    )
              }
            </div>`,
        )
        .join("")
    : '<div class="attachment-empty">선택한 자료가 여기에 표시됩니다.</div>';
}

function renderReview({ draft, resident: r }) {
  return /* HTML */ `${heading(
      "전하기 전에 한 번 더 확인해요",
      "가족에게 공유될 대상과 자료를 살펴봐주세요.",
    )}
    <div class="stepper">
      <span class="step done"><b>${icon("check", 16)}</b> 내용 작성</span
      ><span class="step active"><b>2</b> 대상·자료 확인</span
      ><span class="step"><b>3</b> 가족에게 공유</span>
    </div>
    <div class="detail-layout">
      <article class="card preview-article">
        <div class="notice success">
          ${icon("users")}<span
            ><strong
              >${esc(r?.name || draft.residentId)} 어르신의 가족에게 공유됩니다.</strong
            ><br /><small>가족 공용 계정 · ${esc(r?.familyAccountId || "")}</small></span
          >
        </div>
        <div class="post-meta">
          ${pill(kindName[draft.kind], "green")}${
            draft.pinned ? pill("상단 고정", "amber") : ""
          }
        </div>
        <h2>${esc(draft.title)}</h2>
        <p class="article-body">${esc(draft.body).replace(/\n/g, "<br>")}</p>
        <div class="preview-attachments">
          ${draft.attachments
            .map((a) =>
              a.type === "image"
                ? `<img src="${esc(a.url)}" alt="${esc(a.name)}">`
                : `<div class="attachment-row">${icon(a.type === "video" ? "play" : "file")}<strong>${esc(a.name)}</strong>${pill("준비 완료", "green")}</div>`,
            )
            .join("")}
        </div>
      </article>
      <aside class="card">
        <h2>함께 확인해주세요</h2>
        <form data-form="publish">
          <label class="check-row"
            ><input name="confirmedTarget" type="checkbox" required /><span
              >전달할 어르신과 가족을 확인했어요.</span
            ></label
          ><label class="check-row"
            ><input name="confirmedSharing" type="checkbox" required /><span
              >사진 속 인물과 공유 범위를 확인했어요.</span
            ></label
          ><label class="check-row"
            ><input name="confirmedContent" type="checkbox" required /><span
              >건강자료와 설명 내용을 확인했어요.</span
            ></label
          >
          <p class="small muted">
            이 체험의 게시물은 현재 브라우저의 샘플 가족 화면에만 나타납니다.
          </p>
          <div id="publish-error" class="form-error" role="alert"></div>
          <div class="stack-actions">
            <button type="submit" class="button primary">
              ${draft.editId ? "수정사항 반영" : "게시하기"}</button
            >${link("돌아가서 수정", "/compose")}
          </div>
        </form>
      </aside>
    </div>`;
}

export { renderStaffHome, renderCompose, renderDraftAttachments, renderReview };
