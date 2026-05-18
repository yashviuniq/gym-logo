import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  forbidden,
  getRequestUserId,
  resolveProfileContextById,
  unauthorized,
} from "@/lib/server/tenantAuth";
import { blockViewOnlyWrites } from "@/lib/server/viewOnlyGuard";

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

    const currentUserId = getRequestUserId(request);
    if (!currentUserId) {
      return unauthorized("Missing authenticated user");
    }
    const writeBlocked = await blockViewOnlyWrites(request, supabaseAdmin, currentUserId);
    if (writeBlocked) return writeBlocked;

    const currentUser = await resolveProfileContextById(supabaseAdmin, currentUserId);
    if (!currentUser) {
      return unauthorized("Invalid authenticated user");
    }

    if (params.p_gym_id !== currentUser.gym_id) {
      return forbidden("Forbidden: gym access denied");
    }

    if (params.p_collected_by && params.p_collected_by !== currentUser.id) {
      console.warn("[TenantCheck][members/add][rejected] client sent mismatched collected_by", {
        current_user_id: currentUser.id,
        current_user_gym_id: currentUser.gym_id,
        collected_by_request: params.p_collected_by,
        transaction_gym_id: params.p_gym_id,
      });
      return forbidden("Invalid collector (cross-gym)");
    }

    // Fetch the gym's plan_type to enforce basic plan restrictions
    const { data: gymData } = await supabaseAdmin
      .from("gyms")
      .select("plan_type")
      .eq("id", params.p_gym_id)
      .single();

    const safeParams = {
      ...params,
      p_created_by: currentUser.id,
      p_created_by_name: currentUser.name,
      p_collected_by: currentUser.id,
      p_collected_by_name: currentUser.name,
    };

    if (gymData && gymData.plan_type === 'basic') {
      safeParams.p_login_value = null;
      safeParams.p_default_password = null;
    }

    console.log("[TenantCheck][members/add][write]", {
      transaction_gym_id: safeParams.p_gym_id,
      current_user_id: currentUser.id,
      current_user_gym_id: currentUser.gym_id,
      collected_by_request: params.p_collected_by || null,
      collector_user_id: safeParams.p_collected_by,
      collector_gym_id: currentUser.gym_id,
      collector_name: safeParams.p_collected_by_name,
      plan_type: gymData?.plan_type,
    });

    const { data, error } = await supabaseAdmin.rpc("add_member_with_membership", safeParams);

    if (error) {
      const status = error.message?.includes("DUPLICATE_PHONE")
        ? 409
        : error.message?.includes("PAYMENT_EXCEEDS_MEMBERSHIP_TOTAL")
          ? 400
          : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("API /members/add error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
