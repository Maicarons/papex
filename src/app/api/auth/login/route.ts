import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import type { DeviceInput } from "@/lib/auth/refresh-token";
import { verifyLogin } from "@/lib/services/users";
import { resolveDevice, issueAuthPair } from "@/lib/auth/refresh-token";

export const dynamic = "force-dynamic";

/** Normalize the device metadata from either the desktop (`device`) or mobile
 *  (top-level) request shapes into a single DeviceInput. */
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
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
  }
  const identifier = (parsed.data.identifier ??
    parsed.data.email ??
    parsed.data.username) as string;
  const user = await verifyLogin({ identifier, password: parsed.data.password });
  if (!user) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }
  const device = await resolveDevice(user.id, extractDevice(parsed.data as Record<string, unknown>));
  const auth = await issueAuthPair(user, device.id);
  return NextResponse.json(auth);
}
