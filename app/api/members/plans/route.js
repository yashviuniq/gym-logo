import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gymId = searchParams.get("gym_id");

    if (!gymId) {
      return NextResponse.json({ error: "Missing gym_id" }, { status: 400 });
    }

    const { data: plans, error } = await supabaseAdmin
      .from("membership_plans")
      .select("id, name, duration_days, price, is_active")
      .eq("gym_id", gymId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: plans || [] });
  } catch (err) {
    console.error("API /members/plans error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
