# Vercel Cron Configuration for Push Notifications

# Check for expiring memberships every day at 8 AM IST (2:30 AM UTC)
0 2 * * * curl -X GET https://your-domain.vercel.app/api/notifications/check-expiring -H "Authorization: Bearer YOUR_CRON_SECRET"

# OR using Vercel's cron.json format (recommended):
# Create vercel.json with this config:
{
  "crons": [
    {
      "path": "/api/notifications/check-expiring",
      "schedule": "30 2 * * *"
    }
  ]
}
