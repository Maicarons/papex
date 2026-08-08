import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 个字符")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字、下划线"),
  email: z.string().email("邮箱格式不正确"),
  displayName: z.string().min(1).max(80),
  password: z.string().min(8, "密码至少 8 位").max(128),
});

export const loginSchema = z.object({
  identifier: z.string().min(1), // username or email
  password: z.string().min(1),
});

export const authorInputSchema = z.object({
  name: z.string().min(1).max(160),
  orcid: z.string().optional(),
  affiliationId: z.number().int().optional(),
  order: z.number().int().min(0).default(0),
});

export const createPaperSchema = z.object({
  title: z.string().min(1).max(400),
  abstract: z.string().min(1).max(20000),
  primaryCategoryId: z.string().min(1),
  secondaryCategoryIds: z.array(z.string()).default([]),
  authors: z.array(authorInputSchema).min(1, "至少需要一位作者"),
  pdfUrl: z.string().url().optional().or(z.literal("")),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  doi: z.string().optional(),
  license: z.string().default("CC-BY-4.0"),
  comments: z.string().max(500).optional(),
  // for new version submissions:
  basePaperId: z.string().optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1, "评论不能为空").max(5000),
  parentId: z.number().int().optional(),
});

export const subscriptionSchema = z.object({
  type: z.enum(["category", "author", "paper"]),
  refId: z.string().min(1),
});

export const moderateSchema = z.object({
  action: z.enum(["approve", "reject", "withdraw"]),
  reason: z.string().max(500).optional(),
});

export const citationSchema = z.object({
  targetArxivId: z.string().optional(),
  targetDoi: z.string().optional(),
  targetTitle: z.string().max(400).optional(),
  targetUrl: z.string().url().optional().or(z.literal("")),
});
// At least one identifier/title must be supplied to create a citation.
export const citationSchemaRefined = citationSchema.refine(
  (v) => !!v.targetArxivId || !!v.targetDoi || !!v.targetTitle,
  { message: "需提供 文献编号、DOI 或标题" },
);

// ----------------------------- Co-review (peer review) -----------------------------

export const assignCoReviewSchema = z.object({
  paperId: z.string().min(1, "请选择论文"),
  reviewerId: z.string().min(1, "请选择评审人"),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export const coReviewRespondSchema = z.object({
  accepted: z.boolean(),
});

export const coReviewSubmitSchema = z.object({
  decision: z.enum(["approve", "reject", "revise"]),
  comment: z.string().min(1, "评审意见不能为空").max(5000),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1, "显示名称不能为空").max(80),
  bio: z.string().max(2000).optional().or(z.literal("")),
  institution: z.string().max(160).optional().or(z.literal("")),
  website: z.string().url("网址格式不正确").max(500).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  orcid: z
    .string()
    .regex(/^(\d{4}-){3}\d{3}[\dX]$/, "ORCID 格式不正确（如 0000-0002-1825-0097）")
    .max(40)
    .optional()
    .or(z.literal("")),
});

export const ingestItemSchema = z.object({
  pdfUrl: z.string().url().optional(),
  title: z.string().max(400).optional(),
  abstract: z.string().max(20000).optional(),
  primaryCategoryId: z.string().min(1),
  authors: z.array(authorInputSchema).default([]),
  doi: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

export const ingestSchema = z.object({
  items: z.array(ingestItemSchema).min(1).max(50),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreatePaperInput = z.infer<typeof createPaperSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
export type ModerateInput = z.infer<typeof moderateSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
