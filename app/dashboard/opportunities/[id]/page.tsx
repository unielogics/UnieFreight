import JobDetailPage from './JobDetailClient'

/** Required for static export: pre-render one path; Amplify rewrite serves it for any /dashboard/opportunities/[id] */
export function generateStaticParams() {
  return [{ id: '_' }]
}

export default function Page() {
  return <JobDetailPage />
}
