# UnieFreight

Freight broker / carrier dashboard for UnieWMS.

## Deploying to AWS Amplify

The app is a **Next.js SSR** app. The repo includes an `amplify.yml` that matches [AWS’s Next.js SSR build spec](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html) (`baseDirectory: .next`).

**If the site shows “page can’t be found”:** In Amplify Console the app must use **Next.js (SSR)** / **WEB_COMPUTE**, not static hosting.  
**App settings → Build settings** (or **Hosting**) → ensure the framework is **Next.js** so Amplify runs the Node server instead of serving `.next` as static files.

**In Amplify Console:**

- **Environment variables:** e.g. `NEXT_PUBLIC_API_BASE_URL` = `https://api.uniewms.com/api/v1`
- **Framework:** Next.js (SSR) / WEB_COMPUTE (required for the site to work)
