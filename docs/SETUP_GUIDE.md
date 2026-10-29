# N92 Edu-Italia — Setup Guide (beginner-friendly)

Everything here is done by tapping buttons and pasting text. No coding.
Total time: about 15 minutes. You need: your Supabase login (the same
account you used for IELTSwithKaif is fine).

## Step 1 — Create the database project

1. Open **supabase.com** → sign in → **New Project**.
2. Name: `n92-eduitalia`. Set a **database password** and save it in your
   own password manager. ⚠️ Never send this password to anyone, including
   in this chat. Muse never needs it.
3. Region: **South Asia (Mumbai)**.
4. Wait until the project shows as ready (about 2 minutes).

## Step 2 — Send Muse two public values

1. In the project: **Settings → API**.
2. Copy the **Project URL** and the **anon / publishable key**.
3. Send both to Muse in WhatsApp. These two values are *public by design* —
   the database security rules (Step 3) are what protect your data.

## Step 3 — Create the tables (Muse will confirm when)

1. Left menu → **SQL Editor** → **New query**.
2. Muse will give you the file `supabase/schema.sql` — paste its full
   content → **Run**. You should see "Success".
3. New query again → paste `supabase/seed.sql` → **Run**. This loads the
   starter universities, courses, scholarships, FAQs and calculator
   defaults.

## Step 4 — Create YOUR admin account (only you do this)

1. Left menu → **Authentication** → **Users** → **Add user**.
2. Enter your email + a strong password (save it in your password
   manager). Tick **Auto Confirm User** if shown.
3. Same page (Authentication → Settings, or the sign-in providers page):
   switch **OFF** "Allow new users to sign up". This is important — with
   sign-ups off, nobody else can create an account.

## Step 5 — Go live

Muse verifies the connection (security probes + a test enquiry), then the
site is deployed (see DEPLOY_GUIDE.md) with two environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key

After that: log in at **your-website-address/admin** with your Step 4
account and everything (content, records, leads) is live.

## Safety rules to remember

- The **service-role key** (Settings → API, "secret") must NEVER be put in
  the website, a ZIP, GitHub, or a chat. The website does not use it.
- Your database password and admin password live only in your password
  manager.
- Free tiers change over time: Supabase's free plan pauses projects after
  a period of inactivity and has storage/row limits — fine for this
  website's scale, but check the Supabase pricing page once a year.
