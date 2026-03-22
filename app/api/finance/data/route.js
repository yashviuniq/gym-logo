import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  forbidden,
  getRequestUserId,
  resolveProfileContextById,
  unauthorized,
} from "@/lib/server/tenantAuth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { p_gym_id, p_period_start, p_period_end } = await request.json();

    if (!p_period_start || !p_period_end) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const currentUserId = getRequestUserId(request);
    if (!currentUserId) {
      return unauthorized("Missing authenticated user");
    }

    const currentUser = await resolveProfileContextById(supabaseAdmin, currentUserId);
    if (!currentUser) {
      return unauthorized("Invalid authenticated user");
    }

    if (p_gym_id && p_gym_id !== currentUser.gym_id) {
      return forbidden("Forbidden: gym access denied");
    }

    const finalGymId = currentUser.gym_id;
    console.log("[TenantCheck][finance/data] userId:", currentUser.id, "user.gym_id:", currentUser.gym_id, "requestedGymId:", p_gym_id || null, "finalGymId:", finalGymId);

    const { data, error } = await supabaseAdmin.rpc("get_finance_data", {
      p_gym_id: finalGymId,
      p_period_start,
      p_period_end,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payments = Array.isArray(data?.payments) ? data.payments : [];
    const debugPreview = payments.slice(0, 10).map((payment) => ({
      transaction_id: payment.id,
      transaction_gym_id: payment.transaction_gym_id || null,
      collector_user_id: payment.collected_by || null,
      collector_gym_id: payment.collector_gym_id || null,
      user_gym_id: finalGymId,
    }));
    console.log("[TenantCheck][finance/data][read]", debugPreview);

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /finance/data error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
