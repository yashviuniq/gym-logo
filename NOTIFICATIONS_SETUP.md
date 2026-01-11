# 🔔 Push Notifications Setup Guide

## Overview
Your gym management app now supports push notifications for:
1. **Admin Announcements** - Instant notifications when admin creates announcements
2. **Membership Expiry Alerts** - Automatic notifications 2 days before membership expires (runs once daily at 8 AM)

## 📋 Setup Instructions

### Step 1: Run Database Migration
Run the FCM database migration in your Supabase SQL editor:
```sql
-- Open Supabase Dashboard > SQL Editor
-- Run the file: app/supabase/migrations/003_fcm_notifications.sql
```

This creates:
- `fcm_tokens` table - Stores user device tokens
- `notification_logs` table - Tracks notification history
- RLS policies for security

### Step 2: Get Firebase Server Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sfit-ai-notifications**
3. Go to **Project Settings** (⚙️ icon) > **Cloud Messaging** tab
4. Copy the **Server key** (not the Sender ID)

### Step 3: Configure Environment Variables
Add to your `.env.local` file:
```bash
# Firebase Server Key (from Firebase Console)
FIREBASE_SERVER_KEY=AAAA... (paste your server key here)

# Optional: Secure your cron endpoint
CRON_SECRET=your-random-secret-here
```

### Step 4: Update next.config.mjs
Add Firebase service worker to your Next.js config:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/firebase-messaging-sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          },
          {
            key: 'Content-Type',
            value: 'application/javascript'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
```

### Step 5: Deploy to Vercel
The `vercel.json` file is already configured with a cron job that runs daily at 8 AM IST to check expiring memberships.

```json
{
  "crons": [
    {
      "path": "/api/notifications/check-expiring",
      "schedule": "30 2 * * *"
    }
  ]
}
```

**Note:** Vercel cron jobs are only available on **Pro plans**. For free tier, use alternatives below.

## 🔄 Alternative Scheduling Options (Free Tier)

If you're on Vercel's free tier, use one of these free alternatives:

### Option 1: Cron-job.org (Recommended)
1. Go to [cron-job.org](https://cron-job.org/)
2. Create free account
3. Create new cron job:
   - **URL**: `https://your-domain.vercel.app/api/notifications/check-expiring`
   - **Schedule**: `30 2 * * *` (8 AM IST daily)
   - **Method**: GET
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET` (if using CRON_SECRET)

### Option 2: EasyCron
1. Go to [easycron.com](https://www.easycron.com/)
2. Similar setup as above

### Option 3: GitHub Actions (Free)
Create `.github/workflows/check-expiring.yml`:
```yaml
name: Check Expiring Memberships
on:
  schedule:
    - cron: '30 2 * * *'  # 8 AM IST daily
  workflow_dispatch:

jobs:
  check-expiring:
    runs-on: ubuntu-latest
    steps:
      - name: Call API
        run: |
          curl -X GET https://your-domain.vercel.app/api/notifications/check-expiring \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to your GitHub repository secrets.

## 🎯 How It Works

### 1. Announcement Notifications (Instant)
When admin creates an announcement:
```javascript
// Automatically happens in add announcement page
1. Admin creates announcement
2. System gets all member user_ids for that gym
3. Push notification sent to all registered devices
4. Users receive: "📢 Announcement Title" with message preview
```

### 2. Membership Expiry Notifications (Daily)
Runs automatically every day at 8 AM IST:
```javascript
1. Cron job calls /api/notifications/check-expiring
2. Finds all memberships expiring in exactly 2 days
3. Sends notification to each user:
   "⚠️ Membership Expiring Soon"
   "Hi [Name]! Your [Plan] will expire in 2 days..."
4. Logs all notifications sent
```

## 📱 User Experience

### First Time Setup
1. User opens the app
2. Notification permission popup appears
3. User clicks "Enable" → token is registered
4. User starts receiving notifications

### Notification Types
- **Announcements**: Instant when admin posts
- **Expiry Alerts**: Daily check, sent 2 days before expiry
- **Foreground**: Toast notification when app is open
- **Background**: Push notification when app is closed

## 🔐 Security Features

1. **RLS Policies**: Users can only see their own tokens
2. **Token Management**: Automatic cleanup on logout
3. **Cron Secret**: Optional authentication for cron endpoint
4. **Notification Logs**: Full audit trail of all notifications

## 🧪 Testing

### Test Announcement Notification
1. Login as admin
2. Go to Announcements > Create New
3. Fill in title and message
4. Submit
5. All app users should receive push notification immediately

### Test Expiry Notification (Manual)
Call the API manually:
```bash
curl -X GET http://localhost:3000/api/notifications/check-expiring \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit in browser (if no CRON_SECRET):
```
http://localhost:3000/api/notifications/check-expiring
```

### Test Notification Permission
1. Open app in incognito/private mode
2. Should see notification permission popup
3. Grant permission
4. Check browser console for "FCM token registered successfully"

## 📊 Monitoring

### View Notification Logs
Query Supabase:
```sql
SELECT * FROM notification_logs 
ORDER BY sent_at DESC 
LIMIT 100;
```

### View Active Tokens
```sql
SELECT 
  fcm_tokens.*,
  profiles.first_name,
  profiles.last_name
FROM fcm_tokens
JOIN profiles ON fcm_tokens.user_id = profiles.id
ORDER BY last_used_at DESC;
```

### Check Cron Job Status
- **Vercel**: Dashboard > Project > Cron Jobs
- **cron-job.org**: View execution history
- **GitHub Actions**: Actions tab > workflow runs

## 🐛 Troubleshooting

### Notifications Not Received
1. Check FCM token is registered:
   ```sql
   SELECT * FROM fcm_tokens WHERE user_id = 'user-id-here';
   ```
2. Verify FIREBASE_SERVER_KEY is set correctly
3. Check notification_logs for errors:
   ```sql
   SELECT * FROM notification_logs WHERE success = false;
   ```
4. Ensure service worker is registered (check browser DevTools > Application > Service Workers)

### Cron Job Not Running
1. Verify vercel.json is deployed
2. Check Vercel cron logs
3. Test API endpoint manually
4. Ensure CRON_SECRET matches if using authentication

### Permission Issues
1. Clear browser cache and reload
2. Check browser allows notifications (not in incognito/private mode by default)
3. Revoke and re-grant notification permission
4. Check browser console for errors

## 📝 API Reference

### POST /api/notifications/send
Send notifications to specific users
```json
{
  "userIds": ["uuid1", "uuid2"],
  "notification": {
    "title": "Notification Title",
    "body": "Notification body",
    "type": "announcement",
    "url": "/page-to-open",
    "data": { "custom": "data" }
  }
}
```

### POST /api/notifications/register
Register FCM token
```json
{
  "userId": "uuid",
  "token": "fcm-token",
  "deviceInfo": {
    "userAgent": "...",
    "platform": "..."
  }
}
```

### GET /api/notifications/check-expiring
Check and notify expiring memberships (cron job)
- Headers: `Authorization: Bearer CRON_SECRET` (optional)
- Returns: Count of notifications sent

## 🚀 Next Steps

1. ✅ Run database migration
2. ✅ Add Firebase server key to .env.local
3. ✅ Update next.config.mjs
4. ✅ Deploy to Vercel
5. ✅ Set up cron job (Vercel or alternative)
6. ✅ Test both notification types
7. ✅ Monitor notification logs

## 💡 Tips

- **Battery Optimization**: Notifications are sent efficiently, no battery drain
- **Smart Scheduling**: Cron runs once daily, not repeatedly
- **Scalable**: Works for any number of users
- **Reliable**: Retry logic and error logging built-in
- **User Friendly**: Clear permission prompts and in-app messages

---

**Questions?** Check the code comments or test the endpoints manually.
