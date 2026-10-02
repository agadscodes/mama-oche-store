'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  X,
  Truck,
  ShieldCheck,
  Clock3,
  ArrowRight,
  ArrowLeft,
  MapPin,
  UserRound,
  Menu,
  CheckCircle2,
  Phone,
  Mail,
  Package,
  LoaderCircle,
  Sparkles,
  Store,
  Lock,
  MessageCircle,
  Share2,
  ChevronDown,
  Trash2,
  LogIn,
  LogOut,
} from 'lucide-react'
import { AuthModal } from '@/components/auth-modal'
import { createClient } from '@/lib/supabase/client'
import {
  CartItem,
  DEFAULT_PRODUCTS,
  Order,
  OrderItem,
  Product,
  STORAGE_KEYS,
  STOREFRONT_CATEGORIES,
  STORE_CONFIG,
  formatNaira,
  generateWhatsAppCartUrl,
  generateWhatsAppProductUrl,
  generateWhatsAppOrderHelpUrl,
  getLocalOrders,
  getLocalProducts,
  saveLocalOrders,
  saveLocalProducts,
} from '@/lib/store-data'

type CustomerForm = {
  name: string
  phone: string
  email: string
  address: string
  notes: string
}

const emptyCustomer: CustomerForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
}

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc'

export default function Page() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS)
  const [activeCategory, setActiveCategory] = useState<string>('All products')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartHydrated, setCartHydrated] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartStep, setCartStep] = useState<'basket' | 'checkout' | 'success'>('basket')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [trackOpen, setTrackOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalQty, setModalQty] = useState(1)
  const [confirmation, setConfirmation] = useState('')
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const toastTimerRef = useRef<number | null>(null)

  // Tracking State
  const [trackRef, setTrackRef] = useState('')
  const [trackPhone, setTrackPhone] = useState('')
  const [trackingBusy, setTrackingBusy] = useState(false)
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null)
  const [trackError, setTrackError] = useState('')

  // Hydrate local state & fetch live products/session from Supabase if configured
  useEffect(() => {
    setProducts(getLocalProducts())
    setRecentOrders(getLocalOrders())

    try {
      const savedCart = window.localStorage.getItem(STORAGE_KEYS.CART)
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as CartItem[]
        if (Array.isArray(parsed)) setCart(parsed)
      }
      const savedCustomer = window.localStorage.getItem(STORAGE_KEYS.CUSTOMER)
      if (savedCustomer) {
        const parsedCustomer = JSON.parse(savedCustomer) as Partial<CustomerForm>
        setCustomer((prev) => ({ ...prev, ...parsedCustomer }))
      }
    } catch {
      // ignore localStorage read errors
    }
    setCartHydrated(true)

    const supabase = createClient()
    if (!supabase) return

    // Fetch products from Supabase
    supabase
      .from('products')
      .select('id,name,category,price,unit,image,in_stock,description')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const normalized: Product[] = data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            name: String(row.name || ''),
            category: String(row.category || 'Grains & Staples'),
            price: Number(row.price || 0),
            unit: String(row.unit || 'item'),
            image: row.image ? String(row.image) : null,
            in_stock: row.in_stock !== false,
            description: row.description ? String(row.description) : null,
          }))
          setProducts(normalized)
          saveLocalProducts(normalized)
        }
      })

    // Check authenticated customer session & subscribe to auth changes
    function syncUserSession(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) {
      if (!supabase) return
      if (user) {
        setUserId(user.id)
        setUserEmail(user.email || null)
        const metaName = user.user_metadata?.full_name || user.user_metadata?.name
        setCustomer((prev) => ({
          ...prev,
          email: prev.email || user.email || '',
          name: prev.name || (typeof metaName === 'string' ? metaName : ''),
        }))

        // Load user orders from Supabase
        supabase
          .from('orders')
          .select('id,customer_name,customer_email,customer_phone,customer_address,delivery_notes,subtotal,delivery_fee,total,status,items,created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data: userOrders }) => {
            if (userOrders && userOrders.length > 0) {
              setRecentOrders(userOrders as Order[])
            }
          })
      } else {
        setUserId(null)
        setUserEmail(null)
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      syncUserSession(data?.user as any)
    })

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session?.user as any)
    })

    return () => {
      authSub?.subscription?.unsubscribe()
    }
  }, [])

  // Persist cart to localStorage after hydration
  useEffect(() => {
    if (!cartHydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart))
    } catch {
      // ignore write errors
    }
  }, [cart, cartHydrated])

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  function showToast(message: string) {
    setConfirmation(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setConfirmation('')
      toastTimerRef.current = null
    }, 2800)
  }

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const categoryMatch = activeCategory === 'All products' || product.category === activeCategory
      const searchMatch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.category.toLowerCase().includes(search.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(search.toLowerCase()))
      return categoryMatch && searchMatch
    })

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.price - a.price)
    } else if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [products, activeCategory, search, sortBy])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All products': products.length }
    for (const p of products) {
      counts[p.category] = (counts[p.category] || 0) + 1
    }
    return counts
  }, [products])

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const delivery = subtotal >= STORE_CONFIG.FREE_DELIVERY_THRESHOLD || subtotal === 0 ? 0 : STORE_CONFIG.FLAT_DELIVERY_FEE
  const grandTotal = subtotal + delivery

  function addToCart(product: Product, quantity = 1) {
    if (product.in_stock === false) return
    setCart((current) => {
      const found = current.find((item) => item.id === product.id)
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        )
      }
      return [...current, { ...product, quantity }]
    })
    showToast(`${quantity > 1 ? `${quantity}x ` : ''}${product.name} added to your basket.`)
  }

  function changeQuantity(id: string, amount: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== id) return [item]
        const quantity = item.quantity + amount
        return quantity > 0 ? [{ ...item, quantity }] : []
      })
    )
  }

  function clearCart() {
    if (cart.length === 0) return
    if (window.confirm('Are you sure you want to remove all items from your basket?')) {
      setCart([])
      try {
        window.localStorage.removeItem(STORAGE_KEYS.CART)
      } catch {
        // ignore storage error
      }
      showToast('Your basket has been cleared.')
    }
  }

  function openBasket() {
    setCartStep('basket')
    setCheckoutError('')
    setCartOpen(true)
  }

  function openProductModal(product: Product) {
    setSelectedProduct(product)
    setModalQty(1)
  }

  async function handleGoogleSignIn() {
    const supabase = createClient()
    if (!supabase) {
      showToast('Connect Supabase in .env.local to enable Google Sign-In.')
      return
    }
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    setUserId(null)
    setUserEmail(null)
    showToast('Signed out of your account.')
  }

  async function handleTrackOrder(e: FormEvent) {
    e.preventDefault()
    const cleanRef = trackRef.trim()
    if (!cleanRef) return

    setTrackingBusy(true)
    setTrackError('')
    setTrackedOrder(null)

    // First check local orders
    const localMatch = recentOrders.find(
      (o) =>
        o.id.toLowerCase() === cleanRef.toLowerCase() ||
        o.id.toLowerCase().includes(cleanRef.toLowerCase())
    )

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cleanRef, phone: trackPhone.trim() }),
      })
      const data = await res.json()

      if (res.ok && data.order) {
        setTrackedOrder(data.order as Order)
      } else if (localMatch) {
        setTrackedOrder(localMatch)
      } else {
        setTrackError(data.error || 'Order not found. Please verify your reference code.')
      }
    } catch {
      if (localMatch) {
        setTrackedOrder(localMatch)
      } else {
        setTrackError('Could not connect to tracking server. Please check your network.')
      }
    } finally {
      setTrackingBusy(false)
    }
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault()
    if (cart.length === 0) return

    const trimmedName = customer.name.trim()
    const trimmedPhone = customer.phone.trim()
    const trimmedAddress = customer.address.trim()
    const trimmedEmail = customer.email.trim()
    const trimmedNotes = customer.notes.trim()

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      setCheckoutError('Please fill in your name, phone number, and delivery address.')
      return
    }

    setSubmittingOrder(true)
    setCheckoutError('')

    try {
      window.localStorage.setItem(
        STORAGE_KEYS.CUSTOMER,
        JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          email: trimmedEmail,
          address: trimmedAddress,
          notes: '',
        })
      )
    } catch {
      // ignore storage error
    }

    const orderItems: OrderItem[] = cart.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.price,
    }))

    const fallbackId = `MO-${Date.now().toString(36).toUpperCase().slice(-6)}`
    const nowIso = new Date().toISOString()

    let finalOrder: Order = {
      id: fallbackId,
      customer_name: trimmedName,
      customer_email: trimmedEmail || null,
      customer_phone: trimmedPhone,
      customer_address: trimmedNotes
        ? `${trimmedAddress} (Note: ${trimmedNotes})`
        : trimmedAddress,
      delivery_notes: trimmedNotes || null,
      subtotal,
      delivery_fee: delivery,
      total: grandTotal,
      status: 'pending',
      items: orderItems,
      created_at: nowIso,
    }

    // Attempt API checkout route first (price verification & Mailgun email)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: {
            name: trimmedName,
            phone: trimmedPhone,
            email: trimmedEmail,
            address: trimmedAddress,
            notes: trimmedNotes,
          },
          userId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.order) {
          finalOrder = data.order
        }
      }
    } catch {
      // Offline fallback: handled below with local order storage
    }

    const updatedOrders = [finalOrder, ...getLocalOrders().filter((o) => o.id !== finalOrder.id)]
    saveLocalOrders(updatedOrders)
    setRecentOrders(updatedOrders)
    setCompletedOrder(finalOrder)
    setCart([])
    setSubmittingOrder(false)
    setCartStep('success')
  }

  function copyShareLink(product: Product) {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}#shop`
      navigator.clipboard?.writeText(`${product.name} - ${formatNaira(product.price)} at Mama Oche: ${shareUrl}`)
      showToast('Product link copied to clipboard!')
    }
  }

  return (
    <main className="min-h-screen bg-[#fbfdfb] text-[#10231c]">
      {/* Top Announcement Bar */}
      <div className="bg-[#0b5b43] px-5 py-2.5 text-center text-xs font-medium tracking-wide text-white">
        Free delivery on orders above ₦{STORE_CONFIG.FREE_DELIVERY_THRESHOLD.toLocaleString('en-NG')} · Same-day doorstep delivery across Abuja
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-[#e2eee8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Mama Oche home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d7f6e4] text-lg font-black text-[#0b5b43]">
              M
            </span>
            <span>
              <span className="block font-serif text-2xl font-bold leading-none text-[#0b5b43]">
                Mama Oche
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#779188]">
                Fresh provisions · Abuja
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-[#5d7068] md:flex">
            <a className="text-[#0b5b43] transition hover:text-[#074835]" href="#shop">
              Shop Pantry
            </a>
            <a href="#delivery" className="transition hover:text-[#0b5b43]">
              Delivery Info
            </a>
            <button
              onClick={() => setTrackOpen(true)}
              className="text-[#5d7068] transition hover:text-[#0b5b43]"
            >
              Track Order
            </button>
            <a href="#about" className="transition hover:text-[#0b5b43]">
              About Us
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setTrackOpen(true)}
              aria-label="Track order"
              className="hidden items-center gap-1.5 rounded-full border border-[#e2eee8] px-3 py-2 text-xs font-bold text-[#19342a] transition hover:bg-[#eff9f2] lg:flex"
            >
              <Package size={15} className="text-[#0b8a61]" />
              <span>Track Order</span>
            </button>

            {!userEmail ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                aria-label="Sign In or Sign Up"
                className="flex items-center gap-1.5 rounded-full bg-[#0b5b43] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#074835]"
              >
                <LogIn size={15} />
                <span>Sign In / Sign Up</span>
              </button>
            ) : (
              <button
                onClick={() => setAccountOpen(true)}
                aria-label="Account profile"
                className="flex items-center gap-2 rounded-full border border-[#0b5b43]/30 bg-[#eff9f2] px-3.5 py-2 text-xs font-bold text-[#0b5b43] transition hover:bg-[#dff5e7]"
              >
                <UserRound size={15} />
                <span className="max-w-[100px] truncate sm:max-w-[140px]">{userEmail.split('@')[0]}</span>
              </button>
            )}

            <button
              onClick={() => setAccountOpen(true)}
              aria-label="My Orders"
              className="flex items-center gap-1.5 rounded-full border border-[#e2eee8] px-3 py-2 text-xs font-bold text-[#19342a] transition hover:bg-[#eff9f2]"
            >
              <Package size={15} className="text-[#0b8a61]" />
              <span className="hidden sm:inline">My Orders</span>
              {recentOrders.length > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#0b5b43] px-1 text-[10px] text-white">
                  {recentOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={openBasket}
              aria-label="Your basket"
              className="flex items-center gap-1.5 rounded-full bg-[#0b5b43] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#074835]"
            >
              <ShoppingBag size={15} />
              <span className="hidden sm:inline">Your basket</span>
              {itemCount > 0 && (
                <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#b7f2cc] px-1 text-[10px] text-[#0b5b43]">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-[#10231c] hover:bg-[#eff9f2] md:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="flex flex-col gap-3.5 border-t border-[#e2eee8] bg-white px-5 py-4 text-sm font-semibold md:hidden">
            {!userEmail ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setAuthModalOpen(true)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#074835]"
              >
                <LogIn size={18} /> Sign In / Sign Up
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-[#eff9f2] p-3 text-xs font-bold text-[#0b5b43]">
                <div className="flex items-center gap-2">
                  <UserRound size={16} />
                  <span className="truncate">{userEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    handleSignOut()
                  }}
                  className="shrink-0 text-xs font-bold text-[#b13c2e] hover:underline"
                >
                  Sign out
                </button>
              </div>
            )}
            <a href="#shop" onClick={() => setMenuOpen(false)} className="hover:text-[#0b5b43]">
              Shop provisions
            </a>
            <a href="#delivery" onClick={() => setMenuOpen(false)} className="hover:text-[#0b5b43]">
              How delivery works in Abuja
            </a>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setTrackOpen(true)
              }}
              className="flex items-center gap-2 text-left text-[#10231c] hover:text-[#0b5b43]"
            >
              <Package size={16} className="text-[#0b8a61]" /> Track an Order
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setAccountOpen(true)
              }}
              className="flex items-center gap-2 text-left text-[#0b5b43]"
            >
              <UserRound size={16} /> My Orders & Saved Info
            </button>
            <a href="#about" onClick={() => setMenuOpen(false)} className="hover:text-[#0b5b43]">
              About Mama Oche
            </a>
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 border-t border-[#e2eee8] pt-3 text-xs font-bold text-[#5d7068]"
            >
              <Lock size={14} /> Store Admin Portal
            </Link>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="top"
        className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pt-20"
      >
        <div>
          <p className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#0b8a61]">
            <span className="h-2 w-2 rounded-full bg-[#31c978]" /> Serving Homes Across Abuja
          </p>
          <h1 className="max-w-xl font-serif text-5xl font-bold leading-[1.04] tracking-tight text-[#10231c] sm:text-6xl lg:text-7xl">
            Good food starts with <em className="font-normal text-[#0b8a61]">good</em> provisions.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#60736a]">
            Fresh groceries, pantry staples, and everyday essentials carefully chosen for your Abuja home.
            Delivered directly to your door with pay on arrival.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#shop"
              className="flex items-center gap-2 rounded-full bg-[#0b5b43] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0b5b43]/15 transition hover:-translate-y-0.5 hover:bg-[#074835]"
            >
              Shop provisions <ArrowRight size={17} />
            </a>
            {!userEmail ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-[#0b5b43] bg-white px-5 py-3.5 text-sm font-bold text-[#0b5b43] shadow-sm transition hover:bg-[#eff9f2]"
              >
                <LogIn size={17} /> Sign In / Sign Up
              </button>
            ) : (
              <button
                onClick={() => setAccountOpen(true)}
                className="flex items-center gap-2 rounded-full border border-[#0b5b43] bg-[#eff9f2] px-5 py-3.5 text-sm font-bold text-[#0b5b43] shadow-sm transition hover:bg-[#dff5e7]"
              >
                <UserRound size={17} /> My Account & Orders
              </button>
            )}
            <button
              onClick={() => setTrackOpen(true)}
              className="flex items-center gap-2 rounded-full border border-[#cfe6d8] bg-white px-6 py-3.5 text-sm font-bold text-[#0b5b43] transition hover:bg-[#f1f8f3]"
            >
              <Package size={17} /> Track order
            </button>
            <a
              href={`https://wa.me/${STORE_CONFIG.WHATSAPP}?text=Hello%20Mama%20Oche%2C%20I%20would%20like%20to%20order%20groceries%20in%20Abuja`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-[#25D366] bg-[#25D366]/10 px-5 py-3.5 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
            >
              <MessageCircle size={17} /> Order on WhatsApp ({STORE_CONFIG.PHONE})
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[590px]">
          <div className="absolute -right-3 -top-5 h-24 w-24 rounded-full bg-[#d7f6e4]" />
          <div className="absolute -bottom-7 -left-5 h-32 w-32 rounded-full border-[18px] border-[#f0f9f2]" />
          <div className="relative overflow-hidden rounded-[2rem] rounded-br-[7rem] bg-[#d9f4e3] p-4 shadow-2xl shadow-[#0b5b43]/10">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85"
              alt="Fresh vegetables and groceries arranged on a table"
              className="h-[360px] w-full rounded-[1.5rem] object-cover sm:h-[440px]"
            />
            <div className="absolute bottom-10 left-10 flex items-center gap-3 rounded-2xl bg-white p-3.5 pr-5 shadow-xl">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d7f6e4] text-[#0b5b43]">
                <ShieldCheck size={21} />
              </span>
              <span>
                <strong className="block text-sm">Quality you can trust</strong>
                <small className="text-xs text-[#71847b]">Authentic brands & wholesale value</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="shop" className="border-y border-[#e4eee8] bg-white px-5 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0b8a61]">
                The essentials
              </p>
              <h2 className="mt-2 font-serif text-4xl font-bold">Shop the pantry</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-3 text-[#8ba097]" size={18} />
                <input
                  aria-label="Search products"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search rice, oil, milk, soap..."
                  className="w-full rounded-full border border-[#dbeae0] bg-[#fbfdfb] py-2.5 pl-10 pr-9 text-sm outline-none ring-[#b7e9c8] focus:ring-2"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-2.5 rounded-full p-0.5 text-[#8ba097] hover:text-[#10231c]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Sort Filter Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort products"
                  className="appearance-none rounded-full border border-[#dbeae0] bg-[#fbfdfb] py-2.5 pl-4 pr-9 text-xs font-bold text-[#19342a] outline-none hover:bg-[#eff9f2]"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-[#5d7068]" />
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mb-9 flex gap-2 overflow-x-auto pb-2">
            {STOREFRONT_CATEGORIES.map((category) => {
              const count = categoryCounts[category] || 0
              return (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeCategory === category
                      ? 'bg-[#0b5b43] text-white shadow-sm'
                      : 'bg-[#f1f8f3] text-[#61756b] hover:bg-[#dff4e7]'
                  }`}
                >
                  <span>{category}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                      activeCategory === category ? 'bg-white/20 text-white' : 'bg-white text-[#71847b]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {filteredProducts.map((product) => {
              const inStock = product.in_stock !== false
              const inBasketQty = cart.find((item) => item.id === product.id)?.quantity || 0

              return (
                <article
                  key={product.id}
                  className="group flex flex-col rounded-2xl p-2 transition hover:bg-[#f6fcf8]"
                >
                  <div
                    onClick={() => openProductModal(product)}
                    className="relative mb-4 cursor-pointer overflow-hidden rounded-2xl bg-[#f1f8f3]"
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`aspect-square w-full object-cover transition duration-500 ${
                          inStock ? 'group-hover:scale-105' : 'opacity-60 grayscale'
                        }`}
                      />
                    ) : (
                      <div className="grid aspect-square w-full place-items-center bg-[#e9f8ed]">
                        <Package size={36} className="text-[#0b8a61]" />
                      </div>
                    )}

                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        inStock
                          ? 'bg-white/95 text-[#0b8a61]'
                          : 'bg-[#2c3a35]/90 text-white'
                      }`}
                    >
                      {inStock ? 'In stock' : 'Out of stock'}
                    </span>

                    {inBasketQty > 0 && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#0b5b43] px-2.5 py-1 text-[10px] font-bold text-white shadow">
                        {inBasketQty} in basket
                      </span>
                    )}

                    {inStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          addToCart(product)
                        }}
                        aria-label={`Add ${product.name} to basket`}
                        className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-[#0b5b43] text-white opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-[#074835] focus:opacity-100"
                      >
                        <Plus size={19} />
                      </button>
                    )}
                  </div>

                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8a9b93]">
                    {product.category}
                  </p>
                  <h3
                    onClick={() => openProductModal(product)}
                    className="cursor-pointer font-serif text-lg font-bold leading-tight text-[#19342a] hover:text-[#0b5b43]"
                  >
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6b7f76]">
                      {product.description}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div>
                      <span className="font-bold text-[#0b5b43]">{formatNaira(product.price)}</span>
                      <span className="ml-1 text-xs text-[#83938c]">/ {product.unit}</span>
                    </div>

                    <button
                      disabled={!inStock}
                      onClick={() => addToCart(product)}
                      className="rounded-full bg-[#eff9f2] px-3 py-1.5 text-xs font-bold text-[#0b5b43] transition hover:bg-[#d7f6e4] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {inStock ? '+ Add' : 'Unavailable'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="py-14 text-center">
              <p className="text-base font-semibold text-[#19342a]">
                No provisions match &ldquo;{search || activeCategory}&rdquo;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('All products')
                  setSearch('')
                  setSortBy('featured')
                }}
                className="mt-3 rounded-full bg-[#eff9f2] px-4 py-2 text-xs font-bold text-[#0b5b43] hover:bg-[#d7f6e4]"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Delivery Highlights Section */}
      <section
        id="delivery"
        className="mx-auto grid max-w-7xl gap-4 px-5 py-14 sm:grid-cols-3 lg:px-8"
      >
        <div className="rounded-2xl bg-[#e9f8ed] p-6">
          <Truck className="mb-5 text-[#0b8a61]" />
          <h3 className="font-serif text-xl font-bold">Doorstep delivery in Abuja</h3>
          <p className="mt-2 text-sm leading-6 text-[#60736a]">
            Free delivery when your basket reaches ₦{STORE_CONFIG.FREE_DELIVERY_THRESHOLD.toLocaleString('en-NG')}.
            Otherwise, standard flat-rate delivery across Abuja is just ₦{STORE_CONFIG.FLAT_DELIVERY_FEE.toLocaleString('en-NG')}.
          </p>
        </div>

        <div className="rounded-2xl bg-[#fff7e8] p-6">
          <Clock3 className="mb-5 text-[#b77918]" />
          <h3 className="font-serif text-xl font-bold">Pay on arrival</h3>
          <p className="mt-2 text-sm leading-6 text-[#60736a]">
            Inspect your provisions first and pay conveniently with cash or instant bank transfer when your
            rider arrives at your doorstep.
          </p>
        </div>

        <div className="rounded-2xl bg-[#edf4ff] p-6">
          <MapPin className="mb-5 text-[#3d71b8]" />
          <h3 className="font-serif text-xl font-bold">Abuja neighborhood coverage</h3>
          <p className="mt-2 text-sm leading-6 text-[#60736a]">
            We deliver same-day across Maitama, Wuse, Garki, Jabi, Utako, Gwarinpa, Apo, Lokogoma, and neighboring Abuja districts.
          </p>
        </div>
      </section>

      {/* Dedicated About Section */}
      <section id="about" className="border-t border-[#e4eee8] bg-[#f4fbf6] px-5 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#0b8a61]">
              About Mama Oche
            </p>
            <h2 className="mt-2 font-serif text-4xl font-bold text-[#10231c]">
              Stocking Abuja homes with honest value &amp; fresh staples.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#51665d]">
              At Mama Oche, we believe restocking your family pantry in Abuja should be simple, dependable,
              and fairly priced. From 50kg bags of clean parboiled rice and cooking oils to breakfast
              packs and laundry care, every item is sourced directly from trusted distributors.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-[#0b5b43]">
                  <Sparkles size={16} /> Direct Wholesale Pricing
                </p>
                <p className="mt-1 text-xs leading-5 text-[#60736a]">
                  Buy single family packs or full cartons at honest market prices without the stress.
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-bold text-[#0b5b43]">
                  <Store size={16} /> Open Monday – Saturday
                </p>
                <p className="mt-1 text-xs leading-5 text-[#60736a]">
                  {STORE_CONFIG.HOURS}. Orders placed before 3:00 PM qualify for same-day dispatch.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d7e8dc] bg-white p-7 shadow-lg shadow-[#0b5b43]/5">
            <h3 className="font-serif text-2xl font-bold text-[#10231c]">Need help with bulk orders?</h3>
            <p className="mt-2 text-sm leading-6 text-[#60736a]">
              Reach out to our Abuja store desk for bulk family restocks, festive hampers, or delivery
              inquiries.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a
                href={`tel:${STORE_CONFIG.PHONE}`}
                className="flex items-center gap-3 rounded-xl bg-[#f5faf6] px-4 py-3 font-semibold text-[#10231c] transition hover:bg-[#e9f8ed]"
              >
                <Phone size={17} className="text-[#0b8a61]" />
                <span>Call: {STORE_CONFIG.PHONE}</span>
              </a>
              <a
                href={`https://wa.me/${STORE_CONFIG.WHATSAPP}?text=Hello%20Mama%20Oche%2C%20I%20have%20an%20inquiry%20about%20an%20order%20in%20Abuja`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#25D366]/10 px-4 py-3 font-semibold text-[#128C7E] transition hover:bg-[#25D366]/20"
              >
                <MessageCircle size={17} />
                <span>WhatsApp: {STORE_CONFIG.PHONE}</span>
              </a>
              <a
                href={`mailto:${STORE_CONFIG.EMAIL}`}
                className="flex items-center gap-3 rounded-xl bg-[#f5faf6] px-4 py-3 font-semibold text-[#10231c] transition hover:bg-[#e9f8ed]"
              >
                <Mail size={17} className="text-[#0b8a61]" />
                <span>{STORE_CONFIG.EMAIL}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#103b2e] px-5 py-12 text-[#d4e7dc] lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-serif text-2xl font-bold text-white">Mama Oche</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#a9c5b6]">
              The everyday store for good food, honest value, and a well-stocked home. Delivering across Abuja.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-5 text-xs font-semibold text-[#d4e7dc]">
              <a href="#shop" className="hover:text-white">
                Shop Pantry
              </a>
              <a href="#delivery" className="hover:text-white">
                Delivery Info
              </a>
              <button onClick={() => setTrackOpen(true)} className="hover:text-white">
                Track Order
              </button>
              <button onClick={() => setAccountOpen(true)} className="hover:text-white">
                My Account
              </button>
              <Link href="/admin" className="hover:text-white">
                Admin Portal
              </Link>
            </div>
            <p className="text-xs text-[#a9c5b6]">© 2026 Mama Oche · Abuja, Nigeria · Tel: {STORE_CONFIG.PHONE}</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Support Button */}
      <a
        href={`https://wa.me/${STORE_CONFIG.WHATSAPP}?text=Hello%20Mama%20Oche%2C%20I%20have%20a%20question%20about%20ordering%20in%20Abuja`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order or chat on WhatsApp"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-xl shadow-[#25D366]/30 transition hover:-translate-y-0.5 hover:bg-[#1ebd59]"
      >
        <MessageCircle size={19} />
        <span className="hidden sm:inline">WhatsApp ({STORE_CONFIG.PHONE})</span>
      </a>

      {/* Toast Notification */}
      {confirmation && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#cfe6d8] bg-white px-5 py-4 text-sm font-semibold text-[#10231c] shadow-2xl shadow-[#0b5b43]/20"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#d7f6e4] text-[#0b5b43]">
            ✓
          </span>
          {confirmation}
          <button
            onClick={() => setConfirmation('')}
            className="ml-2 rounded-full p-1 text-[#71847b] transition hover:bg-[#eff9f2]"
            aria-label="Dismiss confirmation"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Product Quick View Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#10231c]/45 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-[#5d7068] shadow-sm hover:bg-[#eff9f2]"
              aria-label="Close product view"
            >
              <X size={20} />
            </button>

            <div className="grid sm:grid-cols-2">
              <div className="relative bg-[#f1f8f3]">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-64 w-full object-cover sm:h-full"
                  />
                ) : (
                  <div className="grid h-64 w-full place-items-center bg-[#e9f8ed] sm:h-full">
                    <Package size={48} className="text-[#0b8a61]" />
                  </div>
                )}
                <span
                  className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    selectedProduct.in_stock !== false
                      ? 'bg-white/95 text-[#0b8a61]'
                      : 'bg-[#2c3a35]/90 text-white'
                  }`}
                >
                  {selectedProduct.in_stock !== false ? 'In stock' : 'Out of stock'}
                </span>
              </div>

              <div className="flex flex-col p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0b8a61]">
                  {selectedProduct.category}
                </span>
                <h3 className="mt-1 font-serif text-2xl font-bold text-[#10231c]">
                  {selectedProduct.name}
                </h3>
                <p className="mt-1 text-xs text-[#71847b]">Packaging: {selectedProduct.unit}</p>

                <p className="mt-3 font-serif text-2xl font-bold text-[#0b5b43]">
                  {formatNaira(selectedProduct.price)}
                </p>

                {selectedProduct.description && (
                  <p className="mt-3 text-xs leading-5 text-[#51665d]">
                    {selectedProduct.description}
                  </p>
                )}

                <div className="mt-6 border-t border-[#e2eee8] pt-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5d7068]">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                        className="grid h-8 w-8 place-items-center rounded-full border border-[#d7e8dc] text-sm hover:bg-[#eff9f2]"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{modalQty}</span>
                      <button
                        onClick={() => setModalQty((q) => q + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-[#d7e8dc] text-sm hover:bg-[#eff9f2]"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      disabled={selectedProduct.in_stock === false}
                      onClick={() => {
                        addToCart(selectedProduct, modalQty)
                        setSelectedProduct(null)
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white transition hover:bg-[#074835] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingBag size={17} /> Add {modalQty > 1 ? `${modalQty} ` : ''}to Basket · {formatNaira(selectedProduct.price * modalQty)}
                    </button>

                    <a
                      href={generateWhatsAppProductUrl(selectedProduct)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-[#25D366]/10 py-2.5 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                    >
                      <MessageCircle size={15} /> Order on WhatsApp
                    </a>

                    <button
                      type="button"
                      onClick={() => copyShareLink(selectedProduct)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e2eee8] py-2 text-xs font-bold text-[#5d7068] hover:bg-[#eff9f2]"
                    >
                      <Share2 size={14} /> Share provision
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {trackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#10231c]/45 backdrop-blur-sm"
            onClick={() => setTrackOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2eee8] p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9f8ed] text-[#0b8a61]">
                  <Package size={20} />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-bold">Track Your Order</h3>
                  <p className="text-xs text-[#71847b]">Enter your order reference number below</p>
                </div>
              </div>
              <button
                onClick={() => setTrackOpen(false)}
                className="rounded-full p-2 hover:bg-[#eff9f2]"
                aria-label="Close tracking"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleTrackOrder} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                    Order Reference / ID *
                    <input
                      required
                      placeholder="e.g. MO-XYZ123 or Supabase UUID"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                    Phone Number (Optional verification)
                    <input
                      placeholder="e.g. 0903 400 6248"
                      value={trackPhone}
                      onChange={(e) => setTrackPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                    />
                  </label>
                </div>

                <button
                  disabled={trackingBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white transition hover:bg-[#074835] disabled:opacity-60"
                >
                  {trackingBusy && <LoaderCircle size={16} className="animate-spin" />}
                  Look Up Delivery Status
                </button>
              </form>

              {trackError && (
                <p className="mt-4 rounded-xl bg-[#fdf2f0] p-3 text-xs font-semibold text-[#b13c2e]">
                  {trackError}
                </p>
              )}

              {trackedOrder && (
                <div className="mt-6 rounded-2xl border border-[#d7e8dc] bg-[#f8fcfa] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0b5b43]">
                        #{String(trackedOrder.id).slice(0, 8).toUpperCase()}
                      </span>
                      <p className="font-bold text-[#10231c]">{trackedOrder.customer_name}</p>
                      <p className="text-xs text-[#71847b]">{trackedOrder.customer_address}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        trackedOrder.status === 'delivered'
                          ? 'bg-[#d7f6e4] text-[#0b5b43]'
                          : trackedOrder.status === 'confirmed'
                          ? 'bg-[#edf4ff] text-[#2b5cab]'
                          : trackedOrder.status === 'cancelled'
                          ? 'bg-[#fdf2f0] text-[#b13c2e]'
                          : 'bg-[#fff7e8] text-[#b77918]'
                      }`}
                    >
                      {trackedOrder.status}
                    </span>
                  </div>

                  {/* Visual Progress Steps */}
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                    <div
                      className={`rounded-xl p-2.5 ${
                        trackedOrder.status !== 'cancelled'
                          ? 'bg-[#d7f6e4] font-bold text-[#0b5b43]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      1. Placed
                    </div>
                    <div
                      className={`rounded-xl p-2.5 ${
                        trackedOrder.status === 'confirmed' || trackedOrder.status === 'delivered'
                          ? 'bg-[#d7f6e4] font-bold text-[#0b5b43]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      2. Packing / Transit
                    </div>
                    <div
                      className={`rounded-xl p-2.5 ${
                        trackedOrder.status === 'delivered'
                          ? 'bg-[#d7f6e4] font-bold text-[#0b5b43]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      3. Delivered
                    </div>
                  </div>

                  {trackedOrder.items && trackedOrder.items.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-[#e2eee8] pt-3 text-xs text-[#4f665b]">
                      {trackedOrder.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-semibold">
                            {formatNaira(item.unit_price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-[#e2eee8] pt-3 text-xs">
                    <span className="font-semibold text-[#71847b]">Total Amount:</span>
                    <span className="font-bold text-[#0b5b43]">{formatNaira(trackedOrder.total)}</span>
                  </div>

                  <a
                    href={generateWhatsAppOrderHelpUrl(trackedOrder.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-[#25D366]/10 py-2.5 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                  >
                    <MessageCircle size={15} /> Chat with Dispatch on WhatsApp ({STORE_CONFIG.PHONE})
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account & Order History Drawer */}
      {accountOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close account drawer"
            onClick={() => setAccountOpen(false)}
            className="absolute inset-0 bg-[#10231c]/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e2eee8] p-5">
              <div>
                <h2 className="font-serif text-2xl font-bold">Account &amp; Orders</h2>
                <p className="text-sm text-[#71847b]">
                  {userEmail ? `Signed in as ${userEmail}` : 'View your recent orders & saved info'}
                </p>
              </div>
              <button
                onClick={() => setAccountOpen(false)}
                className="rounded-full p-2 hover:bg-[#eff9f2]"
                aria-label="Close account drawer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {/* Customer Sign-In / Profile Card */}
              <div className="rounded-2xl border border-[#e2eee8] bg-[#f8fcfa] p-4">
                {userEmail ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#0b8a61]">
                        Verified Customer
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#10231c]">{userEmail}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 rounded-xl border border-[#d7e8dc] bg-white px-3 py-1.5 text-xs font-bold text-[#b13c2e] hover:bg-[#fdf2f0]"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-[#10231c]">Sign In to Mama Oche</p>
                    <p className="mt-1 text-xs text-[#60736a]">
                      Sign in with Google to sync your Abuja orders across devices, track deliveries, and speed up checkout.
                    </p>
                    <div className="mt-3.5 space-y-2">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[#cfe6d8] bg-white py-2.5 text-xs font-bold text-[#10231c] shadow-sm transition hover:bg-[#eff9f2]"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAccountOpen(false)
                          setAuthModalOpen(true)
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#074835]"
                      >
                        <LogIn size={14} />
                        <span>Sign In with Email / Password</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Orders List */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold">Your Recent Orders</h3>
                  <span className="text-xs font-semibold text-[#71847b]">
                    {recentOrders.length} {recentOrders.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d7e8dc] p-8 text-center">
                    <Package className="mx-auto mb-2 text-[#91b2a1]" size={28} />
                    <p className="text-sm font-semibold text-[#19342a]">No orders placed yet</p>
                    <p className="mt-1 text-xs text-[#71847b]">
                      When you checkout, your order receipts and live delivery status will appear
                      here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-[#e2eee8] bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-[#0b5b43]">
                              #{String(order.id).slice(0, 8).toUpperCase()}
                            </span>
                            <p className="mt-0.5 text-xs text-[#71847b]">
                              {new Date(order.created_at).toLocaleString('en-NG')}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                              order.status === 'delivered'
                                ? 'bg-[#d7f6e4] text-[#0b5b43]'
                                : order.status === 'confirmed'
                                ? 'bg-[#edf4ff] text-[#2b5cab]'
                                : 'bg-[#fff7e8] text-[#b77918]'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <ul className="mt-3 space-y-1 border-t border-[#f0f6f2] pt-2.5 text-xs text-[#4f665b]">
                            {order.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>
                                  {item.quantity}x {item.product_name}
                                </span>
                                <span className="font-semibold">
                                  {formatNaira(item.unit_price * item.quantity)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-[#f0f6f2] pt-2.5 text-xs">
                          <span className="truncate text-[#71847b]">{order.customer_address}</span>
                          <span className="ml-2 shrink-0 font-bold text-[#0b5b43]">
                            {formatNaira(order.total)}
                          </span>
                        </div>

                        <div className="mt-2.5 flex items-center gap-2 border-t border-[#f0f6f2] pt-2">
                          <button
                            onClick={() => {
                              setTrackRef(order.id)
                              setAccountOpen(false)
                              setTrackOpen(true)
                            }}
                            className="text-xs font-bold text-[#0b5b43] hover:underline"
                          >
                            Track Delivery →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#e2eee8] p-4">
              <Link
                href="/admin"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f1f8f3] py-2.5 text-xs font-bold text-[#0b5b43] transition hover:bg-[#d7f6e4]"
              >
                <Lock size={14} /> Go to Store Admin Portal
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Basket & Checkout Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close basket"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-[#10231c]/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#e2eee8] p-5">
              <div className="flex items-center gap-2.5">
                {cartStep === 'checkout' && (
                  <button
                    type="button"
                    onClick={() => setCartStep('basket')}
                    className="rounded-full p-1.5 text-[#5d7068] hover:bg-[#eff9f2]"
                    aria-label="Back to basket"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div>
                  <h2 className="font-serif text-2xl font-bold">
                    {cartStep === 'basket' && 'Your basket'}
                    {cartStep === 'checkout' && 'Delivery details'}
                    {cartStep === 'success' && 'Order confirmed'}
                  </h2>
                  <p className="text-sm text-[#71847b]">
                    {cartStep === 'basket' &&
                      `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · Abuja delivery`}
                    {cartStep === 'checkout' && 'Pay cash or transfer on delivery'}
                    {cartStep === 'success' && 'Thank you for shopping with Mama Oche'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full p-2 hover:bg-[#eff9f2]"
                aria-label="Close basket"
              >
                <X size={20} />
              </button>
            </div>

            {/* STEP 1: BASKET VIEW */}
            {cartStep === 'basket' && (
              <>
                <div className="flex-1 overflow-y-auto p-5">
                  {cart.length === 0 ? (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <ShoppingBag className="mx-auto mb-4 text-[#91b2a1]" size={38} />
                        <p className="font-semibold">Your basket is empty</p>
                        <p className="mt-1 text-sm text-[#71847b]">
                          Add a few essentials to get started.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Clear Cart Top Action Bar */}
                      <div className="flex items-center justify-between border-b border-[#e2eee8] pb-3">
                        <span className="text-xs font-semibold text-[#5d7068]">
                          {itemCount} {itemCount === 1 ? 'provision' : 'provisions'} in basket
                        </span>
                        <button
                          type="button"
                          onClick={clearCart}
                          className="flex items-center gap-1.5 rounded-lg border border-[#f0d6d4] bg-[#fff8f7] px-2.5 py-1 text-xs font-bold text-[#b13c2e] transition hover:bg-[#fdebe9]"
                          title="Remove all items from basket"
                        >
                          <Trash2 size={13} /> Clear basket
                        </button>
                      </div>

                      {subtotal < STORE_CONFIG.FREE_DELIVERY_THRESHOLD && (
                        <div className="rounded-xl bg-[#eff9f2] px-3.5 py-2.5 text-xs font-medium text-[#0b5b43]">
                          Add{' '}
                          <strong>
                            {formatNaira(STORE_CONFIG.FREE_DELIVERY_THRESHOLD - subtotal)}
                          </strong>{' '}
                          more to unlock <strong>FREE delivery</strong> across Abuja!
                        </div>
                      )}

                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="h-20 w-20 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="grid h-20 w-20 place-items-center rounded-xl bg-[#e9f8ed]">
                              <Package size={22} className="text-[#0b8a61]" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-serif font-bold">{item.name}</h3>
                            <p className="mt-0.5 text-xs text-[#71847b]">{item.unit}</p>
                            <p className="mt-1 text-sm font-bold text-[#0b8a61]">
                              {formatNaira(item.price * item.quantity)}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => changeQuantity(item.id, -1)}
                                  className="grid h-7 w-7 place-items-center rounded-full border border-[#d7e8dc] hover:bg-[#eff9f2]"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={13} />
                                </button>
                                <span className="text-sm font-bold">{item.quantity}</span>
                                <button
                                  onClick={() => changeQuantity(item.id, 1)}
                                  className="grid h-7 w-7 place-items-center rounded-full border border-[#d7e8dc] hover:bg-[#eff9f2]"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={13} />
                                </button>
                              </div>

                              <button
                                onClick={() => changeQuantity(item.id, -item.quantity)}
                                className="text-xs text-[#9aa8a1] hover:text-[#b13c2e]"
                                title="Remove item"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-[#e2eee8] p-5">
                    <div className="mb-2 flex justify-between text-sm text-[#71847b]">
                      <span>Subtotal</span>
                      <span>{formatNaira(subtotal)}</span>
                    </div>
                    <div className="mb-4 flex justify-between text-sm text-[#71847b]">
                      <span>Delivery (Abuja)</span>
                      <span>{delivery === 0 ? 'Free' : formatNaira(delivery)}</span>
                    </div>
                    <div className="mb-5 flex justify-between border-t border-[#e2eee8] pt-4 text-lg font-bold">
                      <span>Total</span>
                      <span className="text-[#0b5b43]">{formatNaira(grandTotal)}</span>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setCartStep('checkout')}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0b5b43] py-3.5 text-sm font-bold text-white transition hover:bg-[#074835]"
                      >
                        Continue to checkout <ArrowRight size={17} />
                      </button>

                      <a
                        href={generateWhatsAppCartUrl(cart, grandTotal, customer)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] bg-[#25D366]/10 py-3 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                      >
                        <MessageCircle size={16} /> Order Directly via WhatsApp ({STORE_CONFIG.PHONE})
                      </a>

                      <button
                        type="button"
                        onClick={clearCart}
                        className="w-full text-center text-xs font-semibold text-[#8a9b93] hover:text-[#b13c2e]"
                      >
                        Clear entire basket
                      </button>
                    </div>

                    <p className="mt-3 text-center text-xs text-[#8a9b93]">
                      Cash or transfer on delivery · Pay when your order arrives in Abuja
                    </p>
                  </div>
                )}
              </>
            )}

            {/* STEP 2: CHECKOUT FORM */}
            {cartStep === 'checkout' && (
              <form onSubmit={submitOrder} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                      Full Name *
                      <input
                        required
                        type="text"
                        placeholder="e.g. Mrs. Amina Okafor"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                      Phone Number (WhatsApp / Call) *
                      <input
                        required
                        type="tel"
                        placeholder="e.g. 0903 400 6248"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                      Email Address (Optional)
                      <input
                        type="email"
                        placeholder="For order receipt & updates"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                      Abuja Street Address &amp; District *
                      <textarea
                        required
                        rows={3}
                        placeholder="House number, street name, district (e.g. Maitama, Wuse 2, Gwarinpa), and nearest landmark"
                        value={customer.address}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                      Delivery Notes (Optional)
                      <input
                        type="text"
                        placeholder="Gate code, estate name, call before arrival, etc."
                        value={customer.notes}
                        onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal text-[#10231c] outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                      />
                    </label>
                  </div>

                  {/* Order Summary Preview */}
                  <div className="rounded-2xl bg-[#f5faf6] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#0b8a61]">
                      Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-[#4f665b]">
                      {cart.map((item) => (
                        <li key={item.id} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold">
                            {formatNaira(item.price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 space-y-1 border-t border-[#dfeee4] pt-2.5 text-xs">
                      <div className="flex justify-between text-[#71847b]">
                        <span>Subtotal</span>
                        <span>{formatNaira(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[#71847b]">
                        <span>Delivery Fee</span>
                        <span>{delivery === 0 ? 'Free' : formatNaira(delivery)}</span>
                      </div>
                      <div className="flex justify-between pt-1 text-sm font-bold text-[#10231c]">
                        <span>Total to pay on delivery</span>
                        <span className="text-[#0b5b43]">{formatNaira(grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {checkoutError && (
                    <p className="rounded-xl bg-[#fdf2f0] px-3.5 py-2.5 text-xs font-semibold text-[#b13c2e]">
                      {checkoutError}
                    </p>
                  )}
                </div>

                <div className="border-t border-[#e2eee8] p-5">
                  <button
                    type="submit"
                    disabled={submittingOrder}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0b5b43] py-3.5 text-sm font-bold text-white transition hover:bg-[#074835] disabled:opacity-60"
                  >
                    {submittingOrder && <LoaderCircle size={17} className="animate-spin" />}
                    Place Abuja order · {formatNaira(grandTotal)}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: ORDER CONFIRMATION RECEIPT */}
            {cartStep === 'success' && completedOrder && (
              <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
                <div className="space-y-5">
                  <div className="rounded-3xl bg-[#e9f8ed] p-6 text-center">
                    <CheckCircle2 className="mx-auto mb-3 text-[#0b8a61]" size={44} />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#0b8a61]">
                      Order Received
                    </p>
                    <h3 className="mt-1 font-serif text-2xl font-bold text-[#10231c]">
                      Thank you, {completedOrder.customer_name}!
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-[#4f665b]">
                      We&apos;ve received your order and our Abuja dispatch team will call{' '}
                      <strong>{completedOrder.customer_phone}</strong> shortly to confirm delivery.
                    </p>
                    <div className="mt-4 inline-block rounded-full bg-white px-4 py-1.5 font-mono text-xs font-bold text-[#0b5b43] shadow-sm">
                      Order Ref: #{String(completedOrder.id).slice(0, 8).toUpperCase()}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e2eee8] p-4 text-xs">
                    <p className="font-bold uppercase tracking-wider text-[#71847b]">
                      Abuja Delivery Address
                    </p>
                    <p className="mt-1.5 font-semibold text-[#10231c]">
                      {completedOrder.customer_address}
                    </p>

                    {completedOrder.items && completedOrder.items.length > 0 && (
                      <div className="mt-4 border-t border-[#e2eee8] pt-3">
                        <p className="mb-2 font-bold uppercase tracking-wider text-[#71847b]">
                          Items Ordered
                        </p>
                        <ul className="space-y-1.5 text-[#4f665b]">
                          {completedOrder.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>
                                {item.quantity}x {item.product_name} ({item.unit})
                              </span>
                              <span className="font-semibold">
                                {formatNaira(item.unit_price * item.quantity)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-3 flex justify-between border-t border-[#e2eee8] pt-3 text-sm font-bold text-[#0b5b43]">
                      <span>Total Due on Arrival</span>
                      <span>{formatNaira(completedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  <a
                    href={generateWhatsAppOrderHelpUrl(completedOrder.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] bg-[#25D366]/10 py-3 text-xs font-bold text-[#128C7E] transition hover:bg-[#25D366]/20"
                  >
                    <MessageCircle size={16} /> Notify Dispatch on WhatsApp ({STORE_CONFIG.PHONE})
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setTrackRef(completedOrder.id)
                      setCartOpen(false)
                      setTrackOpen(true)
                    }}
                    className="w-full rounded-full border border-[#cfe6d8] bg-white py-3 text-xs font-bold text-[#0b5b43] hover:bg-[#f1f8f3]"
                  >
                    Track Live Delivery
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCartOpen(false)
                      setCartStep('basket')
                    }}
                    className="w-full rounded-full bg-[#0b5b43] py-3.5 text-sm font-bold text-white hover:bg-[#074835]"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Mobile Floating Cart Indicator (only on mobile when items in basket) */}
      {itemCount > 0 && !cartOpen && (
        <button
          onClick={openBasket}
          aria-label="Open basket"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#0b5b43] px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#0b5b43]/30 transition hover:bg-[#074835] md:hidden"
        >
          <ShoppingBag size={15} />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
          <span className="font-mono font-bold">· {formatNaira(subtotal)}</span>
        </button>
      )}

      {/* Auth Modal (Google & Email Sign In / Sign Up) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(email) => {
          setUserEmail(email)
          showToast(`Welcome back, ${email.split('@')[0]}!`)
        }}
      />
    </main>
  )
}
