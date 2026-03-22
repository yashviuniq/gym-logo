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
    const { p_gym_id } = await request.json();
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

    const { data: payments, error } = await supabaseAdmin
      .from("payments")
      .select(`
        id,
        gym_id,
        amount,
        payment_mode,
        status,
        paid_at,
        created_at,
        membership_id,
        collected_by,
        members (
          id,
          full_name,
          phone
        ),
        collector:profiles!collected_by (
          id,
          gym_id,
          first_name,
          last_name
        )
      `)
      .eq("gym_id", finalGymId)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transactions = (payments || []).map((payment) => {
      const collectorGymId = payment.collector?.gym_id || null;
      const collectorName =
        collectorGymId && collectorGymId === finalGymId
          ? `${payment.collector?.first_name || ""} ${payment.collector?.last_name || ""}`.trim() || null
          : null;

      return {
        id: payment.id,
        transaction_gym_id: payment.gym_id,
        name: payment.members?.full_name || "Unknown",
        type: payment.membership_id ? "membership" : "personal_training",
        amount: parseFloat(payment.amount || 0),
        mode: payment.payment_mode?.toLowerCase() || "cash",
        date: payment.paid_at || payment.created_at,
        status: payment.status || "paid",
        collected_by: payment.collected_by || null,
        collector_gym_id: collectorGymId,
        collector_name: collectorName,
        collectedBy: collectorName || null,
      };
    });

    console.log(
      "[TenantCheck][finance/transactions][read]",
      transactions.slice(0, 10).map((t) => ({
        transaction_id: t.id,
        transaction_gym_id: t.transaction_gym_id,
        collector_user_id: t.collected_by,
        collector_gym_id: t.collector_gym_id,
        user_gym_id: finalGymId,
      }))
    );

    return NextResponse.json({ data: transactions });
  } catch (err) {
    console.error("API /finance/transactions error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
