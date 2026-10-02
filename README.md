# Mama Oche Store — Fresh Groceries & Pantry Provisions (Abuja)

A modern, production-grade e-commerce web application built for **Mama Oche Groceries**, serving homes and businesses across **Abuja, Nigeria**. Designed for fast ordering, live order tracking, flexible cash or transfer on delivery, and seamless WhatsApp dispatch.

[![Next.js](https://img.shields.io/badge/Next.js-16.3.3-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture & Folder Structure](#architecture--folder-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup (Supabase)](#database-setup-supabase)
  - [Google OAuth Configuration](#google-oauth-configuration)
  - [Running the Development Server](#running-the-development-server)
- [Available Scripts](#available-scripts)
- [Store Configuration & Abuja Details](#store-configuration--abuja-details)
- [License](#license)

---

## Overview

**Mama Oche Store** provides an easy, trustworthy shopping experience for fresh groceries, pantry staples, cooking oils, grains, and household essentials. It balances full online checkout with regional commerce practices in Nigeria:
- **Cash or Bank Transfer on Delivery**: Customers inspect goods at their door before paying.
- **WhatsApp Integration**: Customers can instantly forward their basket or chat with dispatch in one tap.
- **Live Order Tracking**: Real-time progress updates from placement to dispatch and doorstep arrival.
- **User Accounts + Guest Friendly**: Authenticate via Google or Email to synchronize orders across devices, or checkout instantly as a guest.

---

## Key Features

### 🛒 Storefront & Provision Catalog
- **Category Navigation**: Filter provisions across Grains & Staples, Cooking Oils, Packaged Foods, Dairy & Breakfast, Swallow & Flours, Spices & Seasonings, and Household essentials.
- **Instant Search & Sort**: Real-time multi-field search (by title, category, or description) and sorting (Featured, Price: Low to High, Price: High to Low, Name A-Z).
- **Stock Indicators**: Visual stock status badges with Naira (`₦`) currency formatting.
- **Product Detail Modal**: Quick view with description, quantity selector, and direct WhatsApp inquiry.

### 🛍️ Basket & Cart Drawer
- **Slide-over Drawer**: Clean slide-out basket accessible from anywhere on the storefront.
- **Quantity Controls**: Increment, decrement, or remove items with automatic recalculation.
- **Persistent Cart**: Synced to `localStorage` so items remain saved across page refreshes.
- **Clear Basket**: One-click action with confirmation prompt to prevent accidental deletions.
- **Free Delivery Progress**: Dynamic threshold banner tracking how much more to add for free Abuja delivery (`₦20,000` default).

### 📍 Abuja Delivery & Checkout
- **District & Address Collection**: Street address, district (e.g. Maitama, Wuse 2, Gwarinpa, Asokoro, Jabi), and landmark fields.
- **Delivery Instructions**: Gate code, estate name, and call-before-arrival notes.
- **Payment Method**: Pay on arrival (Cash or Bank Transfer).
- **Instant Receipt**: Generates a unique tracking reference code (`#ORD-XXXX`) upon submission.

### 🔐 Authentication & Accounts
- **Google OAuth**: One-click sign-in using Google Accounts via Supabase Auth and Server-Side OAuth Code Exchange (`/auth/callback`).
- **Email & Password**: Tabbed authentication modal to sign in or create an account.
- **URL Sanitization Safeguards**: Built-in `cleanSupabaseUrl` helper to prevent REST gateway concatenation errors.
- **Account Drawer**: Review customer profile, sign out, and view real-time order history.

### 📦 Live Order Tracking
- **Order Lookup**: Track any past order using Order ID reference and customer phone number.
- **Visual Progress Stepper**: 
  1. *Order Placed*
  2. *Packing / In Transit with Dispatch*
  3. *Delivered to Your Doorstep*
- **Local Fallback**: Automatically caches orders locally so offline and guest users can track immediately.

### 💬 WhatsApp Commerce
- **Order via WhatsApp**: Formats full basket with itemized breakdown, address, and total directly into a WhatsApp message.
- **Dispatch Support**: Instant contact link with Abuja dispatch team via `09034006248`.

### 🛡️ Store Admin Portal (`/admin`)
- **Protected Management Area**: Dashboard for the store manager to view inbound orders, update statuses (`pending`, `confirmed`, `delivered`, `cancelled`), and manage catalog inventory.

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Next.js 16** | App Router, Server Components, Route Handlers, Turbopack |
| **React 19** | Concurrent UI library, client hooks |
| **TypeScript 5.7** | Strict type safety across storefront and data layers |
| **Tailwind CSS 4** | Modern responsive styling with custom color tokens |
| **Lucide React** | Clean UI icons |
| **Supabase** | Managed PostgreSQL database, GoTrue Auth, Row Level Security |
| **@supabase/ssr** | Cookie-based session management for Next.js App Router |

---

## Architecture & Folder Structure

```plaintext
mama-oche/
├── app/
│   ├── admin/               # Store Admin Portal (orders & catalog management)
│   ├── api/
│   │   └── orders/
│   │       └── track/       # Server route handler for live order tracking
│   ├── auth/
│   │   └── callback/        # Supabase OAuth server-side code exchange route
│   ├── globals.css          # Tailwind CSS directives & custom styling
│   ├── layout.tsx           # Root layout with fonts, metadata, and analytics
│   └── page.tsx             # Main storefront (hero, catalog, basket, account)
├── components/
│   ├── auth-modal.tsx       # Authentication modal (Google OAuth & Email tabs)
│   └── ui/                  # Reusable UI primitives
├── lib/
│   ├── store-data.ts        # Default products, config, helpers & Naira formatting
│   └── supabase/
│       ├── admin.ts         # Server-side Supabase client (service role)
│       └── client.ts        # Browser Supabase client & URL sanitization
├── public/                  # Static assets and images
├── supabase/
│   ├── functions/checkout/  # Deno Edge Function for serverless order processing
│   └── schema.sql           # Database tables, RLS security policies, and seed data
├── .env.example             # Template for required environment variables
├── .gitignore               # Ignored files (protects credentials and builds)
├── next.config.mjs          # Next.js configuration
├── package.json             # Scripts and dependencies
└── tsconfig.json            # TypeScript configuration
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.18 or higher (v20+ recommended)
- **pnpm**: v9 or higher (or npm / yarn)
- **Supabase Account**: (Free tier at [supabase.com](https://supabase.com))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mama-oche-store.git
   cd mama-oche-store
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Environment Variables

Copy `.env.example` to create your local `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Supabase (Get from https://supabase.com/dashboard -> Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Store Configuration (Abuja, Nigeria)
NEXT_PUBLIC_STORE_PHONE=09034006248
NEXT_PUBLIC_STORE_WHATSAPP=2349034006248
NEXT_PUBLIC_STORE_EMAIL=orders@mamaoche.ng
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> [!IMPORTANT]
> Ensure `NEXT_PUBLIC_SUPABASE_URL` does **not** include `/rest/v1/` at the end. The app includes built-in sanitization (`cleanSupabaseUrl`), but keeping the clean root URL (`https://<ref>.supabase.co`) is best practice.

### Database Setup (Supabase)

1. Open your project on the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor**.
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and paste them into the editor.
4. Click **Run**. This will create:
   - `products`: Catalog items with prices, categories, units, and images.
   - `orders`: Order submissions with customer details, address, and delivery notes.
   - `profiles`: User profile table linked to Supabase Auth.
   - Row Level Security (RLS) policies allowing public browsing and user order ownership.
   - Starter provision seeds (Mama Gold Rice, Golden Terra Oil, Golden Penny Semovita, etc.).

### Google OAuth Configuration

1. In Supabase Dashboard, go to **Authentication** → **Providers** → **Google**.
2. Enable Google and enter your Google OAuth **Client ID** and **Client Secret** (from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
3. In Google Cloud Console, add Supabase's callback URL to **Authorized redirect URIs**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
4. In Supabase Dashboard, go to **Authentication** → **URL Configuration**:
   - **Site URL**: `http://localhost:3000` (or your production domain).
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback` and `https://your-domain.com/auth/callback`.

### Running the Development Server

Start the local server with Turbopack:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js development server with Turbopack |
| `pnpm build` | Compiles the production build |
| `pnpm start` | Launches the production server |
| `pnpm tsc --noEmit` | Runs TypeScript compiler checks without emitting files |

---

## Store Configuration & Abuja Details

- **Store Name**: Mama Oche Provisions
- **Operating Location**: Abuja, Federal Capital Territory, Nigeria
- **Dispatch Phone**: `08034006248`
- **WhatsApp Support**: `+2348034006248`
- **Official Email**: `orders@mamaoche.ng`
- **Delivery Policy**: Flat `₦1,000` delivery across Abuja; **FREE delivery** on orders of `₦20,000` and above.
- **Payment Method**: Cash on delivery or instant bank transfer upon delivery inspection.

---

## License

This project is licensed under the [MIT License](LICENSE).
