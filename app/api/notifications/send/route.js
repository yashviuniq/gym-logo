import { NextResponse } from 'next/server';
import { sendNotificationToUsers } from '@/lib/notifications';
import { createClient } from "@supabase/supabase-js";
import { blockViewOnlyWrites } from "@/lib/server/viewOnlyGuard";

/**
 * POST /api/notifications/send
 * Send push notifications to users
 * Body: { userIds: string[], notification: { title, body, type, data, url } }
 */
export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const writeBlocked = await blockViewOnlyWrites(request, supabaseAdmin);
    if (writeBlocked) return writeBlocked;

    const body = await request.json();
    const { userIds, notification } = body;

    // Validate request
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      );
    }

    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'notification with title and body is required' },
        { status: 400 }
      );
    }

    // Send notifications
    const result = await sendNotificationToUsers(userIds, notification);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${result.sent} notifications successfully`,
      sent: result.sent,
      failed: result.failed,
      total: result.total
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
