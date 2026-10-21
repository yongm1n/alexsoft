import { esc, fmt, fullDate, stateName } from "./format.js";
import { icon } from "./icons.js";
import { btn, pill, notice, avatar, heading, field } from "./components.js";

function postingCoverageNotice(residents) {
  if (!residents.length) return "";
  return notice(
    "<strong>소식을 게시할 담당 직원이 없는 공간</strong><ul>" +
      residents
        .map(
          (resident) =>
            "<li>" +
            esc(resident.name) +
            " 어르신 · " +
            esc(resident.familyAccountId) +
            "</li>",
        )
        .join("") +
      '</ul><a href="#/admin/staff" class="text-link">직원·담당 배정 확인</a>',
    "warning",
  );
}

function renderAdminHome({ overview: o, jobs }) {
  return `${heading(
    "함께 이어가는 센터 운영",
    "계정과 담당 배정을 센터에서 직접 관리하세요.",
  )}${postingCoverageNotice(o.unassignedPublishingResidents || [])}
    <div class="grid four">
      ${[
        [o.activeResidents, "이용 중인 샘플 공간", "leaf"],
        [o.activeStaff, "활성 샘플 직원", "users"],
        [o.posts, "공유한 샘플 소식", "feed"],
        [o.pendingDeletions, "삭제 처리 중", "lock"],
      ]
        .map(
          ([v, l, i]) =>
            `<div class="stat card"><span class="stat-icon">${icon(i, 23)}</span><strong class="stat-value">${v ?? 0}</strong><p>${l}</p></div>`,
        )
        .join("")}
    </div>
    <div class="grid two admin-shortcuts">
      <a class="card management-card" href="#/admin/spaces"
        >${icon("home", 30)}
        <h2>어르신 공간 관리</h2>
        <p>가족 공용계정과 이용 상태를 관리해요.</p>
        <span>공간 살펴보기 ${icon("arrow", 17)}</span></a
      ><a class="card management-card" href="#/admin/staff"
        >${icon("users", 30)}
        <h2>직원과 담당 배정</h2>
        <p>개인 계정, 담당 어르신, 사용 기능을 관리해요.</p>
        <span>직원 관리하기 ${icon("arrow", 17)}</span></a
      >
    </div>
    <section class="card">
      <div class="section-heading">
        <h2>삭제 요청 현황</h2>
        ${pill("데모 처리")}
      </div>
      ${
        jobs.length
          ? jobs
              .map(
                (j) =>
                  /* HTML */ `<div class="job-row">
                    <span
                      >${icon("lock")}<strong
                        >${esc(j.residentName)}</strong
                      ></span
                    ><span
                      >${pill(
                        j.status === "demo_completed"
                          ? "샘플 삭제 완료"
                          : "접근 차단 · 처리 대기",
                        j.status === "demo_completed" ? "green" : "amber",
                      )}</span
                    >${
                      j.status !== "demo_completed"
                        ? btn(
                            "샘플 처리 완료",
                            "complete-deletion",
                            "secondary",
                            `data-id="${esc(j.id)}"`,
                          )
                        : ""
                    }
                  </div>`,
              )
              .join("")
          : '<p class="muted">현재 삭제 요청이 없습니다.</p>'
      }
      <p class="small muted">
        이 화면은 샘플 상태 변화를 보여줍니다. 실제 저장소·백업 파기 기능은
        없습니다.
      </p>
    </section>
    ${notice(
      "관리자는 기본적으로 계정과 공간을 관리합니다. 어르신 콘텐츠 열람 권한은 자동으로 부여하지 않는 설계 제안을 체험합니다.",
    )}
    <p class="small muted">
      화면의 숫자는 시연용 계정·자료 수입니다. 실제 계획 규모는 어르신 약
      50명이며 직원 수나 운영 지표를 나타내지 않습니다.
    </p>`;
}

function listControls(kind) {
  return `<div class="admin-search-controls">
    <label class="field"><span>${kind} 검색</span><input type="search" data-list-search placeholder="이름 또는 계정 ID" autocomplete="off"></label>
    <label class="field"><span>이용 상태</span><select data-list-status><option value="all">전체 상태</option><option value="active">이용 중</option><option value="suspended">이용 중단</option>${kind === "어르신" ? '<option value="deletion_pending">삭제 처리 중</option><option value="deleted">삭제 완료</option>' : ""}</select></label>
    <button type="button" class="button ghost" data-action="reset-list">검색 초기화</button>
  </div><p class="small muted" data-list-count aria-live="polite"></p>`;
}
const listEmpty =
  '<div class="empty-state" data-list-empty hidden><h2>검색 결과가 없어요</h2><p>이름·계정 ID 또는 이용 상태를 바꿔보세요.</p><button type="button" class="button secondary" data-action="reset-list">전체 보기</button></div>';

function renderAdminStaff({ staff, residents }) {
  return `${heading(
    "직원·담당 배정",
    "직원마다 개인 계정과 필요한 기능을 부여합니다.",
    btn(icon("plus", 18) + " 직원 등록", "new-staff", "primary"),
  )}
    <section class="card" data-list-scope="admin-staff">
      ${listControls("직원")}
      <div class="table-wrap">
        <table class="staff-table">
          <thead>
            <tr>
              <th scope="col">직원 / 계정</th>
              <th scope="col">담당 어르신</th>
              <th scope="col">허용 기능</th>
              <th scope="col">상태</th>
              <th scope="col"><span class="sr-only">관리</span></th>
            </tr>
          </thead>
          <tbody>
            ${staff
              .map(
                (s) =>
                  /* HTML */ `<tr
                    data-list-row
                    data-search="${esc(s.name + " " + s.accountId)}"
                    data-status="${esc(s.status)}"
                  >
                    <td data-label="직원 / 계정">
                      <div class="person-cell">
                        <span class="resident-avatar"
                          >${esc(s.name.slice(0, 1))}</span
                        ><span
                          ><strong>${esc(s.name)}</strong
                          ><small>${esc(s.accountId)}</small></span
                        >
                      </div>
                    </td>
                    <td data-label="담당 어르신">
                      ${
                        s.residentIds
                          .map((id) =>
                            esc(residents.find((r) => r.id === id)?.name || id),
                          )
                          .join(" · ") || '<span class="muted">미배정</span>'
                      }
                    </td>
                    <td data-label="허용 기능">
                      <div class="permission-pills">
                        ${
                          Object.entries(s.permissions)
                            .filter(([, v]) => v)
                            .map(([k]) =>
                              pill(
                                {
                                  view: "열람",
                                  post: "게시·수정",
                                  delete: "철회",
                                }[k] || k,
                              ),
                            )
                            .join("") || "없음"
                        }
                      </div>
                    </td>
                    <td data-label="상태">
                      ${pill(
                        stateName[s.status],
                        s.status === "active" ? "green" : "amber",
                      )}
                    </td>
                    <td data-label="관리">
                      ${btn(
                        "관리",
                        "edit-staff",
                        "secondary",
                        `data-id="${esc(s.id)}" aria-label="${esc(s.name)} · ${esc(s.accountId)} 관리"`,
                      )}
                    </td>
                  </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${listEmpty}
    </section>
    ${notice(
      "담당 배정 해제나 이용 중지는 해당 직원의 다음 API 요청부터 적용됩니다. 다른 역할로 바꿔 변경된 접근 범위를 확인해보세요.",
    )}`;
}

function renderAdminSpaces({ residents, staff }) {
  return `${heading(
    "어르신 공간 관리",
    "한 어르신의 가족이 함께 쓰는 비공개 공간입니다.",
    btn(icon("plus", 18) + " 공간 만들기", "new-space", "primary"),
  )}
    <section data-list-scope="admin-spaces">
    ${listControls("어르신")}
    <div class="grid two">
      ${residents
        .map(
          (r) =>
            /* HTML */ `<article
              class="card space-card"
              data-list-row
              data-search="${esc(r.name + " " + r.familyAccountId)}"
              data-status="${esc(r.status)}"
            >
              <div class="person-cell">
                ${avatar(r, true)}
                <div>
                  <h2>${esc(r.name)} 어르신</h2>
                  <small>${esc(r.familyAccountId)}</small>
                </div>
                ${pill(
                  stateName[r.status] || r.status,
                  r.status === "active" ? "green" : "amber",
                )}
              </div>
              <dl class="resident-summary">
                <div>
                  <dt>담당 직원</dt>
                  <dd>
                    ${
                      (r.staffIds || [])
                        .map((id) =>
                          esc(staff.find((s) => s.id === id)?.name || id),
                        )
                        .join(" · ") || "미배정"
                    }
                  </dd>
                </div>
                <div>
                  <dt>공간 상태</dt>
                  <dd>${esc(stateName[r.status] || r.status)}</dd>
                </div>
              </dl>
              ${
                !["deleted", "deletion_pending"].includes(r.status)
                  ? /* HTML */ `<div class="form-actions">
                      ${btn(
                        "공간 관리",
                        "edit-space",
                        "secondary",
                        `data-id="${esc(r.id)}"`,
                      )}${btn(
                        r.status === "active" ? "이용 중단" : "다시 이용",
                        "toggle-space",
                        r.status === "active" ? "ghost" : "primary",
                        `data-id="${esc(r.id)}"`,
                      )}
                    </div>`
                  : `<p class="small muted">${r.status === "deleted" ? "샘플 삭제 완료" : "가족·직원 접근이 차단되었습니다."}</p>`
              }
            </article>`,
        )
        .join("")}
    </div>
    ${listEmpty}
    </section>
    <p class="small muted">
      공간 중단은 삭제와 다릅니다. 다시 이용할 때 기존 자료는 유지되며 계정은
      재로그인합니다.
    </p>`;
}

function renderAdminBlog(blog) {
  return `${heading(
    "센터 블로그 연결",
    "한 번 연결하고, 모든 가족에게 같은 센터 소식을 전하세요.",
  )}
    <div class="grid two">
      <form class="card form" data-form="blog">
        <h2>공통 연결 설정</h2>
        ${field(
          "네이버 블로그 주소",
          "url",
          blog.url,
          'type="url" required placeholder="https://blog.naver.com/블로그아이디"',
        )}
        <p class="small muted">
          네이버 블로그 홈 주소만 입력할 수 있습니다.<br />데모에서는 외부 조회
          없이 샘플 피드로 연결합니다.
        </p>
        <div class="form-error" id="blog-error" role="alert"></div>
        <button class="button primary" type="submit">연결 설정 저장</button>
        <hr />
        <h3>자동 갱신 흐름 체험</h3>
        <p class="muted">새 샘플 글이 가족 화면에도 반영되는지 확인해보세요.</p>
        <div class="form-actions">
          ${btn(
            icon("refresh", 17) + " 새 샘플 글 불러오기",
            "refresh-blog",
          )}${btn("갱신 실패 체험", "fail-blog", "ghost")}
        </div>
        <p class="small muted">마지막 성공: ${fullDate(blog.lastSuccessAt)}</p>
        ${
          blog.status === "cached" || blog.status === "error"
            ? notice(
                "갱신에 실패해 마지막 성공 자료를 유지하고 있습니다.",
                "warning",
              )
            : notice("가족 화면에 표시할 샘플 자료가 준비됐습니다.", "success")
        }
      </form>
      <section class="card">
        <div class="section-heading">
          <h2>가족에게 보이는 이야기</h2>
          ${pill("샘플 피드")}
        </div>
        ${blog.items
          .map(
            (p) =>
              /* HTML */ `<article class="blog-preview">
                <img
                  src="./assets/${
                    p.art === "flowers"
                      ? "flowers"
                      : p.art === "garden"
                        ? "garden"
                        : "autumn"
                  }.svg"
                  alt="샘플 블로그 이미지"
                />
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.summary)}</p>
                <small class="muted">${fmt(p.date)}</small>
              </article>`,
          )
          .join("")}
      </section>
    </div>`;
}

export {
  renderAdminHome,
  renderAdminStaff,
  renderAdminSpaces,
  renderAdminBlog,
};
