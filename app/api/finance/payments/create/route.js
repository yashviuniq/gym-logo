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
    const {
      p_gym_id,
      p_member_id,
      p_membership_id,
      p_amount,
      p_payment_mode,
      p_status,
      p_paid_at,
      p_created_at,
      p_notes,
      p_next_payment_date,
      p_remaining_amount,
      p_collected_by,
      p_collected_by_name,
    } = await request.json();

    if (!p_member_id || !p_amount || !p_payment_mode) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const currentUserId = getRequestUserId(request);
    if (!currentUserId) {
      return unauthorized("Missing authenticated user");
    }

    const collector = await resolveProfileContextById(supabaseAdmin, currentUserId);
    if (!collector) {
      return unauthorized("Invalid authenticated user");
    }

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, gym_id")
      .eq("id", p_member_id)
      .maybeSingle();

    if (!member) {
      return forbidden("Invalid member");
    }

    const finalGymId = member.gym_id;
    if (!finalGymId) {
      return forbidden("Invalid member gym");
    }

    if (collector.gym_id !== finalGymId) {
      console.warn("[TenantCheck][finance/payments/create][rejected] collector-member gym mismatch", {
        current_user_id: collector.id,
        current_user_gym_id: collector.gym_id,
        collected_by: p_collected_by || null,
        collector_gym_id: collector.gym_id,
        transaction_gym_id: finalGymId,
      });
      return forbidden("Invalid collector (cross-gym)");
    }

    if (p_gym_id && p_gym_id !== finalGymId) {
      return forbidden("Forbidden: gym access denied");
    }

    const normalizedStatus = String(p_status || "paid").toLowerCase();

    let finalCollectorId = null;
    let finalCollectorName = null;

    if (normalizedStatus === "paid") {
      finalCollectorId = collector.id;
      finalCollectorName = collector.name;
    }

    console.log("[TenantCheck][finance/payments/create][write]", {
      current_user_id: collector.id,
      current_user_gym_id: collector.gym_id,
      collected_by_request: p_collected_by || null,
      collected_by_name_request: p_collected_by_name || null,
      collected_by_final: finalCollectorId,
      collector_gym_id: collector.gym_id,
      transaction_gym_id: finalGymId,
    });

    const { data: insertedPayment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        gym_id: finalGymId,
        member_id: p_member_id,
        membership_id: p_membership_id || null,
        amount: Number(p_amount),
        payment_mode: p_payment_mode,
        status: normalizedStatus,
        paid_at: p_paid_at || null,
        created_at: p_created_at || new Date().toISOString(),
        notes: p_notes || null,
        next_payment_date: p_next_payment_date || null,
        remaining_amount: p_remaining_amount ?? null,
        collected_by: finalCollectorId,
        collected_by_name: finalCollectorName,
      })
      .select("id, gym_id, collected_by, collected_by_name, status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: insertedPayment });
  } catch (err) {
    console.error("API /finance/payments/create error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
