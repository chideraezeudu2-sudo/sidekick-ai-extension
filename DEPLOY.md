# Deploying Sidekick AI's backend + going live

## 1. Get the backend on Render
Render deploys from a Git repo, so:
1. Push the `backend/` folder to a GitHub repo (can be private).
2. In Render: New → Web Service → connect that repo.
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
3. Add environment variables (Render dashboard → Environment):
   - `OPENROUTER_API_KEY` — your own key from openrouter.ai (required)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — optional but recommended before
     real launch (see below); without these, usage counts reset on every deploy/restart.
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_POWER`,
     `STRIPE_WEBHOOK_SECRET` — optional, only needed once you want upgrades to work
     (see step 3).
4. Deploy. Render gives you a URL like `https://clickyweb-backend.onrender.com`.

## 2. Point the extension at it
In `src/lib/constants.ts`, replace the three `REPLACE-ME` URLs with your real Render
URL, then rebuild:
```
npm install
npm run build
```
Reload the unpacked extension in `chrome://extensions` (or re-zip `dist/`).

## 3. Turn on billing (optional, can do after you're testing)
1. In Stripe: create two recurring Prices — Basic Pro ($5.99/mo) and Power Agent
   ($10.99/mo). Copy their price IDs into `STRIPE_PRICE_BASIC` / `STRIPE_PRICE_POWER`
   on Render.
2. In Stripe: add a webhook endpoint pointing at
   `https://<your-render-url>/billing/webhook`, listening for
   `checkout.session.completed` and `customer.subscription.deleted`. Copy its
   signing secret into `STRIPE_WEBHOOK_SECRET` on Render.
3. Put your Stripe secret key in `STRIPE_SECRET_KEY` on Render.

## 4. Persist usage in Supabase (recommended before real users)
Run once in the Supabase SQL editor for your project:
```sql
create table sidekick_usage (
  install_id text primary key,
  plan text not null default 'free',
  count int not null default 0,
  period_start timestamptz not null default now(),
  stripe_subscription_id text,
  stripe_customer_id text
);
```
Then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Render. Without this,
the backend falls back to an in-memory counter that resets whenever Render
restarts the service — fine for your own testing, not fine once other people
are relying on their plan limit being remembered.

## 5. Let your brother/a friend test it today
No Chrome Web Store needed for this — the exact same "Load unpacked" steps work
on any Chrome install:
1. Send them `sidekick-ai-extension.zip` (or the `dist` folder).
2. `chrome://extensions` → enable Developer mode → Load unpacked → select `dist`.
Once your Render backend is live and the extension is rebuilt pointing at it,
this works on their machine exactly like yours — no API key needed on their end.

## 6. Submitting to the Chrome Web Store
1. Create a developer account at https://chrome.google.com/webstore/devconsole —
   one-time $5 registration fee, paid by you.
2. Zip just the contents of `dist/` (not the folder itself) for upload.
3. You'll need: a short + detailed description, at least one 1280x800 screenshot,
   a 128x128 icon (already in the manifest), and a privacy policy URL — required
   because this extension requests host permissions and uses `scripting`.
4. Review time varies and has recently been running longer than usual due to
   volume — budget for it to take anywhere from a few hours to several days, not
   guaranteed same-day. This is entirely on Google's side; step 5 above is how
   people can use it in the meantime.
