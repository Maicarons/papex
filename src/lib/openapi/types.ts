// OpenAPI fragment / document types used by the code-first generator.
// Only the parts we author are typed; the generated document is kept loose
// (plain objects) so route fragments can use `as const` without friction.

export interface OpenApiFragment {
  // A single path item, e.g. { "/api/papers": { get: {...}, post: {...} } }
  [path: string]: unknown;
}

export type OpenApiDocument = Record<string, unknown>;
