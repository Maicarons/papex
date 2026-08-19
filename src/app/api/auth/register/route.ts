import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import type { DeviceInput } from "@/lib/auth/refresh-token";
import { createUser } from "@/lib/services/users";
import { resolveDevice, issueAuthPair } from "@/lib/auth/refresh-token";
import { signSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function extractDevice(input: Record<string, unknown>): DeviceInput {
  const device = input.device as Record<string, unknown> | undefined;
  if (device && typeof device === "object") {
    return {
      deviceName: (device.deviceName as string) ?? null,
      platform: (device.platform as string) ?? "desktop",
      fingerprint:
        ((device.fingerprint as string) ?? (input.fingerprint as string)) ?? null,
    };
  }
  return {
    deviceName: (input.deviceName as string) ?? null,
    platform: (input.platform as string) ?? "mobile",
    fingerprint: null,
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }
  const email = parsed.data.email ?? `${parsed.data.username}@local`;
  try {
    const user = await createUser({
      username: parsed.data.username,
      email,
      displayName: parsed.data.displayName ?? parsed.data.username,
      password: parsed.data.password,
    });
    const device = await resolveDevice(
      user.id,
      extractDevice(parsed.data as Record<string, unknown>),
    );
    const auth = await issueAuthPair(user, device.id);
    // Plant the web session cookie in addition to the bearer token pair.
    const token = await signSession({ sub: user.id, username: user.username, role: user.role });
    await setSessionCookie(token);
    return NextResponse.json(auth, { status: 201 });
  } catch {
    return NextResponse.json({ error: "用户名或邮箱已被占用" }, { status: 409 });
  }
}
