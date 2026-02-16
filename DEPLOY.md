# UnieFreight – Amplify deployment checklist

If **https://uniefreight.com/dashboard/** shows **404** ("This page can't be found"), the app is not being run as Next.js SSR. Fix it in Amplify Console:

## 1. Set Framework to Next.js SSR

- **Amplify Console** → your app → **Hosting** (left sidebar).
- Under **Hosting**, open **Hosting** or **Build settings**.
- Set **Framework** (or **Build type**) to **"Next.js - SSR"** or **"Next.js"**.
- Do **not** use "Static" or "Single-page application" — those serve only static files and cause 404 on `/dashboard/` and all other routes.

## 2. Set Root directory (if repo is UnieWMS monorepo)

- **App settings** → **General** → **Build settings** (or **Build settings** in the left menu).
- If the repo contains multiple folders (e.g. UnieFreight, UnieDashboard, UnieBackend), set **Root directory** to **`UnieFreight`**.
- Save and **Redeploy** so the build runs from the UnieFreight folder (correct `package.json` and `next.config.js`).

## 3. Environment variables

- **Environment variables** (under Build settings or App settings): add **`NEXT_PUBLIC_API_BASE_URL`** (e.g. `https://api.uniewms.com/api/v1`).
- Redeploy after changing env vars.

## 4. No SPA rewrites

- Do **not** add a rewrite like "/* → /index.html" for the main app. Next.js SSR handles routing; SPA rewrites break direct links to `/dashboard/`, etc.

After changing Framework and Root directory, run a **full redeploy** (not just a branch redeploy). Then open https://uniefreight.com/dashboard/ again.
