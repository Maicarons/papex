import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRefreshToken, refreshAuthPair } from "@/lib/auth/refresh-token";

export const dynamic = "force-dynamic";

const schema = z.object({
  refreshToken: z.string().min(1),
  // Client also sends deviceId; we ignore it and trust the token's bound
  // deviceId (more authoritative, prevents a stolen token being re-bound).
  deviceId: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const verification = await verifyRefreshToken(parsed.data.refreshToken);
  if (!verification) {
    return NextResponse.json({ error: "refresh_token_invalid" }, { status: 401 });
  }
  const auth = await refreshAuthPair(verification);
  if (!auth) {
    return NextResponse.json({ error: "user_not_found" }, { status: 401 });
  }
  return NextResponse.json(auth);
}
