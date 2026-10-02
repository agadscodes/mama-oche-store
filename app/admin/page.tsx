'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  DEFAULT_PRODUCTS,
  Order,
  PRODUCT_CATEGORIES,
  Product,
  formatNaira,
  getLocalOrders,
  getLocalProducts,
  saveLocalOrders,
  saveLocalProducts,
} from '@/lib/store-data'

type FormProduct = {
  name: string
  category: string
  price: string
  unit: string
  image: string
  description: string
  in_stock: boolean
}

const emptyProduct: FormProduct = {
  name: '',
  category: 'Grains & Staples',
  price: '',
  unit: '',
  image: '',
  description: '',
  in_stock: true,
}

export default function AdminPage() {
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<typeof createClient> | null>(null)
  const [hasEnv, setHasEnv] = useState<boolean>(false)
  const [session, setSession] = useState<boolean | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [form, setForm] = useState<FormProduct>(emptyProduct)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const configured = isSupabaseConfigured()
    setHasEnv(configured)

    if (configured) {
      const client = createClient()
      setSupabaseClient(client)
    } else {
      // Offline / Local Demo fallback
      setSession(false)
      setProducts(getLocalProducts())
      setOrders(getLocalOrders())
    }
  }, [])

  useEffect(() => {
    if (supabaseClient) {
      loadAdminData()
    }
  }, [supabaseClient])

  async function loadAdminData() {
    if (!supabaseClient) {
      setProducts(getLocalProducts())
      setOrders(getLocalOrders())
      return
    }

    try {
      const { data: auth } = await supabaseClient.auth.getUser()
      if (!auth.user) {
        setSession(false)
        return
      }

      // Check if user is in admin_users table
      const { data: admin, error: adminErr } = await supabaseClient
        .from('admin_users')
        .select('id')
        .eq('id', auth.user.id)
        .maybeSingle()

      if (adminErr || !admin) {
        setSession(false)
        setMessage('This Supabase account is not registered in the admin_users table.')
        return
      }

      const [{ data: productRows }, { data: orderRows }] = await Promise.all([
        supabaseClient
          .from('products')
          .select('id,name,category,price,unit,image,in_stock,description,created_at')
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('orders')
          .select(
            'id,customer_name,customer_email,customer_phone,customer_address,delivery_notes,subtotal,delivery_fee,total,status,items,created_at'
          )
          .order('created_at', { ascending: false }),
      ])

      const loadedProducts: Product[] =
        productRows && productRows.length > 0
          ? productRows.map((r: Record<string, unknown>) => ({
              id: String(r.id),
              name: String(r.name || ''),
              category: String(r.category || 'Grains & Staples'),
              price: Number(r.price || 0),
              unit: String(r.unit || 'item'),
              image: r.image ? String(r.image) : null,
              in_stock: r.in_stock !== false,
              description: r.description ? String(r.description) : null,
            }))
          : getLocalProducts()

      setProducts(loadedProducts)
      saveLocalProducts(loadedProducts)

      const loadedOrders: Order[] = (orderRows as Order[]) || getLocalOrders()
      setOrders(loadedOrders)
      saveLocalOrders(loadedOrders)
      setSession(true)
    } catch {
      setSession(false)
      setMessage('Failed to connect to Supabase. Check your connection or use local demo mode.')
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault()
    if (!supabaseClient) return
    setBusy(true)
    setMessage('')

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message || 'Invalid email or password.')
    } else {
      await loadAdminData()
    }
    setBusy(false)
  }

  function enterDemoMode() {
    setIsDemoMode(true)
    setSession(true)
    setProducts(getLocalProducts())
    setOrders(getLocalOrders())
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage('')

    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      unit: form.unit.trim(),
      image: form.image.trim() || null,
      description: form.description.trim() || null,
      in_stock: form.in_stock,
    }

    if (supabaseClient && session && !isDemoMode) {
      const result = editingId
        ? await supabaseClient.from('products').update(payload).eq('id', editingId)
        : await supabaseClient.from('products').insert(payload)

      if (result.error) {
        setMessage('Could not save product to Supabase: ' + result.error.message)
      } else {
        setForm(emptyProduct)
        setEditingId(null)
        await loadAdminData()
      }
    } else {
      // Local demo mode save
      if (editingId) {
        const updated = products.map((p) => (p.id === editingId ? { ...p, ...payload } : p))
        setProducts(updated)
        saveLocalProducts(updated)
      } else {
        const newProduct: Product = {
          id: `local-prod-${Date.now()}`,
          ...payload,
        }
        const updated = [newProduct, ...products]
        setProducts(updated)
        saveLocalProducts(updated)
      }
      setForm(emptyProduct)
      setEditingId(null)
    }
    setBusy(false)
  }

  async function deleteProduct(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return
    setBusy(true)

    if (supabaseClient && session && !isDemoMode) {
      const { error } = await supabaseClient.from('products').delete().eq('id', id)
      if (error) setMessage('Failed to delete: ' + error.message)
      else await loadAdminData()
    } else {
      const updated = products.filter((p) => p.id !== id)
      setProducts(updated)
      saveLocalProducts(updated)
    }
    setBusy(false)
  }

  async function toggleProductStock(product: Product) {
    const newStock = product.in_stock === false ? true : false
    if (supabaseClient && session && !isDemoMode) {
      await supabaseClient.from('products').update({ in_stock: newStock }).eq('id', product.id)
      await loadAdminData()
    } else {
      const updated = products.map((p) => (p.id === product.id ? { ...p, in_stock: newStock } : p))
      setProducts(updated)
      saveLocalProducts(updated)
    }
  }

  async function updateOrderStatus(id: string, status: Order['status']) {
    if (supabaseClient && session && !isDemoMode) {
      await supabaseClient
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
      await loadAdminData()
    } else {
      const updated = orders.map((o) => (o.id === id ? { ...o, status } : o))
      setOrders(updated)
      saveLocalOrders(updated)
    }
  }

  // Loading spinner while verifying configuration
  if (session === null && hasEnv) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf6] text-[#123226]">
        <div className="text-center">
          <LoaderCircle className="mx-auto mb-3 animate-spin text-[#0b5b43]" size={32} />
          <p className="text-sm font-semibold text-[#5d7068]">Connecting to Mama Oche portal...</p>
        </div>
      </main>
    )
  }

  // Sign In Screen (or Demo Mode Choice)
  if (!session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5faf6] px-5 py-12 text-[#123226]">
        <div className="w-full max-w-md">
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b5b43] hover:underline"
            >
              <ArrowLeft size={14} /> Back to Storefront
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-xl shadow-[#0b5b43]/10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b8a61]">
              Mama Oche Provisions
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold">Admin Portal</h1>
            <p className="mt-1 text-xs leading-5 text-[#60736a]">
              Manage catalog, restock items, and dispatch incoming orders.
            </p>

            {!hasEnv && (
              <div className="mt-5 rounded-2xl border border-[#ffe082] bg-[#fff9c4] p-4 text-xs">
                <p className="flex items-center gap-1.5 font-bold text-[#8d6e00]">
                  <Info size={16} /> Supabase not connected yet
                </p>
                <p className="mt-1 text-[#5d4037]">
                  To connect live database, add credentials to <code>.env.local</code>. You can test
                  all admin capabilities right now using Local Demo Mode.
                </p>
                <button
                  type="button"
                  onClick={enterDemoMode}
                  className="mt-3 w-full rounded-xl bg-[#0b5b43] py-2.5 text-xs font-bold text-white transition hover:bg-[#074835]"
                >
                  Enter Local Demo Admin
                </button>
              </div>
            )}

            {hasEnv && (
              <form onSubmit={signIn} className="mt-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Admin Email
                  <input
                    required
                    type="email"
                    placeholder="admin@mamaoche.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>

                <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Password
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#d7e8dc] px-4 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>

                {message && (
                  <p className="mt-3 rounded-xl bg-[#fdf2f0] p-3 text-xs font-semibold text-[#b13c2e]">
                    {message}
                  </p>
                )}

                <button
                  disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white transition hover:bg-[#074835] disabled:opacity-60"
                >
                  {busy && <LoaderCircle size={16} className="animate-spin" />}
                  Sign in to Portal
                </button>

                <div className="mt-4 border-t border-[#e2eee8] pt-4 text-center">
                  <button
                    type="button"
                    onClick={enterDemoMode}
                    className="text-xs font-bold text-[#0b5b43] hover:underline"
                  >
                    Or open in local demo mode
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f5faf6] text-[#123226]">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 border-b border-[#dfeee4] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-lg p-2 text-[#5d7068] hover:bg-[#eff9f2]"
              title="Return to storefront"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0b8a61]">
                  Mama Oche
                </p>
                {isDemoMode && (
                  <span className="rounded-full bg-[#fff9c4] px-2 py-0.5 text-[10px] font-bold text-[#8d6e00]">
                    Local Demo
                  </span>
                )}
              </div>
              <h1 className="font-serif text-2xl font-bold">Admin Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              className="rounded-xl border border-[#d7e8dc] p-2.5 text-[#5d7068] hover:bg-[#eff9f2]"
              aria-label="Refresh data"
              title="Refresh orders and products"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={() => {
                if (supabaseClient) supabaseClient.auth.signOut()
                setSession(false)
                setIsDemoMode(false)
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#d7e8dc] px-3.5 py-2 text-xs font-semibold text-[#5d7068] hover:bg-[#eff9f2]"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Grid */}
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
        {/* Orders Column */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0b8a61]">
                Customer Dispatches
              </p>
              <h2 className="font-serif text-2xl font-bold">Order Queue</h2>
            </div>
            <span className="rounded-full bg-[#d7f6e4] px-3 py-1 text-xs font-bold text-[#0b5b43]">
              {orders.length} total
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7e8dc] bg-white p-12 text-center text-sm text-[#71847b]">
              <ShoppingBag className="mx-auto mb-2 text-[#91b2a1]" size={32} />
              <p className="font-bold text-[#19342a]">No incoming orders yet.</p>
              <p className="mt-1 text-xs text-[#71847b]">
                When customers check out on the storefront, orders will immediately populate here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-2xl border border-[#e2eee8] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0b5b43]">
                          #{String(order.id).slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-xs text-[#8a9b93]">
                          {new Date(order.created_at).toLocaleString('en-NG')}
                        </span>
                      </div>
                      <p className="mt-1 font-bold text-[#10231c]">{order.customer_name}</p>
                      <p className="text-xs text-[#71847b]">
                        Phone: <a href={`tel:${order.customer_phone}`} className="font-semibold text-[#0b5b43] hover:underline">{order.customer_phone}</a>
                        {order.customer_email && ` · ${order.customer_email}`}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#4f665b]">
                        <strong>Address:</strong> {order.customer_address}
                      </p>
                    </div>

                    <p className="font-serif text-xl font-bold text-[#0b5b43]">
                      {formatNaira(order.total)}
                    </p>
                  </div>

                  {/* Ordered Line Items Display */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 rounded-xl bg-[#f8fcfa] p-3 text-xs">
                      <p className="font-bold uppercase tracking-wider text-[#71847b]">
                        Items to pack:
                      </p>
                      <ul className="mt-2 space-y-1.5 text-[#3b5449]">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span>
                              <strong>{item.quantity}x</strong> {item.product_name} ({item.unit})
                            </span>
                            <span className="font-mono font-semibold">
                              {formatNaira(item.unit_price * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Status Toggle Buttons */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f6f2] pt-3">
                    <span className="text-xs font-semibold text-[#71847b]">Status:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(['pending', 'confirmed', 'delivered', 'cancelled'] as const).map(
                        (status) => (
                          <button
                            key={status}
                            onClick={() => updateOrderStatus(order.id, status)}
                            className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${
                              order.status === status
                                ? status === 'delivered'
                                  ? 'bg-[#0b5b43] text-white'
                                  : status === 'cancelled'
                                  ? 'bg-[#b13c2e] text-white'
                                  : 'bg-[#2b5cab] text-white'
                                : 'bg-[#eff8f1] text-[#668074] hover:bg-[#d7f6e4]'
                            }`}
                          >
                            {order.status === status && <Check size={12} className="mr-1 inline" />}
                            {status}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Catalog / Products Column */}
        <section className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0b8a61]">Inventory</p>
            <h2 className="font-serif text-2xl font-bold">Catalog Management</h2>
          </div>

          {/* Add / Edit Form */}
          <form onSubmit={saveProduct} className="rounded-2xl border border-[#e2eee8] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">
                {editingId ? 'Edit Product' : 'Add New Provision'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyProduct)
                  }}
                  className="rounded-full p-1 text-[#71847b] hover:bg-[#eff8f1]"
                  aria-label="Cancel edit"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Product Name *
                  <input
                    required
                    placeholder="e.g. Mama Gold Parboiled Rice"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Category *
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Price (₦) *
                  <input
                    required
                    min="1"
                    type="number"
                    placeholder="88000"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Unit *
                  <input
                    required
                    placeholder="50kg bag, carton of 40..."
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Image URL (Optional)
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#4f665b]">
                  Short Description (Optional)
                  <input
                    placeholder="Stone-free long grain parboiled rice..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#d7e8dc] px-3.5 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#b7e9c8]"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 pt-1 text-xs font-bold text-[#10231c]">
                <input
                  type="checkbox"
                  checked={form.in_stock}
                  onChange={(e) => setForm({ ...form, in_stock: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#0b5b43]"
                />
                In Stock & Available for Order
              </label>
            </div>

            <button
              disabled={busy}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5b43] py-3 text-sm font-bold text-white transition hover:bg-[#074835] disabled:opacity-60"
            >
              {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
              {editingId ? 'Save Product Changes' : 'Add Product to Catalog'}
            </button>

            {message && (
              <p className="mt-3 rounded-xl bg-[#fdf2f0] p-3 text-xs font-semibold text-[#b13c2e]">
                {message}
              </p>
            )}
          </form>

          {/* Product Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#71847b]">
                Active Catalog ({products.length})
              </h3>
            </div>

            {products.map((product) => {
              const inStock = product.in_stock !== false
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#e2eee8] bg-white p-3 shadow-sm"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className={`h-14 w-14 rounded-xl object-cover ${
                        !inStock ? 'opacity-50 grayscale' : ''
                      }`}
                    />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-[#e9f8ed]">
                      <Package size={20} className="text-[#0b8a61]" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-[#10231c]">{product.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inStock ? 'bg-[#d7f6e4] text-[#0b5b43]' : 'bg-[#f1f3f2] text-[#71847b]'
                        }`}
                      >
                        {inStock ? 'In stock' : 'Out of stock'}
                      </span>
                    </div>
                    <p className="text-xs text-[#71847b]">
                      {formatNaira(product.price)} · {product.unit} · {product.category}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleProductStock(product)}
                      className="rounded-lg p-2 text-[#5d7068] hover:bg-[#eff8f1]"
                      title={inStock ? 'Mark out of stock' : 'Mark in stock'}
                    >
                      {inStock ? <Eye size={16} /> : <EyeOff size={16} className="text-[#b13c2e]" />}
                    </button>

                    <button
                      onClick={() => {
                        setEditingId(product.id)
                        setForm({
                          name: product.name,
                          category: product.category,
                          price: String(product.price),
                          unit: product.unit,
                          image: product.image || '',
                          description: product.description || '',
                          in_stock: inStock,
                        })
                      }}
                      className="rounded-lg p-2 text-[#5d7068] hover:bg-[#eff8f1]"
                      title={`Edit ${product.name}`}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="rounded-lg p-2 text-[#b13c2e] hover:bg-[#fdf2f0]"
                      title={`Delete ${product.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
