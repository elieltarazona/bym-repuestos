'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle, ScanLine } from 'lucide-react'

interface ScannerProps {
  onScan: (code: string) => void
  onClose: () => void
  titulo?: string
}

export default function Scanner({ onScan, onClose, titulo = 'Escanear código' }: ScannerProps) {
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<{ clear: () => void | Promise<void> } | null>(null)
  const divId = 'qr-reader'

  useEffect(() => {
    let scanner: { clear: () => void | Promise<void> } | null = null
    let active = true

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')

        if (!active) return

        const instance = new Html5QrcodeScanner(
          divId,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Caja adaptativa: más ancha para códigos de barra rectangulares
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
              const width = Math.floor(minEdge * 0.85)
              const height = Math.floor(minEdge * 0.65)
              return { width, height }
            },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0, 1],
          },
          false
        )

        instance.render(
          (decodedText: string) => {
            if (!active) return
            // Feedback háptico/vibración si está disponible en dispositivos móviles
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try { navigator.vibrate(100) } catch {}
            }
            void instance.clear()
            onScan(decodedText.trim())
          },
          () => {}
        )

        scanner = instance
        scannerRef.current = instance
        setStarted(true)
      } catch {
        if (active) {
          setError('No se pudo acceder a la cámara. Verifica los permisos de tu dispositivo.')
        }
      }
    }

    startScanner()

    return () => {
      active = false
      if (scannerRef.current) {
        try {
          void scannerRef.current.clear()
        } catch {}
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl fade-in"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--bg-surface2)' }}
        >
          <div className="flex items-center gap-2">
            <ScanLine size={20} style={{ color: 'var(--primary-light)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              {titulo}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 relative min-h-[260px] flex items-center justify-center">
          {error ? (
            <div
              className="flex items-center gap-3 p-4 rounded-xl text-left"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertCircle size={20} color="#EF4444" className="flex-shrink-0" />
              <p className="text-xs font-medium" style={{ color: '#EF4444' }}>{error}</p>
            </div>
          ) : (
            <div id={divId} className="w-full overflow-hidden rounded-xl" />
          )}

          {!started && !error && (
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-8 h-8 rounded-full border-3 animate-spin"
                style={{ borderColor: 'var(--primary-light)', borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Iniciando cámara...
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Apunta la cámara al código QR o código de barras del producto
          </p>
        </div>
      </div>
    </div>
  )
}

