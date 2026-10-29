# N92 Edu-Italia — Deployment, Backup & Recovery

## How the website is hosted

- **Frontend:** Cloudflare Pages (free tier) serves the static site built
  from this project (`npm run build` → `out/` folder).
- **Backend:** Supabase (free tier) — database, admin login, media.
- Content/record/lead changes in the Admin Dashboard go live **without**
  redeploying. Redeploy only for design/code changes.

## First deployment (same proven route as IELTSwithKaif)

1. Create a GitHub repository (e.g. `n92-eduitalia`) and upload the
   project files (web upload is fine — the Muse GitHub app route was
   blocked last time; the manual route works).
2. Cloudflare → **Pages → Create → Connect to Git** → pick the repo.
3. Build settings: Framework **Next.js (Static HTML Export)** or manual:
   build command `npm run build`, output directory `out`.
4. Environment variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/publishable key
5. Deploy → open the `*.pages.dev` address and check the site, the
   directories (data should now come from the database), and submit a
   test enquiry to see it appear in Admin → Student Leads.
6. Custom domain (optional): Pages → Custom domains → follow the DNS
   steps. After the domain is live, a `sitemap.xml` with the real domain
   should be added (deliberately not shipped with a guessed domain).

## Updating the website code later

Upload the changed files to GitHub (same web-upload route) — Cloudflare
redeploys automatically. Routine content updates never need this; use
the Admin Dashboard.

## Backup

- **Code:** keep the dated project ZIPs (Stage backups are in the
  workspace; download the latest full ZIP to your own storage too).
- **Database:** Supabase free tier does not include automatic point-in-
  time backups. Protect yourself: in Admin, your records are the source
  of truth; for a manual export, Supabase → Database → Backups / or
  export tables as CSV from the Table Editor periodically. The seed file
  (`supabase/seed.sql`) can always rebuild the starter dataset.
- **Recovery:** to rebuild from scratch — new Supabase project → run
  `schema.sql` → run `seed.sql` → re-create the admin user → update the
  two environment variables in Cloudflare → redeploy.

## Costs and limits (honest notes)

- Cloudflare Pages and Supabase both offer free tiers that comfortably
  fit this website today. Free tiers are not guaranteed forever and have
  quotas (Supabase free projects pause after inactivity; storage and
  database size are capped). If the consultancy outgrows them, the first
  paid steps are small (Supabase Pro) — nothing in this build locks you
  into any paid API.
- No paid services are used anywhere in this project.
