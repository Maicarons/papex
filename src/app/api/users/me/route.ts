import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/services/users";
import { updateProfileSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = updateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    );
  }

  const updated = await updateUserProfile(user.id, parsed.data);
  return NextResponse.json({
    user: {
      id: updated.id,
      username: updated.username,
      displayName: updated.displayName,
      role: updated.role,
      bio: updated.bio,
      orcid: updated.orcid,
      institution: updated.institution,
      website: updated.website,
      location: updated.location,
    },
  });
}
