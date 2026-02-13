export const PROD_API_BASE_URL = 'https://api.uniewms.com/api/v1'
export const LOCAL_API_BASE_URL = 'http://localhost:8000/api/v1'

export const API_BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) || LOCAL_API_BASE_URL
