import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      p_gym_id,
      p_search,
      p_status,
      p_page,
      p_page_size,
      p_user_id,
      p_is_trainer,
      p_show_my_members,
    } = body;

    if (!p_gym_id) {
      return NextResponse.json({ error: "Missing p_gym_id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("get_members_paginated", {
      p_gym_id,
      p_search: p_search || "",
      p_status: p_status || "all",
      p_page: p_page || 1,
      p_page_size: p_page_size || 20,
      p_user_id: p_user_id || null,
      p_is_trainer: p_is_trainer || false,
      p_show_my_members: p_show_my_members || false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /members/list error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
