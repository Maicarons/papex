// Client-safe permission catalog (no DB imports) so both server services and
// client admin UIs can share the same taxonomy.

export interface PermissionDef {
  key: string;
  name: string;
  group: string;
  description: string;
}

export const PERMISSION_GROUPS: { key: string; name: string }[] = [
  { key: "paper", name: "论文" },
  { key: "comment", name: "评论" },
  { key: "ticket", name: "工单" },
  { key: "co_review", name: "协审" },
  { key: "endorse", name: "背书" },
  { key: "message", name: "站内信" },
  { key: "admin", name: "管理" },
];

export const PERMISSIONS: PermissionDef[] = [
  { key: "paper:publish", name: "发布论文", group: "paper", description: "提交新论文或新版本" },
  { key: "paper:view", name: "查看论文", group: "paper", description: "浏览已发布论文" },
  { key: "paper:download", name: "下载论文", group: "paper", description: "下载 PDF / 源码包" },
  { key: "paper:moderate", name: "审核论文", group: "paper", description: "通过 / 拒绝 / 撤稿" },
  { key: "comment:create", name: "发表评论", group: "comment", description: "在论文下评论与回复" },
  { key: "comment:view", name: "查看评论", group: "comment", description: "浏览评论区" },
  { key: "ticket:create", name: "提交工单", group: "ticket", description: "创建反馈 / 工单" },
  { key: "ticket:manage", name: "管理工单", group: "ticket", description: "回复 / 处置工单" },
  { key: "co_review:assign", name: "指派协审", group: "co_review", description: "向用户发起协审请求" },
  { key: "co_review:respond", name: "参与协审", group: "co_review", description: "接收并回应协审请求" },
  { key: "co_review:manage", name: "管理协审", group: "co_review", description: "查看全部协审进度" },
  { key: "endorse:create", name: "给予背书", group: "endorse", description: "为某用户在某分类下背书" },
  { key: "endorse:view", name: "查看背书", group: "endorse", description: "查看用户收到的背书" },
  { key: "message:broadcast", name: "群发通知", group: "message", description: "向用户广播站内信" },
  { key: "user:manage", name: "用户管理", group: "admin", description: "查看 / 编辑用户" },
  { key: "role:manage", name: "角色权限管理", group: "admin", description: "配置角色与权限" },
  { key: "permission:manage", name: "权限覆盖管理", group: "admin", description: "用户级权限允许 / 禁止" },
];

export const PERMISSION_KEYS = new Set(PERMISSIONS.map((p) => p.key));

// Default permission mapping for the seeded system roles.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: PERMISSIONS.map((p) => p.key),
  moderator: [
    "paper:view",
    "paper:download",
    "paper:moderate",
    "comment:create",
    "comment:view",
    "ticket:create",
    "ticket:manage",
    "co_review:assign",
    "co_review:respond",
    "co_review:manage",
    "endorse:create",
    "endorse:view",
    "message:broadcast",
    "user:manage",
  ],
  author: [
    "paper:publish",
    "paper:view",
    "paper:download",
    "comment:create",
    "comment:view",
    "ticket:create",
    "endorse:create",
    "endorse:view",
  ],
  reader: ["paper:view", "paper:download", "comment:view", "endorse:view"],
};

export const SYSTEM_ROLE_KEYS = Object.keys(DEFAULT_ROLE_PERMISSIONS);
