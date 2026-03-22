import { NextResponse } from "next/server";

export function getRequestUserId(request) {
  const headerUserId = request.headers.get("x-user-id");
  return headerUserId ? String(headerUserId) : null;
}

export async function resolveProfileContextById(supabaseAdmin, userId) {
  if (!userId) return null;

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id, gym_id, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.id || !profile?.gym_id) {
    return null;
  }

  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || null;

  return {
    id: profile.id,
    gym_id: profile.gym_id,
    name,
  };
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
