"use client"

import { ToastContainer } from './Toast'
import { useToast } from '../lib/useToast'

export default function ToastContainerWithContext() {
  const { toasts, removeToast } = useToast()
  return <ToastContainer toasts={toasts} onClose={removeToast} />
}
