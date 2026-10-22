import { esc } from "./format.js";
import { icon } from "./icons.js";

const SAMPLE_ACCOUNT = "family-r1";
const SAMPLE_CONTACT = {
  email: "guardian.r1@example.invalid",
  sms: "010-0000-1001",
};
const SAMPLE_PASSWORD = "Grace-demo-2026!!";
// Only request timestamps survive route changes, matching the API's lifetime.
// Contact details, passwords and recovery proofs remain within each journey.
const cooldownsByApi = new WeakMap();
export function clearPasswordRecoveryCooldown(api) {
  cooldownsByApi.delete(api);
}
const action = (name, label, kind = "secondary", attrs = "") =>
  `<button type="button" class="button ${kind}" data-recovery-action="${name}" ${attrs}>${label}</button>`;

/** A disposable recovery journey. Proofs and passwords never enter storage or URLs. */
export function mountPasswordRecovery({ host, api, isCurrent, onComplete }) {
  const events = new AbortController();
  const resendWindows = cooldownsByApi.get(api) || new Map();
  cooldownsByApi.set(api, resendWindows);
  for (const [key, deadline] of resendWindows) {
    if (deadline <= Date.now()) resendWindows.delete(key);
  }
  let disposed = false;
  const state = {
    stage: "request",
    channel: "email",
    accountId: api.getSession()?.accountId || "",
    contact: "",
    requestId: null,
    resetToken: null,
    delivery: null,
    expiresAt: 0,
    resendAt: 0,
    busy: false,
  };
  const live = () => !disposed && isCurrent();
  const find = (selector) => host.querySelector(selector);
  const email = () => state.channel === "email";
  const remaining = () =>
    Math.max(0, Math.ceil((state.expiresAt - Date.now()) / 1000));

  function requestView() {
    return `<p class="recovery-lead">센터에 등록한 연락처로 본인을 확인하고<br class="wide-only">새 비밀번호를 만들 수 있어요.</p>
      <form data-recovery-form="request" novalidate>
        <fieldset class="recovery-methods"><legend>확인 방법을 선택해주세요</legend>
          <label class="recovery-method"><input type="radio" name="channel" value="email" ${email() ? "checked" : ""}>
            <span>${icon("mail", 24)}<strong>이메일</strong><small>재설정 링크 받기 · 기본</small></span></label>
          <label class="recovery-method"><input type="radio" name="channel" value="sms" ${!email() ? "checked" : ""}>
            <span>${icon("lock", 24)}<strong>휴대전화 문자</strong><small>인증번호 6자리 받기</small></span></label>
        </fieldset>
        <label class="field"><span>아이디</span><input name="accountId" value="${esc(state.accountId)}" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="80" required aria-describedby="recovery-account-help"></label>
        <p id="recovery-account-help" class="recovery-hint">센터에서 발급받은 아이디를 입력해주세요.</p>
        <label class="field"><span>등록된 ${email() ? "이메일 주소" : "휴대전화 번호"}</span><input name="contact" value="${esc(state.contact)}" type="${email() ? "email" : "tel"}" autocomplete="${email() ? "email" : "tel"}" inputmode="${email() ? "email" : "tel"}" autocapitalize="none" spellcheck="false" maxlength="254" required aria-describedby="recovery-contact-help"></label>
        <p id="recovery-contact-help" class="recovery-hint">가족 공용 계정은 센터에 등록된 대표 보호자의 연락처를 사용해요.</p>
        ${errorRegion()}
        <p class="recovery-hint" data-recovery-cooldown hidden></p>
        <button class="button primary recovery-submit" type="submit">${email() ? "재설정 링크 받기" : "인증번호 받기"}${icon("arrow", 18)}</button>
      </form>
      <div class="recovery-demo"><span class="demo-label">샘플 체험</span><p>실제 개인정보를 입력하지 않고 김동행 가족 계정으로 체험해보세요. 이메일·문자는 발송되지 않아요.</p>${action("sample", "샘플 정보 채우기", "ghost")}</div>`;
  }

  function errorRegion() {
    return '<p class="form-error recovery-error" id="recovery-error" role="alert" tabindex="-1"></p>';
  }

  function deliveryView() {
    if (!state.delivery) return "";
    return `<details class="recovery-inbox"><summary>샘플 ${email() ? "이메일" : "문자"} 확인하기</summary>
      <div><span class="demo-label">가상 수신함</span><p class="small muted">실제 발송 없이 수신 화면을 재현했어요.</p>
      <p class="recovery-message">그레이스 건강동행<br>${email() ? "비밀번호 재설정을 요청하셨나요? 아래 링크로 새 비밀번호를 설정해주세요." : `인증번호는 <strong class="recovery-code">${esc(state.delivery.proof)}</strong>입니다. 다른 사람에게 알려주지 마세요.`}</p>
      ${email() ? action("email-link", "샘플 메일의 재설정 링크 열기", "primary") : action("sample-code", "샘플 인증번호 입력", "secondary")}</div></details>`;
  }

  function verifyView() {
    return `<p class="recovery-lead">입력한 정보가 등록 정보와 일치하면<br>${email() ? "이메일로 재설정 링크를 보내드려요." : "휴대전화로 인증번호를 보내드려요."}</p>
      <div class="recovery-destination">${icon(email() ? "mail" : "lock", 24)}<span><small>입력한 ${email() ? "이메일" : "휴대전화"}</small><strong>${esc(state.contact)}</strong></span></div>
      <p class="recovery-hint">${email() ? "이메일의 링크를 눌러 이어가세요. 메일이 보이지 않으면 스팸함도 확인해주세요." : "문자로 받은 숫자 6자리를 아래에 입력해주세요."}</p>
      <p class="recovery-timer" data-recovery-expiry></p>
      ${!email() ? `<form data-recovery-form="verify" novalidate><label class="field"><span>인증번호 6자리</span><input class="recovery-code-input" name="proof" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required aria-describedby="recovery-expiry-note"></label><span class="sr-only" id="recovery-expiry-note">인증번호는 5분 동안 유효합니다.</span>${errorRegion()}<button type="submit" class="button primary recovery-submit">인증번호 확인</button></form>` : errorRegion()}
      ${deliveryView()}
      <div class="recovery-retry">${action("resend", "다시 보내기", "ghost", "data-recovery-resend")}${action("restart", "입력 정보·확인 방법 바꾸기", "ghost")}</div>`;
  }

  function passwordView() {
    return `<p class="recovery-lead">본인 확인을 마쳤어요.<br>기억하기 쉬운 긴 비밀번호로 설정해주세요.</p>
      <form data-recovery-form="password" novalidate>
        <label class="field"><span>새 비밀번호</span><input name="password" type="password" autocomplete="new-password" maxlength="128" required aria-describedby="recovery-password-help"></label>
        <p id="recovery-password-help" class="recovery-hint">15~64자. 여러 단어를 조합해도 좋아요.<br>영문·숫자·특수문자를 모두 넣을 필요는 없어요.</p>
        <label class="field"><span>새 비밀번호 확인</span><input name="passwordConfirmation" type="password" autocomplete="new-password" maxlength="128" required></label>
        <label class="recovery-show"><input type="checkbox" data-recovery-visibility> 비밀번호 보기</label>
        <div class="notice info">${icon("lock", 18)}<span>재설정하면 이 계정으로 로그인한 모든 기기에서 로그아웃돼요. 함께 쓰는 가족도 새 비밀번호로 다시 로그인해야 해요.</span></div>
        ${errorRegion()}<button type="submit" class="button primary recovery-submit">새 비밀번호로 설정</button>
      </form>
      <div class="recovery-demo"><span class="demo-label">샘플 체험</span><p>실제 사용하는 비밀번호를 입력하지 마세요. 입력한 비밀번호는 저장하지 않아요.</p>${action("sample-password", "샘플 비밀번호 채우기", "ghost")}</div>
      <p class="recovery-timer" data-recovery-expiry></p>${action("restart", "처음부터 다시 확인", "ghost")}`;
  }

  function completeView() {
    return `<div class="recovery-complete-mark">${icon("check", 32)}</div><p class="recovery-lead">비밀번호 재설정을 마쳤어요.</p><p>기존 로그인은 모두 종료했어요.<br>새 비밀번호로 다시 로그인해주세요.</p><div class="notice info">${icon("info", 18)}<span>이 화면은 재설정 절차 체험입니다. 실제 비밀번호는 변경되지 않으며, 체험 앱은 샘플 계정 버튼으로 계속 이용해요.</span></div><a href="#/login" class="button primary recovery-submit">로그인 화면으로</a>`;
  }

  function render() {
    if (!live()) return;
    const titles = {
      request: "비밀번호를 다시 설정해요",
      verify: email() ? "이메일을 확인해주세요" : "문자를 확인해주세요",
      password: "새 비밀번호를 정해주세요",
      complete: "이제 다시 이용할 수 있어요",
    };
    const step =
      state.stage === "request" ? 0 : state.stage === "verify" ? 1 : 2;
    host.innerHTML = `<main id="main" class="recovery-layout">
      <header class="recovery-header"><a class="brand" href="#/login"><span class="brand-mark">${icon("leaf", 26)}</span>그레이스 건강동행</a><a class="recovery-back" href="#/login">${icon("back", 18)} 로그인으로</a></header>
      <div class="recovery-body"><aside class="recovery-story"><p class="eyebrow">ACCOUNT RECOVERY</p><h2>다시 연결되는<br>가족의 하루.</h2><p>이메일이 익숙하지 않으세요?<br>휴대전화 문자로도 확인할 수 있어요.</p><img src="./assets/hero.svg" alt="" width="320" height="260"><div class="recovery-policy">${icon("users", 22)}<p>어르신 한 분의 계정은<br>센터에 등록된 대표 보호자가 관리해요.</p></div></aside>
      <section class="recovery-panel" aria-labelledby="recovery-title"><ol class="recovery-steps" aria-label="비밀번호 재설정 순서">${["확인 방법", "본인 확인", "새 비밀번호"].map((label, i) => `<li ${i === step ? 'aria-current="step"' : ""} class="${i < step ? "done" : ""}"><span>${i < step ? icon("check", 14) : i + 1}</span>${label}</li>`).join("")}</ol><h1 id="recovery-title" tabindex="-1">${titles[state.stage]}</h1>
      ${state.stage === "request" ? requestView() : state.stage === "verify" ? verifyView() : state.stage === "password" ? passwordView() : completeView()}
      ${state.stage !== "complete" ? `<details class="recovery-help"><summary>등록된 연락처를 사용할 수 없나요?</summary><p>이메일과 휴대전화 중 사용할 수 있는 방법을 선택해주세요. 둘 다 사용할 수 없거나 아이디가 기억나지 않으면, 평소 연락하던 센터 담당자에게 계정 복구를 요청해주세요.</p><p>대표 보호자 변경이나 연락처 수정은 센터가 확인한 후 처리해요. 이 화면에서는 복구 연락처를 바꿀 수 없어요.</p></details>` : ""}
      </section></div></main>`;
    document.title = `${titles[state.stage]} · 그레이스 건강동행`;
    updateTimers();
    find("#recovery-title")?.focus({ preventScroll: true });
  }

  function showError(message, input) {
    if (!live()) return;
    const region = find("#recovery-error");
    if (region) {
      region.textContent = message;
      region.focus({ preventScroll: true });
      region.scrollIntoView({ block: "nearest" });
    }
    if (input) {
      input.setAttribute("aria-invalid", "true");
      const descriptions = new Set(
        (input.getAttribute("aria-describedby") || "")
          .split(/\s+/)
          .filter(Boolean),
      );
      descriptions.add("recovery-error");
      input.setAttribute("aria-describedby", [...descriptions].join(" "));
      input.focus({ preventScroll: true });
    }
  }

  function updateTimers() {
    if (!live()) return;
    const seconds = remaining();
    const expiry = find("[data-recovery-expiry]");
    if (expiry)
      expiry.textContent =
        seconds > 0
          ? `${state.stage === "password" ? "본인 확인 유효시간" : "링크·인증번호 유효시간"} ${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초`
          : "유효시간이 지났어요. 처음부터 다시 확인해주세요.";
    const resend = find("[data-recovery-resend]");
    if (resend) {
      const cooldown = Math.max(
        0,
        Math.ceil((state.resendAt - Date.now()) / 1000),
      );
      resend.disabled = state.busy || cooldown > 0;
      resend.textContent =
        cooldown > 0 ? `다시 보내기 · ${cooldown}초 후` : "다시 보내기";
    }
    if (state.stage === "request") {
      const accountId = find('[name="accountId"]')?.value.trim() || "";
      const cooldown = requestCooldown(accountId);
      const submit = find('[type="submit"]');
      const hint = find("[data-recovery-cooldown]");
      if (submit) {
        submit.disabled = state.busy || cooldown > 0;
        submit.textContent =
          (email() ? "재설정 링크 받기" : "인증번호 받기") +
          (cooldown ? ` · ${cooldown}초 후` : "");
      }
      if (hint) {
        hint.hidden = cooldown === 0;
        hint.textContent =
          "방금 요청한 안내가 있어요. 잠시 후 다시 요청하거나 다른 확인 방법을 선택해주세요.";
      }
    }
  }

  function requestCooldown(accountId) {
    return Math.max(
      0,
      Math.ceil(
        ((resendWindows.get(`${accountId}:${state.channel}`) || 0) -
          Date.now()) /
          1000,
      ),
    );
  }

  async function pending(work) {
    if (state.busy) return;
    state.busy = true;
    find("#recovery-error")?.replaceChildren();
    host.querySelectorAll("button, input").forEach((node) => {
      node.disabled = true;
    });
    const panel = find(".recovery-panel");
    panel?.setAttribute("aria-busy", "true");
    let failure = null;
    try {
      await work();
    } catch (error) {
      failure = error;
    } finally {
      state.busy = false;
      if (live()) {
        host.querySelectorAll("button, input").forEach((node) => {
          node.disabled = false;
        });
        find(".recovery-panel")?.removeAttribute("aria-busy");
        updateTimers();
        if (failure) {
          const proofInput =
            failure.code === "RECOVERY_INVALID" &&
            state.stage === "verify" &&
            !email()
              ? find('[name="proof"]')
              : null;
          showError(
            failure.message || "연결을 확인한 뒤 다시 시도해주세요.",
            proofInput,
          );
        }
      }
    }
  }

  async function sendRequest() {
    const result = await api.request("POST", "/auth/password-reset/request", {
      accountId: state.accountId,
      channel: state.channel,
      contact: state.contact,
    });
    if (!live()) return;
    state.requestId = result.requestId;
    state.delivery = api.getDemoRecoveryDelivery?.(result.requestId) || null;
    state.expiresAt = Date.now() + result.expiresInSeconds * 1000;
    state.resendAt = Date.now() + result.resendAfterSeconds * 1000;
    resendWindows.set(`${state.accountId}:${state.channel}`, state.resendAt);
    state.stage = "verify";
    render();
  }

  async function verify(proof) {
    const result = await api.request("POST", "/auth/password-reset/verify", {
      requestId: state.requestId,
      proof,
    });
    if (!live()) return;
    state.resetToken = result.resetToken;
    state.delivery = null;
    state.expiresAt = Date.now() + 10 * 60 * 1000;
    state.stage = "password";
    render();
  }

  function restart(channel = state.channel) {
    Object.assign(state, {
      stage: "request",
      channel,
      requestId: null,
      resetToken: null,
      delivery: null,
      contact: "",
    });
    render();
  }

  host.addEventListener(
    "change",
    (event) => {
      if (event.target.name === "channel") {
        state.accountId = find('[name="accountId"]')?.value || "";
        restart(event.target.value);
        find('[name="channel"]:checked')?.focus({ preventScroll: true });
      }
      if (event.target.matches("[data-recovery-visibility]")) {
        host
          .querySelectorAll('[autocomplete="new-password"]')
          .forEach((input) => {
            input.type = event.target.checked ? "text" : "password";
          });
      }
    },
    { signal: events.signal },
  );

  host.addEventListener(
    "input",
    (event) => {
      event.target.removeAttribute("aria-invalid");
      const descriptions = (event.target.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter((id) => id && id !== "recovery-error");
      if (descriptions.length)
        event.target.setAttribute("aria-describedby", descriptions.join(" "));
      else event.target.removeAttribute("aria-describedby");
      if (event.target.name === "accountId") updateTimers();
    },
    { signal: events.signal },
  );

  host.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("[data-recovery-action]");
      if (!button || state.busy) return;
      const name = button.dataset.recoveryAction;
      if (name === "sample") {
        find('[name="accountId"]').value = SAMPLE_ACCOUNT;
        find('[name="contact"]').value = SAMPLE_CONTACT[state.channel];
        updateTimers();
        find('[type="submit"]').focus();
      } else if (name === "restart") restart();
      else if (name === "resend") pending(sendRequest);
      else if (name === "email-link")
        pending(() => verify(state.delivery.proof));
      else if (name === "sample-code") {
        find('[name="proof"]').value = state.delivery.proof;
        find('[name="proof"]').focus();
      } else if (name === "sample-password") {
        host
          .querySelectorAll('[autocomplete="new-password"]')
          .forEach((input) => {
            input.value = SAMPLE_PASSWORD;
          });
        find('[type="submit"]').focus();
      }
    },
    { signal: events.signal },
  );

  host.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest("[data-recovery-form]");
      if (!form) return;
      event.preventDefault();
      if (state.busy) return;
      const data = new FormData(form);
      const type = form.dataset.recoveryForm;
      if (type === "request") {
        state.accountId = String(data.get("accountId")).trim();
        state.contact = String(data.get("contact")).trim();
        if (!state.accountId)
          return showError(
            "센터에서 발급받은 아이디를 입력해주세요.",
            form.elements.accountId,
          );
        if (requestCooldown(state.accountId))
          return showError(
            "방금 요청한 안내가 있어요. 잠시 후 다시 시도해주세요.",
          );
        if (
          !state.contact ||
          (email()
            ? !form.elements.contact.validity.valid
            : !/^01[016789][0-9]{7,8}$/.test(
                state.contact.replace(/[\s-]/g, ""),
              ))
        )
          return showError(
            email()
              ? "이메일 주소를 확인해주세요. 예: name@example.com"
              : "휴대전화 번호를 확인해주세요. 숫자만 입력해도 돼요.",
            form.elements.contact,
          );
        pending(sendRequest);
      } else if (type === "verify") {
        const proof = String(data.get("proof")).trim();
        if (!/^\d{6}$/.test(proof))
          return showError(
            "문자로 받은 숫자 6자리를 입력해주세요.",
            form.elements.proof,
          );
        pending(() => verify(proof));
      } else if (type === "password") {
        const password = String(data.get("password"));
        const confirmation = String(data.get("passwordConfirmation"));
        if ([...password].length < 15 || [...password].length > 64)
          return showError(
            "비밀번호를 15~64자로 입력해주세요.",
            form.elements.password,
          );
        if (password !== confirmation)
          return showError(
            "두 비밀번호가 달라요. 같은 비밀번호를 다시 입력해주세요.",
            form.elements.passwordConfirmation,
          );
        pending(async () => {
          await api.request("POST", "/auth/password-reset/complete", {
            resetToken: state.resetToken,
            password,
            passwordConfirmation: confirmation,
          });
          if (!live()) return;
          state.resetToken = null;
          state.requestId = null;
          state.stage = "complete";
          onComplete();
          render();
        });
      }
    },
    { signal: events.signal },
  );

  render();
  const timer = setInterval(updateTimers, 1000);
  return () => {
    disposed = true;
    events.abort();
    clearInterval(timer);
    state.resetToken = null;
    state.delivery = null;
  };
}
