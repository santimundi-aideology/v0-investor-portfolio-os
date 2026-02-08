# Vercel Deployment Guide

This guide will help you deploy your Real Estate Investor Portfolio OS to Vercel.

## Prerequisites

- A GitHub account (your code is already pushed to GitHub)
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- A Supabase project (for database)
- OpenAI API key (for AI features)

## Step 1: Connect Your GitHub Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New Project"** or **"Import Project"**
3. Select your GitHub repository: `santimundi-aideology/v0-investor-portfolio-os`
4. Vercel will automatically detect it's a Next.js project

## Step 2: Configure Build Settings

Vercel should auto-detect these settings, but verify:

- **Framework Preset:** Next.js
- **Root Directory:** `./` (root)
- **Build Command:** `pnpm build` (or `npm run build` if using npm)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `pnpm install` (or `npm install`)

## Step 3: Set Environment Variables

In the Vercel project settings, add these environment variables:

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# OpenAI Configuration (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Optional Environment Variables

```bash
# Tavily API (for news fetching in AI agents)
TAVILY_API_KEY=your-tavily-api-key

# Demo Mode (uses mock data without real auth)
# NEXT_PUBLIC_DEMO_MODE=true
```

### Feature Flag Environment Variables

Feature flags control which features are visible in the application. Use these to incrementally enable deferred features.

| Environment | Feature Flags | Crons | Database |
|-------------|--------------|-------|----------|
| Production (`main`) | All **OFF** (not set) | Guarded by flag check | Production Supabase |
| Preview (`develop`) | All **ON** | Active | Staging Supabase |
| Local dev | All **ON** | N/A | Local / dev Supabase |

```bash
# Feature Flags — set to "true" to enable each feature
# In production: leave ALL unset (features will be hidden)
# In preview/local: set ALL to "true"
NEXT_PUBLIC_FF_EXECUTIVE_SUMMARY=true
NEXT_PUBLIC_FF_MARKET_REPORT=true
NEXT_PUBLIC_FF_ROI_CALCULATOR=true
NEXT_PUBLIC_FF_DEAL_ROOM=true
NEXT_PUBLIC_FF_MARKET_SIGNALS=true
NEXT_PUBLIC_FF_MARKET_MAP=true
NEXT_PUBLIC_FF_MARKET_COMPARE=true
NEXT_PUBLIC_FF_REALTOR_OPS=true
NEXT_PUBLIC_FF_REAL_ESTATE=true
NEXT_PUBLIC_FF_ADMIN_PANEL=true
NEXT_PUBLIC_FF_TASKS=true
NEXT_PUBLIC_FF_DATA_INGESTION=true
```

> **Cron jobs:** The `vercel.json` cron schedules still fire in all environments, but the middleware blocks `/api/jobs/*` routes when `NEXT_PUBLIC_FF_DATA_INGESTION` is not `"true"`. This means crons are effectively no-ops in production until the flag is enabled.

### How to Add Environment Variables in Vercel:

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name:** The variable name (e.g., `SUPABASE_URL`)
   - **Value:** The actual value
   - **Environment:** Select all (Production, Preview, Development)
4. Click **Save**

## Step 4: Get Your Supabase Credentials

If you don't have a Supabase project yet:

1. Go to [supabase.com](https://supabase.com) and create a project
2. Once created, go to **Settings** → **API**
3. Copy:
   - **Project URL** → Use for `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 5: Set Up Your Database

After creating your Supabase project, you need to run the migrations:

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Option B: Using Supabase Studio (Web UI)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file from `supabase/migrations/` in order:
   - `001_initial_schema.sql`
   - `002_auth_tables.sql`
   - `003_holdings.sql`
   - ... (all other migration files)

## Step 6: Deploy

1. After setting all environment variables, click **"Deploy"**
2. Vercel will:
   - Install dependencies (`pnpm install`)
   - Build your Next.js app (`pnpm build`)
   - Deploy to a production URL

## Step 7: Update NEXT_PUBLIC_APP_URL

After the first deployment:

1. Copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Go back to **Environment Variables** in Vercel
3. Update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
4. Redeploy (or wait for automatic redeploy)

## Step 8: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS instructions

## Step 9: Verify Cron Jobs

Your `vercel.json` already includes cron job configurations:

- **DLD Ingestion:** Daily at 2 AM UTC
- **Ejari Ingestion:** Weekly on Sunday at 3 AM UTC
- **Portal Ingestion:** Daily at 4 AM UTC
- **Signals Pipeline:** Daily at 6 AM UTC
- **Full Pipeline:** Daily at 7 AM UTC

These will run automatically on Vercel. Make sure your API routes are working:
- `/api/jobs/ingest-dld`
- `/api/jobs/ingest-ejari`
- `/api/jobs/ingest-portals`
- `/api/jobs/run-signals`
- `/api/jobs/run-full-pipeline`

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify `package.json` has correct build scripts
- Check for TypeScript errors: `pnpm lint`

### Database Connection Issues

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- Check Supabase project is active (not paused)
- Ensure migrations have been run

### AI Features Not Working

- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits/quota
- Review server logs in Vercel dashboard

### Authentication Issues

- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify `NEXT_PUBLIC_APP_URL` matches your Vercel deployment URL
- Check Supabase auth settings allow your domain

## Quick Deploy Checklist

- [ ] GitHub repository connected to Vercel
- [ ] All environment variables set in Vercel
- [ ] Supabase project created and migrations run
- [ ] `NEXT_PUBLIC_APP_URL` set to Vercel deployment URL
- [ ] Build succeeds without errors
- [ ] Application loads correctly
- [ ] Database connections work
- [ ] AI features functional

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues:
1. Check Vercel build logs
2. Review server function logs
3. Verify all environment variables are set
4. Check Supabase dashboard for database errors
