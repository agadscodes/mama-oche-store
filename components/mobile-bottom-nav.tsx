'use client'

import React from 'react'
import { Home, Store, ShoppingBag, Package, UserRound, LogIn } from 'lucide-react'

interface MobileBottomNavProps {
  activeTab?: 'home' | 'shop' | 'cart' | 'track' | 'account'
  cartCount: number
  userEmail: string | null
  onOpenShop: () => void
  onOpenCart: () => void
  onOpenTrack: () => void
  onOpenAccount: () => void
  onOpenAuth: () => void
}

export function MobileBottomNav({
  activeTab = 'home',
  cartCount,
  userEmail,
  onOpenShop,
  onOpenCart,
  onOpenTrack,
  onOpenAccount,
  onOpenAuth,
}: MobileBottomNavProps) {
  function scrollToHome() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-[#d8ebe0] bg-white/95 backdrop-blur-md pb-safe transition-all shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {/* Home */}
        <button
          type="button"
          onClick={scrollToHome}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition active:scale-95 ${
            activeTab === 'home' ? 'text-[#0b5b43]' : 'text-[#72857c] hover:text-[#0b5b43]'
          }`}
          aria-label="Home"
        >
          <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-tight">Home</span>
        </button>

        {/* Shop Pantry */}
        <button
          type="button"
          onClick={onOpenShop}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition active:scale-95 ${
            activeTab === 'shop' ? 'text-[#0b5b43]' : 'text-[#72857c] hover:text-[#0b5b43]'
          }`}
          aria-label="Shop Pantry"
        >
          <Store size={20} strokeWidth={activeTab === 'shop' ? 2.5 : 2} />
          <span className="text-[10px] font-bold tracking-tight">Shop</span>
        </button>

        {/* Basket / Cart with Live Badge */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition active:scale-95 text-[#0b5b43]"
          aria-label={`Basket with ${cartCount} items`}
        >
          <div className="relative">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#0b5b43] text-white shadow-md shadow-[#0b5b43]/25">
              <ShoppingBag size={17} />
            </div>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff3b30] px-1 text-[9px] font-black text-white ring-2 ring-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight text-[#0b5b43]">Basket</span>
        </button>

        {/* Track Orders */}
        <button
          type="button"
          onClick={onOpenTrack}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center text-[#72857c] transition hover:text-[#0b5b43] active:scale-95"
          aria-label="Track Order"
        >
          <Package size={20} />
          <span className="text-[10px] font-bold tracking-tight">Track</span>
        </button>

        {/* Account / Sign In */}
        <button
          type="button"
          onClick={userEmail ? onOpenAccount : onOpenAuth}
          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center text-[#72857c] transition hover:text-[#0b5b43] active:scale-95"
          aria-label={userEmail ? 'My Account' : 'Sign In'}
        >
          {userEmail ? (
            <>
              <div className="grid h-5 w-5 place-items-center rounded-full bg-[#d7f6e4] text-[#0b5b43]">
                <UserRound size={13} strokeWidth={2.5} />
              </div>
              <span className="max-w-[54px] truncate text-[10px] font-bold tracking-tight text-[#0b5b43]">
                {userEmail.split('@')[0]}
              </span>
            </>
          ) : (
            <>
              <LogIn size={20} />
              <span className="text-[10px] font-bold tracking-tight">Sign In</span>
            </>
          )}
        </button>
      </div>
    </nav>
  )
}

