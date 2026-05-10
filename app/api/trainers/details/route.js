import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const { p_trainer_id, p_gym_id } = body;

    if (!p_trainer_id || !p_gym_id) {
      return NextResponse.json(
        { error: "Missing p_trainer_id or p_gym_id" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("get_trainer_details", {
      p_trainer_id,
      p_gym_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Safety filter: keep only paid payment activities.
    // This prevents pending balance rows from showing as "Collected payment".
    let sanitizedData = data;
    const activityLog = Array.isArray(data?.activity_log) ? data.activity_log : [];
    const paymentActivityIds = activityLog
      .filter((item) => item?.type === "payment" && typeof item?.id === "string" && item.id.startsWith("payment-"))
      .map((item) => item.id.replace("payment-", ""));

    if (paymentActivityIds.length > 0) {
      const { data: paymentRows } = await supabaseAdmin
        .from("payments")
        .select("id, status")
        .in("id", paymentActivityIds);

      const paidPaymentIds = new Set(
        (paymentRows || [])
          .filter((row) => String(row.status || "").toLowerCase() === "paid")
          .map((row) => String(row.id))
      );

      sanitizedData = {
        ...data,
        activity_log: activityLog.filter((item) => {
          if (item?.type !== "payment" || typeof item?.id !== "string") return true;
          const paymentId = item.id.replace("payment-", "");
          return paidPaymentIds.has(paymentId);
        }),
      };
    }

    return NextResponse.json({ data: sanitizedData });
  } catch (err) {
    console.error("API /trainers/details error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
