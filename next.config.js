/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export' removed so dynamic routes like /dashboard/opportunities/[id] work.
  // With static export, Next.js requires all [id] params in generateStaticParams() at build time,
  // but opportunity IDs come from the API and cannot be known at build time.
}
module.exports = nextConfig
