import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { params } = await request.json();

    if (!params) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("add_member_with_membership", params);

    if (error) {
      const status = error.message?.includes("DUPLICATE_PHONE") ? 409 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /members/add error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
