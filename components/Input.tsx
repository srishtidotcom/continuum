"use client"

import { useState, useRef } from 'react'
import { useToast } from '../lib/useToast'

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain: string
}

export default function Input() {
  const [text, setText] = useState('')
  const [halfBaked, setHalfBaked] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [ariaMessage, setAriaMessage] = useState('')
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata[]>([])
  const [placeholder] = useState(() => {
    const options = ['Dump your brain here...', "What's on your mind?", 'Half-formed thoughts welcome.']
    return options[Math.floor(Math.random() * options.length)]
  })
  const { addToast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const textRef = useRef('')
  const submittingRef = useRef(false)

  // Extract metadata from pasted links
  const extractLinkMetadata = async (content: string) => {
    try {
      const response = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content })
      })

      if (response.ok) {
        const data = await response.json()
        setLinkMetadata(data.metadata || [])
      }
    } catch (err) {
      console.error('Error extracting metadata:', err)
    }
  }

  // Handle paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.includes('http')) {
      await extractLinkMetadata(pastedText)
    }
  }

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    textRef.current = newText
    
    // Check for links in the new text
    if (newText.includes('http')) {
      extractLinkMetadata(newText)
    }
  }

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAriaMessage('Recording stopped. Transcribing audio and saving.')
        await transcribeAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setAriaMessage('Recording started')
    } catch (err) {
      console.error('Error accessing microphone:', err)
      addToast('Could not access microphone. Please check permissions.', 'error', 6000)
    }
  }

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Transcribe audio using Whisper
  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true)
    setAriaMessage('Transcribing audio')
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        // Append transcribed text to existing text
        const existingText = textRef.current
        const newText = existingText + (existingText ? ' ' : '') + data.text
        setText(newText)
        textRef.current = newText
        
        // Extract metadata if there are links
        if (newText.includes('http')) {
          await extractLinkMetadata(newText)
        }
        await submit(undefined, newText)
        setAriaMessage('Transcription completed and saved')
      } else {
        const error = await response.json()
        addToast(`Transcription failed: ${error.error || 'Unknown error'}`, 'error', 6000)
        setAriaMessage('Transcription failed')
      }
    } catch (err) {
      console.error('Error transcribing:', err)
      addToast('Failed to transcribe audio. Make sure OPENAI_API_KEY is set.', 'error', 6000)
      setAriaMessage('Transcription failed')
    } finally {
      setTranscribing(false)
    }
  }

  async function submit(e?: React.FormEvent, overrideText?: string) {
    if (e) e.preventDefault()
    const content = overrideText ?? textRef.current
    if (!content.trim() || submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    try {
      const res = await fetch('/api/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, halfBaked })
      })
      
      if (!res.ok) {
        const error = await res.json()
        addToast(`Failed to save: ${error.error || 'Unknown error'}`, 'error', 6000)
        return
      }
      
      const data = await res.json()
      if (textRef.current === content) {
        setText('')
        textRef.current = ''
      }
      setLinkMetadata([])
      
      // Show success with any warnings
      if (data.warnings && data.warnings.length > 0) {
        addToast('Memory saved, but some features failed (embedding/tasks)', 'warning', 5000)
      } else {
        addToast('Memory saved successfully', 'success', 2000)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      addToast(`Error saving memory: ${errorMsg}`, 'error', 6000)
      console.error(err)
    } finally {
      setSaving(false)
      submittingRef.current = false
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="continuum-input rounded-[var(--radius-soft)] p-3 md:p-4">
        <textarea
          className="min-h-[132px] w-full resize-none bg-transparent px-2 py-3 text-lg leading-8 text-[color:var(--color-text)] placeholder:text-[color:var(--color-faint)] focus:outline-none md:min-h-[156px] md:px-4 md:text-xl"
          placeholder={placeholder}
          value={text}
          onChange={handleTextChange}
          onPaste={handlePaste}
          onBlur={() => submit()}
        />

        {/* Link Metadata Display */}
        {linkMetadata.length > 0 && (
          <div className="space-y-2 px-2 pb-2 md:px-4">
            {linkMetadata.map((link, idx) => (
              <div
                key={idx}
                className="space-y-1 rounded-[var(--radius-soft)] border border-[color:var(--color-border)] bg-white/[0.035] p-3 text-xs"
              >
                <div className="font-medium text-[color:var(--color-text)]">{link.title || link.domain}</div>
                {link.description && <div className="line-clamp-2 text-[color:var(--color-muted)]">{link.description}</div>}
                <div className="text-[color:var(--color-faint)]">{link.url}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-[color:var(--color-border)] px-2 pt-3 sm:flex-row sm:items-center sm:justify-between md:px-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Half-baked checkbox */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--color-muted)]">
              <input
                type="checkbox"
                checked={halfBaked}
                onChange={() => setHalfBaked(!halfBaked)}
                className="h-4 w-4 accent-[color:var(--color-accent)]"
              />
              Half-baked
            </label>

            {/* Voice input button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={transcribing}
              aria-pressed={isRecording}
              aria-label={isRecording ? 'Stop recording' : transcribing ? 'Transcribing' : 'Start voice input'}
              className={`inline-flex h-9 items-center rounded-[var(--radius-soft)] border px-3 text-sm ${
                isRecording
                  ? 'border-red-300/30 bg-red-500/15 text-red-100'
                  : transcribing
                    ? 'border-[color:var(--color-border)] bg-white/[0.04] text-[color:var(--color-faint)]'
                    : 'border-[color:var(--color-border)] bg-white/[0.035] text-[color:var(--color-muted)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)]'
              }`}
            >
              {transcribing ? (
                <>Transcribing...</>
              ) : isRecording ? (
                <>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-200" aria-hidden="true" />
                  Recording
                </>
              ) : (
                <>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[color:var(--color-accent)]/70" aria-hidden="true" />
                  Voice
                </>
              )}
            </button>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-xs text-[color:var(--color-faint)]">
              Saves on blur
            </div>
            <button
              type="submit"
              className="h-9 rounded-[var(--radius-soft)] bg-[color:var(--color-text)] px-5 text-sm font-semibold text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={saving || !text.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>

      {/* ARIA live region for announcing recording/transcription status */}
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  )
}
