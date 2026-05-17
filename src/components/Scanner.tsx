'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'

interface ScannerProps {
  onScan: (code: string) => void
  onClose: () => void
}

export default function Scanner({ onScan, onClose }: ScannerProps) {
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const scannerRef = useRef<{ clear: () => void } | null>(null)
  const divId = 'qr-reader'

  useEffect(() => {
    let scanner: { clear: () => void } | null = null

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode')

        const instance = new Html5QrcodeScanner(
          divId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [0, 1],
          },
          false
        )

        instance.render(
          (decodedText: string) => {
            void instance.clear()
            onScan(decodedText.trim())
          },
          () => {}
        )

        scanner = instance
        scannerRef.current = instance
        setStarted(true)
      } catch {
        setError('No se pudo acceder a la cámara. Verifica los permisos.')
      }
    }

    startScanner()

    return () => {
      void scanner?.clear()
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-surface2)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--bg-surface2)' }}
        >
          <div className="flex items-center gap-2">
            <Camera size={18} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
              Escanear código
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          {error ? (
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertCircle size={18} color="#EF4444" />
              <p className="text-sm" style={{ color: '#EF4444' }}>{error}</p>
            </div>
          ) : (
            <div id={divId} style={{ width: '100%' }} />
          )}

          {!started && !error && (
            <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
              Iniciando cámara...
            </p>
          )}
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            Apunta al código QR o de barras del producto
          </p>
        </div>
      </div>
    </div>
  )
}
