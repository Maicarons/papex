import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ----------------------------- Enums -----------------------------

export const userRoleEnum = pgEnum("user_role", ["author", "moderator", "admin"]);

export const paperStatusEnum = pgEnum("paper_status", [
  "submitted",
  "approved",
  "withdrawn",
  "rejected",
]);

export const subscriptionTypeEnum = pgEnum("subscription_type", [
  "category",
  "author",
  "paper",
]);

export const announcementKindEnum = pgEnum("announcement_kind", [
  "new_in_category",
  "new_from_author",
  "comment_reply",
  "announcement",
]);

export const messageKindEnum = pgEnum("message_kind", [
  "system", // 系统通知
  "ticket_reply", // 工单回执 / 工单回复
  "announcement", // 公告
  "review_result", // 审核结果
  "co_review_request", // 协审请求
  "co_review_result", // 协审结果回执
  "admin_message", // 管理员私信
  "community_reply", // 社区回复
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// Co-review (peer review) workflow status / decision.
export const coReviewStatusEnum = pgEnum("co_review_status", [
  "pending",
  "accepted",
  "declined",
  "completed",
  "expired",
]);

export const coReviewDecisionEnum = pgEnum("co_review_decision", [
  "approve",
  "reject",
  "revise",
]);

// ----------------------------- Users -----------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  role: userRoleEnum("role").notNull().default("author"),
  bio: text("bio"),
  orcid: text("orcid"),
  institution: text("institution"),
  website: text("website"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Affiliations & Authors -----------------------------

export const affiliations = pgTable("affiliations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  orcid: text("orcid"),
  affiliationId: integer("affiliation_id").references(() => affiliations.id, {
    onDelete: "set null",
  }),
  homepage: text("homepage"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Categories -----------------------------

export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // e.g. "cs.LG"
  // Self-referential FK: the `any` return type is required to break circular
  // type inference (TS7022) for a table that references its own `id`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parentId: text("parent_id").references((): any => categories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Papers & Versions -----------------------------

export const papers = pgTable(
  "papers",
  {
    id: text("id").primaryKey(), // paper id format: YYMM.NNNNN
    title: text("title").notNull(),
    primaryCategoryId: text("primary_category_id")
      .notNull()
      .references(() => categories.id),
    status: paperStatusEnum("status").notNull().default("submitted"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    latestVersion: integer("latest_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    statusIdx: index("papers_status_cat_idx").on(
      _table.status,
      _table.primaryCategoryId,
      _table.createdAt,
    ),
  }),
);

export const paperVersions = pgTable(
  "paper_versions",
  {
    id: serial("id").primaryKey(),
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    abstract: text("abstract").notNull().default(""),
    authorsJson: jsonb("authors_json")
      .notNull()
      .default(sql`'[]'::jsonb`),
    pdfUrl: text("pdf_url"),
    sourceUrl: text("source_url"),
    doi: text("doi"),
    license: text("license").notNull().default("CC-BY-4.0"),
    comments: text("comments"), // version note (e.g. "v2: camera-ready")
    withdrawalReason: text("withdrawal_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    paperVersionUniq: uniqueIndex("paper_version_uniq").on(
      _table.paperId,
      _table.version,
    ),
    searchIdx: index("paper_versions_search_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(abstract, '') || ' ' || coalesce(authors_json::text, ''))`,
    ),
    // Trigram index (requires the pg_trgm extension) — enables fast substring /
    // Chinese (CJK) full-text matching via ILIKE for languages without word breaks.
    trgmIdx: index("paper_versions_trgm_idx").using(
      "gin",
      sql`(coalesce(title, '') || ' ' || coalesce(abstract, '')) gin_trgm_ops`,
    ),
  }),
);

export const paperAuthors = pgTable(
  "paper_authors",
  {
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    authorId: integer("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
  },
  (_table) => ({
    pk: primaryKey({ columns: [_table.paperId, _table.authorId] }),
  }),
);

export const paperCategories = pgTable(
  "paper_categories",
  {
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (_table) => ({
    pk: primaryKey({ columns: [_table.paperId, _table.categoryId] }),
  }),
);

// ----------------------------- Comments -----------------------------

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  paperId: text("paper_id")
    .notNull()
    .references(() => papers.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Subscriptions & Endorsements -----------------------------

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: subscriptionTypeEnum("type").notNull(),
    refId: text("ref_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    uniq: uniqueIndex("subscriptions_uniq").on(
      _table.userId,
      _table.type,
      _table.refId,
    ),
  }),
);

export const endorsements = pgTable(
  "endorsements",
  {
    id: serial("id").primaryKey(),
    endorserId: uuid("endorser_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endorseeId: uuid("endorsee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    uniq: uniqueIndex("endorsements_uniq").on(
      _table.endorserId,
      _table.endorseeId,
      _table.categoryId,
    ),
  }),
);

// ----------------------------- Announcements / Feed -----------------------------

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: announcementKindEnum("kind").notNull(),
  refId: text("ref_id"),
  title: text("title").notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Citations / Reference Graph -----------------------------

export const citations = pgTable(
  "citations",
  {
    id: serial("id").primaryKey(),
    // The paper that *makes* the citation (the citing work).
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    // The cited work. At least one of the three target columns should be populated.
    targetPaperId: text("target_paper_id").references(() => papers.id, {
      onDelete: "cascade",
    }),
    targetDoi: text("target_doi"),
    targetArxivId: text("target_arxiv_id"),
    targetTitle: text("target_title"),
    targetUrl: text("target_url"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    paperIdx: index("citations_paper_idx").on(_table.paperId),
    targetIdx: index("citations_target_idx").on(_table.targetPaperId),
    uniq: uniqueIndex("citations_uniq").on(
      _table.paperId,
      _table.targetPaperId,
      _table.targetDoi,
      _table.targetArxivId,
    ),
  }),
);

// ----------------------------- Messages (站内信) -----------------------------

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "set null" }),
  kind: messageKindEnum("kind").notNull().default("system"),
  title: text("title").notNull(),
  body: text("body"),
  refId: text("ref_id"),
  // Generic destination for the message (e.g. "/papers/2608.00001", "/co-reviews/12").
  // Takes precedence over refId-based routing and supports every message category.
  link: text("link"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ----------------------------- Tickets (工单) -----------------------------

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  type: text("type").notNull().default("other"),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketReplies = pgTable(
  "ticket_replies",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => ({
    ticketIdx: index("ticket_reply_ticket_idx").on(_table.ticketId),
  }),
);

// ----------------------------- Permissions / RBAC -----------------------------

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  group: text("group").notNull().default("general"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (_t) => ({ pk: primaryKey({ columns: [_t.roleId, _t.permissionId] }) }),
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (_t) => ({ pk: primaryKey({ columns: [_t.userId, _t.roleId] }) }),
);

// Per-user permission overrides (grant=true allows, grant=false denies).
export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionKey: text("permission_key").notNull(),
    grant: boolean("grant").notNull(),
  },
  (_t) => ({ pk: primaryKey({ columns: [_t.userId, _t.permissionKey] }) }),
);

// ----------------------------- Co-review (peer review) -----------------------------

export const coReviews = pgTable(
  "co_reviews",
  {
    id: serial("id").primaryKey(),
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedById: uuid("assigned_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: coReviewStatusEnum("status").notNull().default("pending"),
    decision: coReviewDecisionEnum("decision"),
    // Reviewer's submitted opinion.
    comment: text("comment"),
    // Assignment note shown to the invited reviewer.
    note: text("note"),
    // The request message created for the reviewer (so they can jump straight there).
    messageId: integer("message_id").references(() => messages.id, { onDelete: "set null" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_t) => ({
    paperIdx: index("co_reviews_paper_idx").on(_t.paperId),
    reviewerIdx: index("co_reviews_reviewer_idx").on(_t.reviewerId),
    statusIdx: index("co_reviews_status_idx").on(_t.status),
  }),
);

// ----------------------------- Moderation log (audit trail) -----------------------------

export const moderationLogs = pgTable(
  "moderation_logs",
  {
    id: serial("id").primaryKey(),
    paperId: text("paper_id")
      .notNull()
      .references(() => papers.id, { onDelete: "cascade" }),
    moderatorId: uuid("moderator_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // approve | reject | withdraw
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (_t) => ({ paperIdx: index("moderation_logs_paper_idx").on(_t.paperId) }),
);

// ----------------------------- Relations (typed joins) -----------------------------

import { relations } from "drizzle-orm";

export const papersRelations = relations(papers, ({ one, many }) => ({
  primaryCategory: one(categories, {
    fields: [papers.primaryCategoryId],
    references: [categories.id],
  }),
  versions: many(paperVersions),
  paperAuthors: many(paperAuthors),
  paperCategories: many(paperCategories),
  comments: many(comments),
  outgoingCitations: many(citations, { relationName: "citing" }),
  incomingCitations: many(citations, { relationName: "cited" }),
}));

export const paperVersionsRelations = relations(paperVersions, ({ one }) => ({
  paper: one(papers, { fields: [paperVersions.paperId], references: [papers.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id] }),
  children: many(categories),
  papers: many(paperCategories),
}));

export const authorsRelations = relations(authors, ({ one, many }) => ({
  user: one(users, { fields: [authors.userId], references: [users.id] }),
  affiliation: one(affiliations, { fields: [authors.affiliationId], references: [affiliations.id] }),
  paperAuthors: many(paperAuthors),
}));

export const usersRelations = relations(users, ({ many }) => ({
  papers: many(papers),
  comments: many(comments),
  subscriptions: many(subscriptions),
  announcements: many(announcements),
  messages: many(messages),
  tickets: many(tickets),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  assignedCoReviews: many(coReviews, { relationName: "assignedBy" }),
  receivedCoReviews: many(coReviews, { relationName: "reviewer" }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, { fields: [messages.userId], references: [users.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, { fields: [userPermissions.userId], references: [users.id] }),
}));

export const coReviewsRelations = relations(coReviews, ({ one }) => ({
  paper: one(papers, { fields: [coReviews.paperId], references: [papers.id] }),
  reviewer: one(users, {
    fields: [coReviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  assignedBy: one(users, {
    fields: [coReviews.assignedById],
    references: [users.id],
    relationName: "assignedBy",
  }),
  message: one(messages, { fields: [coReviews.messageId], references: [messages.id] }),
}));

export const moderationLogsRelations = relations(moderationLogs, ({ one }) => ({
  paper: one(papers, { fields: [moderationLogs.paperId], references: [papers.id] }),
  moderator: one(users, { fields: [moderationLogs.moderatorId], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  replies: many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketReplies.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketReplies.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  paper: one(papers, { fields: [comments.paperId], references: [papers.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const citationsRelations = relations(citations, ({ one }) => ({
  citing: one(papers, {
    fields: [citations.paperId],
    references: [papers.id],
    relationName: "citing",
  }),
  cited: one(papers, {
    fields: [citations.targetPaperId],
    references: [papers.id],
    relationName: "cited",
  }),
  creator: one(users, { fields: [citations.createdById], references: [users.id] }),
}));
