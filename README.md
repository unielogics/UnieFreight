# UnieFreight

Freight broker / carrier dashboard for UnieWMS.

## Deploying to AWS Amplify

The app is built as a **static export** (`output: 'export'` in `next.config.js`). Amplify serves the `out/` folder as static files—no Node/SSR required.

- **Build:** `npm run build` produces the `out/` directory.
- **amplify.yml** sets `baseDirectory: out` and `files: "**/*"`.
- Auth redirects (e.g. /dashboard → /login when not logged in) run **client-side** in the app.

**In Amplify Console:**
- Set **Environment variables** if needed (e.g. `NEXT_PUBLIC_API_BASE_URL`).
- **Redirects and rewrites** (Hosting → Redirects and rewrites): add a **Rewrite (200)** so job detail URLs work:
  - **Source:** `/dashboard/opportunities/<*>`
  - **Target:** `/dashboard/opportunities/_/index.html`  
  (So any `/dashboard/opportunities/123` is served the same page; the app reads the id from the URL.)
