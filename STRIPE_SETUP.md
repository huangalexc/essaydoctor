# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payments for Essay Doctor subscriptions.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your Essay Doctor application running locally

## Step 1: Get Stripe API Keys

### For Development (Test Mode)

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com/test/dashboard
2. Click on **Developers** in the left sidebar
3. Click on **API keys**
4. Copy your **Publishable key** (starts with `pk_test_`)
5. Click **Reveal test key** for the **Secret key** (starts with `sk_test_`)

### For Production (Live Mode)

1. Activate your Stripe account by providing business details
2. Switch to **Live mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy your **Publishable key** (starts with `pk_live_`)
5. Copy your **Secret key** (starts with `sk_live_`)

## Step 2: Create Products and Prices

### Option A: Using Stripe Dashboard (Recommended for beginners)

1. Go to **Products** in your Stripe Dashboard
2. Click **+ Add product**

**For PLUS Plan:**
- Name: `Essay Doctor Plus`
- Description: `Unlimited AI edits, unlimited drafts, school customization`
- Pricing model: `Recurring`
- Price: `$19.00`
- Billing period: `Monthly`
- Click **Save product**
- **Copy the Price ID** (starts with `price_...`)

**For PRO Plan:**
- Name: `Essay Doctor Pro`
- Description: `Everything in Plus + dedicated advisor + video sessions`
- Pricing model: `Recurring`
- Price: `$49.00`
- Billing period: `Monthly`
- Click **Save product**
- **Copy the Price ID** (starts with `price_...`)

### Option B: Using Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-brew/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Create PLUS product
stripe products create \
  --name "Essay Doctor Plus" \
  --description "Unlimited AI edits, unlimited drafts, school customization"

# Create PLUS price (use product ID from above)
stripe prices create \
  --product prod_XXXXX \
  --unit-amount 1900 \
  --currency usd \
  --recurring[interval]=month

# Create PRO product
stripe products create \
  --name "Essay Doctor Pro" \
  --description "Everything in Plus + dedicated advisor + video sessions"

# Create PRO price
stripe prices create \
  --product prod_YYYYY \
  --unit-amount 4900 \
  --currency usd \
  --recurring[interval]=month
```

## Step 3: Configure Webhooks

Webhooks are essential for processing subscription lifecycle events.

### For Development (Local Testing)

1. Install Stripe CLI (see Option B above)
2. Run the webhook forwarding command:
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```
3. Copy the **webhook signing secret** (starts with `whsec_`)
4. Keep this terminal window open while developing

### For Production

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Enter your endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Signing secret** (starts with `whsec_`)

## Step 4: Update Environment Variables

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_XXXXX"  # Your secret key
STRIPE_WEBHOOK_SECRET="whsec_XXXXX"  # Your webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_XXXXX"  # Your publishable key

# Stripe Price IDs
STRIPE_PRICE_ID_PLUS="price_XXXXX"  # PLUS plan price ID
STRIPE_PRICE_ID_PRO="price_YYYYY"   # PRO plan price ID

# App URL (for redirects)
NEXT_PUBLIC_APP_URL="http://localhost:3001"  # For development
# NEXT_PUBLIC_APP_URL="https://yourdomain.com"  # For production
```

**Important:** Replace all `XXXXX` placeholders with your actual Stripe values!

## Step 5: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
PORT=3001 npm run dev
```

## Step 6: Test the Payment Flow

### Test Card Numbers

Stripe provides test card numbers for development:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Payment Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`

**Payment Declined:**
- Card: `4000 0000 0000 9995`

**Full list:** https://stripe.com/docs/testing#cards

### Testing Steps

1. **Start webhook listener** (in a separate terminal):
   ```bash
   stripe listen --forward-to localhost:3001/api/webhooks/stripe
   ```

2. **Navigate to pricing page:**
   ```
   http://localhost:3001/pricing
   ```

3. **Click "Upgrade to Plus" or "Upgrade to Pro"**

4. **You should be redirected to Stripe Checkout**

5. **Fill in the test card details:**
   - Email: Any email address
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/34`
   - CVC: `123`
   - ZIP: `12345`

6. **Click "Subscribe"**

7. **You should be redirected to the success page**

8. **Check your webhook listener terminal** for events:
   ```
   checkout.session.completed
   customer.subscription.created
   ```

9. **Verify in your database** that the subscription was created:
   ```bash
   npx prisma studio
   # Check the "subscriptions" table
   ```

10. **Check your dashboard** to see the updated subscription status

## Step 7: Verify Webhook Processing

Check your server logs for these messages:

```
[WEBHOOK] Received event: checkout.session.completed
[WEBHOOK] Checkout completed: cs_test_...
[WEBHOOK] Subscription created for user: clu...
```

## Troubleshooting

### "Missing Stripe signature" error

- Make sure the webhook listener is running
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly in `.env`

### "Price ID not configured" error

- Verify `STRIPE_PRICE_ID_PLUS` and `STRIPE_PRICE_ID_PRO` are set in `.env`
- Restart your dev server after adding env vars

### Checkout redirects to wrong URL

- Check `NEXT_PUBLIC_APP_URL` in `.env`
- Make sure it matches your development URL (usually `http://localhost:3001`)

### Subscription not showing in dashboard

- Check webhook listener is running
- Check server logs for webhook processing errors
- Verify database connection is working
- Check `subscriptions` table in Prisma Studio

### "Unauthorized" error

- Make sure you're logged in
- Check that session authentication is working
- Verify `auth()` is returning user data

## Production Deployment

### Before Going Live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update environment variables** with live keys:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_...`
   - `STRIPE_PRICE_ID_PLUS` → Live price ID
   - `STRIPE_PRICE_ID_PRO` → Live price ID
3. **Create production webhook endpoint** pointing to your live domain
4. **Update `STRIPE_WEBHOOK_SECRET`** with production webhook secret
5. **Update `NEXT_PUBLIC_APP_URL`** to your production domain
6. **Test with a real card** (you can immediately refund test charges)

### Security Checklist:

- ✅ Webhook signature verification is enabled
- ✅ API keys are stored in environment variables (not committed to git)
- ✅ HTTPS is enabled on your production domain
- ✅ Webhook endpoint is accessible (not behind authentication)
- ✅ Database backups are configured
- ✅ Error monitoring is set up (e.g., Sentry)

## API Endpoints

Your application now has these payment endpoints:

- `POST /api/subscriptions/checkout` - Create checkout session
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `GET /api/subscriptions/portal` - Create billing portal session
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/upgrade` - Upgrade/downgrade subscription

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Testing Guide: https://stripe.com/docs/testing
- Webhook Testing: https://stripe.com/docs/webhooks/test

## Next Steps

1. Customize email notifications for successful subscriptions
2. Add proration handling for upgrades/downgrades
3. Implement subscription renewal reminders
4. Add analytics tracking for conversion rates
5. Set up Stripe Tax for automatic tax calculation

Your payment system is now fully integrated and ready for testing!
