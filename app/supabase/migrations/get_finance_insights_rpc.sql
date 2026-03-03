-- ============================================================
-- RPC: get_finance_insights
-- Returns all-time summary + month-wise breakdown for Finance Insights page
-- ============================================================
CREATE OR REPLACE FUNCTION get_finance_insights(
  p_gym_id UUID,
  p_month INTEGER,       -- 1-12
  p_year INTEGER          -- e.g. 2026
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_total_revenue NUMERIC;
  v_total_salary_paid NUMERIC;
  v_total_dues NUMERIC;
  v_avg_monthly_revenue NUMERIC;
  v_first_payment_date DATE;
  v_months_active NUMERIC;
  v_month_start DATE;
  v_month_end DATE;
  v_month_revenue NUMERIC;
  v_month_new_joins INTEGER;
  v_month_renewals INTEGER;
  v_month_active_members INTEGER;
BEGIN
  -- ===================== ALL-TIME STATS =====================

  -- 1. Total Revenue (all time) - sum of all payments
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_revenue
  FROM payments
  WHERE gym_id = p_gym_id
    AND status = 'paid';

  -- 2. Total Trainer Salary Paid (all time) - from trainer_earnings table
  SELECT COALESCE(SUM(trainer_amount), 0)
  INTO v_total_salary_paid
  FROM trainer_earnings
  WHERE gym_id = p_gym_id;

  -- 3. Total Pending Dues (all time) - sum of member balances > 0
  SELECT COALESCE(SUM(balance), 0)
  INTO v_total_dues
  FROM members
  WHERE gym_id = p_gym_id
    AND balance > 0;

  -- 4. Average Monthly Revenue
  --    Calculate months since first payment, then divide total revenue
  SELECT MIN(COALESCE(paid_at::date, created_at::date))
  INTO v_first_payment_date
  FROM payments
  WHERE gym_id = p_gym_id
    AND status = 'paid';

  IF v_first_payment_date IS NOT NULL THEN
    v_months_active := GREATEST(
      1,
      EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_first_payment_date)) * 12 +
      EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_first_payment_date)) + 1
    );
    v_avg_monthly_revenue := ROUND(v_total_revenue / v_months_active, 2);
  ELSE
    v_avg_monthly_revenue := 0;
  END IF;

  -- ===================== MONTH-WISE STATS =====================

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- 5. Month Revenue
  SELECT COALESCE(SUM(amount), 0)
  INTO v_month_revenue
  FROM payments
  WHERE gym_id = p_gym_id
    AND status = 'paid'
    AND (
      (paid_at IS NOT NULL AND paid_at::date >= v_month_start AND paid_at::date <= v_month_end)
      OR
      (paid_at IS NULL AND created_at::date >= v_month_start AND created_at::date <= v_month_end)
    );

  -- 6. Month New Joins - members whose join_date falls in the month
  SELECT COUNT(*)
  INTO v_month_new_joins
  FROM members
  WHERE gym_id = p_gym_id
    AND join_date >= v_month_start
    AND join_date <= v_month_end;

  -- 7. Month Renewals - memberships created in the month that are NOT the first membership for that member
  SELECT COUNT(*)
  INTO v_month_renewals
  FROM memberships ms
  WHERE ms.gym_id = p_gym_id
    AND ms.created_at::date >= v_month_start
    AND ms.created_at::date <= v_month_end
    AND EXISTS (
      SELECT 1 FROM memberships ms2
      WHERE ms2.member_id = ms.member_id
        AND ms2.gym_id = p_gym_id
        AND ms2.id != ms.id
        AND ms2.created_at < ms.created_at
    );

  -- 8. Month Active Members - members with an active membership overlapping the month
  SELECT COUNT(DISTINCT ms.member_id)
  INTO v_month_active_members
  FROM memberships ms
  WHERE ms.gym_id = p_gym_id
    AND ms.start_date <= v_month_end
    AND ms.end_date >= v_month_start
    AND ms.status = 'active';

  -- ===================== BUILD RESULT =====================

  v_result := jsonb_build_object(
    'total_revenue_all_time', v_total_revenue,
    'total_salary_paid_all_time', v_total_salary_paid,
    'total_dues_all_time', v_total_dues,
    'net_profit_all_time', v_total_revenue - v_total_salary_paid,
    'avg_monthly_revenue', v_avg_monthly_revenue,
    'month_revenue', v_month_revenue,
    'month_new_joins', v_month_new_joins,
    'month_renewals', v_month_renewals,
    'month_active_members', v_month_active_members
  );

  RETURN v_result;
END;
$$;
