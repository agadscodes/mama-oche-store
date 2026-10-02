'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error)
  }, [error])

  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfdfb] px-5 py-24 text-[#10231c]">
      <div className="w-full max-w-md rounded-3xl border border-[#d7e8dc] bg-white p-8 text-center shadow-xl shadow-[#0b5b43]/5">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#fdf2f0] text-[#b13c2e]">
          <AlertTriangle size={28} />
        </div>
        <h1 className="font-serif text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-xs leading-5 text-[#60736a]">
          An unexpected error occurred while loading this page. You can try refreshing or returning
          to the store homepage.
        </p>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            onClick={() => reset()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-2.5 text-xs font-bold text-white transition hover:bg-[#074835]"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d7e8dc] py-2.5 text-xs font-bold text-[#5d7068] hover:bg-[#eff9f2]"
          >
            <Home size={14} /> Home
          </Link>
        </div>
      </div>
    </main>
  )
}
