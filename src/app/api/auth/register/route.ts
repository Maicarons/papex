import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { createUser } from "@/lib/services/users";
import { signSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "参数错误" }, { status: 400 });
  }
  try {
    const user = await createUser(parsed.data);
    const token = await signSession({
      sub: user.id,
      username: user.username,
      role: user.role,
    });
    await setSessionCookie(token);
    return NextResponse.json({ id: user.id, username: user.username });
  } catch {
    return NextResponse.json({ error: "用户名或邮箱已被占用" }, { status: 409 });
  }
}
