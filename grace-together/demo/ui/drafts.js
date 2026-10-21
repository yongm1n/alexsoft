import { POST_LIMITS } from "../domain/content-policy.js";

const sampleNames = {
  flowers: "꽃 만들기.svg",
  garden: "정원 산책.svg",
  autumn: "가을 풍경.svg",
  video: "함께하는 정원.mp4",
  pdf: "샘플 안내자료.pdf",
};

const sampleTypes = {
  flowers: "image",
  garden: "image",
  autumn: "image",
  video: "video",
  pdf: "pdf",
};

function newDraft(residentId) {
  return {
    residentId,
    title: "",
    body: "",
    kind: "photo",
    pinned: false,
    attachments: [],
    idempotencyKey: crypto.randomUUID(),
  };
}

function validateDraft(draft) {
  if (!draft?.title.trim()) return "제목을 입력해주세요.";
  if (!draft.body.trim() && !draft.attachments.length)
    return "이야기 또는 첨부자료를 하나 이상 준비해주세요.";
  if (
    draft.title.trim().length > POST_LIMITS.title ||
    draft.body.trim().length > POST_LIMITS.body
  )
    return "제목 또는 내용이 데모 입력 한도를 넘었어요.";
  if (draft.attachments.length > POST_LIMITS.attachments)
    return `첨부는 최대 ${POST_LIMITS.attachments}개까지 준비할 수 있어요.`;
  if (draft.attachments.some((a) => a.status !== "ready"))
    return "모든 첨부자료가 준비되어야 합니다. 실패한 자료를 재시도하거나 제거해주세요.";
  if (
    ["photo", "video"].includes(draft.kind) &&
    !draft.attachments.some(
      (a) => a.type === (draft.kind === "photo" ? "image" : "video"),
    )
  )
    return `${draft.kind === "photo" ? "사진" : "영상"} 소식에는 해당 샘플 자료를 하나 이상 첨부해주세요.`;
  return "";
}

export { sampleNames, sampleTypes, newDraft, validateDraft };
