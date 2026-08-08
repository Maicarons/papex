import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import { verifyLogin } from "@/lib/services/users";
import { signSession, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
  }
  const user = await verifyLogin(parsed.data);
  if (!user) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }
  const token = await signSession({ sub: user.id, username: user.username, role: user.role });
  await setSessionCookie(token);
  return NextResponse.json({ id: user.id, username: user.username });
}
