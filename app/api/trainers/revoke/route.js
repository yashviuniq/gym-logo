import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request) {
  try {
    const { trainerProfileId } = await request.json();

    if (!trainerProfileId) {
      return NextResponse.json({ error: "trainerProfileId is required" }, { status: 400 });
    }

    const supabase = supabaseServer();

    // Ban the user to invalidate refresh tokens and force logout on all devices
    const { error } = await supabase.auth.admin.updateUserById(trainerProfileId, {
      ban_duration: "8760h", // 1 year; effectively forces sign-out now
    });

    if (error) {
      // If the trainer was created directly in profiles (not via Supabase Auth),
      // there's no auth user to ban — that's fine, no active session to revoke.
      if (error.status === 404 || error.code === "user_not_found") {
        console.warn("Trainer has no auth user, skipping session revoke");
        return NextResponse.json({ success: true, skipped: true });
      }
      console.error("Failed to revoke trainer sessions", error);
      return NextResponse.json({ error: "Failed to revoke sessions" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error revoking trainer sessions", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
