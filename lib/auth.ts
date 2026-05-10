import { serverSupabase } from './serverSupabase'

/**
 * Extracts the authenticated user's id from the incoming Request.
 * Prefer Authorization: Bearer <token> header. Falls back to null.
 */
export async function getUserIdFromRequest(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    if (!token) return null

    // Use Supabase server client to get user from access token
    // Note: This relies on supabase-js v2 `auth.getUser()` behavior where
    // you can pass an access token to fetch the user. If your Supabase SDK
    // version differs, replace this with appropriate JWT verification.
    const res = await serverSupabase.auth.getUser(token)
    // res shape: { data: { user }, error }
    // @ts-ignore
    const user = res?.data?.user
    if (!user) return null
    return user.id
  } catch (err) {
    console.error('getUserIdFromRequest error', err)
    return null
  }
}
