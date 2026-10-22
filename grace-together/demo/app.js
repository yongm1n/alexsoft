import {
  renderAdminHome,
  renderAdminStaff,
  renderAdminSpaces,
  renderAdminBlog,
} from "./ui/views-admin.js";
import {
  renderStaffHome,
  renderCompose,
  renderDraftAttachments,
  renderReview,
} from "./ui/views-staff.js";
import {
  renderFamilyHome,
  renderFeed,
  renderFeedResults,
  renderPostDetail,
} from "./ui/views-family.js";
import { $, esc, roleName } from "./ui/format.js";
import { icon } from "./ui/icons.js";
import {
  mountPasswordRecovery,
  clearPasswordRecoveryCooldown,
} from "./ui/password-recovery.js";
import { btn, link, pill, field, notice, empty } from "./ui/components.js";
import {
  sampleNames,
  sampleTypes,
  newDraft,
  validateDraft,
} from "./ui/drafts.js";
import {
  closeOverlay,
  dismissOverlay,
  openModal,
  confirm,
  openDrawer,
  preserveReturnFocus,
  runConfirmation,
  trapOverlayKeys,
} from "./ui/overlays.js";
import { api } from "./api/client.js";
import { POST_LIMITS } from "./domain/content-policy.js";
import { getNewlyUncoveredPostingResidents } from "./domain/staff-coverage.js";

let epoch = 0,
  view = {},
  draft = null,
  dirty = false,
  toastTimer,
  currentRole = "family",
  filter = "all",
  query = "",
  busy = false,
  publishing = false;

function currentRoute() {
  try {
    return decodeURI(location.hash.slice(1) || "/");
  } catch {
    return "/not-found";
  }
}
const request = (method, path, body) => api.request(method, path, body);
const session = () => api.getSession();
const can = (capability) =>
  session()?.role === "staff" && session()?.permissions?.[capability] === true;
let accountsLoading = false;
const homeRoute = () =>
  session()?.role === "admin"
    ? "/admin"
    : session()?.role === "staff"
      ? "/residents"
      : "/home";
const toast = (text, tone = "success") => {
  clearTimeout(toastTimer);
  $("#toasts").innerHTML =
    `<div class="toast ${tone}" role="${tone === "error" ? "alert" : "status"}">${icon(tone === "success" ? "check" : "info", 18)}${esc(text)}</div>`;
  toastTimer = setTimeout(() => $("#toasts").replaceChildren(), 4500);
};
function navigate(route) {
  if (currentRoute() === route) render();
  else location.hash = route;
}

// Filtering changes visibility only: a hidden checked assignment remains selected.
const listFilters = new Map();
function filterList(container, restore = false) {
  const search = $("[data-list-search]", container);
  const status = $("[data-list-status]", container);
  const key = `${session()?.accountId}:${container.dataset.listScope}`;
  const previous = listFilters.get(key);
  if (restore && previous) {
    if (search) search.value = previous.query;
    if (status) status.value = previous.status;
  }
  const state = { query: search?.value || "", status: status?.value || "all" };
  listFilters.set(key, state);
  const needle = state.query.trim().toLocaleLowerCase();
  const rows = [...container.querySelectorAll("[data-list-row]")];
  let visible = 0;
  for (const row of rows) {
    row.hidden = !(
      row.dataset.search.toLocaleLowerCase().includes(needle) &&
      (state.status === "all" || row.dataset.status === state.status)
    );
    if (!row.hidden) visible++;
  }
  const count = $("[data-list-count]", container);
  if (count) count.textContent = `${visible}명 표시 · 전체 ${rows.length}명`;
  const emptyState = $("[data-list-empty]", container);
  if (emptyState) emptyState.hidden = visible > 0;
}
function restoreListFilters() {
  document
    .querySelectorAll("[data-list-scope]")
    .forEach((container) => filterList(container, true));
}
function assignmentPicker(
  title,
  name,
  items,
  selected,
  label,
  identity,
  detail = () => "",
) {
  const ordered = [...items].sort(
    (a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)),
  );
  return `<fieldset class="fieldset" data-assignment-picker><legend>${esc(title)}</legend>
    <label class="field"><span>${esc(title)} 검색</span><input type="search" data-assignment-search placeholder="이름 또는 계정 ID" autocomplete="off"></label>
    <p class="assignment-count" data-assignment-count aria-live="polite">${selected.length}명 선택 · 전체 ${items.length}명</p>
    <div class="assignment-list">${ordered
      .map(
        (
          item,
        ) => `<label class="check-row" data-assignment-row data-search="${esc(label(item) + " " + identity(item))}">
      <input name="${name}" type="checkbox" value="${esc(item.id)}" ${selected.includes(item.id) ? "checked" : ""}>
      <span>${esc(label(item))}<small><span>${esc(identity(item))}</span> · ${item.status === "active" ? "이용 중" : "이용 중단"}${detail(item) ? " · " + esc(detail(item)) : ""}</small></span>
    </label>`,
      )
      .join(
        "",
      )}</div><p class="small muted" data-assignment-empty hidden>일치하는 대상이 없어요. 이름이나 계정 ID를 다시 확인해주세요.</p>
    <p class="small muted">선택한 대상을 먼저 표시해요. 검색해도 기존 선택은 유지됩니다.</p></fieldset>`;
}
function filterAssignments(picker) {
  const needle = $("[data-assignment-search]", picker)
    .value.trim()
    .toLocaleLowerCase();
  const rows = [...picker.querySelectorAll("[data-assignment-row]")];
  let visible = 0;
  for (const row of rows) {
    row.hidden = !row.dataset.search.toLocaleLowerCase().includes(needle);
    if (!row.hidden) visible++;
  }
  const selected = picker.querySelectorAll(
    'input[type="checkbox"]:checked',
  ).length;
  $("[data-assignment-count]", picker).textContent =
    `${selected}명 선택 · ${visible}명 표시 / 전체 ${rows.length}명`;
  $("[data-assignment-empty]", picker).hidden = visible > 0;
}

function navItems(role) {
  return role === "family"
    ? [
        ["home", "우리 어르신", "/home"],
        ["feed", "소식 모아보기", "/feed"],
      ]
    : role === "staff"
      ? [
          ["users", "담당 어르신", "/residents"],
          ...(can("post") ? [["edit", "소식 작성", "/compose"]] : []),
        ]
      : [
          ["home", "운영 현황", "/admin"],
          ["users", "직원·담당 배정", "/admin/staff"],
          ["lock", "어르신 공간", "/admin/spaces"],
          ["leaf", "센터 블로그", "/admin/blog"],
        ];
}
function shell() {
  const s = session(),
    route = currentRoute(),
    items = navItems(s.role);
  const nav = items
    .map(
      ([i, t, p]) =>
        /* HTML */ `<a
          href="#${p}"
          class="nav-link ${
            route === p || (p === "/feed" && route.startsWith("/post/"))
              ? "active"
              : ""
          }"
          ${route === p ? 'aria-current="page"' : ""}
          >${icon(i)}<span>${t}</span></a
        >`,
    )
    .join("");
  return /* HTML */ `<div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#${homeRoute()}"
        ><span class="brand-mark">${icon("leaf", 25)}</span
        ><span>그레이스<br /><strong>건강동행</strong></span></a
      >
      <div class="sidebar-section-label">${roleName[s.role]}의 공간</div>
      <nav aria-label="주 메뉴">${nav}</nav>
      <div class="sidebar-footer">
        <span class="status-dot"></span> 그레이스 주간보호센터
        <p>소소한 하루를,<br />가족과 함께.</p>
        <a href="#/password-reset">비밀번호 재설정</a>
        <a href="../" target="_blank" rel="noopener"
          >기획·설계서 보기 ${icon("arrow", 14)}</a
        >${btn(icon("logout", 16) + " 로그아웃", "logout", "ghost")}
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <a class="mobile-brand" href="#${homeRoute()}"
          >${icon("leaf")}<b>건강동행</b></a
        >
        <div class="breadcrumb">
          그레이스 주간보호센터 <span>/</span> ${roleName[s.role]} 공간
        </div>
        <div class="top-actions">
          ${pill(roleName[s.role], "green")}<span class="account-name"
            >${esc(s.name)}</span
          >${btn(
            icon("users", 17) + " 역할 바꾸기",
            "switch-role",
            "ghost",
          )}${btn(
            icon("settings", 18),
            "tools",
            "icon-button",
            'aria-label="데모 도구 열기"',
          )}
        </div>
      </header>
      <main class="main" id="main" tabindex="-1">
        <div class="loading-state" role="status">
          <div class="skeleton"></div>
          <p>소식을 불러오고 있어요.</p>
        </div>
      </main>
      <footer class="footer-note">
        그레이스 건강동행 <span>·</span> 함께 돌보고, 함께 나눕니다.
      </footer>
    </div>
    <nav class="mobile-nav" aria-label="모바일 메뉴">${nav}</nav>
  </div>`;
}
function errorView(err) {
  const denied = [401, 403, 410].includes(err.status);
  const signedOut = err.status === 401;
  return /* HTML */ `<div class="error-state">
    ${icon(denied ? "lock" : "refresh", 36)}
    <p class="eyebrow">${denied ? "접근 상태 확인" : "잠시 연결이 어려워요"}</p>
    <h1>
      ${signedOut ? "다시 로그인해주세요" : denied ? "이 공간을 이용할 수 없어요" : "소식을 불러오지 못했어요"}
    </h1>
    <p>${esc(err.message || "잠시 후 다시 시도해주세요.")}</p>
    <div class="form-actions">
      ${signedOut ? link("로그인 화면으로", "/login", "primary") : btn("다시 확인", "reload", "primary")}${btn(
        "체험 계정 바꾸기",
        "switch-role",
      )}${btn("데모 도구", "tools", "ghost")}
    </div>
    <small
      >샘플 서비스의 상태입니다. 실제 센터 운영에 영향을 주지 않습니다.</small
    >
  </div>`;
}
let disposeRecovery = null;
async function render() {
  disposeRecovery?.();
  disposeRecovery = null;
  const ticket = ++epoch,
    route = currentRoute();
  document.body.classList.toggle(
    "focus-workflow",
    !!session() && /^\/(compose|review)(\/|$)/.test(route),
  );
  closeOverlay(false);
  if (route === "/password-reset") {
    disposeRecovery = mountPasswordRecovery({
      host: $("#app"),
      api,
      isCurrent: () => ticket === epoch && currentRoute() === "/password-reset",
      onComplete: () => {
        draft = null;
        dirty = false;
      },
    });
    return;
  }
  if (route === "/login" || !session()) {
    await renderLogin(ticket);
    return;
  }
  $("#app").innerHTML = shell();
  try {
    await request("GET", "/session");
    if (ticket !== epoch) return;
    let html;
    if (route === "/" || route === "/login") {
      navigate(homeRoute());
      return;
    }
    if (route === "/home") html = await familyHome();
    else if (route === "/feed") html = await feed();
    else if (route.startsWith("/post/"))
      html = await postDetail(route.split("/")[2]);
    else if (route === "/residents") html = await staffHome();
    else if (route.startsWith("/resident/"))
      html = await feed(route.split("/")[2]);
    else if (route.startsWith("/compose"))
      html = await compose(route.split("/")[2]);
    else if (route === "/review") html = review();
    else if (route === "/admin") html = await adminHome();
    else if (route === "/admin/staff") html = await adminStaff();
    else if (route === "/admin/spaces") html = await adminSpaces();
    else if (route === "/admin/blog") html = await adminBlog();
    else
      html = empty(
        "화면을 찾을 수 없어요",
        "메뉴에서 원하는 화면을 선택해주세요.",
        link("첫 화면으로", homeRoute(), "primary"),
      );
    if (ticket !== epoch) return;
    $("#main").innerHTML = html;
    restoreListFilters();
    const storage = api.getStorageStatus?.();
    if (storage && !storage.persistent)
      $("#main").insertAdjacentHTML(
        "afterbegin",
        notice(
          "브라우저 저장소를 사용할 수 없어 현재 창에서만 변경사항이 유지됩니다.",
          "warning",
        ),
      );
    document.title = `${$("#main h1")?.textContent || "서비스 체험"} · 그레이스 건강동행`;
  } catch (err) {
    if (ticket === epoch && $("#main")) $("#main").innerHTML = errorView(err);
  }
}
async function renderLogin(ticket) {
  accountsLoading = true;
  view.accounts = [];
  $("#app").innerHTML = /* HTML */ `<main class="login-layout" id="main">
    <section class="login-story">
      <a class="brand" href="#/login"
        ><span class="brand-mark">${icon("leaf", 26)}</span>그레이스 건강동행</a
      >
      <div class="login-story-copy">
        <p class="eyebrow">LITTLE MOMENTS, TOGETHER</p>
        <h1>소소한 하루가<br />가족의 안심이 되도록.</h1>
        <p>센터에서 함께한 순간과<br />꼭 전하고 싶은 이야기를 나눕니다.</p>
      </div>
      <img
        src="./assets/hero.svg"
        alt="따뜻한 햇살 아래 식물과 꽃을 그린 일러스트"
        class="login-illustration"
      />
      <div class="login-story-footer">
        그레이스 주간보호센터 <span>함께하는 매일의 동행</span>
      </div>
    </section>
    <section class="login-panel">
      <div class="login-panel-inner">
        <p class="eyebrow">WELCOME TO GRACE</p>
        <h2>어떤 하루를 만나볼까요?</h2>
        <p class="muted">
          역할을 선택하고 샘플 계정으로 들어가세요.<br />가족은 어르신별 공용
          계정으로 이용합니다.
        </p>
        <div class="role-tabs" role="group" aria-label="체험 역할">
          ${["family", "staff", "admin"]
            .map(
              (r) =>
                /* HTML */ `<button
                  type="button"
                  class="role-tab ${r === currentRole ? "active" : ""}"
                  aria-pressed="${r === currentRole}"
                  data-action="login-role"
                  data-role="${r}"
                >
                  ${icon(
                    r === "family"
                      ? "home"
                      : r === "staff"
                        ? "users"
                        : "settings",
                  )}${roleName[r]}
                </button>`,
            )
            .join("")}
        </div>
        <div id="login-accounts" class="account-choices" aria-live="polite">
          <p>샘플 계정을 불러오고 있어요.</p>
        </div>
        <div class="notice info">
          ${icon("lock", 18)}<span
            >가입이나 실제 비밀번호가 필요하지 않아요.<br />실제
            개인정보·건강정보는 입력하지 마세요.</span
          >
        </div>
        <div class="login-links">
          <a href="#/password-reset">비밀번호를 잊으셨나요?</a>
          <a href="../" target="_blank" rel="noopener"
            >기획·설계서 보기 ${icon("arrow", 14)}</a
          >${btn("체험 안내", "tools", "ghost")}
        </div>
        <p class="small muted">
          샘플 자료와 변경사항은 이 브라우저에 저장됩니다.<br />다른 기기나 다른
          사람과 공유되지 않습니다.
        </p>
      </div>
    </section>
  </main>`;
  try {
    const accounts = await request("GET", "/demo/accounts");
    if (ticket !== epoch) return;
    view.accounts = accounts;
    accountsLoading = false;
    renderAccounts();
  } catch (err) {
    if (ticket === epoch)
      $("#login-accounts").innerHTML =
        `<p class="form-error" role="alert">${esc(err.message)}</p>${btn("다시 불러오기", "reload")}`;
  }
}
function renderAccounts() {
  const host = $("#login-accounts");
  if (!host) return;
  if (accountsLoading) {
    host.innerHTML = "<p>샘플 계정을 불러오고 있어요.</p>";
    return;
  }
  host.innerHTML =
    view.accounts
      .filter((a) => a.role === currentRole)
      .map(
        (a) =>
          /* HTML */ `<button
            type="button"
            class="account-choice"
            data-action="login"
            data-id="${esc(a.id)}"
            ${a.status && a.status !== "active" ? "disabled" : ""}
          >
            <span class="resident-avatar"
              >${esc(a.name?.slice(0, 1) || "동")}</span
            ><span
              ><strong
                >${esc(
                  a.role === "staff" ? a.name + " 선생님" : a.label || a.name,
                )}</strong
              ><small
                >${esc(a.id)}${
                  a.status && a.status !== "active" ? " · 이용 중단" : ""
                }</small
              ></span
            >${icon("arrow", 18)}
          </button>`,
      )
      .join("") || "<p>체험 계정이 없습니다.</p>";
}

async function familyHome() {
  const ticket = epoch;
  const residents = await request("GET", "/residents");
  const r = residents[0];
  if (!r)
    return empty(
      "이용할 공간이 없어요",
      "센터에 계정 이용 상태를 확인해주세요.",
    );
  const [posts, blog] = await Promise.all([
    request("GET", `/residents/${r.id}/posts`),
    request("GET", "/blog"),
  ]);
  if (ticket !== epoch) return "";
  view = { ...view, resident: r, posts, blog };
  const pinned = posts
    .filter((p) => p.pinned)
    .sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
  const recent = posts
    .filter((p) => ["photo", "video"].includes(p.kind))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  return renderFamilyHome({ resident: r, pinned, recent, blog });
}
async function feed(residentId) {
  const ticket = epoch;
  const residents = await request("GET", "/residents"),
    r = residents.find((r) => r.id === residentId) || residents[0];
  if (!r)
    return empty(
      "담당 어르신이 없어요",
      "관리자에게 담당 배정을 요청해주세요.",
    );
  const posts = await request("GET", `/residents/${r.id}/posts`);
  if (ticket !== epoch) return "";
  view = { ...view, resident: r, posts };
  return renderFeed({
    resident: r,
    canPost: can("post"),
    filter,
    query,
    results: feedResults(),
  });
}
function filteredPosts() {
  return (view.posts || [])
    .filter(
      (p) =>
        (filter === "all" || p.kind === filter) &&
        (!query || p.title.toLowerCase().includes(query.toLowerCase())),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        new Date(b.createdAt) - new Date(a.createdAt),
    );
}
function feedResults() {
  const posts = filteredPosts();
  return renderFeedResults(posts, query);
}
async function postDetail(id) {
  const ticket = epoch;
  const p = await request("GET", `/posts/${id}`);
  const r = await request("GET", `/residents/${p.residentId}`);
  if (ticket !== epoch) return "";
  view = { ...view, post: p, resident: r };
  return renderPostDetail({
    post: p,
    resident: r,
    role: session().role,
    canPost: can("post"),
    canDelete: can("delete"),
  });
}
async function staffHome() {
  const ticket = epoch;
  const residents = await request("GET", "/residents");
  const d = await request("GET", "/drafts/current").catch((err) => {
    if (err.status === 403) return null;
    throw err;
  });
  if (ticket !== epoch) return "";
  view = { ...view, residents };
  return renderStaffHome({ residents, savedDraft: d, canPost: can("post") });
}

function draftFields() {
  const form = $('[data-form="compose"]');
  if (!form || !draft) return;
  const f = new FormData(form);
  // Keep this draft identity while an upload is pending; changing the target creates a new draft.
  Object.assign(draft, {
    title: String(f.get("title") || ""),
    body: String(f.get("body") || ""),
    kind: String(f.get("kind") || "photo"),
    pinned: f.get("pinned") === "on",
  });
}

async function compose(residentId) {
  const ticket = epoch;
  if (!can("post"))
    throw Object.assign(new Error("담당 직원만 소식을 작성할 수 있습니다."), {
      status: 403,
    });
  const residents = await request("GET", "/residents");
  if (!residents.length)
    return empty(
      "담당 어르신이 없어요",
      "관리자에게 담당 배정을 요청해주세요.",
    );
  if (ticket !== epoch) return "";
  if (!draft) {
    const saved = await request("GET", "/drafts/current");
    if (ticket !== epoch) return "";
    draft =
      saved && (!residentId || saved.residentId === residentId)
        ? { ...saved, idempotencyKey: crypto.randomUUID() }
        : newDraft(residentId || residents[0].id);
  }
  if (residentId && draft.residentId !== residentId) {
    draft = newDraft(residentId);
    dirty = false;
  }
  if (!residents.some((r) => r.id === draft.residentId))
    throw Object.assign(
      new Error("작성 대상의 담당 배정이나 이용 상태가 변경되었습니다."),
      { status: 403 },
    );
  if (ticket !== epoch) return "";
  view = { ...view, residents };
  return renderCompose({ residents, draft });
}
function draftAttachments() {
  return renderDraftAttachments(draft);
}

function review() {
  if (!draft)
    return empty(
      "작성 중인 소식이 없어요",
      "새 소식을 먼저 작성해주세요.",
      link("소식 작성", "/compose", "primary"),
    );
  const r = view.residents?.find((r) => r.id === draft.residentId);
  return renderReview({ draft, resident: r });
}

async function adminHome() {
  const ticket = epoch;
  const [o, jobs] = await Promise.all([
    request("GET", "/admin/overview"),
    request("GET", "/admin/deletions"),
  ]);
  if (ticket !== epoch) return "";
  view = { ...view, jobs };
  return renderAdminHome({ overview: o, jobs });
}
async function adminStaff() {
  const ticket = epoch;
  const [staff, residents] = await Promise.all([
    request("GET", "/admin/staff"),
    request("GET", "/admin/residents"),
  ]);
  if (ticket !== epoch) return "";
  view = { ...view, staff, residents };
  return renderAdminStaff({ staff, residents });
}
async function adminSpaces() {
  const ticket = epoch;
  const [residents, staff] = await Promise.all([
    request("GET", "/admin/residents"),
    request("GET", "/admin/staff"),
  ]);
  if (ticket !== epoch) return "";
  view = { ...view, residents, staff };
  return renderAdminSpaces({ residents, staff });
}
async function adminBlog() {
  const ticket = epoch;
  const blog = await request("GET", "/admin/blog");
  if (ticket !== epoch) return "";
  view = { ...view, blog };
  return renderAdminBlog(blog);
}

const demoConfig = {
  offline: false,
  failNext: false,
  latency: 180,
  uploadFailure: false,
};

function toolsDrawer() {
  draftFields();
  openDrawer(
    /* HTML */ `<div class="drawer-backdrop" data-action="backdrop">
      <aside
        class="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tools-title"
      >
        <header class="drawer-header">
          <div>
            <p class="eyebrow">DEMO STUDIO</p>
            <h2 id="tools-title">체험 안내와 도구</h2>
          </div>
          ${btn(
            icon("close"),
            "close-modal",
            "icon-button",
            'aria-label="닫기"',
          )}
        </header>
        <div class="drawer-body">
          <section>
            <h3>이 순서로 둘러보세요</h3>
            <ol class="tour-list">
              <li><b>가족</b> — 소식과 자료를 확인해요.</li>
              <li><b>직원</b> — 샘플 자료로 소식을 게시해요.</li>
              <li><b>가족</b> — 새 소식이 도착했는지 확인해요.</li>
              <li><b>관리자</b> — 담당 배정·중단을 바꿔보세요.</li>
            </ol>
          </section>
          ${notice(
            "실제 인증·서버·외부 발송 없이 작동합니다. 계정과 자료는 모두 가상이며, 이 브라우저에서만 변경됩니다. 공개 샘플 파일에는 실제 접근 보안이 적용되지 않습니다.",
          )}
          <section>
            <h3>연결과 오류 체험</h3>
            <label class="check-row"
              ><input
                id="demo-offline"
                type="checkbox"
                ${demoConfig.offline ? "checked" : ""}
              /><span
                ><strong>오프라인 체험</strong
                ><small>다음 API 요청부터 연결 오류를 표시해요.</small></span
              ></label
            ><label class="check-row"
              ><input
                id="demo-failnext"
                type="checkbox"
                ${demoConfig.failNext ? "checked" : ""}
              /><span
                ><strong>다음 요청 한 번 실패</strong
                ><small>재시도 후 회복되는 흐름을 확인해요.</small></span
              ></label
            ><label class="check-row"
              ><input
                id="demo-upload-failure"
                type="checkbox"
                ${demoConfig.uploadFailure ? "checked" : ""}
              /><span
                ><strong>다음 첨부 한 번 실패</strong
                ><small>직원 작성 화면에서 자료를 추가해보세요.</small></span
              ></label
            ><label class="field"
              ><span>샘플 응답 속도</span
              ><select id="demo-latency">
                <option
                  value="180"
                  ${demoConfig.latency === 180 ? "selected" : ""}
                >
                  보통 · 0.18초
                </option>
                <option
                  value="1200"
                  ${demoConfig.latency === 1200 ? "selected" : ""}
                >
                  느린 연결 · 1.2초
                </option>
                <option value="0" ${demoConfig.latency === 0 ? "selected" : ""}>
                  즉시
                </option>
              </select></label
            >
          </section>
          <section>
            <div class="section-heading">
              <h3>API 요청 기록</h3>
              ${pill("가상 응답")}
            </div>
            <p class="small muted">
              화면과 데이터 계층을 분리했습니다. 실제 서버 전송은 하지 않으며
              요청 본문은 기록하지 않습니다.
            </p>
            <div
              id="api-log"
              class="api-log"
              tabindex="0"
              role="region"
              aria-label="API 요청 기록"
            >
              ${apiLog()}
            </div>
          </section>
          ${
            session()
              ? `<section>${btn(icon("logout", 17) + " 체험 계정 로그아웃", "logout")}</section>`
              : ""
          }
          <section class="reset-section">
            <h3>처음 상태로 돌아가기</h3>
            <p class="small muted">
              이 브라우저의 샘플 변경사항과 임시저장을 모두 지웁니다.
            </p>
            ${btn(
              icon("refresh", 17) + " 샘플 데이터 초기화",
              "reset-demo",
              "danger",
            )}
          </section>
          <p class="small muted">
            직원 역할·공간 삭제 단계·입력 한도는 동선 검토를 위한 설계
            제안입니다. 운영 정책 승인이나 실서비스 보안 검증을 의미하지
            않습니다.
          </p>
        </div>
      </aside>
    </div>`,
  );
}
function apiLog() {
  return (
    api
      .getLog()
      .slice(0, 12)
      .map(
        (l) =>
          /* HTML */ `<div class="api-row">
            <span class="api-method">${esc(l.method)}</span
            ><code>${esc(l.path)}</code
            ><span
              class="${
                l.status >= 400 || l.status === 0 ? "api-error" : "api-success"
              }"
              >${l.status || "연결 실패"}</span
            ><small>${l.duration}ms</small>
          </div>`,
      )
      .join("") ||
    '<p class="small muted">화면을 조작하면 요청이 기록됩니다.</p>'
  );
}
let lastLogSeen = "";
api.onChange?.(() => {
  const latest = api.getLog()[0],
    key = latest ? latest.time + latest.method + latest.path : "";
  if (key !== lastLogSeen) {
    lastLogSeen = key;
    if (latest?.status === 503) {
      demoConfig.failNext = false;
      if ($("#demo-failnext")) $("#demo-failnext").checked = false;
    }
  }
  if ($("#api-log")) $("#api-log").innerHTML = apiLog();
});
async function showMedia(id) {
  const ticket = epoch;
  const route = currentRoute();
  const accountId = session()?.accountId;
  const related =
    view.post?.attachments.filter((x) => x.type === "image") || [];
  const a = await request("GET", `/attachments/${id}`);
  if (
    ticket !== epoch ||
    route !== currentRoute() ||
    accountId !== session()?.accountId
  )
    return;
  const index = related.findIndex((x) => x.id === id);
  const content =
    a.type === "image"
      ? /* HTML */ `<div class="media-stage">
            <img id="zoom-image" src="${esc(a.url)}" alt="${esc(a.name)}" />
          </div>
          <p class="small muted">
            샘플 일러스트 · ${index + 1} / ${related.length}
          </p>`
      : a.type === "pdf"
        ? `<iframe class="pdf-viewer" src="${esc(a.url)}" title="샘플 PDF 미리보기"></iframe><p class="small muted">미리보기가 보이지 않으면 아래에서 내려받아 확인하세요.</p>`
        : `<video class="modal-video" src="${esc(a.url)}" controls playsinline aria-label="샘플 영상 재생"></video>`;
  openModal(
    esc(a.name),
    content,
    (a.type === "image" ? btn("확대 / 축소", "zoom", "secondary") : "") +
      (related.length > 1
        ? btn(
            "이전",
            "media",
            "secondary",
            `data-id="${esc(related[(index + related.length - 1) % related.length].id)}"`,
          ) +
          btn(
            "다음",
            "media",
            "secondary",
            `data-id="${esc(related[(index + 1) % related.length].id)}"`,
          )
        : "") +
      btn(
        icon("download", 17) + " 다운로드",
        "download",
        "primary",
        `data-id="${esc(id)}"`,
      ),
    true,
  );
}
function staffModal(id) {
  const s = view.staff?.find((s) => s.id === id) || {
    name: "",
    accountId: "",
    residentIds: [],
    permissions: { view: true, post: true, delete: false },
    status: "active",
  };
  view.editingStaff = s;
  openModal(
    id ? "직원 정보와 담당 배정" : "새 직원 등록",
    /* HTML */ `<form id="staff-form" class="form" data-form="staff">
      ${field(
        "직원 이름",
        "name",
        s.name,
        'required maxlength="40" placeholder="가상 이름"',
      )}${field(
        "개인 계정 ID",
        "accountId",
        s.accountId,
        `${id ? "readonly" : ""} required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_\\-]{3,50}" placeholder="sample-staff03"`,
      )}${
        id
          ? /* HTML */ `<label class="field"
              ><span>이용 상태</span
              ><select name="status">
                <option
                  value="active"
                  ${s.status === "active" ? "selected" : ""}
                >
                  이용 중
                </option>
                <option
                  value="suspended"
                  ${s.status === "suspended" ? "selected" : ""}
                >
                  이용 중단
                </option>
              </select></label
            >`
          : ""
      }
      <fieldset class="fieldset">
        <legend>사용 가능한 기능</legend>
        ${[
          ["view", "자료 열람"],
          ["post", "소식 게시·수정"],
          ["delete", "소식 철회"],
        ]
          .map(
            ([k, l]) =>
              `<label class="check-row"><input name="permission-${k}" type="checkbox" ${s.permissions[k] ? "checked" : ""}><span>${l}</span></label>`,
          )
          .join("")}
      </fieldset>
      ${assignmentPicker(
        "담당 어르신",
        "residentIds",
        view.residents.filter((r) =>
          id
            ? !["deleted", "deletion_pending"].includes(r.status)
            : r.status === "active",
        ),
        s.residentIds,
        (r) => r.name + " 어르신",
        (r) => r.familyAccountId,
      )}
      ${notice(
        "배정·기능·이용 상태가 변경되면 이 직원의 기존 세션은 다시 로그인해야 합니다.",
      )}
      <div class="form-error" role="alert"></div>
    </form>`,
    btn("취소", "close-modal") +
      '<button class="button primary" type="submit" form="staff-form">변경사항 저장</button>',
  );
}
function spaceModal(id) {
  const r = view.residents?.find((r) => r.id === id) || {
    name: "",
    familyAccountId: "",
    staffIds: [],
  };
  view.editingResident = r;
  openModal(
    id ? "어르신 공간 관리" : "가족을 위한 공간 만들기",
    /* HTML */ `<form id="space-form" class="form" data-form="space">
        ${field(
          "어르신 이름",
          "name",
          r.name,
          'required maxlength="40" placeholder="가상 이름"',
        )}${field(
          "가족 공용 계정 ID",
          "familyAccountId",
          r.familyAccountId,
          `${id ? "readonly" : ""} required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_\\-]{3,50}" placeholder="sample-family05"`,
        )}
        ${assignmentPicker(
          "담당 직원",
          "staffIds",
          view.staff,
          r.staffIds,
          (s) => s.name,
          (s) => s.accountId,
          (s) =>
            s.status === "active" && s.permissions.view && s.permissions.post
              ? "게시 가능"
              : "게시 불가",
        )}
        ${notice(
          "한 어르신의 가족들은 이 공용 계정을 함께 사용합니다. 가족별 가입·초대는 필요하지 않아요.",
        )}
        <div class="form-error" role="alert"></div>
      </form>
      ${
        id
          ? /* HTML */ `<hr />
              <div class="space-management">
                <h3>계정 복구와 공간 삭제</h3>
                <p class="small muted">
                  공용 계정 재발급은 모든 가족의 기존 세션을 종료합니다.
                </p>
                <div class="form-actions">
                  ${btn(
                    "공용 계정 재발급",
                    "reset-password",
                    "secondary",
                    `data-id="${r.id}"`,
                  )}${btn(
                    "공간 삭제 요청",
                    "delete-space",
                    "danger",
                    `data-id="${r.id}"`,
                  )}
                </div>
              </div>`
          : ""
      }`,
    btn("닫기", "close-modal") +
      '<button class="button primary" type="submit" form="space-form">공간 저장</button>',
  );
}
async function addSample(sample, index) {
  if (!draft) return;
  if (index == null && draft.attachments.length >= POST_LIMITS.attachments) {
    toast(
      `샘플 첨부는 최대 ${POST_LIMITS.attachments}개까지 선택할 수 있어요.`,
    );
    return;
  }
  draftFields();
  dirty = true;
  const attachment = {
    id: crypto.randomUUID(),
    name: sampleNames[sample],
    type: sampleTypes[sample],
    url: sampleTypes[sample] === "image" ? `./assets/${sample}.svg` : "",
    status: "processing",
    sample,
  };
  if (index == null) {
    index = draft.attachments.length;
    draft.attachments.push(attachment);
  } else draft.attachments[index] = attachment;
  const originalDraft = draft;
  const redraw = () => {
    if ($("#draft-attachments"))
      $("#draft-attachments").innerHTML = draftAttachments();
  };
  redraw();
  const fail = demoConfig.uploadFailure;
  demoConfig.uploadFailure = false;
  try {
    const result = await request("POST", "/uploads", {
      residentId: draft.residentId,
      sample,
      simulateFailure: fail,
    });
    if (draft === originalDraft) {
      const at = draft.attachments.findIndex((a) => a.id === attachment.id);
      if (at >= 0) draft.attachments[at] = { ...result, sample };
    }
  } catch (err) {
    if (draft === originalDraft) {
      attachment.status = "failed";
      attachment.error = err.message;
    }
    toast(err.message, "error");
  } finally {
    if (draft === originalDraft) {
      redraw();
      if (
        $("#compose-error") &&
        !draft.attachments.some((a) => a.status !== "ready")
      )
        $("#compose-error").textContent = "";
    }
  }
}
async function withButton(button, fn) {
  if (button?.dataset.busy) return;
  const originalFocus = document.activeElement;
  const old = button?.disabled;
  if (button) {
    button.dataset.busy = "true";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
  }
  try {
    await fn();
  } catch (err) {
    toast(
      err.message || "요청을 처리하지 못했어요. 다시 시도해주세요.",
      "error",
    );
  } finally {
    preserveReturnFocus(originalFocus);
    if (button) {
      delete button.dataset.busy;
      button.disabled = old;
      button.removeAttribute("aria-busy");
    }
  }
}
// UI-only actions stay responsive; request actions share duplicate-submit protection.
const immediateActions = {
  "reset-list": (button) => {
    const list = button.closest("[data-list-scope]");
    const search = $("[data-list-search]", list);
    const status = $("[data-list-status]", list);
    if (search) search.value = "";
    if (status) status.value = "all";
    filterList(list);
    search?.focus();
  },
  backdrop: dismissBackdrop,
  "close-modal": dismissModal,
  tools: showDemoTools,
  "login-role": selectLoginRole,
  "switch-role": switchRole,
  filter: updateFeedFilter,
  "clear-filter": updateFeedFilter,
  "new-staff": manageStaff,
  "edit-staff": manageStaff,
  "new-space": manageSpace,
  "edit-space": manageSpace,
  "add-sample": attachSample,
  "retry-upload": retryAttachment,
  "remove-attachment": removeAttachment,
  zoom: toggleImageZoom,
  "review-draft": reviewDraft,
  "blog-article": showBlogArticle,
  "reset-demo": resetDemo,
};
const requestActions = {
  login: login,
  reload: reloadView,
  logout: logout,
  "confirm-run": confirmAction,
  media: openAttachment,
  download: downloadAttachment,
  "save-draft": saveDraft,
  "resume-draft": resumeDraft,
  "edit-post": editPost,
  "pin-post": togglePostPin,
  "delete-post": withdrawPost,
  "toggle-space": toggleSpace,
  "reset-password": resetFamilyAccount,
  "delete-space": requestSpaceDeletion,
  "complete-deletion": completeDeletion,
  "refresh-blog": refreshBlog,
  "fail-blog": refreshBlog,
};

async function onAction(button, event) {
  const action = button.dataset.action;
  if (publishing) {
    toast(
      "가족 공간에 소식을 전하고 있어요. 결과를 확인한 뒤 이동해주세요.",
      "info",
    );
    return;
  }
  const immediate = immediateActions[action];
  if (immediate) {
    await immediate(button, event);
    return;
  }
  const requestAction = requestActions[action];
  if (requestAction)
    await withButton(button, () => requestAction(button, event));
}

async function dismissBackdrop(button, event) {
  if (event.target === button) dismissOverlay();
  return;
}

async function dismissModal() {
  dismissOverlay();
  return;
}

async function showDemoTools() {
  toolsDrawer();
  return;
}

async function selectLoginRole(button) {
  currentRole = button.dataset.role;
  $(".role-tabs")
    .querySelectorAll("button")
    .forEach((b) => {
      const selected = b.dataset.role === currentRole;
      b.classList.toggle("active", selected);
      b.setAttribute("aria-pressed", String(selected));
    });
  renderAccounts();
  return;
}

async function switchRole() {
  draftFields();
  const go = () => {
    dirty = false;
    draft = null;
    filter = "all";
    query = "";
    closeOverlay();
    navigate("/login");
  };
  if (dirty)
    confirm(
      "작성 중인 내용을 잠시 두고 갈까요?",
      "<p>저장하지 않은 변경사항은 사라집니다. 임시저장한 내용은 해당 직원 계정에서 다시 열 수 있어요.</p>",
      "역할 바꾸기",
      go,
    );
  else go();
  return;
}

async function updateFeedFilter(button) {
  const { action } = button.dataset;

  filter = action === "clear-filter" ? "all" : button.dataset.filter;
  if (action === "clear-filter") query = "";
  $("#post-search").value = query;
  document.querySelectorAll('[data-action="filter"]').forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === filter);
    b.setAttribute("aria-pressed", String(b.dataset.filter === filter));
  });
  $("#feed-results").innerHTML = feedResults();
  $("#feed-count").textContent = `${filteredPosts().length}개의 소식`;
  return;
}

async function manageStaff(button) {
  const { id } = button.dataset;

  staffModal(id);
  return;
}

async function manageSpace(button) {
  const { id } = button.dataset;

  spaceModal(id);
  return;
}

async function attachSample(button) {
  await addSample(button.dataset.sample);
  return;
}

async function retryAttachment(button) {
  const index = Number(button.dataset.index);
  await addSample(draft.attachments[index].sample, index);
  return;
}

async function removeAttachment(button) {
  draftFields();
  draft.attachments.splice(Number(button.dataset.index), 1);
  dirty = true;
  $("#draft-attachments").innerHTML = draftAttachments();
  return;
}

async function toggleImageZoom() {
  $("#zoom-image").classList.toggle("zoomed");
  return;
}

async function reviewDraft() {
  draftFields();
  const err = validateDraft(draft);
  if (err) {
    $("#compose-error").textContent = err;
    $('[data-form="compose"]').reportValidity();
    return;
  }
  navigate("/review");
  return;
}

async function showBlogArticle(button) {
  const p = view.blog.items[Number(button.dataset.index)];
  openModal(
    "센터의 이야기",
    /* HTML */ `<img
        class="blog-dialog-art"
        src="./assets/${p.art || "autumn"}.svg"
        alt="샘플 일러스트"
      />
      <p class="eyebrow">SAMPLE CENTER STORY</p>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.summary)}</p>
      ${notice(
        "실제 게시글이 아닌 블로그 연결 흐름을 위한 샘플입니다. 실제 블로그는 새 창에서 열 수 있어요.",
      )}`,
    btn("닫기", "close-modal") +
      `<a class="button primary" href="${esc(view.blog.url)}" target="_blank" rel="noopener noreferrer">실제 센터 블로그 열기</a>`,
  );
  return;
}

async function resetDemo() {
  confirm(
    "샘플 데이터를 처음으로 되돌릴까요?",
    "<p>이 브라우저에서 만든 소식, 계정, 설정과 임시저장이 모두 지워집니다.</p>",
    "초기화하기",
    () => {
      api.reset();
      clearPasswordRecoveryCooldown(api);
      Object.assign(demoConfig, {
        offline: false,
        failNext: false,
        latency: 180,
        uploadFailure: false,
      });
      api.configure(demoConfig);
      draft = null;
      dirty = false;
      filter = "all";
      query = "";
      closeOverlay();
      navigate("/login");
      toast("샘플 데이터를 처음 상태로 되돌렸어요.");
    },
    true,
  );
  return;
}

async function login(button) {
  const { id } = button.dataset;

  if (busy) return;
  busy = true;
  try {
    const ticket = ++epoch;
    const route = currentRoute();
    await request("POST", "/auth/login", { accountId: id });
    if (ticket !== epoch || currentRoute() !== route) return;
    draft = null;
    dirty = false;
    filter = "all";
    query = "";
    navigate(homeRoute());
  } finally {
    busy = false;
  }
  return;
}

async function reloadView() {
  render();
  return;
}

async function logout() {
  const leave = async () => {
    await request("POST", "/auth/logout");
    draft = null;
    dirty = false;
    closeOverlay();
    navigate("/login");
    toast("로그아웃했어요.");
  };
  if (dirty)
    confirm(
      "작성 중인 내용을 두고 로그아웃할까요?",
      "<p>임시저장하지 않은 내용은 사라집니다.</p>",
      "로그아웃",
      leave,
    );
  else await leave();
  return;
}

async function confirmAction() {
  await runConfirmation();
  return;
}

async function openAttachment(button) {
  const { id } = button.dataset;

  await showMedia(id);
  return;
}

async function downloadAttachment(button) {
  const { id } = button.dataset;

  const a = await request("GET", `/attachments/${id}`);
  const anchor = document.createElement("a");
  anchor.href = a.url;
  anchor.download = a.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  toast("샘플 자료 다운로드를 시작했어요.");
  return;
}

async function saveDraft() {
  draftFields();
  if (draft.attachments.some((a) => a.status !== "ready"))
    throw new Error(
      "준비되지 않은 첨부를 재시도하거나 제거한 뒤 임시저장해주세요.",
    );
  const saving = draft;
  const snapshot = JSON.stringify(saving);
  const accountId = session()?.accountId;
  await request("PUT", "/drafts/current", JSON.parse(snapshot));
  if (draft !== saving || session()?.accountId !== accountId) return;
  // Editing can continue while a save is pending. Only clear the saved revision.
  if (JSON.stringify(draft) === snapshot) {
    dirty = false;
    const status = $("#draft-status");
    if (status)
      status.textContent = "임시저장 완료 · 다음에 이어서 작성할 수 있어요.";
  }
  toast("임시저장했어요.");
  return;
}

async function resumeDraft() {
  draft = await request("GET", "/drafts/current");
  if (draft) {
    draft.idempotencyKey = crypto.randomUUID();
    dirty = false;
    navigate("/compose");
  }
  return;
}

async function editPost() {
  const p = view.post;
  draft = { ...p, editId: p.id, idempotencyKey: crypto.randomUUID() };
  dirty = false;
  navigate(`/compose/${p.residentId}`);
  return;
}

async function togglePostPin() {
  const p = view.post;
  await request("PATCH", `/posts/${p.id}`, {
    ...p,
    pinned: !p.pinned,
    confirmedTarget: true,
    confirmedSharing: true,
    confirmedContent: true,
  });
  toast(p.pinned ? "고정을 해제했어요." : "가족 홈 상단에 고정했어요.");
  render();
  return;
}

async function withdrawPost() {
  const p = view.post;
  confirm(
    "이 소식을 철회할까요?",
    `<p><strong>${esc(p.title)}</strong></p><p>가족 화면에서 소식과 첨부자료가 사라집니다. 이미 내려받은 사본은 회수할 수 없습니다.</p>`,
    "철회하기",
    async () => {
      await request("DELETE", `/posts/${p.id}`, { version: p.version });
      closeOverlay();
      navigate(`/resident/${p.residentId}`);
      toast("소식을 철회했어요.");
    },
    true,
  );
  return;
}

async function toggleSpace(button) {
  const { id } = button.dataset;

  const r = view.residents.find((r) => r.id === id),
    suspend = r.status === "active";
  confirm(
    suspend ? "공간 이용을 중단할까요?" : "이 공간을 다시 이용할까요?",
    /* HTML */ `<p>
        <strong>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</strong>
      </p>
      <p>
        ${
          suspend
            ? "가족과 담당 직원의 새 요청이 차단됩니다. 자료는 삭제되지 않아요."
            : "자료는 그대로 유지됩니다. 가족과 직원은 다시 로그인해주세요."
        }
      </p>`,
    suspend ? "이용 중단" : "다시 이용",
    async () => {
      await request("PATCH", `/admin/residents/${r.id}`, {
        version: r.version,
        status: suspend ? "suspended" : "active",
      });
      closeOverlay();
      render();
      toast(suspend ? "공간 이용을 중단했어요." : "공간 이용을 재개했어요.");
    },
    suspend,
  );
  return;
}

async function resetFamilyAccount(button) {
  const { id } = button.dataset;

  const r = view.residents.find((r) => r.id === id);
  confirm(
    "가족 공용 계정을 재발급할까요?",
    `<p><strong>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</strong></p><p>가족 모두가 사용하는 계정입니다. 모든 기존 가족 세션을 종료하며, 가족들에게 다시 안내해야 해요.</p>`,
    "재발급 체험",
    async () => {
      const c = await request("POST", `/admin/residents/${id}/reset-password`);
      openModal(
        "샘플 계정을 재발급했어요",
        /* HTML */ `<p>공용 계정: <strong>${esc(c.accountId)}</strong></p>
          <div class="credential-example">
            <small>시연용 임시 비밀번호</small
            ><strong>${esc(c.temporaryPassword)}</strong>
          </div>
          ${notice(
            "실제 인증정보가 아닙니다. 이 데모는 계정 선택으로 로그인하며 기존 샘플 세션의 종료만 체험합니다.",
            "warning",
          )}`,
        btn("확인", "close-modal", "primary"),
      );
    },
  );
  return;
}

async function requestSpaceDeletion(button) {
  const { id } = button.dataset;

  const r = view.residents.find((r) => r.id === id);
  openModal(
    "공간 삭제 요청",
    /* HTML */ `<p>
        <strong>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</strong>의
        가족·직원 접근을 차단하고 삭제 진행 상태로 전환합니다.
      </p>
      ${notice(
        "실제 저장소와 백업 파기는 구현하지 않았습니다. 데모에서는 샘플 삭제 단계만 확인합니다.",
        "warning",
      )}
      <form id="delete-space-form" data-form="delete-space">
        ${field(
          `확인을 위해 ‘${esc(r.name)}’ 입력`,
          "confirmName",
          "",
          'required autocomplete="off"',
        )}<input type="hidden" name="residentId" value="${esc(id)}" />
        <div class="form-error" role="alert"></div>
      </form>`,
    btn("취소", "close-modal") +
      '<button type="submit" form="delete-space-form" class="button danger">삭제 요청</button>',
  );
  return;
}

async function completeDeletion(button) {
  const { id } = button.dataset;

  await request("POST", `/admin/deletions/${id}/complete`);
  toast("샘플 데이터 삭제 단계를 완료했어요.");
  render();
  return;
}

async function refreshBlog(button) {
  const { action } = button.dataset;

  await request("POST", "/admin/blog/refresh", {
    fail: action === "fail-blog",
  });
  toast(
    action === "fail-blog"
      ? "갱신 실패: 마지막 성공 자료를 유지해요."
      : "새 샘플 글을 불러왔어요.",
    action === "fail-blog" ? "error" : "success",
  );
  render();
  return;
}

const formHandlers = {
  publish: publishDraft,
  staff: saveStaff,
  space: saveSpace,
  "delete-space": deleteSpace,
  blog: saveBlogConnection,
};

async function publishDraft(data) {
  const err = validateDraft(draft);
  if (err) throw new Error(err);
  const publishingDraft = draft;
  const accountId = session()?.accountId;
  const body = {
    ...structuredClone(publishingDraft),
    confirmedTarget: data.has("confirmedTarget"),
    confirmedSharing: data.has("confirmedSharing"),
    confirmedContent: data.has("confirmedContent"),
  };
  publishing = true;
  try {
    const result = await request(
      publishingDraft.editId ? "PATCH" : "POST",
      publishingDraft.editId
        ? `/posts/${publishingDraft.editId}`
        : `/residents/${publishingDraft.residentId}/posts`,
      body,
    );
    if (draft !== publishingDraft || session()?.accountId !== accountId) return;
    // A successful publish is not reported as failed if draft cleanup loses connection.
    const cleanup = await request("DELETE", "/drafts/current").then(
      () => true,
      () => false,
    );
    draft = null;
    dirty = false;
    filter = "all";
    query = "";
    navigate(`/post/${result.id}`);
    toast(
      cleanup
        ? "가족 공간에 소식을 전했어요."
        : "소식은 게시됐어요. 저장된 초안 정리는 다시 확인해주세요.",
    );
  } finally {
    publishing = false;
  }
}

async function saveStaff(data) {
  const s = view.editingStaff,
    body = {
      name: String(data.get("name")).trim(),
      accountId: String(data.get("accountId")).trim(),
      residentIds: data.getAll("residentIds"),
      permissions: {
        view: data.has("permission-view"),
        post: data.has("permission-post"),
        delete: data.has("permission-delete"),
      },
    };
  if (
    !body.permissions.view &&
    (body.permissions.post || body.permissions.delete)
  )
    throw new Error(
      "게시·수정 또는 철회를 허용하려면 자료 열람도 허용해주세요.",
    );
  if (s.id) {
    body.version = s.version;
    body.status = data.get("status");
  }

  const persist = async () => {
    await request(
      s.id ? "PATCH" : "POST",
      s.id ? `/admin/staff/${s.id}` : "/admin/staff",
      body,
    );
    closeOverlay();
    render();
    toast("직원 정보와 담당 배정을 저장했어요.");
  };
  if (s.id) {
    const nextStaff = view.staff.map((staff) =>
      staff.id === s.id ? { ...staff, ...body } : staff,
    );
    if (confirmPublisherChange(nextStaff, persist)) return;
  }
  await persist();
}

function confirmPublisherChange(nextStaff, persist) {
  const uncovered = getNewlyUncoveredPostingResidents(
    view.residents,
    view.staff,
    nextStaff,
  );
  if (!uncovered.length) return false;
  confirm(
    "소식을 게시할 담당 직원이 없어져요",
    notice(
      "아래 가족 공간에 소식을 게시할 직원이 남지 않습니다. 취소하여 다른 직원을 배정하거나, 이 변경을 그대로 저장할 수 있어요.",
      "warning",
    ) +
      "<ul>" +
      uncovered
        .map(
          (r) => `<li>${esc(r.name)} 어르신 · ${esc(r.familyAccountId)}</li>`,
        )
        .join("") +
      "</ul>",
    "변경사항 저장",
    persist,
    false,
    true,
  );
  return true;
}

async function saveSpace(data) {
  const r = view.editingResident;
  const body = {
    name: String(data.get("name")).trim(),
    familyAccountId: String(data.get("familyAccountId")).trim(),
    staffIds: data.getAll("staffIds"),
  };
  if (r.id) body.version = r.version;
  const persist = async () => {
    await request(
      r.id ? "PATCH" : "POST",
      r.id ? `/admin/residents/${r.id}` : "/admin/residents",
      body,
    );
    closeOverlay();
    await render();
    toast(
      r.id
        ? "공간 정보를 저장했어요."
        : "새 가족 공간을 만들었어요. 역할 선택에서 체험할 수 있어요.",
    );
  };
  if (r.id) {
    const nextStaff = view.staff.map((staff) => ({
      ...staff,
      residentIds: body.staffIds.includes(staff.id)
        ? [...new Set([...staff.residentIds, r.id])]
        : staff.residentIds.filter((id) => id !== r.id),
    }));
    if (confirmPublisherChange(nextStaff, persist)) return;
  }
  await persist();
}

async function deleteSpace(data) {
  await request("DELETE", `/admin/residents/${data.get("residentId")}`, {
    confirmName: data.get("confirmName"),
  });
  closeOverlay();
  navigate("/admin");
  toast("가족·직원의 접근을 차단하고 삭제 요청을 접수했어요.");
}

async function saveBlogConnection(data) {
  await request("PATCH", "/admin/blog", {
    url: String(data.get("url")).trim(),
  });
  toast("전체 가족 화면의 블로그 연결을 저장했어요.");
  render();
}

async function submitForm(form, event) {
  event.preventDefault();
  if (form.dataset.busy) return;
  if (!form.reportValidity()) return;
  const data = new FormData(form),
    type = form.dataset.form;
  const errors = $(".form-error", form);
  if (errors) errors.textContent = "";
  form.dataset.busy = "true";
  const submit = event.submitter;
  if (submit) {
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
  }
  const submitLabel = submit?.innerHTML;
  if (submit && type === "publish") submit.textContent = "가족에게 전하는 중…";
  try {
    await formHandlers[type]?.(data);
  } catch (err) {
    if (errors) {
      errors.textContent = err.message;
      errors.scrollIntoView({ block: "nearest" });
    } else toast(err.message, "error");
  } finally {
    delete form.dataset.busy;
    if (submit) {
      submit.disabled = false;
      submit.removeAttribute("aria-busy");
      if (type === "publish") submit.innerHTML = submitLabel;
    }
  }
}
document.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (
    action &&
    !(action.dataset.action === "backdrop" && event.target !== action)
  ) {
    event.preventDefault();
    onAction(action, event).catch((err) => toast(err.message, "error"));
    return;
  }
  const anchor = event.target.closest('a[href^="#/"]');
  if (!anchor) return;
  const next = anchor.getAttribute("href").slice(1);
  if (publishing) {
    event.preventDefault();
    toast(
      "가족 공간에 소식을 전하고 있어요. 결과를 확인한 뒤 이동해주세요.",
      "info",
    );
    return;
  }
  if (
    dirty &&
    draft &&
    ["/compose", "/review"].some((p) => currentRoute().startsWith(p)) &&
    !["/compose", "/review"].some((p) => next.startsWith(p))
  ) {
    event.preventDefault();
    draftFields();
    confirm(
      "작성 화면에서 나갈까요?",
      "<p>저장하지 않은 내용은 사라집니다. 계속 작성하거나 임시저장한 뒤 이동해주세요.</p>",
      "나가기",
      () => {
        draft = null;
        dirty = false;
        closeOverlay();
        navigate(next);
      },
    );
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (form) submitForm(form, event);
});
document.addEventListener("input", (event) => {
  const list = event.target.closest("[data-list-scope]");
  if (list && event.target.matches("[data-list-search]")) filterList(list);
  const picker = event.target.closest("[data-assignment-picker]");
  if (picker) filterAssignments(picker);
  if (event.target.id === "post-search") {
    query = event.target.value;
    $("#feed-results").innerHTML = feedResults();
    $("#feed-count").textContent = `${filteredPosts().length}개의 소식`;
  }
  if (event.target.closest('[data-form="compose"]')) {
    dirty = true;
    draftFields();
  }
});
document.addEventListener("change", (event) => {
  const el = event.target;
  const list = el.closest("[data-list-scope]");
  if (list && el.matches("[data-list-status]")) filterList(list);
  const picker = el.closest("[data-assignment-picker]");
  if (picker) filterAssignments(picker);
  if (
    el.id === "demo-offline" ||
    el.id === "demo-failnext" ||
    el.id === "demo-latency"
  ) {
    if (el.id === "demo-offline") demoConfig.offline = el.checked;
    if (el.id === "demo-failnext") demoConfig.failNext = el.checked;
    if (el.id === "demo-latency") demoConfig.latency = Number(el.value);
    api.configure({
      offline: demoConfig.offline,
      failNext: demoConfig.failNext,
      latency: demoConfig.latency,
    });
    toast("체험 조건을 적용했어요.");
  }
  if (el.id === "demo-upload-failure") demoConfig.uploadFailure = el.checked;
  if (el.name === "residentId" && el.closest('[data-form="compose"]')) {
    const next = el.value,
      previous = draft.residentId;
    el.value = previous;
    confirm(
      "전달할 어르신을 바꿀까요?",
      "<p>다른 공간으로 자료가 잘못 전달되지 않도록 현재 첨부와 내용을 비우고 새로 작성합니다.</p>",
      "대상 바꾸기",
      () => {
        draft = newDraft(next);
        dirty = false;
        closeOverlay();
        navigate(`/compose/${next}`);
      },
    );
  }
});
document.addEventListener("keydown", trapOverlayKeys);
window.addEventListener("hashchange", () => {
  if (publishing && currentRoute() !== "/review") {
    history.replaceState(null, "", "#/review");
    toast("게시 결과를 확인한 뒤 이동해주세요.", "info");
    return;
  }
  window.scrollTo({ top: 0 });
  render();
});
window.addEventListener("beforeunload", (event) => {
  if (dirty || publishing) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("storage", (event) => {
  // Recovery is a disposable journey, not a live content list. Other tabs must
  // not discard its proof or in-progress password; the API rechecks account
  // status and authVersion at verification and completion.
  if (currentRoute() === "/password-reset") return;
  if (event.key?.startsWith("grace-together.demo.") && !dirty && !publishing)
    render();
});
render();
