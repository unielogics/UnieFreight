export const PROD_API_BASE_URL = 'https://api.uniewms.com/api/v1'
export const LOCAL_API_BASE_URL = 'http://localhost:8000/api/v1'

/** Backend API base URL. Set NEXT_PUBLIC_API_BASE_URL in Amplify (or .env) to point at your live backend. */
export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
  (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' ? PROD_API_BASE_URL : LOCAL_API_BASE_URL)
