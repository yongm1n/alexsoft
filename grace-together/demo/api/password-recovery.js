/**
 * Fictional, in-memory recovery simulation. It sends no email/SMS and stores no
 * password. Real recovery requires a server, securely hashed secrets and shared
 * rate limits; the demo-only delivery accessor must never exist in that API.
 */
const CONTACTS = Object.freeze({
  "family-r1": { email: "guardian.r1@example.invalid", sms: "010-0000-1001" },
  "family-r2": { email: "guardian.r2@example.invalid", sms: "010-0000-1002" },
  "family-r3": { email: "guardian.r3@example.invalid", sms: "010-0000-1003" },
  "family-r4": { email: "guardian.r4@example.invalid", sms: "010-0000-1004" },
  "staff-1": { email: "staff1@example.invalid", sms: "010-0000-2001" },
  "staff-2": { email: "staff2@example.invalid", sms: "010-0000-2002" },
  "admin-1": { email: "admin1@example.invalid", sms: "010-0000-3001" },
});
const RESEND_MS = 60_000;
const WINDOW_MS = 15 * 60_000;
const RESET_MS = 10 * 60_000;
const MAX_RATE_KEYS = 500;
const error = (status, code, message) =>
  Object.assign(new Error(message), { status, code });
const invalid = () =>
  error(
    400,
    "RECOVERY_INVALID",
    "안내가 만료되었거나 확인할 수 없습니다. 새 안내를 요청해 주세요.",
  );

function randomNumber() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0];
  }
  // Compatibility only for this fictional simulator, never a server fallback.
  return Math.floor(Math.random() * 0x100000000);
}
const token = () =>
  Array.from({ length: 4 }, () =>
    randomNumber().toString(16).padStart(8, "0"),
  ).join("");
function normalizedContact(channel, value) {
  if (typeof value !== "string" || value.length > 254) return "";
  if (channel === "email") return value.trim().toLowerCase();
  if (!/^[+\d\s().-]+$/.test(value)) return "";
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("8210") ? `0${digits.slice(2)}` : digits;
}

export function createPasswordRecovery({
  now = Date.now,
  getAccount,
  onComplete,
}) {
  const challenges = new Map();
  const grants = new Map();
  const requests = new Map();
  function prune(time) {
    for (const [key, value] of challenges)
      if (value.expiresAt <= time) challenges.delete(key);
    for (const [key, value] of grants)
      if (value.expiresAt <= time) grants.delete(key);
    for (const [key, times] of requests) {
      const recent = times.filter((at) => at > time - WINDOW_MS);
      if (recent.length) requests.set(key, recent);
      else requests.delete(key);
    }
  }
  function currentAccount(value) {
    const account = getAccount(value.accountId);
    return account && account.authVersion === value.authVersion
      ? account
      : null;
  }
  function invalidate(accountId) {
    for (const collection of [challenges, grants])
      for (const [key, value] of collection)
        if (value.accountId === accountId) collection.delete(key);
  }
  return {
    request({ accountId, channel, contact } = {}) {
      if (!["email", "sms"].includes(channel))
        throw error(
          422,
          "RECOVERY_CHANNEL",
          "이메일 또는 문자 안내를 선택해 주세요.",
        );
      const time = now();
      prune(time);
      const id =
        typeof accountId === "string" ? accountId.trim().slice(0, 100) : "";
      const requestId = token();
      const expiresInSeconds = channel === "email" ? 15 * 60 : 5 * 60;
      const response = { requestId, expiresInSeconds, resendAfterSeconds: 60 };
      const key = `${id}:${channel}`;
      const recent = requests.get(key) || [];
      // The same neutral result is used for absent accounts, mismatched contact,
      // blocked accounts and rate limits. Unmatched requests invalidate nothing.
      if (
        recent.length >= 5 ||
        (recent.length && time - recent.at(-1) < RESEND_MS) ||
        (!requests.has(key) && requests.size >= MAX_RATE_KEYS)
      )
        return response;
      requests.set(key, [...recent, time]);
      const account = getAccount(id);
      const registered = Object.hasOwn(CONTACTS, id) && CONTACTS[id][channel];
      if (
        !account ||
        !registered ||
        normalizedContact(channel, contact) !==
          normalizedContact(channel, registered)
      )
        return response;
      invalidate(id);
      challenges.set(requestId, {
        accountId: id,
        authVersion: account.authVersion,
        channel,
        contact: registered,
        proof:
          channel === "email"
            ? token()
            : String(randomNumber() % 1_000_000).padStart(6, "0"),
        expiresAt: time + expiresInSeconds * 1000,
        attempts: 0,
      });
      return response;
    },
    verify({ requestId, proof } = {}) {
      const time = now();
      prune(time);
      const challenge = challenges.get(requestId);
      if (!challenge || !currentAccount(challenge)) {
        challenges.delete(requestId);
        throw invalid();
      }
      if (typeof proof !== "string" || proof !== challenge.proof) {
        challenge.attempts++;
        if (challenge.attempts >= 5) challenges.delete(requestId);
        throw invalid();
      }
      challenges.delete(requestId);
      const resetToken = token();
      grants.set(resetToken, {
        accountId: challenge.accountId,
        authVersion: challenge.authVersion,
        expiresAt: time + RESET_MS,
      });
      return { resetToken };
    },
    complete({ resetToken, password, passwordConfirmation } = {}) {
      prune(now());
      const grant = grants.get(resetToken);
      if (!grant || !currentAccount(grant)) {
        grants.delete(resetToken);
        throw invalid();
      }
      const length =
        typeof password === "string" ? Array.from(password).length : 0;
      if (length < 15 || length > 64)
        throw error(
          422,
          "PASSWORD_LENGTH",
          "새 비밀번호는 공백을 포함해 15~64자로 입력해 주세요.",
        );
      if (password !== passwordConfirmation)
        throw error(
          422,
          "PASSWORD_MISMATCH",
          "새 비밀번호와 확인 입력이 일치하지 않습니다.",
        );
      // Only the account id leaves this method. Never retain the entered password.
      onComplete(grant.accountId);
      invalidate(grant.accountId);
      return { ok: true };
    },
    getDemoDelivery(requestId) {
      prune(now());
      const challenge = challenges.get(requestId);
      if (!challenge || !currentAccount(challenge)) return null;
      const { channel, contact, proof, expiresAt } = challenge;
      return { simulated: true, requestId, channel, contact, proof, expiresAt };
    },
    reset() {
      challenges.clear();
      grants.clear();
      requests.clear();
    },
  };
}
