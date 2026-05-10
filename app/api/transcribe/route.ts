import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '../../../lib/openaiUtils'
import { getOpenAIApiKey } from '../../../lib/envValidation'
import { logger } from '../../../lib/logger'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      logger.warn('POST /api/transcribe: missing audio file')
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    logger.logApiStart('POST', '/api/transcribe')

    // Check for OpenAI API key
    const apiKey = getOpenAIApiKey()
    if (!apiKey) {
      logger.error('POST /api/transcribe: OpenAI key not configured', {
        endpoint: '/api/transcribe'
      })
      return NextResponse.json(
        { error: 'Whisper API not configured' },
        { status: 500 }
      )
    }

    // Convert file to buffer
    const buffer = await audioFile.arrayBuffer()

    // Call Whisper API
    const { text, error } = await transcribeAudio(buffer, audioFile.type, audioFile.name, apiKey)

    if (error || !text) {
      logger.logExternalApi('OpenAI', 'whisper', false, error)
      return NextResponse.json(
        { error: error || 'Failed to transcribe audio' },
        { status: 500 }
      )
    }

    logger.logExternalApi('OpenAI', 'whisper', true)
    logger.logApiSuccess('POST', '/api/transcribe', 200)

    return NextResponse.json({ text })
  } catch (err) {
    logger.logApiError('POST', '/api/transcribe', err as Error)
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}
