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
    'Mama Oche store Abuja',
    'buy food online Abuja',
  ],
  authors: [{ name: 'Mama Oche Provisions' }],
  creator: 'Mama Oche',
  publisher: 'Mama Oche Provisions',
  applicationName: 'Mama Oche',
  category: 'shopping',
  alternates: {
    canonical: baseUrl,
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: baseUrl,
    siteName: 'Mama Oche Provisions',
    title: 'Mama Oche | Fresh provisions delivered in Abuja',
    description:
      'Good food starts with good provisions. Everyday groceries, grains, and essentials delivered same-day across Abuja with pay on arrival.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85',
        width: 1200,
        height: 630,
        alt: 'Mama Oche Provisions Abuja - Fresh Groceries & Pantry Staples',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mama Oche | Fresh provisions delivered in Abuja',
    description: 'Fresh groceries & pantry staples delivered to your doorstep in Abuja with pay on arrival.',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85'],
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
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
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0b5b43' },
    { media: '(prefers-color-scheme: dark)', color: '#10231c' },
  ],
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'GroceryStore',
      '@id': `${baseUrl}/#store`,
      name: 'Mama Oche Provisions',
      url: baseUrl,
      description:
        'Fresh groceries, pantry staples, clean rice, and wholesale provisions delivered same-day across Abuja with pay on arrival.',
      telephone: '+2349034006248',
      priceRange: '₦₦',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=85',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Abuja',
        addressRegion: 'Federal Capital Territory',
        addressCountry: 'NG',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 9.0765,
        longitude: 7.3986,
      },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '08:00',
          closes: '18:00',
        },
      ],
      areaServed: [
        'Maitama',
        'Wuse',
        'Wuse 2',
        'Garki',
        'Jabi',
        'Utako',
        'Gwarinpa',
        'Apo',
        'Lokogoma',
        'Asokoro',
        'Abuja',
      ],
      paymentAccepted: 'Cash on Delivery, Instant Bank Transfer',
      currenciesAccepted: 'NGN',
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Mama Oche Provisions',
      description: 'Fresh provisions and grocery doorstep delivery across Abuja.',
      publisher: {
        '@id': `${baseUrl}/#store`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/#shop`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light-theme scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased selection:bg-[#d7f6e4] selection:text-[#0b5b43]">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
