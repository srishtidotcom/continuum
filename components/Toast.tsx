"use client"

import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps extends Toast {
  onClose: (id: string) => void
}

export function ToastItem({ id, message, type, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const bgColor = {
    success: 'bg-emerald-500/10 border-emerald-200/20',
    error: 'bg-red-500/10 border-red-200/20',
    info: 'bg-sky-500/10 border-sky-200/20',
    warning: 'bg-amber-500/10 border-amber-200/20'
  }[type]

  const textColor = {
    success: 'text-emerald-100',
    error: 'text-red-100',
    info: 'text-sky-100',
    warning: 'text-amber-100'
  }[type]

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }[type]

  return (
    <div
      className={`${bgColor} flex items-start gap-3 rounded-[var(--radius-soft)] border px-4 py-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300`}
      role="alert"
    >
      <span className={`${textColor} flex-shrink-0 text-lg font-bold leading-none`}>{icon}</span>
      <div className="flex-1">
        <p className={`${textColor} text-sm`}>{message}</p>
      </div>
      <button
        onClick={() => onClose(id)}
        className={`${textColor} hover:opacity-70 flex-shrink-0 text-lg leading-none`}
        aria-label="Close toast"
      >
        ×
      </button>
    </div>
  )
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-auto fixed bottom-4 right-4 z-50 max-w-md space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}
