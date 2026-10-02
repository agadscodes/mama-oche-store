export type Product = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  image: string | null
  in_stock?: boolean
  description?: string | null
}

export type CartItem = Product & { quantity: number }

export type OrderItem = {
  id?: string
  product_id: string
  product_name: string
  unit: string
  quantity: number
  unit_price: number
}

export type Order = {
  id: string
  customer_name: string
  customer_email?: string | null
  customer_phone: string
  customer_address: string
  delivery_notes?: string | null
  subtotal?: number
  delivery_fee?: number
  total: number
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  items?: OrderItem[]
  created_at: string
  updated_at?: string
}

export const PRODUCT_CATEGORIES = [
  'Grains & Staples',
  'Cooking Oils',
  'Packaged Foods',
  'Dairy & Breakfast',
  'Swallow & Flours',
  'Spices & Seasonings',
  'Household & Laundry',
] as const

export const STOREFRONT_CATEGORIES = ['All products', ...PRODUCT_CATEGORIES] as const

export const STORE_CONFIG = {
  NAME: 'Mama Oche',
  TAGLINE: 'Fresh provisions delivered with care',
  PHONE: process.env.NEXT_PUBLIC_STORE_PHONE || '09034006248',
  WHATSAPP: process.env.NEXT_PUBLIC_STORE_WHATSAPP || '2349034006248',
  EMAIL: process.env.NEXT_PUBLIC_STORE_EMAIL || 'orders@mamaoche.ng',
  LOCATION: 'Abuja, Nigeria',
  FREE_DELIVERY_THRESHOLD: 20000,
  FLAT_DELIVERY_FEE: 1000,
  HOURS: 'Mon – Sat: 8:00 AM – 7:00 PM',
} as const

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Mama Gold Parboiled Rice',
    category: 'Grains & Staples',
    price: 88000,
    unit: '50kg bag',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Clean, stone-free long grain parboiled rice suitable for everyday family meals, catering, and classic Nigerian jollof.',
  },
  {
    id: 'prod-2',
    name: 'Golden Terra Soya Oil',
    category: 'Cooking Oils',
    price: 14500,
    unit: '5 litres',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: '100% pure cholesterol-free soya oil for deep frying, stews, baking, and healthy everyday family cooking.',
  },
  {
    id: 'prod-3',
    name: 'Indomie Onion Chicken',
    category: 'Packaged Foods',
    price: 9500,
    unit: 'carton of 40',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Original savory onion-flavored instant noodles carton containing 40 individual packs for quick, delicious meals.',
  },
  {
    id: 'prod-4',
    name: 'Peak Evaporated Milk',
    category: 'Dairy & Breakfast',
    price: 4200,
    unit: 'pack of 6',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Rich and creamy full-cream evaporated milk tins packed with 28 vitamins and minerals for morning tea, oats, and cereal.',
  },
  {
    id: 'prod-5',
    name: 'Milo Refill Pack',
    category: 'Dairy & Breakfast',
    price: 5800,
    unit: '800g',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Nourishing chocolate malt energy food drink refill pack packed with Activ-Go, iron, and essential vitamins.',
  },
  {
    id: 'prod-6',
    name: 'Golden Penny Semovita',
    category: 'Swallow & Flours',
    price: 16000,
    unit: '10kg',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Smooth, easily prepared superior wheat semolina swallow that molds beautifully for egusi, ogbono, and vegetable soups.',
  },
  {
    id: 'prod-7',
    name: 'Knorr Beef Seasoning Cubes',
    category: 'Spices & Seasonings',
    price: 1200,
    unit: 'pack of 50',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Classic double-cube beef seasoning pack crafted with herbs and spices to bring deep, savory aroma to Nigerian dishes.',
  },
  {
    id: 'prod-8',
    name: 'Ariel Auto Washing Powder',
    category: 'Household & Laundry',
    price: 2800,
    unit: '1kg',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=85',
    in_stock: true,
    description: 'Deep-cleaning laundry detergent formulated for brilliant white stain removal and long-lasting fresh garden scent.',
  },
]

export const STORAGE_KEYS = {
  CART: 'mama_oche_cart_v1',
  PRODUCTS: 'mama_oche_products_v1',
  ORDERS: 'mama_oche_orders_v1',
  CUSTOMER: 'mama_oche_customer_v1',
} as const

export const formatNaira = (value: number) => `₦${Number(value || 0).toLocaleString('en-NG')}`

export function getLocalProducts(): Product[] {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PRODUCTS)
    if (!raw) return DEFAULT_PRODUCTS
    const parsed = JSON.parse(raw) as Product[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRODUCTS
  } catch {
    return DEFAULT_PRODUCTS
  }
}

export function saveLocalProducts(products: Product[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products))
  } catch {
    // ignore storage errors
  }
}

export function getLocalOrders(): Order[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.ORDERS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Order[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalOrders(orders: Order[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders))
  } catch {
    // ignore storage errors
  }
}

// WhatsApp Link Helpers
export function generateWhatsAppCartUrl(
  items: CartItem[],
  total: number,
  customer?: { name?: string; address?: string; phone?: string }
): string {
  const lines = items.map((i) => `• ${i.quantity}x ${i.name} (${i.unit}) — ${formatNaira(i.price * i.quantity)}`)
  let message = `Hello Mama Oche! 🛒\nI want to place an order in Abuja:\n\n${lines.join('\n')}\n\n*Total Due on Delivery: ${formatNaira(total)}*`

  if (customer?.name) {
    message += `\n\n*Customer Details:*`
    message += `\nName: ${customer.name}`
    if (customer.phone) message += `\nPhone: ${customer.phone}`
    if (customer.address) message += `\nAbuja Delivery Address: ${customer.address}`
  }

  return `https://wa.me/${STORE_CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppProductUrl(product: Product): string {
  const message = `Hello Mama Oche! 👋\nI want to order *${product.name}* (${product.unit}) at ${formatNaira(product.price)} for delivery in Abuja. Is this in stock?`
  return `https://wa.me/${STORE_CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`
}

export function generateWhatsAppOrderHelpUrl(orderId: string): string {
  const message = `Hello Mama Oche! 👋\nI need an update on my Abuja order *#${orderId.slice(0, 8).toUpperCase()}*. Could you please check the delivery status for me?`
  return `https://wa.me/${STORE_CONFIG.WHATSAPP}?text=${encodeURIComponent(message)}`
}
