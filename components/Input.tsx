"use client"

import { useState, useEffect, useRef } from 'react'
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
  const [autoSaveInterval, setAutoSaveInterval] = useState(30)
  const [isRecording, setIsRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [ariaMessage, setAriaMessage] = useState('')
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata[]>([])
  const { addToast } = useToast()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem('continuum-settings')
    if (saved) {
      const settings = JSON.parse(saved)
      setAutoSaveInterval(settings.autoSaveInterval || 30)
    }
  }, [])

  // Auto-save effect
  useEffect(() => {
    if (!text.trim()) {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
      return
    }

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (text.trim()) {
        submit()
      }
    }, autoSaveInterval * 1000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [text, autoSaveInterval])

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
        setAriaMessage('Recording stopped. Transcribing audio.')
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
        const newText = text + (text ? ' ' : '') + data.text
        setText(newText)
        
        // Extract metadata if there are links
        if (newText.includes('http')) {
          await extractLinkMetadata(newText)
        }
        addToast('Audio transcribed successfully', 'success', 3000)
        setAriaMessage('Transcription completed')
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

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, halfBaked })
      })
      
      if (!res.ok) {
        const error = await res.json()
        addToast(`Failed to save: ${error.error || 'Unknown error'}`, 'error', 6000)
        return
      }
      
      const data = await res.json()
      setText('')
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
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <textarea
          className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 min-h-[96px] resize-none focus:border-zinc-700 focus:outline-none transition"
          placeholder="Dump your brain here. Half-formed thoughts welcome."
          value={text}
          onChange={handleTextChange}
          onPaste={handlePaste}
        />

        {/* Link Metadata Display */}
        {linkMetadata.length > 0 && (
          <div className="space-y-2">
            {linkMetadata.map((link, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-800 border border-zinc-700 rounded text-xs space-y-1"
              >
                <div className="font-medium text-zinc-300">{link.title || link.domain}</div>
                {link.description && (
                  <div className="text-zinc-400 line-clamp-2">{link.description}</div>
                )}
                <div className="text-zinc-500">{link.url}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Half-baked checkbox */}
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={halfBaked}
                onChange={() => setHalfBaked(!halfBaked)}
                className="w-4 h-4"
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
              className={`px-3 py-1 rounded text-sm transition inline-flex items-center ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : transcribing
                    ? 'bg-zinc-700 text-zinc-400'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {transcribing ? (
                <>🎙️ Transcribing...</>
              ) : isRecording ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-white/30 mr-2" aria-hidden="true" />
                  ⊚ Recording...
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse mr-2" aria-hidden="true" />
                  🎤 Voice
                </>
              )}
            </button>
          </div>

          {/* Save button */}
          <div>
            <button
              type="submit"
              className="bg-white text-black px-4 py-1 rounded text-sm hover:bg-zinc-100 transition disabled:bg-zinc-600"
              disabled={saving || !text.trim()}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <div className="text-xs text-zinc-500 mt-1 text-right">
              Auto-save in {autoSaveInterval}s
            </div>
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
