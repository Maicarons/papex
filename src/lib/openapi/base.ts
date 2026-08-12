// AUTO-GENERATED static part of the OpenAPI document (info, servers, tags,
// components/schemas, components/responses, security). The `paths` are
// generated from per-route fragments by src/lib/openapi/generate.ts.
// Edit base.ts for shared schemas/responses; run `npm run openapi:generate`.

export const baseSpec = {
  openapi: "3.1.0",
  info: {
    title: "Papex API",
    version: "1.0.0",
    description:
      "Programmatic access to the Papex academic literature platform. " +
      "Supports session-cookie and API-key authentication, inherits the " +
      "caller's RBAC permissions, and exposes papers, search, categories, " +
      "authors, subscriptions, citations, comments, messages, tickets, " +
      "co-reviews, endorsements, feedback and an admin surface.",
    contact: { name: "Papex", url: "https://github.com/Maicarons/papex" },
    license: { name: "MIT" },
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [
    { name: "Auth", description: "Registration, login, session, locale" },
    { name: "Papers", description: "Papers, versions, PDFs, citations, comments, moderation" },
    { name: "Discovery", description: "Categories, search, authors, feed" },
    { name: "Subscriptions", description: "Follow categories / authors / papers" },
    { name: "Users", description: "Profile and API keys" },
    { name: "Messages", description: "In-site messaging" },
    { name: "Tickets", description: "Support tickets and replies" },
    { name: "CoReviews", description: "Collaborative review workflow" },
    { name: "Endorsements", description: "Category endorsements" },
    { name: "Misc", description: "Feedback, health, locale, archive submit" },
    { name: "Admin", description: "Moderation, ingest, user & role management" },
  ],
  components: {
    securitySchemes: {
      papex_session: {
        type: "apiKey",
        in: "cookie",
        name: "papex_session",
        description: "httpOnly session cookie issued on login.",
      },
      apiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "pk_live_… / pk_test_…",
        description:
          "API key issued from /settings/api-keys. Sent as `Authorization: Bearer pk_…`. " +
          "Inherits the owning user's RBAC permissions.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "Human-readable error code or message." },
        },
      },
      PaperListItem: {
        type: "object",
        properties: {
          id: { type: "string", description: "Paper id, e.g. 2401.12345" },
          title: { type: "string" },
          abstract: { type: "string" },
          primaryCategoryId: { type: "string", nullable: true },
          status: { type: "string", enum: ["pending", "approved", "rejected", "withdrawn"] },
          version: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Author: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          orcid: { type: "string", nullable: true },
          affiliationId: { type: "integer", nullable: true },
          affiliation: { type: "object", nullable: true },
          order: { type: "integer" },
        },
      },
      CategoryNode: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          children: { type: "array", items: { $ref: "#/components/schemas/CategoryNode" } },
        },
      },
      Citation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          paperId: { type: "string" },
          targetPaperId: { type: "string", nullable: true },
          targetDoi: { type: "string", nullable: true },
          targetArxivId: { type: "string", nullable: true },
          targetTitle: { type: "string", nullable: true },
          targetUrl: { type: "string", nullable: true },
          resolvedTitle: { type: "string", nullable: true },
        },
      },
      CommentNode: {
        type: "object",
        properties: {
          id: { type: "integer" },
          body: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          authorName: { type: "string" },
          authorUsername: { type: "string" },
          parentId: { type: "integer", nullable: true },
          children: { type: "array", items: { $ref: "#/components/schemas/CommentNode" } },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          displayName: { type: "string" },
          role: { type: "string", enum: ["author", "moderator", "admin"] },
          bio: { type: "string", nullable: true },
          orcid: { type: "string", nullable: true },
          institution: { type: "string", nullable: true },
          website: { type: "string", nullable: true },
          location: { type: "string", nullable: true },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          keyPrefix: { type: "string", description: "First 12 chars of the raw key." },
          scopes: { type: "array", items: { type: "string", enum: ["read", "write"] } },
          lastUsedAt: { type: "string", format: "date-time", nullable: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          revokedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      HealthComponent: {
        type: "object",
        properties: {
          key: { type: "string" },
          status: { type: "string", enum: ["operational", "degraded", "down"] },
          latency: { type: "number", nullable: true },
          detail: { type: "string", nullable: true },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid authentication.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      Forbidden: {
        description: "Authenticated but lacking the required permission.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      NotFound: {
        description: "Resource not found.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
      BadRequest: {
        description: "Invalid request body or parameters.",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
  },
  security: [{ papex_session: [] }, { apiKey: [] }],
} as const;
