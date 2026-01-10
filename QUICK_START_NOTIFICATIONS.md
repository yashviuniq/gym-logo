# Quick Start - Testing Notifications

## 1. Run Database Migration
Copy and run in Supabase SQL Editor:
\`\`\`bash
# File: app/supabase/migrations/003_fcm_notifications.sql
\`\`\`

## 2. Add Environment Variables
Create `.env.local` (if not exists):
\`\`\`bash
# Get Server Key from: https://console.firebase.google.com/project/sfit-ai-notifications/settings/cloudmessaging
FIREBASE_SERVER_KEY=your-key-from-firebase-console

# Optional - for securing cron endpoint
CRON_SECRET=any-random-string-here
\`\`\`

## 3. Get Your Firebase Server Key
1. Go to: https://console.firebase.google.com/project/sfit-ai-notifications/settings/cloudmessaging
2. Scroll to "Cloud Messaging API (Legacy)"
3. Copy the "Server key"
4. Paste it in `.env.local` as `FIREBASE_SERVER_KEY`

## 4. Install & Run
\`\`\`bash
npm install firebase
npm run dev
\`\`\`

## 5. Test It!
1. Open http://localhost:3000
2. Login as user
3. Allow notifications when prompted
4. As admin, create an announcement
5. User should receive push notification! 🎉

## For Production (Vercel)
1. Add `FIREBASE_SERVER_KEY` to Vercel Environment Variables
2. Deploy
3. Cron job will automatically run daily at 8 AM for expiry notifications

See NOTIFICATIONS_SETUP.md for detailed documentation.
