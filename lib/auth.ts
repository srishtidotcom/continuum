/**
 * Extracts the authenticated user's id from the incoming Request.
 *
 * NOTE: Supabase server-side token validation was removed for MVP to
 * simplify the authentication surface. This function intentionally does
 * not validate access tokens. Use `x-user-id` header or `LOCAL_USER_ID`
 * env for local testing; `lib/authUtils.extractUserId()` already falls
 * back to those.
 */
export async function getUserIdFromRequest(_request: Request): Promise<string | null> {
  // Intentionally do not parse/validate tokens server-side for MVP.
  return null
}
