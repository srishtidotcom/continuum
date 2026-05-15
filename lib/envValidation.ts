/**
 * Environment variable validation for startup
 * Ensures required variables are configured before runtime
 */

interface EnvValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

/**
 * Validate environment variables at startup
 * Called once during Next.js server initialization
 */
export function validateEnvironment(): EnvValidationResult {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  const recommended = ['GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
  const optional = ['LOCAL_USER_ID']

  const missing: string[] = []
  const warnings: string[] = []

  // Check required variables
  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  }

  // Check recommended variables
  for (const envVar of recommended) {
    if (!process.env[envVar]) {
      warnings.push(`${envVar} is not set - some features will be degraded`)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

/**
 * Assert that environment variables are valid
 * Throws error if required variables are missing
 */
export function assertEnvironment(): void {
  const validation = validateEnvironment()

  if (!validation.valid) {
    const message = `Missing required environment variables: ${validation.missing.join(', ')}`
    throw new Error(message)
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment warnings:', validation.warnings.join('; '))
  }
}

/**
 * Get Gemini API key from environment
 * Returns null if not configured (graceful degradation)
 */
export function getGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY || null
}

/**
 * Get user ID from environment (for local testing)
 */
export function getLocalUserId(): string | null {
  return process.env.LOCAL_USER_ID || null
}

/**
 * Check if Gemini features are available
 */
export function hasGeminiSupport(): boolean {
  return !!process.env.GEMINI_API_KEY
}
