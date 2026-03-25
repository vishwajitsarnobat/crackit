import { apiError } from '@/lib/api/api-helpers'

export function isAuthorizedCronRequest(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret) return false

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${expectedSecret}`
}

export function requireAuthorizedCronRequest(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return apiError('Unauthorized cron request.', 401)
  }

  return null
}
