import Link from 'next/link'
import { ArrowLeft, PackageX } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfdfb] px-5 py-24 text-[#10231c]">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#eff9f2] text-[#0b8a61]">
          <PackageX size={36} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b8a61]">404 Error</p>
        <h1 className="mt-2 font-serif text-4xl font-bold">Provision Not Found</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#60736a]">
          The page or product you are looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[#0b5b43] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#074835]"
          >
            <ArrowLeft size={16} /> Return to Storefront
          </Link>
        </div>
      </div>
    </main>
  )
}
