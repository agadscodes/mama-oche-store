export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fbfdfb] text-[#10231c]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#d7f6e4] border-t-[#0b5b43]" />
        <p className="font-serif text-sm font-semibold text-[#0b5b43]">Loading Mama Oche...</p>
      </div>
    </main>
  )
}
