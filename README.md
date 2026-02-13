# UnieFreight

Freight broker / carrier dashboard for UnieWMS.

## Deploying to AWS Amplify

The app is built as a **static export** (`output: 'export'` in `next.config.js`). Amplify serves the `out/` folder as static files—no Node/SSR required, so it works with Amplify’s default static hosting.

- **Build:** `npm run build` produces the `out/` directory.
- **amplify.yml** sets `baseDirectory: out` and `files: "**/*"`.
- Auth redirects (e.g. /dashboard → /login when not logged in) run **client-side** in the app.

**In Amplify Console:** set **Environment variables** if needed (e.g. `NEXT_PUBLIC_API_BASE_URL`).
