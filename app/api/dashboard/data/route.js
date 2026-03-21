import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function resolveUserGymId(userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("gym_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.gym_id) return profile.gym_id;

  const { data: member } = await supabaseAdmin
    .from("members")
    .select("gym_id")
    .eq("id", userId)
    .maybeSingle();

  return member?.gym_id || null;
}

export async function POST(request) {
  try {
    const { p_gym_id, p_user_id } = await request.json();

    if (!p_user_id) {
      return NextResponse.json({ error: "Missing p_user_id" }, { status: 401 });
    }

    const userGymId = await resolveUserGymId(p_user_id);
    if (!userGymId) {
      return NextResponse.json({ error: "Unauthorized user" }, { status: 403 });
    }

    if (p_gym_id && p_gym_id !== userGymId) {
      return NextResponse.json({ error: "Forbidden: gym access denied" }, { status: 403 });
    }

    const finalGymId = userGymId;
    console.log("[TenantCheck][dashboard/data] userId:", p_user_id, "user.gym_id:", userGymId, "requestedGymId:", p_gym_id || null, "finalGymId:", finalGymId);

    const { data, error } = await supabaseAdmin.rpc("get_dashboard_data", {
      p_gym_id: finalGymId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /dashboard/data error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
