# Bohol Jewelry — Transaction Management System

A staff-facing Next.js web application for recording customer transactions
at a jewelry shop, with government ID verification.

## Features

- **Staff Authentication** — Login/logout with Supabase Auth
- **ID Upload & OCR** — Photo/upload government IDs, AI-powered extraction using Gemini 1.5 Flash
- **Customer Management** — Search, create, and manage customer records with ID verification
- **Transaction Recording** — Multi-step workflow: Upload → Extract → Review → Confirm → Save
- **Returning Customer Detection** — Automatic matching by ID number to prevent duplicates
- **Private ID Storage** — Government IDs stored in private Supabase Storage (never public)
- **Audit Logging** — All actions logged with staff identity
- **Mobile-First UI** — Responsive design optimized for phones, tablets, and desktop

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** + Custom design system
- **Supabase** — PostgreSQL, Auth, Private Storage
- **Google Gemini 1.5 Flash** — OCR/AI extraction (free tier)
- **Lucide React** — Icons

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OCR_PROVIDER=gemini
OCR_API_KEY=your-gemini-api-key
```

### 3. Run Database Schema

Open the Supabase SQL Editor and run the contents of `supabase-schema.sql`.

This creates:
- `profiles` table (linked to auth.users)
- `customers` table
- `id_documents` table
- `transactions` table
- `audit_logs` table
- Row Level Security policies
- Private `id-documents` storage bucket

### 4. Create Staff Users

In the Supabase dashboard:
1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create New User**
3. Enter email and password
4. The profile will be auto-created with `role: 'staff'`

To make a user admin, update their profile in SQL:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
```

### 5. Get Gemini API Key (Free)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Add it as `OCR_API_KEY` in `.env.local`

The free tier supports 15 requests/minute, 1,500 requests/day — plenty for a jewelry shop.

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Application Routes

| Route | Description |
|-------|-------------|
| `/login` | Staff login |
| `/dashboard` | Main dashboard with stats and recent transactions |
| `/transactions` | Transaction list |
| `/transactions/new` | **New transaction workflow** (Upload → Extract → Review → Save) |
| `/transactions/[id]` | Transaction details |
| `/customers` | Customer search |
| `/customers/[id]` | Customer profile with transaction history |

## Architecture

```
src/
├── app/
│   ├── (protected)/          # Auth-required routes
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   └── customers/
│   ├── api/
│   │   └── id-image/         # Secure private image serving
│   ├── auth/callback/
│   └── login/
├── components/
│   ├── transaction/          # Multi-step workflow components
│   │   ├── id-upload-step.tsx
│   │   ├── extraction-step.tsx
│   │   ├── review-step.tsx
│   │   └── success-step.tsx
│   ├── app-shell.tsx
│   └── id-image-viewer.tsx
└── lib/
    ├── actions/              # Server Actions (business logic)
    ├── ocr/                  # OCR provider abstraction
    │   ├── provider.ts       # Interface
    │   ├── gemini-provider.ts
    │   ├── mock-provider.ts
    │   └── index.ts
    ├── supabase/             # Supabase client factories
    └── utils.ts              # Utilities
```

## Security

- All routes protected by authentication middleware
- Government ID images stored in **private** Supabase Storage
- Service role key only used server-side (never exposed to browser)
- Row Level Security enabled on all tables
- ID numbers masked in UI display
- Audit logging on customer/transaction creation
- Private images served through authenticated API route with no-cache headers

## Cost

**$0/month** on free tiers:
- Supabase Free: 500MB DB, 1GB Storage, 50K MAU
- Gemini 1.5 Flash Free: 15 RPM, 1,500 RPD
