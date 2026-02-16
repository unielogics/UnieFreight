# UnieFreight – Amplify deployment checklist

If the site **shows nothing** (blank white page), or **https://uniefreight.com/dashboard/** shows **404** ("This page can't be found"), the app is almost certainly **not** being run as Next.js SSR. Amplify is serving the build as static files instead of running the Next.js server. Fix it in Amplify Console:

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

After changing Framework and Root directory, run a **full redeploy** (not just a branch redeploy). Then open https://uniefreight.com/ or https://uniefreight.com/dashboard/ again. If you still see a blank page, try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) or an incognito window in case of cached content.

---

**If the site worked before and now shows nothing:** The `amplify.yml` in this repo has been simplified to match the official AWS Next.js SSR build spec (preBuild: npm ci; build: npm run build; artifacts: baseDirectory .next). If problems persist, in Amplify Console go to **Build settings** and confirm the **build specification** source is "Use amplify.yml in the repository" and that **Hosting > Framework** is "Next.js - SSR". You can also try temporarily renaming or removing `amplify.yml` from the repo and redeploying so Amplify uses its auto-generated build spec, then compare behavior.
