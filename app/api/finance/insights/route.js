import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function getMonthRangeUtc(month, year) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function getPaymentTimestamp(payment) {
  const raw = payment?.paid_at || payment?.created_at;
  if (!raw) return Number.NaN;
  return new Date(raw).getTime();
}

async function enrichInsightsWithPaymentAmounts(baseData, gymId, month, year) {
  if (!baseData || typeof baseData !== "object") return baseData;

  const newJoins = Array.isArray(baseData.month_new_joins_list)
    ? baseData.month_new_joins_list
    : [];
  const renewals = Array.isArray(baseData.month_renewals_list)
    ? baseData.month_renewals_list
    : [];

  if (newJoins.length === 0 && renewals.length === 0) {
    return baseData;
  }

  const renewalPhones = Array.from(
    new Set(renewals.map((item) => item?.phone).filter(Boolean))
  );

  const membersByPhone = new Map();
  if (renewalPhones.length > 0) {
    const { data: renewalMembers } = await supabaseAdmin
      .from("members")
      .select("id, phone")
      .eq("gym_id", gymId)
      .in("phone", renewalPhones);

    (renewalMembers || []).forEach((member) => {
      if (member?.phone) membersByPhone.set(member.phone, member.id);
    });
  }

  const memberIds = new Set();
  newJoins.forEach((item) => {
    if (item?.id) memberIds.add(item.id);
  });
  renewals.forEach((item) => {
    const memberId = item?.phone ? membersByPhone.get(item.phone) : null;
    if (memberId) memberIds.add(memberId);
  });

  if (memberIds.size === 0) {
    return {
      ...baseData,
      month_new_joins_list: newJoins.map((item) => ({ ...item, payment_amount: null })),
      month_renewals_list: renewals.map((item) => ({ ...item, payment_amount: null })),
    };
  }

  const { start, end } = getMonthRangeUtc(month, year);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { data: paymentsData } = await supabaseAdmin
    .from("payments")
    .select("member_id, membership_id, amount, paid_at, created_at")
    .eq("gym_id", gymId)
    .eq("status", "paid")
    .in("member_id", Array.from(memberIds))
    .or(
      `and(paid_at.gte.${startIso},paid_at.lte.${endIso}),and(paid_at.is.null,created_at.gte.${startIso},created_at.lte.${endIso})`
    )
    .order("created_at", { ascending: true });

  const payments = (paymentsData || [])
    .map((payment) => ({ ...payment, _ts: getPaymentTimestamp(payment) }))
    .filter((payment) => !Number.isNaN(payment._ts) && payment._ts >= start.getTime() && payment._ts <= end.getTime());

  const firstPaymentByMember = new Map();
  const sumByMembership = new Map();

  payments
    .sort((left, right) => left._ts - right._ts)
    .forEach((payment) => {
      if (payment.member_id && !firstPaymentByMember.has(payment.member_id)) {
        firstPaymentByMember.set(payment.member_id, Number(payment.amount || 0));
      }
      if (payment.membership_id) {
        const current = sumByMembership.get(payment.membership_id) || 0;
        sumByMembership.set(payment.membership_id, current + Number(payment.amount || 0));
      }
    });

  const enrichedNewJoins = newJoins.map((item) => ({
    ...item,
    payment_amount: item?.id ? firstPaymentByMember.get(item.id) ?? null : null,
  }));

  const enrichedRenewals = renewals.map((item) => {
    const renewalMembershipAmount = item?.id ? sumByMembership.get(item.id) : null;
    const fallbackMemberAmount = item?.phone
      ? firstPaymentByMember.get(membersByPhone.get(item.phone))
      : null;

    return {
      ...item,
      payment_amount:
        renewalMembershipAmount !== undefined && renewalMembershipAmount !== null
          ? renewalMembershipAmount
          : fallbackMemberAmount ?? null,
    };
  });

  return {
    ...baseData,
    month_new_joins_list: enrichedNewJoins,
    month_renewals_list: enrichedRenewals,
  };
}

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
    const { p_gym_id, p_month, p_year, p_user_id } = await request.json();

    if (!p_month || !p_year) {
      return NextResponse.json(
        { error: "Missing required parameters: p_month, p_year" },
        { status: 400 }
      );
    }

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
    console.log("[TenantCheck][finance/insights] userId:", p_user_id, "user.gym_id:", userGymId, "requestedGymId:", p_gym_id || null, "finalGymId:", finalGymId);

    const month = parseInt(p_month);
    const year = parseInt(p_year);

    const { data, error } = await supabaseAdmin.rpc("get_finance_insights", {
      p_gym_id: finalGymId,
      p_month: month,
      p_year: year,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enrichedData = await enrichInsightsWithPaymentAmounts(data, finalGymId, month, year);

    return NextResponse.json({ data: enrichedData });
  } catch (err) {
    console.error("API /finance/insights error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
