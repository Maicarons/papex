import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyRecord,
} from "@/lib/auth/api-key";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(80),
  scopes: z.array(z.enum(["read", "write"])).min(1).max(2).default(["read", "write"]),
  environment: z.enum(["live", "test"]).default("live"),
  // Optional ISO date string. null = never expires.
  expiresAt: z.string().datetime().nullable().optional(),
});

function toPublic(record: ApiKeyRecord) {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
  };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keys = await listApiKeys(user.id);
  return NextResponse.json({ apiKeys: keys.map(toPublic) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const created = await createApiKey(user.id, data.name, {
    scopes: data.scopes,
    environment: data.environment,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  });

  // The raw secret is returned exactly once. Persist nothing but its hash.
  return NextResponse.json(
    { apiKey: { ...toPublic(created), token: (created as ApiKeyRecord & { token: string }).token } },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const ok = await revokeApiKey(user.id, id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
