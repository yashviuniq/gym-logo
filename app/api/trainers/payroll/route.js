import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { p_gym_id, p_month } = body;

    if (!p_gym_id) {
      return NextResponse.json({ error: "Missing p_gym_id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc("get_trainer_payroll_dashboard", {
      p_gym_id,
      p_month: p_month || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /trainers/payroll error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}