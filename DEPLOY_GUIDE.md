# 🍔 FoodKnock — Deploy Guide
## GitHub → Vercel → foodknock.com (Hostinger)

---

## ✅ Pre-Deploy Checklist

Before deploying, make sure you have:
- [ ] MongoDB Atlas account + cluster created
- [ ] Cloudinary account (free tier is fine)
- [ ] Razorpay account with Live API keys
- [ ] A GitHub account
- [ ] Vercel account (free)
- [ ] Hostinger domain: `foodknock.com`

---

## STEP 1 — Generate VAPID Keys (Web Push Notifications)

Run this **once** in your terminal (Node.js required):

```bash
npx web-push generate-vapid-keys
```

Output will look like:
```
Public Key:  BxxxxxxxxxxxxY   ← NEXT_PUBLIC_VAPID_PUBLIC_KEY
Private Key: xxxxxxxxxxxxxxx  ← VAPID_PRIVATE_KEY
```

Save both — you'll need them in Step 3.

---

## STEP 2 — Push to GitHub

```bash
cd foodknock

# Initialize git
git init
git add .
git commit -m "FoodKnock v1 — initial deploy"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/foodknock.git
git branch -M main
git push -u origin main
```

> ⚠️ Make sure `.env.local` is NOT committed — it's in `.gitignore`

---

## STEP 3 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `foodknock` GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Root Directory: leave blank (or `./` if needed)
5. **Before clicking Deploy** → click **Environment Variables**

### Add ALL these environment variables:

| Variable | Value |
|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true` |
| `JWT_SECRET` | Any 64-char random string |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxx` |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as `RAZORPAY_KEY_ID` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | From Step 1 (Public Key) |
| `VAPID_PRIVATE_KEY` | From Step 1 (Private Key) |
| `VAPID_CONTACT_EMAIL` | `foodknock@gmail.com` |
| `CRON_SECRET` | Any random 32-char string |
| `NEXT_PUBLIC_APP_URL` | `https://www.foodknock.com` |
| `TELEGRAM_BOT_TOKEN` | From @BotFather (optional) |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID (optional) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | From Search Console (add later) |

6. Click **Deploy** — wait ~2 minutes

---

## STEP 4 — Connect Domain (Hostinger → Vercel)

### On Vercel:
1. Go to your project → **Settings** → **Domains**
2. Add `foodknock.com` → Click Add
3. Add `www.foodknock.com` → Click Add
4. Vercel will show you the DNS records needed

### On Hostinger:
1. Login → **Domains** → `foodknock.com` → **DNS / Nameservers**
2. Add these records:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

3. Wait 5–30 minutes for DNS propagation
4. SSL certificate will auto-install on Vercel (Let's Encrypt)

> 💡 Test propagation at: https://dnschecker.org

---

## STEP 5 — Verify Notifications are Working

The cron jobs in `vercel.json` run automatically on Vercel:
- **11:00 AM IST** → morning slot notification
- **4:00 PM IST** → evening slot notification

To test manually after deploy:
```bash
# Replace YOUR_CRON_SECRET with what you set in env
curl -X POST "https://www.foodknock.com/api/push/send-campaign?slot=morning" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{ "success": true, "slot": "morning", "sent": 5, "failed": 0, "deactivated": 0 }
```

> Note: Vercel Cron Jobs require **Pro plan** for custom schedules. On Free plan, you can trigger manually or use a free service like [cron-job.org](https://cron-job.org) to hit the endpoint on schedule.

### cron-job.org setup (Free alternative):
1. Register at cron-job.org
2. Create job: URL = `https://www.foodknock.com/api/push/send-campaign?slot=morning`
3. Add header: `Authorization: Bearer YOUR_CRON_SECRET`
4. Schedule: `30 5 * * *` (UTC) = 11:00 AM IST
5. Repeat for evening: `30 10 * * *` (UTC) = 4:00 PM IST

---

## STEP 6 — Google Search Console (SEO)

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Click **Add Property** → `foodknock.com`
3. Choose **HTML tag** verification method
4. Copy the `content="xxxx"` value from the meta tag
5. Add to Vercel env: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=xxxx`
6. Redeploy on Vercel (just push any commit)
7. Click **Verify** in Search Console
8. Then go to **Sitemaps** → Submit: `https://www.foodknock.com/sitemap.xml`

---

## STEP 7 — Create Admin Account

After deploy, create your admin user directly in MongoDB:

1. Open MongoDB Atlas → Browse Collections → `users`
2. Insert document:
```json
{
  "name": "Admin",
  "email": "your@email.com",
  "password": "<bcrypt-hash>",
  "role": "admin",
  "isActive": true,
  "createdAt": { "$date": "2025-01-01T00:00:00Z" }
}
```

To generate bcrypt hash:
```bash
node -e "const b=require('bcryptjs'); b.hash('YourPassword123',12).then(h=>console.log(h))"
```

Or use the register page and then update role to `admin` in MongoDB.

---

## STEP 8 — Add OG Image

Replace `public/og-image.png` with a 1200×630px image showing:
- FoodKnock logo / name
- Some food imagery
- Tagline

This is used when your link is shared on WhatsApp, Twitter, etc.

---

## How Notifications Work (Full Flow)

```
1. User visits foodknock.com
2. After scrolling 500px (or 4.5s) → NotificationPrompt card appears
3. User clicks "Enable Notifications"
4. Browser asks permission → User clicks Allow
5. Browser generates unique push subscription (endpoint + keys)
6. POST /api/push/subscribe → Saved in MongoDB PushSubscription collection
7. ─────────────────────────────────────────────────────
8. Every day at 11 AM IST → Vercel Cron hits /api/push/send-campaign?slot=morning
9. Every day at 4 PM IST  → Vercel Cron hits /api/push/send-campaign?slot=evening
10. API fetches all active subscriptions from MongoDB
11. Picks a random message from NOTIFICATION_POOL
12. Sends via web-push library to each subscriber's endpoint
13. Browser's Service Worker (sw.js) receives the push
14. OS shows native notification with title, body, action buttons
15. User clicks "Order Now" → opens /menu
```

**If a subscription is expired/invalid** (user cleared browser data):
- web-push returns 404/410 status
- Subscription is auto-marked `isActive: false` in MongoDB
- Won't be messaged again (no wasted calls)

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Build fails with "MONGODB_URI not defined" | Add env var in Vercel before deploying |
| Notifications not showing | Check VAPID keys are correct; test with curl command above |
| Domain not resolving | Wait 30 min for DNS; check records at dnschecker.org |
| Images not loading | Check Cloudinary credentials in Vercel env |
| Cron not firing | Use cron-job.org on free Vercel plan |
| Admin panel 403 | Make sure user has `role: "admin"` in MongoDB |
| PWA install not showing | Must be on HTTPS + manifest.webmanifest must be accessible |

---

## Environment Summary

```
MONGODB_URI                       → Database connection
JWT_SECRET                        → Auth token signing
CLOUDINARY_*                      → Product image upload
RAZORPAY_KEY_ID/SECRET            → Payment processing
NEXT_PUBLIC_RAZORPAY_KEY_ID       → Client-side payment init
NEXT_PUBLIC_VAPID_PUBLIC_KEY      → Push notification subscription (client)
VAPID_PRIVATE_KEY                 → Push notification sending (server)
VAPID_CONTACT_EMAIL               → Push notification contact
CRON_SECRET                       → Secures cron endpoint
NEXT_PUBLIC_APP_URL               → Canonical URL
TELEGRAM_BOT_TOKEN/CHAT_ID        → Order alerts (optional)
NEXT_PUBLIC_GOOGLE_SITE_VERIFY    → SEO verification (optional)
```

---

*FoodKnock — Fresh. Fast. Delivered. 🍔*
