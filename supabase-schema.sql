-- ===========================================
-- Bohol Jewelry Shop - Database Schema
-- Run this in your Supabase SQL Editor
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  normalized_id_number TEXT NOT NULL,
  address TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on normalized ID to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_normalized_id
  ON public.customers (normalized_id_number);

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON public.customers USING GIN (to_tsvector('english', full_name));

CREATE INDEX IF NOT EXISTS idx_customers_id_number
  ON public.customers (id_number);

-- ============================================
-- 3. ID DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.id_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL,
  id_number TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  ocr_raw_data JSONB,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_id_documents_customer
  ON public.id_documents (customer_id);

-- ============================================
-- 4. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  id_document_id UUID NOT NULL REFERENCES public.id_documents(id) ON DELETE RESTRICT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type TEXT NOT NULL DEFAULT 'other'
    CHECK (transaction_type IN ('buy', 'sell', 'pawn', 'trade', 'repair', 'other')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  items JSONB DEFAULT '[]'::jsonb,
  staff_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer
  ON public.transactions (customer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON public.transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_staff
  ON public.transactions (staff_id);

-- ============================================
-- 5. AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  staff_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  customer_id UUID,
  transaction_id UUID,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON public.audit_logs (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_staff
  ON public.audit_logs (staff_id);

-- ============================================
-- 6. UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Customers RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view customers" ON public.customers;
CREATE POLICY "Authenticated staff can view customers"
  ON public.customers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can insert customers" ON public.customers;
CREATE POLICY "Authenticated staff can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can update customers" ON public.customers;
CREATE POLICY "Authenticated staff can update customers"
  ON public.customers FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ID Documents RLS
ALTER TABLE public.id_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view id_documents" ON public.id_documents;
CREATE POLICY "Authenticated staff can view id_documents"
  ON public.id_documents FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can insert id_documents" ON public.id_documents;
CREATE POLICY "Authenticated staff can insert id_documents"
  ON public.id_documents FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Transactions RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view transactions" ON public.transactions;
CREATE POLICY "Authenticated staff can view transactions"
  ON public.transactions FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can insert transactions" ON public.transactions;
CREATE POLICY "Authenticated staff can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can update transactions" ON public.transactions;
CREATE POLICY "Authenticated staff can update transactions"
  ON public.transactions FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Audit Logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated staff can view audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated staff can view audit_logs"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated staff can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated staff can insert audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- 8. STORAGE BUCKET (run separately or via API)
-- ============================================
-- Create private bucket for ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-documents',
  'id-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "Authenticated users can upload id documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload id documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'id-documents'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can view id documents" ON storage.objects;
CREATE POLICY "Authenticated users can view id documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-documents'
    AND auth.role() = 'authenticated'
  );
