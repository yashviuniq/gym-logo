import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from "@supabase/supabase-js";
import { blockViewOnlyWrites } from "@/lib/server/viewOnlyGuard";

// Ensure Admin SDK initialized (lib/notifications should already handle, but safe-guard here)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  if (!serviceAccount.project_id) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT is not properly configured');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✅ Firebase Admin SDK initialized in test-send');
}

export async function POST(request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const writeBlocked = await blockViewOnlyWrites(request, supabaseAdmin);
    if (writeBlocked) return writeBlocked;

    const body = await request.json();
    const { token, title, body: msgBody } = body;

    console.log('📤 test-send called with token:', token?.substring(0, 30) + '...');

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    console.log('🔥 Attempting to send via Firebase Admin SDK...');
    const messageId = await admin.messaging().send({
      token,
      notification: {
        title: title || 'Test Alert',
        body: msgBody || 'If you see this, FCM works ✅',
      },
      webpush: {
        fcmOptions: {
          link: '/'
        }
      }
    });

    console.log('✅ Message sent successfully. MessageId:', messageId);
    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    console.error('❌ Test send error:', err.code, err.message);
    return NextResponse.json({ error: 'Send failed', details: err?.message, code: err?.code }, { status: 500 });
  }
}
