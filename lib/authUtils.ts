/**
 * Shared authentication utilities for API routes
 * Centralizes user ID extraction and validation logic
 */

import { getUserIdFromRequest } from './auth'
import { getLocalUserId } from './envValidation'

/**
 * Extract user ID from request with fallbacks
 * Tries: JWT token → x-user-id header → LOCAL_USER_ID env
 * 
 * @param request - Request object
 * @returns User ID string or null if not found
 */
export async function extractUserId(request: Request): Promise<string | null> {
  // Try JWT token first
  let userId = await getUserIdFromRequest(request)

  // Fallback to x-user-id header
  if (!userId) {
    userId = request.headers.get('x-user-id')
  }

  // Fallback to LOCAL_USER_ID env (for local testing)
  if (!userId) {
    userId = getLocalUserId()
  }

  return userId
}

/**
 * Require user ID or throw 401 error
 * Use this to guard routes that need authentication
 * 
 * @param userId - User ID from extractUserId
 * @returns User ID string (guaranteed non-null)
 * @throws 401 error if userId is null
 */
export function requireUserId(userId: string | null): string {
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}
