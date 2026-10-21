const $ = (s, root = document) => root.querySelector(s);

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const fmt = (value) =>
  value
    ? new Intl.DateTimeFormat("ko-KR", {
        month: "long",
        day: "numeric",
        timeZone: "Asia/Seoul",
      }).format(new Date(value))
    : "아직 소식 없음";

const fullDate = (value) =>
  value
    ? new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Seoul",
      }).format(new Date(value))
    : "—";

const kindName = {
  photo: "사진과 일상",
  video: "영상 소식",
  memo: "중요메모",
  health: "건강자료",
};

const roleName = { family: "가족", staff: "직원", admin: "관리자" };

const stateName = {
  active: "이용 중",
  suspended: "이용 중단",
  deletion_pending: "삭제 진행 중",
  deleted: "삭제됨",
};

export { $, esc, fmt, fullDate, kindName, roleName, stateName };
