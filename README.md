# UnieFreight

Freight broker / carrier dashboard for UnieWMS.

## Deploying to AWS Amplify

This app is **Next.js with SSR** (no static export). All routes (e.g. `/dashboard/`, `/dashboard/opportunities/[id]`) are served by the Node server. **If you see 404 on /dashboard/, Amplify is likely set to static hosting—see below.**

### Amplify Console settings (required)

1. **Hosting → Framework**  
   Set to **"Next.js - SSR"** (or **"Next.js"**). If this is "Static" or "Single-page application", Amplify will not run the Node server and every route except `/` will 404.

2. **Root directory (monorepo)**  
   If the connected repo is the full UnieWMS repo (multiple apps), set **General → Build settings → Root directory** to **`UnieFreight`**. Otherwise the build runs from the repo root and may not find this app's `package.json`.

3. **Environment variables**  
   Add `NEXT_PUBLIC_API_BASE_URL` (e.g. `https://api.uniewms.com/api/v1`).

### Build

- `npm run build` produces the `.next` directory (SSR build).
- `amplify.yml` uses `baseDirectory: .next` and is correct for SSR.
- Do **not** add SPA-style rewrites (e.g. `/*` → `/index.html`); the Next.js server handles routing.
