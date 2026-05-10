/**
 * API routes and resource constants
 * Centralized to avoid magic strings scattered throughout code
 */

// API Route base paths
export const API_ROUTES = {
  INPUT: '/api/input',
  MEMORIES: '/api/memories',
  SEARCH: '/api/search',
  CHAT: '/api/chat',
  TASKS: '/api/tasks',
  TRANSCRIBE: '/api/transcribe',
  METADATA: '/api/metadata'
} as const

// Database table names
export const DB_TABLES = {
  USERS: 'users',
  MEMORIES: 'memories',
  MEMORY_EMBEDDINGS: 'memory_embeddings',
  TASKS: 'tasks'
} as const

// RPC function names
export const RPC_FUNCTIONS = {
  SEARCH_MEMORIES: 'search_memories_by_embedding'
} as const

// OpenAI models
export const OPENAI_MODELS = {
  EMBEDDING: 'text-embedding-3-small',
  CHAT: 'gpt-4o-mini',
  WHISPER: 'whisper-1'
} as const

// Similarity thresholds for semantic search
export const SIMILARITY_THRESHOLDS = {
  SEMANTIC_SEARCH: 0.5, // Stricter for search results
  CHAT_CONTEXT: 0.3 // Lower for more context in chat
} as const

// Search types
export const SEARCH_TYPES = {
  KEYWORD: 'keyword',
  SEMANTIC: 'semantic',
  HYBRID: 'hybrid'
} as const

// Task extraction
export const TASK_CONFIG = {
  MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0.3, // Precise for task extraction
  MAX_TOKENS: 300
} as const

// Chat configuration
export const CHAT_CONFIG = {
  MODEL: 'gpt-4o-mini',
  TEMPERATURE: 0.7, // Balanced for conversational tone
  MAX_TOKENS: 500,
  MEMORY_THRESHOLD: SIMILARITY_THRESHOLDS.CHAT_CONTEXT,
  CONTEXT_THRESHOLD: SIMILARITY_THRESHOLDS.CHAT_CONTEXT, // Alias for clarity in context retrieval
  MAX_MEMORIES: 20
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
} as const

// Error messages
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized',
  EMPTY_QUERY: 'Empty query',
  EMPTY_MESSAGE: 'Empty message',
  EMPTY_TEXT: 'Empty text',
  MISSING_FILE: 'Audio file is required',
  OPENAI_NOT_CONFIGURED: 'OpenAI API key not configured',
  EMBEDDING_FAILED: 'Failed to generate embedding',
  SEARCH_FAILED: 'Failed to retrieve memories',
  CHAT_FAILED: 'Failed to generate response',
  MEMORY_RETRIEVAL_FAILED: 'Failed to retrieve relevant memories',
  CHAT_GENERATION_FAILED: 'Failed to generate chat response',
  TRANSCRIPTION_FAILED: 'Failed to transcribe audio',
  DATABASE_ERROR: 'Database operation failed',
  INVALID_RESPONSE: 'Invalid response from AI service'
} as const

// Toast configuration defaults
export const TOAST_DEFAULTS = {
  DURATION_SUCCESS: 2000,
  DURATION_ERROR: 6000,
  DURATION_WARNING: 5000,
  DURATION_INFO: 3000
} as const

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_CHAT_LIMIT: 10,
  MAX_CHAT_RESULTS: 20
} as const

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  CONTINUUM_SETTINGS: 'continuum-settings'
} as const
