-- ==============================================================================
-- NIRIKSHAN AI — Complete Supabase PostgreSQL Schema & Security Policies
-- ==============================================================================
-- This script sets up all tables, relations, triggers, and Row Level Security
-- (RLS) policies for Nirikshan AI in Supabase.
-- Paste this script into the Supabase Dashboard -> SQL Editor and click RUN.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. USER PROFILES TABLE (Linked with Supabase Auth auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    allergies TEXT DEFAULT '',
    health_conditions TEXT[] DEFAULT '{}',
    dietary_preference TEXT DEFAULT '',
    watchlist TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Trigger to create profile record when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. SCANS TABLE (Master scan history)
CREATE TABLE IF NOT EXISTS public.scans (
    id TEXT PRIMARY KEY, -- e.g. 'scan_1793273635433' or UUID string
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL DEFAULT 'Unknown Packaged Food',
    brand TEXT DEFAULT '',
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'UNCLEAR', 'ERROR'
    modules_requested TEXT NOT NULL DEFAULT 'both', -- 'both', 'legal_metrology', 'ingredient_safety'
    raw_extracted_text TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON public.scans(status);

-- 4. SCAN RESULTS TABLE (Rich JSON analysis findings)
CREATE TABLE IF NOT EXISTS public.scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id TEXT NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE UNIQUE,
    response_payload JSONB NOT NULL,
    health_score NUMERIC(5, 1),
    fssai_compliant BOOLEAN DEFAULT TRUE,
    legal_metrology_compliant BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON public.scan_results(scan_id);

-- 5. SCAN CORRECTIONS TABLE (User edits from OCR Review page)
CREATE TABLE IF NOT EXISTS public.scan_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id TEXT NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE UNIQUE,
    corrections JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_scan_corrections_scan_id ON public.scan_corrections(scan_id);

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_corrections ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- SCANS POLICIES
DROP POLICY IF EXISTS "Allow user and anon select scans" ON public.scans;
CREATE POLICY "Allow user and anon select scans"
    ON public.scans FOR SELECT
    USING (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Allow insert scans" ON public.scans;
CREATE POLICY "Allow insert scans"
    ON public.scans FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Allow update own scans" ON public.scans;
CREATE POLICY "Allow update own scans"
    ON public.scans FOR UPDATE
    USING (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "Allow delete own scans" ON public.scans;
CREATE POLICY "Allow delete own scans"
    ON public.scans FOR DELETE
    USING (
        auth.uid() = user_id OR user_id IS NULL OR auth.role() = 'anon'
    );

-- SCAN RESULTS POLICIES
DROP POLICY IF EXISTS "Allow select scan results" ON public.scan_results;
CREATE POLICY "Allow select scan results"
    ON public.scan_results FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Allow insert scan results" ON public.scan_results;
CREATE POLICY "Allow insert scan results"
    ON public.scan_results FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow update scan results" ON public.scan_results;
CREATE POLICY "Allow update scan results"
    ON public.scan_results FOR UPDATE
    USING (TRUE);

-- SCAN CORRECTIONS POLICIES
DROP POLICY IF EXISTS "Allow select scan corrections" ON public.scan_corrections;
CREATE POLICY "Allow select scan corrections"
    ON public.scan_corrections FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Allow upsert scan corrections" ON public.scan_corrections;
CREATE POLICY "Allow upsert scan corrections"
    ON public.scan_corrections FOR INSERT
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow update scan corrections" ON public.scan_corrections;
CREATE POLICY "Allow update scan corrections"
    ON public.scan_corrections FOR UPDATE
    USING (TRUE);

-- 7. STORAGE BUCKET FOR LABEL IMAGES (Optional if image upload is enabled)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-labels', 'food-labels', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to food-labels" ON storage.objects;
CREATE POLICY "Public access to food-labels"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'food-labels');

DROP POLICY IF EXISTS "Public upload to food-labels" ON storage.objects;
CREATE POLICY "Public upload to food-labels"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'food-labels');
