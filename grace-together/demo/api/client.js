import { createMockApi } from "./mock-api.js";

/** Future HTTP adapter. This demo does not include or contact a backend. */
export function createHttpApi({
  baseUrl = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  let session = null;
  let log = [];
  const listeners = new Set();
  const emit = () => {
    for (const fn of listeners) {
      try {
        fn();
      } catch {}
    }
  };
  return {
    async request(method, path, body = {}) {
      const started = Date.now();
      let status = 0;
      const verb = String(method).toUpperCase();
      try {
        const response = await fetchImpl(
          `${baseUrl.replace(/\/$/, "")}${path}`,
          {
            method: verb,
            credentials: "include",
            headers: {
              Accept: "application/json",
              ...(verb !== "GET" && verb !== "HEAD"
                ? { "Content-Type": "application/json" }
                : {}),
            },
            ...(verb !== "GET" && verb !== "HEAD"
              ? { body: JSON.stringify(body) }
              : {}),
          },
        );
        status = response.status;
        let data = null;
        if (response.status !== 204) {
          try {
            data = await response.json();
          } catch {
            throw Object.assign(new Error("서버 응답을 읽지 못했습니다."), {
              status,
              code: "INVALID_RESPONSE",
            });
          }
        }
        if (!response.ok)
          throw Object.assign(
            new Error(
              data?.error?.message ||
                data?.message ||
                "요청을 처리하지 못했습니다.",
            ),
            { status, code: data?.error?.code || data?.code || "HTTP_ERROR" },
          );
        if (path === "/auth/login" || path === "/session") session = data;
        if (path === "/auth/logout") session = null;
        return data;
      } catch (e) {
        if (e.status === 401) session = null;
        if (!("status" in e))
          Object.assign(e, { status: 0, code: "NETWORK_ERROR" });
        throw e;
      } finally {
        log.unshift({
          method: verb,
          path,
          status,
          duration: Date.now() - started,
          time: new Date().toISOString(),
        });
        log = log.slice(0, 80);
        emit();
      }
    },
    getSession: () => (session ? { ...session } : null),
    getLog: () => log.map((entry) => ({ ...entry })),
    getStorageStatus: () => ({
      persistent: false,
      reason: "HTTP 어댑터: 서버 저장 정책은 별도 구현이 필요합니다.",
    }),
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
let browserStorage;
try {
  browserStorage = globalThis.localStorage;
} catch {
  /* Private/blocked storage: memory fallback. */
}
export const api = createMockApi({ storage: browserStorage });
export default api;
