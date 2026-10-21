/** Entirely fictional sample data. Limits and policies are demo assumptions. */
export const DB_VERSION = 1;
export const DB_KEY = "grace-together.demo.db.v1";
export const SESSION_KEY = "grace-together.demo.session.v1";
export const SAMPLE_FILES = {
  flowers: {
    type: "image",
    name: "꽃 만들기 · 가상 일러스트.svg",
    url: "./assets/flowers.svg",
    bytes: 4607,
  },
  garden: {
    type: "image",
    name: "정원 산책 · 가상 일러스트.svg",
    url: "./assets/garden.svg",
    bytes: 2063,
  },
  autumn: {
    type: "image",
    name: "가을 활동 · 가상 일러스트.svg",
    url: "./assets/autumn.svg",
    bytes: 1742,
  },
  video: {
    type: "video",
    name: "움직이는 계절 · 샘플 영상.mp4",
    url: "./assets/sample-video.mp4",
    bytes: 37078,
  },
  pdf: {
    type: "pdf",
    name: "가족 안내 · 가상 샘플.pdf",
    url: "./assets/sample-guide.pdf",
    bytes: 81842,
  },
};
export const DEFAULT_BLOG = "https://blog.naver.com/the_grace_daycare";
export function sampleBlogItems(revision = 0) {
  return [
    {
      id: `blog-${revision}-1`,
      title: revision
        ? "[샘플] 새로 도착한 가을 프로그램"
        : "[샘플] 함께 만든 가을 정원",
      summary:
        "공통 센터 소식을 보여 주는 가상 피드입니다. 실제 블로그에서 가져온 글이 아닙니다.",
      date: revision ? "2026-10-21" : "2026-10-20",
      art: "garden",
    },
    {
      id: "blog-2",
      title: "[샘플] 가족과 함께 나누는 계절 이야기",
      summary: "가족 모두에게 같은 공통 소식이 표시됩니다.",
      date: "2026-10-18",
      art: "flowers",
    },
    {
      id: "blog-3",
      title: "[샘플] 센터 이용 안내",
      summary: "이미지가 없는 글도 제목으로 확인할 수 있습니다.",
      date: "2026-10-15",
      art: null,
    },
  ];
}
export function createSeed() {
  const residents = [
    ["r1", "김동행", "family-r1", ["staff-1"]],
    ["r2", "이하루", "family-r2", ["staff-1"]],
    ["r3", "박온유", "family-r3", ["staff-2"]],
    ["r4", "정다솜", "family-r4", []],
  ].map(([id, name, familyAccountId, staffIds]) => ({
    id,
    name,
    initial: name[0],
    familyAccountId,
    staffIds,
    status: "active",
    version: 1,
  }));
  const accounts = residents.map((r) => ({
    id: r.familyAccountId,
    name: `${r.name} 가족`,
    role: "family",
    residentId: r.id,
    label: `${r.name} 가족 공용 계정`,
    status: "active",
    authVersion: 1,
  }));
  accounts.push(
    ...[
      {
        id: "staff-1",
        name: "박다정",
        role: "staff",
        label: "담당 직원 · 김동행·이하루",
      },
      {
        id: "staff-2",
        name: "이보람",
        role: "staff",
        label: "담당 직원 · 박온유",
      },
      {
        id: "admin-1",
        name: "센터 관리자",
        role: "admin",
        label: "계정·공간 관리",
      },
    ].map((a) => ({ ...a, status: "active", authVersion: 1 })),
  );
  const staff = [
    {
      id: "staff-1",
      accountId: "staff-1",
      name: "박다정",
      status: "active",
      residentIds: ["r1", "r2"],
      permissions: { view: true, post: true, delete: true },
      version: 1,
    },
    {
      id: "staff-2",
      accountId: "staff-2",
      name: "이보람",
      status: "active",
      residentIds: ["r3"],
      permissions: { view: true, post: true, delete: true },
      version: 1,
    },
  ];
  const uploads = [];
  function attachment(sample, residentId, id) {
    const a = {
      id,
      ...SAMPLE_FILES[sample],
      status: "ready",
      residentId,
      creatorId: residentId === "r3" ? "staff-2" : "staff-1",
    };
    uploads.push(a);
    return { ...a };
  }
  const stories = [
    [
      "p1",
      "r1",
      "함께 완성한 가을 꽃",
      "색종이 꽃으로 작은 정원을 꾸며 보았습니다. 이 화면의 모든 이야기와 그림은 가상 자료입니다.",
      "photo",
      "flowers",
      "2026-10-21T02:20:00Z",
    ],
    [
      "p2",
      "r1",
      "햇살 좋은 날, 정원 산책",
      "가을 색을 찾아 천천히 걸으며 이야기를 나눈 가상의 활동 소식입니다.",
      "photo",
      "garden",
      "2026-10-20T01:40:00Z",
    ],
    [
      "p3",
      "r1",
      "움직이는 계절 이야기",
      "영상 재생과 자료 확인 동선을 위한 짧은 샘플 영상입니다.",
      "video",
      "video",
      "2026-10-19T03:10:00Z",
    ],
    [
      "p4",
      "r1",
      "가을 색을 모아 보았어요",
      "여러 가지 가을빛을 골라 나만의 그림을 만들었습니다.",
      "photo",
      "autumn",
      "2026-10-18T05:00:00Z",
    ],
    [
      "p5",
      "r1",
      "가족께 드리는 이용 안내",
      "방문 전 센터에 일정 확인을 부탁드립니다. 실제 운영 안내가 아닌 가상 메모입니다.",
      "memo",
      null,
      "2026-10-17T01:00:00Z",
    ],
    [
      "p6",
      "r1",
      "건강자료 공유 예시",
      "개별 자료를 가족과 나누는 동선의 예시입니다. 첨부는 가상 안내문이며 의료 조언이나 실제 건강기록이 아닙니다.",
      "health",
      "pdf",
      "2026-10-16T01:00:00Z",
    ],
    [
      "p7",
      "r2",
      "하루 님의 가을 그림",
      "이하루 어르신 공간에만 표시되는 가상 활동 소식입니다.",
      "photo",
      "autumn",
      "2026-10-20T04:00:00Z",
    ],
    [
      "p8",
      "r2",
      "작은 정원을 만들었어요",
      "색을 고르고 이야기를 나누는 가상 활동입니다.",
      "photo",
      "flowers",
      "2026-10-18T02:00:00Z",
    ],
    [
      "p9",
      "r3",
      "온유 님의 정원 이야기",
      "박온유 담당자와 가족 공간에만 보이는 가상 소식입니다.",
      "photo",
      "garden",
      "2026-10-20T02:00:00Z",
    ],
  ];
  const posts = stories.map(
    ([id, residentId, title, body, kind, sample, createdAt]) => ({
      id,
      residentId,
      title,
      body,
      kind,
      attachments: sample ? [attachment(sample, residentId, `a-${id}`)] : [],
      pinned: ["p5", "p6"].includes(id),
      pinnedAt: ["p5", "p6"].includes(id) ? createdAt : null,
      createdAt,
      updatedAt: createdAt,
      version: 1,
      authorId: residentId === "r3" ? "staff-2" : "staff-1",
      authorName: residentId === "r3" ? "이보람" : "박다정",
      status: "published",
    }),
  );
  return {
    schemaVersion: DB_VERSION,
    revision: 1,
    nextId: 100,
    residents,
    accounts,
    staff,
    posts,
    uploads,
    drafts: {},
    idempotency: {},
    deletions: [],
    blog: {
      url: DEFAULT_BLOG,
      items: sampleBlogItems(),
      lastSuccessAt: "2026-10-21T00:00:00Z",
      status: "ready",
      revision: 0,
    },
  };
}
