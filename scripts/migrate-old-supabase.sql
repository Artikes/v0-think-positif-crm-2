-- ============================================================
-- Migration script for old Supabase instance (tykxjwzbvpfnllrdgokk)
-- Run this in your Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add missing columns to trainers table
-- DB currently has: id, name, email, phone, speciality, notes, status
-- Code expects: first_name, last_name, email, phone, diploma_level, expertise, schools, comments
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS diploma_level TEXT DEFAULT 'bac+5';
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS expertise JSONB DEFAULT '[]'::jsonb;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS schools TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing data: copy "name" into "first_name" for existing rows
UPDATE trainers SET first_name = name WHERE first_name IS NULL AND name IS NOT NULL;
-- Copy "speciality" into expertise as a JSON array
UPDATE trainers SET expertise = jsonb_build_array(speciality) WHERE expertise = '[]'::jsonb AND speciality IS NOT NULL AND speciality != '';
-- Copy "notes" into "comments"
UPDATE trainers SET comments = notes WHERE comments IS NULL AND notes IS NOT NULL;

-- 2. Add missing columns to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS revenue NUMERIC(12,2) DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS project_name TEXT;

-- 3. Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    document_category TEXT DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (use DO block to avoid errors if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view all documents') THEN
    CREATE POLICY "Users can view all documents" ON documents FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can insert documents') THEN
    CREATE POLICY "Users can insert documents" ON documents FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can update documents') THEN
    CREATE POLICY "Users can update documents" ON documents FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can delete documents') THEN
    CREATE POLICY "Users can delete documents" ON documents FOR DELETE USING (true);
  END IF;
END $$;

-- 5. Create documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Create storage policies (use DO block to avoid errors if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can upload documents') THEN
    CREATE POLICY "Anyone can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can view documents') THEN
    CREATE POLICY "Anyone can view documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can update documents') THEN
    CREATE POLICY "Anyone can update documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Anyone can delete documents') THEN
    CREATE POLICY "Anyone can delete documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents');
  END IF;
END $$;

-- Done! All tables and storage are now ready.
