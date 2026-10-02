import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mamaoche.ng'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Mama Oche | Fresh provisions delivered in Abuja',
    template: '%s | Mama Oche',
  },
  description:
    'Shop fresh provisions, groceries, rice, cooking oils, beverages, and pantry staples in Abuja. Fast same-day doorstep delivery with pay on arrival.',
  keywords: [
    'Mama Oche',
    'provisions Abuja',
    'groceries delivery Abuja',
    'buy rice Abuja',
    'cooking oil delivery Abuja',
    'Maitama grocery delivery',
    'Wuse market provisions',
    'Gwarinpa provisions',
    'Nigerian staples wholesale Abuja',
    'fresh food delivery Abuja',
  ],
  authors: [{ name: 'Mama Oche Provisions' }],
  creator: 'Mama Oche',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: baseUrl,
    siteName: 'Mama Oche Provisions',
    title: 'Mama Oche | Fresh provisions delivered in Abuja',
    description:
      'Good food starts with good provisions. Everyday groceries, grains, and essentials delivered same-day across Abuja.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85',
        width: 1200,
        height: 630,
        alt: 'Mama Oche Provisions Abuja',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mama Oche | Fresh provisions delivered in Abuja',
    description: 'Fresh groceries & pantry staples delivered to your doorstep in Abuja.',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b5b43' },
    { media: '(prefers-color-scheme: dark)', color: '#10231c' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light-theme scroll-smooth">
      <body className="antialiased selection:bg-[#d7f6e4] selection:text-[#0b5b43]">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
