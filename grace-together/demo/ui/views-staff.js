import { POST_LIMITS } from "../domain/content-policy.js";
import { esc, fmt, kindName } from "./format.js";
import { icon } from "./icons.js";
import {
  btn,
  link,
  pill,
  notice,
  avatar,
  empty,
  heading,
  field,
} from "./components.js";

function renderStaffHome({ residents, savedDraft: d, canPost }) {
  return `${heading(
    "오늘도 따뜻한 동행",
    "전하고 싶은 소식이 있을 때, 가족에게 편하게 남겨주세요.",
    canPost
      ? link(icon("plus", 18) + " 새 소식 작성", "/compose", "primary")
      : "",
  )}
    <section class="staff-intro">
      <div>
        <p class="eyebrow">YOUR CARE CIRCLE</p>
        <h2>작은 기록이<br />가족에게는 큰 안심이에요.</h2>
        <p>
          매일 작성할 의무는 없어요.<br />필요한 순간에 필요한 소식만
          전해주세요.
        </p>
      </div>
      <img src="./assets/flowers.svg" alt="샘플 꽃 만들기 일러스트" />
    </section>
    ${
      d
        ? /* HTML */ `<div class="notice info">
            ${icon("edit")}<span
              ><strong>작성 중인 소식이 있어요.</strong> ${esc(
                d.title || "제목 없는 소식",
              )}</span
            >${btn("이어서 작성", "resume-draft", "secondary")}
          </div>`
        : ""
    }
    <div class="section-heading">
      <h2>담당 어르신 <span class="muted">${residents.length}</span></h2>
      ${pill("배정된 공간만 표시", "green")}
    </div>
    ${
      residents.length
        ? /* HTML */ `<div class="grid two">
            ${residents
              .map(
                (r) =>
                  /* HTML */ `<article class="resident-card card">
                    <div class="person-cell">
                      ${avatar(r, true)}
                      <div>
                        <h3>${esc(r.name)} 어르신</h3>
                        <p class="small muted">
                          가족 공용 공간 · ${esc(r.familyAccountId)}
                        </p>
                      </div>
                      ${pill("이용 중", "green")}
                    </div>
                    <dl class="resident-summary">
                      <div>
                        <dt>마지막 소식</dt>
                        <dd>${fmt(r.lastPostAt)}</dd>
                      </div>
                      <div>
                        <dt>함께 나눈 소식</dt>
                        <dd>${r.postCount}건</dd>
                      </div>
                    </dl>
                    <div class="form-actions">
                      ${link("소식 보기", `/resident/${r.id}`)}${
                        canPost
                          ? link(
                              icon("plus", 17) + " 작성하기",
                              `/compose/${r.id}`,
                              "primary",
                            )
                          : ""
                      }
                    </div>
                  </article>`,
              )
              .join("")}
          </div>`
        : empty(
            "아직 담당 어르신이 없어요",
            "센터 관리자가 담당자를 배정하면 이곳에 표시됩니다.",
          )
    }`;
}

function renderCompose({ residents, draft }) {
  return `${heading(
    draft.editId ? "소식 수정" : "가족에게 소식 전하기",
    "사진 한 장, 짧은 메모로 따뜻한 하루를 나눠보세요.",
  )}
    <div class="stepper">
      <span class="step active"><b>1</b> 내용 작성</span
      ><span class="step"><b>2</b> 대상·자료 확인</span
      ><span class="step"><b>3</b> 가족에게 공유</span>
    </div>
    <form class="form compose-form" data-form="compose">
      <div class="grid two compose-columns">
        <section class="card">
          <h2>어떤 소식을 전할까요?</h2>
          <label class="field"
            ><span>전달할 어르신 <em>필수</em></span
            ><select name="residentId" ${draft.editId ? "disabled" : ""}>
              ${residents
                .map(
                  (r) =>
                    `<option value="${r.id}" ${draft.residentId === r.id ? "selected" : ""}>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</option>`,
                )
                .join("")}
            </select></label
          ><label class="field"
            ><span>소식 종류</span
            ><select name="kind">
              ${Object.entries(kindName)
                .map(
                  ([v, n]) =>
                    `<option value="${v}" ${draft.kind === v ? "selected" : ""}>${n}</option>`,
                )
                .join("")}
            </select></label
          >${field(
            "제목 <em>필수</em>",
            "title",
            draft.title,
            `required maxlength="${POST_LIMITS.title}" placeholder="예: 함께 완성한 봄빛 꽃 한 송이"`,
          )}<label class="field"
            ><span>전하고 싶은 이야기</span
            ><textarea
              name="body"
              rows="7"
              maxlength="${POST_LIMITS.body}"
              placeholder="어떤 시간을 보내셨는지 가족에게 전해주세요. 실제 개인정보는 입력하지 마세요."
            >
${esc(draft.body)}</textarea
            ><small
              >제목 ${POST_LIMITS.title}자 · 본문 ${POST_LIMITS.body.toLocaleString("ko-KR")}자 이내는 데모용 기준입니다. 이야기 또는 첨부자료를 하나 이상 준비해주세요.</small
            ></label
          ><label class="check-row"
            ><input
              type="checkbox"
              name="pinned"
              ${draft.pinned ? "checked" : ""}
            /><span
              ><strong>가족 홈 상단에 고정</strong
              ><small>꼭 확인할 중요메모·안내에 사용해주세요.</small></span
            ></label
          >
        </section>
        <section class="card">
          <div class="section-heading">
            <h2>사진·영상·첨부</h2>
            <span class="small muted">샘플 자료</span>
          </div>
          <div class="upload-zone">
            ${icon("image", 32)}
            <h3>전할 자료를 골라주세요</h3>
            <p>
              실제 파일 대신 준비된 샘플을 첨부합니다.<br />처리와 재시도 흐름을
              확인할 수 있어요.
            </p>
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
          <p class="small muted">
            첨부는 데모에서 최대 ${POST_LIMITS.attachments}개까지 체험할 수 있어요.<br />실제 서비스의
            파일 규격·한도는 아직 확정하지 않았습니다.
          </p>
          ${notice(
            "모든 첨부가 준비된 뒤 게시할 수 있어요. 처리에 실패한 자료는 다시 시도하거나 제거해주세요.",
          )}
        </section>
      </div>
      <div class="form-error" id="compose-error" role="alert"></div>
      <div class="sticky-actions">
        <span id="draft-status" class="small muted"
          >${
            draft.editId
              ? "게시된 소식 수정 중"
              : "게시 전까지 가족에게 보이지 않아요."
          }</span
        >
        <div class="form-actions">
          ${btn("임시저장", "save-draft")}${btn(
            "게시 전 확인 " + icon("arrow", 17),
            "review-draft",
            "primary",
          )}
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
  return `${heading(
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
            ><strong>${esc(r?.name || draft.residentId)} 어르신의 가족에게 공유됩니다.</strong
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
