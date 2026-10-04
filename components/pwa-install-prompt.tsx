'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare, Sparkles } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosModal, setShowIosModal] = useState(false)

  useEffect(() => {
    // Check if already in standalone app mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      setIsStandalone(isStandaloneMode)

      if (isStandaloneMode) {
        return // Do not show install prompt if already installed and running standalone
      }

      // Check if iOS
      const ua = window.navigator.userAgent.toLowerCase()
      const isIosDevice = /iphone|ipad|ipod/.test(ua)
      setIsIos(isIosDevice)

      // Check dismissed state in sessionStorage
      const dismissed = sessionStorage.getItem('mama_pwa_dismissed')
      if (!dismissed) {
        // Show after 2.5 seconds on mobile
        const timer = setTimeout(() => setShowBanner(true), 2500)
        return () => clearTimeout(timer)
      }
    }

    // Android / Chrome beforeinstallprompt event
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (isStandalone || !showBanner) {
    return null
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowBanner(false)
      }
      setDeferredPrompt(null)
    } else if (isIos) {
      setShowIosModal(true)
    } else {
      setShowIosModal(true)
    }
  }

  function dismissBanner() {
    setShowBanner(false)
    sessionStorage.setItem('mama_pwa_dismissed', 'true')
  }

  return (
    <>
      {/* Floating Bottom/Top Install Banner on Mobile */}
      <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 z-30 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 lg:hidden">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#bce8cb] bg-white p-3 shadow-xl shadow-[#0b5b43]/15 ring-1 ring-black/5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b5b43] text-white shadow-sm font-bold">
              M
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <strong className="block text-xs font-bold text-[#10231c]">Install Mama Oche App</strong>
                <span className="rounded-full bg-[#d7f6e4] px-1.5 py-0.2 text-[9px] font-black text-[#0b5b43]">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-[#60736a] truncate">Add to phone home screen for instant shopping</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-[#0b5b43] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#074835] active:scale-95"
            >
              <Download size={14} />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              className="rounded-lg p-1.5 text-[#8aa095] hover:bg-[#eff9f2] active:scale-90"
              aria-label="Dismiss banner"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 backdrop-blur-sm bg-black/45 animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowIosModal(false)}
            aria-label="Close modal backdrop"
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl pb-safe">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2eee8]">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#d7f6e4] text-[#0b5b43] font-black">
                  M
                </span>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#10231c]">Install on Your Phone</h3>
                  <p className="text-[11px] text-[#71847b]">Mama Oche Provisions App</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-[#71847b] hover:bg-[#eff9f2]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-[#2c4037]">
              <div className="flex items-start gap-3 rounded-2xl bg-[#f5faf6] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0b5b43] text-white font-bold text-xs">
                  1
                </span>
                <p className="pt-0.5 leading-relaxed">
                  Tap the <strong className="font-bold text-[#0b5b43]">Share</strong> button{' '}
                  <Share className="inline-block mx-1 -mt-1 text-[#0b8a61]" size={15} /> in your browser menu (bottom of Safari or top-right in Chrome).
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#f5faf6] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0b5b43] text-white font-bold text-xs">
                  2
                </span>
                <p className="pt-0.5 leading-relaxed">
                  Scroll down the options and select{' '}
                  <strong className="font-bold text-[#0b5b43]">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline-block mx-1 -mt-1 text-[#0b8a61]" size={15} />.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-[#f5faf6] p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0b5b43] text-white font-bold text-xs">
                  3
                </span>
                <p className="pt-0.5 leading-relaxed">
                  Tap <strong className="font-bold text-[#0b5b43]">Add</strong> in the top-right corner. The app icon will appear directly on your phone’s home screen!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-5 w-full rounded-2xl bg-[#0b5b43] py-3 text-xs font-bold text-white shadow-md shadow-[#0b5b43]/20 active:scale-98"
            >
              Got it, let's shop!
            </button>
          </div>
        </div>
      )}
    </>
  )
}

