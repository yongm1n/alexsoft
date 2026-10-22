import { POST_LIMITS } from "../domain/content-policy.js";
import { getUncoveredPostingResidents } from "../domain/staff-coverage.js";
import { createPasswordRecovery } from "./password-recovery.js";
import {
  createSeed,
  DB_KEY,
  SESSION_KEY,
  DB_VERSION,
  SAMPLE_FILES,
  sampleBlogItems,
} from "./seed.js";

const clone = (value) =>
  value == null ? value : JSON.parse(JSON.stringify(value));
const error = (status, code, message) =>
  Object.assign(new Error(message), { status, code });
const deny = () => {
  throw error(403, "FORBIDDEN", "이 자료를 이용할 권한이 없습니다.");
};
const missing = () => {
  throw error(404, "NOT_FOUND", "요청한 항목을 찾을 수 없습니다.");
};
const now = () => new Date().toISOString();
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const publicAccount = ({ authVersion, ...account }) => account;
const publicAttachment = ({ residentId, creatorId, ...attachment }) =>
  attachment;
const publicPost = (p) => ({
  ...clone(p),
  attachments: p.attachments.map(publicAttachment),
});
const sessionView = (s) =>
  s
    ? Object.fromEntries(
        ["userId", "accountId", "role", "name", "residentId", "permissions"]
          .filter((k) => s[k] != null)
          .map((k) => [k, clone(s[k])]),
      )
    : null;
const text = (v, min, max, label) => {
  if (typeof v !== "string" || v.trim().length < min || v.trim().length > max)
    throw error(
      422,
      "VALIDATION",
      `${label}: ${min}~${max}자로 입력해 주세요. (데모 검증 기준)`,
    );
  return v.trim();
};
function checkVersion(item, version) {
  if (item.version !== version)
    throw error(
      409,
      "VERSION_CONFLICT",
      "다른 변경이 먼저 저장되었습니다. 최신 내용을 다시 확인해 주세요.",
    );
}
function blogUrl(value) {
  if (
    typeof value !== "string" ||
    !/^https:\/\/blog\.naver\.com\/[a-zA-Z0-9_-]+\/?$/.test(value)
  )
    throw error(
      422,
      "INVALID_BLOG_URL",
      "https://blog.naver.com/블로그ID 형식의 주소를 입력해 주세요.",
    );
  return value.replace(/\/$/, "");
}

/** In-browser workflow simulator, not a secure backend. No real credentials or network calls. */
export function createMockApi({
  storage,
  delay = 180,
  recoveryNow = Date.now,
} = {}) {
  let store = storage;
  let storageStatus = {
    persistent: Boolean(store),
    reason: store ? null : "이 브라우저에서는 메모리로만 저장합니다.",
  };
  let db = createSeed();
  let session = null;
  let config = { offline: false, failNext: false, latency: delay };
  const listeners = new Set();
  let log = [];
  // Recovery state stays outside db: failed guesses must survive db rollback,
  // while reload/reset intentionally discards all simulated delivery proofs.
  const recovery = createPasswordRecovery({
    now: recoveryNow,
    getAccount(accountId) {
      const account = db.accounts.find((a) => a.id === accountId);
      if (!account || account.status !== "active") return null;
      if (account.residentId) {
        const resident = db.residents.find((r) => r.id === account.residentId);
        if (
          resident?.status !== "active" ||
          resident.familyAccountId !== account.id
        )
          return null;
      }
      return account;
    },
    onComplete(accountId) {
      revoke(accountId);
      session = null;
    },
  });
  function fallback(reason) {
    store = null;
    storageStatus = { persistent: false, reason };
  }
  function load(readSession = false) {
    if (!store) return;
    try {
      const raw = store.getItem(DB_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved.schemaVersion !== DB_VERSION ||
          !Array.isArray(saved.accounts) ||
          !Array.isArray(saved.posts) ||
          !Array.isArray(saved.residents) ||
          !Array.isArray(saved.staff) ||
          !Array.isArray(saved.uploads) ||
          !saved.drafts ||
          !saved.blog ||
          !saved.idempotency ||
          !Array.isArray(saved.deletions)
        )
          throw new Error("schema");
        db = saved;
      }
      if (readSession) {
        const savedSession = store.getItem(SESSION_KEY);
        session = savedSession ? JSON.parse(savedSession) : null;
        if (session && (!session.accountId || !session.authVersion))
          throw new Error("session");
      }
      if (!raw) persist();
    } catch {
      fallback("저장된 데모 자료를 읽지 못해 메모리 저장으로 전환했습니다.");
    }
  }
  function persist({ database = true, authentication = true } = {}) {
    if (!store) return;
    try {
      for (const [key, value] of [
        ...(database ? [[DB_KEY, db]] : []),
        ...(authentication ? [[SESSION_KEY, session]] : []),
      ]) {
        const serialized = JSON.stringify(value);
        if (store.getItem(key) !== serialized) store.setItem(key, serialized);
      }
    } catch {
      fallback(
        "브라우저 저장 공간을 사용할 수 없어 메모리에 저장합니다. 새로고침하면 변경이 사라질 수 있습니다.",
      );
    }
  }
  load(true);
  function auth() {
    if (!session)
      throw error(
        401,
        "UNAUTHENTICATED",
        "먼저 데모 계정으로 로그인해 주세요.",
      );
    const account = db.accounts.find((a) => a.id === session.accountId);
    const resident =
      account?.residentId &&
      db.residents.find((r) => r.id === account.residentId);
    if (
      !account ||
      account.status !== "active" ||
      account.authVersion !== session.authVersion ||
      (resident && resident.status !== "active")
    ) {
      session = null;
      persist({ database: false });
      throw error(
        401,
        "SESSION_REVOKED",
        "계정 또는 담당 권한이 변경되었습니다. 다시 로그인해 주세요.",
      );
    }
    return account;
  }
  function staffFor(account) {
    return db.staff.find(
      (s) => s.accountId === account.id && s.status === "active",
    );
  }
  function admin() {
    const a = auth();
    if (a.role !== "admin") deny();
    return a;
  }
  function scope(id, permission = "view") {
    const a = auth();
    const resident = db.residents.find((r) => r.id === id);
    if (!resident) missing();
    if (resident.status !== "active")
      throw error(
        403,
        "SPACE_UNAVAILABLE",
        "이 공간은 현재 이용할 수 없습니다.",
      );
    if (a.role === "family") {
      if (permission !== "view" || a.residentId !== id) deny();
    } else {
      const staff = staffFor(a);
      if (
        !staff ||
        !staff.residentIds.includes(id) ||
        !staff.permissions[permission] ||
        (permission !== "view" && !staff.permissions.view)
      )
        deny();
    }
    return resident;
  }
  function residentView(r) {
    const posts = db.posts.filter((p) => p.residentId === r.id);
    return {
      ...clone(r),
      postCount: posts.length,
      lastPostAt: posts.reduce(
        (last, p) => (last > p.createdAt ? last : p.createdAt),
        null,
      ),
    };
  }
  function postById(id, permission = "view") {
    const p = db.posts.find((p) => p.id === id);
    if (!p) missing();
    scope(p.residentId, permission);
    return p;
  }
  function revoke(accountId) {
    const a = db.accounts.find((a) => a.id === accountId);
    if (a) a.authVersion++;
  }
  function ids(value, valid, label) {
    if (
      !Array.isArray(value) ||
      new Set(value).size !== value.length ||
      value.some((id) => !valid.includes(id))
    )
      throw error(422, "VALIDATION", `${label} 선택을 확인해 주세요.`);
    return [...value];
  }
  function permissions(value) {
    if (
      !value ||
      ["view", "post", "delete"].some((k) => typeof value[k] !== "boolean")
    )
      throw error(
        422,
        "VALIDATION",
        "열람·게시·삭제 권한을 각각 지정해 주세요.",
      );
    if (!value.view && (value.post || value.delete))
      throw error(
        422,
        "VALIDATION",
        "게시·삭제 권한에는 열람 권한이 필요합니다.",
      );
    return { view: value.view, post: value.post, delete: value.delete };
  }
  function status(value) {
    if (!["active", "suspended"].includes(value))
      throw error(422, "VALIDATION", "계정 상태를 확인해 주세요.");
    return value;
  }
  function syncAssignments() {
    for (const r of db.residents)
      r.staffIds = db.staff
        .filter((s) => s.residentIds.includes(r.id))
        .map((s) => s.id);
  }
  function assignResident(r, staffIds) {
    const selected = ids(
      staffIds,
      db.staff.map((s) => s.id),
      "담당 직원",
    );
    for (const s of db.staff) {
      const before = s.residentIds.includes(r.id);
      const after = selected.includes(s.id);
      if (before !== after) {
        s.residentIds = after
          ? [...s.residentIds, r.id]
          : s.residentIds.filter((id) => id !== r.id);
        s.version++;
        revoke(s.accountId);
      }
    }
    syncAssignments();
  }
  function validateAttachments(values, residentId) {
    if (!Array.isArray(values) || values.length > POST_LIMITS.attachments)
      throw error(
        422,
        "VALIDATION",
        "첨부는 데모에서 최대 12개까지 사용할 수 있습니다.",
      );
    if (new Set(values.map((a) => a.id)).size !== values.length)
      throw error(422, "VALIDATION", "중복 첨부를 제거해 주세요.");
    return values.map((value) => {
      const a = db.uploads.find((a) => a.id === value.id);
      if (!a || a.residentId !== residentId)
        throw error(
          403,
          "ATTACHMENT_SCOPE",
          "다른 공간의 첨부를 사용할 수 없습니다.",
        );
      if (a.status !== "ready" || value.status !== "ready")
        throw error(
          422,
          "ATTACHMENT_NOT_READY",
          "실패하거나 준비 중인 첨부를 제거·재시도한 뒤 게시해 주세요.",
        );
      return clone(a);
    });
  }
  function postInput(body, residentId, previous) {
    const values = { ...previous, ...body };
    if (body.residentId && body.residentId !== residentId)
      throw error(
        422,
        "IMMUTABLE_TARGET",
        "게시물의 대상 공간을 변경할 수 없습니다.",
      );
    if (!["photo", "video", "memo", "health"].includes(values.kind))
      throw error(422, "VALIDATION", "자료 종류를 선택해 주세요.");
    const attachments = validateAttachments(
      values.attachments || [],
      residentId,
    );
    if (
      ["photo", "video"].includes(values.kind) &&
      !attachments.some(
        (a) => a.type === (values.kind === "photo" ? "image" : "video"),
      )
    )
      throw error(422, "VALIDATION", "선택한 종류의 첨부를 추가해 주세요.");
    if (
      body.confirmedTarget !== true ||
      body.confirmedSharing !== true ||
      body.confirmedContent !== true
    )
      throw error(
        422,
        "CONFIRMATION_REQUIRED",
        "대상·함께 나온 인물·공유 내용을 확인해 주세요.",
      );
    if (!String(values.body || "").trim() && attachments.length === 0) {
      throw error(
        422,
        "CONTENT_REQUIRED",
        "내용을 입력하거나 첨부자료를 추가해 주세요.",
      );
    }
    return {
      title: text(values.title, 1, POST_LIMITS.title, "제목"),
      body: text(values.body || "", 0, POST_LIMITS.body, "내용"),
      kind: values.kind,
      attachments,
      pinned: Boolean(values.pinned),
    };
  }
  const NOT_HANDLED = Symbol("not-handled");
  function handleSession(method, path, body) {
    if (method === "POST") {
      if (path === "/auth/password-reset/request")
        return recovery.request(body);
      if (path === "/auth/password-reset/verify") return recovery.verify(body);
      if (path === "/auth/password-reset/complete")
        return recovery.complete(body);
    }
    if (method === "GET" && path === "/demo/accounts")
      return db.accounts
        .filter((a) => a.id !== "family-r3" && a.status !== "deleted")
        .map((a) => ({
          ...publicAccount(a),
          status: a.residentId
            ? db.residents.find((r) => r.id === a.residentId)?.status
            : a.status,
        }));
    if (method === "POST" && path === "/auth/login") {
      const a = db.accounts.find((a) => a.id === body.accountId);
      if (!a || a.status !== "active")
        throw error(
          403,
          "ACCOUNT_UNAVAILABLE",
          "이 데모 계정은 현재 이용할 수 없습니다.",
        );
      if (
        a.residentId &&
        db.residents.find((r) => r.id === a.residentId)?.status !== "active"
      )
        throw error(
          403,
          "SPACE_UNAVAILABLE",
          "이 공간은 현재 이용할 수 없습니다.",
        );
      session = {
        userId: a.id,
        accountId: a.id,
        role: a.role,
        name: a.name,
        residentId: a.residentId,
        authVersion: a.authVersion,
        permissions: clone(staffFor(a)?.permissions),
      };
      return sessionView(session);
    }
    if (method === "POST" && path === "/auth/logout") {
      session = null;
      return { ok: true };
    }
    if (method === "GET" && path === "/session") {
      const a = auth();
      session.permissions = clone(staffFor(a)?.permissions);
      return sessionView(session);
    }
    return NOT_HANDLED;
  }
  function handleContent(method, path, body, account) {
    if (method === "GET" && path === "/residents")
      return db.residents
        .filter(
          (r) =>
            r.status === "active" &&
            (account.role === "family"
              ? account.residentId === r.id
              : staffFor(account)?.permissions.view &&
                staffFor(account)?.residentIds.includes(r.id)),
        )
        .map(residentView);
    let match = path.match(/^\/residents\/([^/]+)(\/posts)?$/);
    if (match) {
      const [, id, posts] = match;
      if (!posts && method === "GET") {
        scope(id);
        return residentView(db.residents.find((r) => r.id === id));
      }
      if (posts && method === "GET") {
        scope(id);
        return db.posts
          .filter((p) => p.residentId === id)
          .sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id),
          )
          .map(publicPost);
      }
      if (posts && method === "POST") {
        scope(id, "post");
        const key =
          body.idempotencyKey &&
          `${account.id}:${id}:${text(body.idempotencyKey, 1, 120, "재시도 키")}`;
        const fingerprint = JSON.stringify(
          Object.fromEntries(
            Object.entries(body)
              .filter(([k]) => k !== "idempotencyKey")
              .sort(([a], [b]) => a.localeCompare(b)),
          ),
        );
        if (key && db.idempotency[key]) {
          if (db.idempotency[key].fingerprint !== fingerprint)
            throw error(
              409,
              "IDEMPOTENCY_CONFLICT",
              "같은 재시도 키로 다른 내용을 게시할 수 없습니다.",
            );
          const p = db.posts.find((p) => p.id === db.idempotency[key].postId);
          if (!p)
            throw error(409, "POST_WITHDRAWN", "이미 철회한 게시물입니다.");
          return publicPost(p);
        }
        const input = postInput(body, id);
        const date = now();
        const p = {
          id: `p${db.nextId++}`,
          residentId: id,
          ...input,
          pinnedAt: input.pinned ? date : null,
          createdAt: date,
          updatedAt: date,
          version: 1,
          authorId: account.id,
          authorName: account.name,
          status: "published",
        };
        db.posts.push(p);
        if (key) db.idempotency[key] = { postId: p.id, fingerprint };
        return publicPost(p);
      }
    }
    match = path.match(/^\/posts\/([^/]+)$/);
    if (match) {
      if (method === "GET") return publicPost(postById(match[1]));
      if (method === "PATCH") {
        const p = postById(match[1], "post");
        checkVersion(p, body.version);
        const input = postInput(body, p.residentId, p);
        Object.assign(p, input, {
          pinnedAt: input.pinned ? p.pinnedAt || now() : null,
          updatedAt: now(),
          version: p.version + 1,
        });
        return publicPost(p);
      }
      if (method === "DELETE") {
        const p = postById(match[1], "delete");
        checkVersion(p, body.version);
        db.posts = db.posts.filter((item) => item.id !== p.id);
        db.uploads = db.uploads.filter(
          (a) => !p.attachments.some((item) => item.id === a.id),
        );
        return { ok: true };
      }
    }
    if (path === "/uploads" && method === "POST") {
      scope(body.residentId, "post");
      const sample = SAMPLE_FILES[body.sample];
      if (!sample)
        throw error(
          422,
          "UNSUPPORTED_FILE",
          "지원하는 가상 샘플을 선택해 주세요.",
        );
      if (body.simulateFailure)
        throw error(
          422,
          "UPLOAD_FAILED",
          "샘플 파일 전송에 실패했습니다. 다시 시도해 주세요.",
        );
      const a = {
        id: `a${db.nextId++}`,
        ...sample,
        status: "ready",
        residentId: body.residentId,
        creatorId: account.id,
      };
      db.uploads.push(a);
      return publicAttachment(a);
    }
    match = path.match(/^\/attachments\/([^/]+)$/);
    if (match && method === "GET") {
      const p = db.posts.find((p) =>
        p.attachments.some((a) => a.id === match[1]),
      );
      if (!p) missing();
      scope(p.residentId);
      return publicAttachment(p.attachments.find((a) => a.id === match[1]));
    }
    if (path === "/drafts/current") {
      const staff = staffFor(account);
      if (!staff || !staff.permissions.view || !staff.permissions.post) deny();
      if (method === "GET") {
        const draft = db.drafts[account.id] || null;
        if (draft) scope(draft.residentId, "post");
        return clone(draft);
      }
      if (method === "PUT") {
        scope(body.residentId, "post");
        const attachments = body.attachments || [];
        // Drafts may retain visibly failed files; publication checks every file again.
        if (
          !Array.isArray(attachments) ||
          attachments.length > POST_LIMITS.attachments ||
          attachments.some(
            (a) =>
              !db.uploads.some(
                (u) => u.id === a.id && u.residentId === body.residentId,
              ),
          )
        )
          throw error(
            422,
            "ATTACHMENT_SCOPE",
            "이 공간에서 올린 첨부만 임시 저장할 수 있습니다.",
          );
        let editing = {};
        if (body.editId) {
          const post = postById(body.editId, "post");
          if (post.residentId !== body.residentId)
            throw error(
              422,
              "IMMUTABLE_TARGET",
              "수정 중인 게시물의 대상 공간을 변경할 수 없습니다.",
            );
          checkVersion(post, body.version);
          editing = { editId: post.id, version: body.version };
        }
        const draft = {
          residentId: body.residentId,
          title: text(body.title || "", 0, POST_LIMITS.title, "제목"),
          body: text(body.body || "", 0, POST_LIMITS.body, "내용"),
          kind: ["photo", "video", "memo", "health"].includes(body.kind)
            ? body.kind
            : "memo",
          pinned: Boolean(body.pinned),
          attachments: clone(attachments),
          ...editing,
          updatedAt: now(),
        };
        db.drafts[account.id] = draft;
        return draft;
      }
      if (method === "DELETE") {
        delete db.drafts[account.id];
        return { ok: true };
      }
    }
    if (path === "/blog" && method === "GET") return clone(db.blog);
    return NOT_HANDLED;
  }
  function handleStaffManagement(method, path, body) {
    if (path === "/admin/staff") {
      if (method === "GET") return clone(db.staff);
      if (method === "POST") {
        const name = text(body.name, 1, 40, "직원 이름");
        const accountId = text(body.accountId, 3, 50, "직원 계정");
        if (!/^[a-zA-Z0-9_-]+$/.test(accountId))
          throw error(
            422,
            "VALIDATION",
            "계정은 영문·숫자·밑줄·하이픈으로 입력해 주세요.",
          );
        if (db.accounts.some((a) => a.id === accountId))
          throw error(409, "ACCOUNT_EXISTS", "이미 사용 중인 계정입니다.");
        const s = {
          id: `staff-${db.nextId++}`,
          accountId,
          name,
          status: "active",
          residentIds: ids(
            body.residentIds || [],
            db.residents.filter((r) => r.status === "active").map((r) => r.id),
            "담당 어르신",
          ),
          permissions: permissions(
            body.permissions || { view: true, post: true, delete: true },
          ),
          version: 1,
        };
        db.staff.push(s);
        db.accounts.push({
          id: accountId,
          name,
          role: "staff",
          label: "담당 직원",
          status: "active",
          authVersion: 1,
        });
        syncAssignments();
        return clone(s);
      }
    }
    const match = path.match(/^\/admin\/staff\/([^/]+)$/);
    if (match && method === "PATCH") {
      const s = db.staff.find((s) => s.id === match[1]);
      if (!s) missing();
      checkVersion(s, body.version);
      if (own(body, "name")) s.name = text(body.name, 1, 40, "직원 이름");
      if (own(body, "status")) s.status = status(body.status);
      if (own(body, "residentIds"))
        s.residentIds = ids(
          body.residentIds,
          db.residents
            .filter((r) => !["deleted", "deletion_pending"].includes(r.status))
            .map((r) => r.id),
          "담당 어르신",
        );
      if (own(body, "permissions"))
        s.permissions = permissions(body.permissions);
      s.version++;
      const a = db.accounts.find((a) => a.id === s.accountId);
      Object.assign(a, { name: s.name, status: s.status });
      revoke(s.accountId);
      syncAssignments();
      return clone(s);
    }
    return NOT_HANDLED;
  }
  function handleResidentManagement(method, path, body) {
    if (path === "/admin/residents") {
      if (method === "GET")
        return db.residents
          .filter((r) => r.status !== "deleted")
          .map(residentView);
      if (method === "POST") {
        const name = text(body.name, 1, 40, "어르신 이름");
        const familyAccountId = text(
          body.familyAccountId,
          3,
          50,
          "가족 공용 계정",
        );
        if (!/^[a-zA-Z0-9_-]+$/.test(familyAccountId))
          throw error(
            422,
            "VALIDATION",
            "계정은 영문·숫자·밑줄·하이픈으로 입력해 주세요.",
          );
        if (db.accounts.some((a) => a.id === familyAccountId))
          throw error(409, "ACCOUNT_EXISTS", "이미 사용 중인 계정입니다.");
        const r = {
          id: `r${db.nextId++}`,
          name,
          initial: name[0],
          familyAccountId,
          staffIds: [],
          status: "active",
          version: 1,
        };
        db.residents.push(r);
        assignResident(r, body.staffIds || []);
        const familyAccount = {
          id: familyAccountId,
          name: `${name} 가족`,
          role: "family",
          residentId: r.id,
          label: `${name} 가족 공용 계정`,
          status: "active",
          authVersion: 1,
        };
        db.accounts.push(familyAccount);
        return {
          ...residentView(r),
          familyAccount: publicAccount(familyAccount),
          temporaryPassword: `DEMO-${db.nextId++}`,
        };
      }
    }
    const match = path.match(
      /^\/admin\/residents\/([^/]+)(\/reset-password)?$/,
    );
    if (match) {
      const r = db.residents.find((r) => r.id === match[1]);
      if (!r || r.status === "deleted") missing();
      if (match[2] && method === "POST") {
        if (r.status !== "active")
          throw error(
            409,
            "SPACE_UNAVAILABLE",
            "이용 중인 공간에서만 새 비밀번호를 발급할 수 있습니다.",
          );
        revoke(r.familyAccountId);
        return {
          temporaryPassword: `DEMO-${db.nextId++}`,
          accountId: r.familyAccountId,
        };
      }
      if (!match[2] && method === "PATCH") {
        if (r.status === "deletion_pending")
          throw error(
            409,
            "DELETION_PENDING",
            "삭제 처리 중인 공간은 변경할 수 없습니다.",
          );
        checkVersion(r, body.version);
        if (own(body, "name")) {
          r.name = text(body.name, 1, 40, "어르신 이름");
          r.initial = r.name[0];
          const a = db.accounts.find((a) => a.id === r.familyAccountId);
          a.name = `${r.name} 가족`;
          a.label = `${r.name} 가족 공용 계정`;
        }
        if (own(body, "status")) {
          const changed = status(body.status);
          if (r.status !== changed) revoke(r.familyAccountId);
          r.status = changed;
        }
        if (own(body, "staffIds")) assignResident(r, body.staffIds);
        r.version++;
        return residentView(r);
      }
      if (!match[2] && method === "DELETE") {
        if (body.confirmName !== r.name)
          throw error(
            422,
            "CONFIRM_NAME",
            "삭제할 어르신 이름을 정확히 입력해 주세요.",
          );
        if (r.status === "deletion_pending")
          throw error(409, "DELETION_PENDING", "이미 삭제 처리 중입니다.");
        r.status = "deletion_pending";
        r.version++;
        revoke(r.familyAccountId);
        const job = {
          id: `del${db.nextId++}`,
          residentId: r.id,
          residentName: r.name,
          status: "deletion_pending",
          createdAt: now(),
          steps: [
            { label: "공간 접근 차단", status: "completed" },
            { label: "데모 자료 삭제", status: "pending" },
            { label: "운영 저장소·백업 파기", status: "not_applicable_demo" },
          ],
        };
        db.deletions.push(job);
        return { jobId: job.id, status: "deletion_pending" };
      }
    }
    return NOT_HANDLED;
  }
  function handleDeletionJobs(method, path, body) {
    if (path === "/admin/deletions" && method === "GET")
      return clone(db.deletions);
    const match = path.match(/^\/admin\/deletions\/([^/]+)\/complete$/);
    if (match && method === "POST") {
      const job = db.deletions.find((j) => j.id === match[1]);
      if (!job) missing();
      const r = db.residents.find((r) => r.id === job.residentId);
      r.status = "deleted";
      r.version++;
      db.posts = db.posts.filter((p) => p.residentId !== r.id);
      db.uploads = db.uploads.filter((a) => a.residentId !== r.id);
      for (const id of Object.keys(db.drafts))
        if (db.drafts[id].residentId === r.id) delete db.drafts[id];
      for (const s of db.staff)
        if (s.residentIds.includes(r.id)) {
          s.residentIds = s.residentIds.filter((id) => id !== r.id);
          s.version++;
          revoke(s.accountId);
        }
      db.accounts.find((a) => a.id === r.familyAccountId).status = "deleted";
      syncAssignments();
      job.status = "demo_completed";
      job.steps[1].status = "completed";
      job.completedAt = now();
      return clone(job);
    }
    return NOT_HANDLED;
  }
  function handleBlogManagement(method, path, body) {
    if (path === "/admin/blog") {
      if (method === "GET") return clone(db.blog);
      if (method === "PATCH") {
        db.blog.url = blogUrl(body.url);
        db.blog.status = "ready";
        return clone(db.blog);
      }
    }
    if (path === "/admin/blog/refresh" && method === "POST") {
      if (body.fail) {
        db.blog.status = "cached";
        db.blog.lastAttemptAt = now();
        return clone(db.blog);
      }
      db.blog.revision++;
      db.blog.items = sampleBlogItems(db.blog.revision);
      db.blog.status = "ready";
      db.blog.lastSuccessAt = now();
      return clone(db.blog);
    }
    return NOT_HANDLED;
  }
  // Authentication precedes every domain handler. A sentinel distinguishes an
  // unmatched route from a legitimate null response (for example, no draft).
  function dispatch(method, path, body) {
    const sessionResult = handleSession(method, path, body);
    if (sessionResult !== NOT_HANDLED) return sessionResult;
    const account = auth();
    const contentResult = handleContent(method, path, body, account);
    if (contentResult !== NOT_HANDLED) return contentResult;
    if (path.startsWith("/admin/")) admin();
    if (path === "/admin/overview" && method === "GET")
      return {
        residents: db.residents.filter((r) => r.status !== "deleted").length,
        activeResidents: db.residents.filter((r) => r.status === "active")
          .length,
        suspendedResidents: db.residents.filter((r) => r.status === "suspended")
          .length,
        staff: db.staff.length,
        activeStaff: db.staff.filter((s) => s.status === "active").length,
        posts: db.posts.length,
        attachments: db.posts.reduce((n, p) => n + p.attachments.length, 0),
        pendingDeletions: db.deletions.filter(
          (j) => j.status !== "demo_completed",
        ).length,
        unassignedPublishingResidents: getUncoveredPostingResidents(
          db.residents,
          db.staff,
        ).map(({ id, name, familyAccountId }) => ({
          id,
          name,
          familyAccountId,
        })),
      };
    for (const handler of [
      handleStaffManagement,
      handleResidentManagement,
      handleDeletionJobs,
      handleBlogManagement,
    ]) {
      const result = handler(method, path, body);
      if (result !== NOT_HANDLED) return result;
    }
    missing();
  }
  function notify() {
    for (const fn of listeners) {
      try {
        fn();
      } catch {}
    }
  }
  let queue = Promise.resolve();
  let generation = 0;
  async function perform(method, path, body, requestedGeneration) {
    const start = Date.now();
    let resultStatus = 200;
    try {
      if (config.latency > 0)
        await new Promise((resolve) => setTimeout(resolve, config.latency));
      if (requestedGeneration !== generation)
        throw error(
          409,
          "DEMO_RESET",
          "샘플 데이터가 초기화되어 이전 요청을 취소했습니다.",
        );
      if (config.offline)
        throw error(
          0,
          "OFFLINE",
          "네트워크 연결이 끊긴 데모 상태입니다. 연결을 복구하고 다시 시도해 주세요.",
        );
      if (config.failNext) {
        config.failNext = false;
        throw error(
          503,
          "SIMULATED_FAILURE",
          "일시적으로 요청을 처리하지 못했습니다. 다시 시도해 주세요.",
        );
      }
      load();
      const before = clone(db);
      const beforeSession = clone(session);
      try {
        const result = dispatch(method, path, clone(body));
        // Reads must not trigger storage events that make another tab read again.
        // Compare state so idempotent mutation retries also remain quiet.
        const databaseChanged = JSON.stringify(db) !== JSON.stringify(before);
        const sessionChanged =
          JSON.stringify(session) !== JSON.stringify(beforeSession) ||
          (method === "POST" && path === "/auth/password-reset/complete");
        if (databaseChanged) db.revision++;
        if (databaseChanged || sessionChanged)
          persist({
            database: databaseChanged,
            authentication: sessionChanged,
          });
        return clone(result);
      } catch (e) {
        db = before;
        if (e.code !== "SESSION_REVOKED") session = beforeSession;
        throw e;
      }
    } catch (e) {
      resultStatus = e.status ?? 500;
      throw e;
    } finally {
      log.unshift({
        method,
        path,
        status: resultStatus,
        duration: Date.now() - start,
        time: now(),
      });
      log = log.slice(0, 80);
      notify();
    }
  }
  return {
    request(method, path, body = {}) {
      const verb = String(method).toUpperCase();
      const requestedGeneration = generation;
      const operation = queue.then(() =>
        perform(verb, String(path), body, requestedGeneration),
      );
      queue = operation.catch(() => {});
      return operation;
    },
    getSession: () => sessionView(session),
    // Explicit simulator escape hatch, absent from the HTTP adapter.
    getDemoRecoveryDelivery(requestId) {
      load();
      return recovery.getDemoDelivery(requestId);
    },
    getLog: () => clone(log),
    getStorageStatus: () => ({ ...storageStatus }),
    configure(options = {}) {
      config = {
        ...config,
        ...options,
        latency: Math.max(0, Number(options.latency ?? config.latency) || 0),
      };
      notify();
    },
    reset() {
      generation++;
      recovery.reset();
      db = createSeed();
      session = null;
      log = [];
      config.offline = false;
      config.failNext = false;
      persist();
      notify();
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
