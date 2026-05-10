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
    success: 'bg-green-900 border-green-700',
    error: 'bg-red-900 border-red-700',
    info: 'bg-blue-900 border-blue-700',
    warning: 'bg-yellow-900 border-yellow-700'
  }[type]

  const textColor = {
    success: 'text-green-100',
    error: 'text-red-100',
    info: 'text-blue-100',
    warning: 'text-yellow-100'
  }[type]

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠'
  }[type]

  return (
    <div
      className={`${bgColor} border rounded px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-300`}
      role="alert"
    >
      <span className={`${textColor} font-bold flex-shrink-0 text-lg leading-none`}>{icon}</span>
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
    <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}
