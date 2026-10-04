import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mama Oche Provisions Abuja',
    short_name: 'Mama Oche',
    description:
      'Good food starts with good provisions. Everyday groceries, grains, and pantry staples delivered same-day across Abuja with pay on arrival.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#fbfdfb',
    theme_color: '#0b5b43',
    orientation: 'portrait',
    scope: '/',
    categories: ['shopping', 'food', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

