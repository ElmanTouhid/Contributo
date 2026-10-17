-- ====================================================================
-- CONTRIBUTO: CORRECTED IDEMPOTENT SUPABASE PUBLIC MIGRATION
-- Compatible with actual schema:
--   public.registered_students (user_id uuid, student_id text, email text, display_name text, created_at timestamptz)
--   public.youtube_resources (id text, course_id text, segment_id text, youtube_url text, ...)
--   public.file_resources (id text, course_id text, segment_id text, file_path text, ...)
--   public.reports (id text, resource_kind text, resource_id text, reporter_id text, reason text, ...)
--   storage.objects (bucket: course-files)
--
-- Instructions:
-- 1. Review this entire SQL script carefully.
-- 2. Open your Supabase Project Dashboard -> SQL Editor.
-- 3. Paste and run this script.
--
-- Key Design & Security Guarantees:
-- 1. NO UNRESTRICTED UPDATE ACCESS:
--    All UPDATE policies on registered_students are removed. Anonymous visitors
--    cannot modify any student's record.
-- 2. PRIVACY & DATA LEAKAGE PREVENTION:
--    register_public_student() checks if email or student ID already exists.
--    If an email or student ID is already registered, it raises an exception
--    and DOES NOT return another student's email, student ID, or profile.
--    It NEVER modifies an existing student's record.
-- 3. REMOVAL OF UNVERIFIABLE UUID ENDPOINTS:
--    get_student_profile() and update_student_display_name() are dropped because
--    a client-supplied UUID does not prove ownership in a system without Supabase Auth.
-- 4. RESOURCE OWNERSHIP & ANTI-DESTRUCTION:
--    Neither anonymous visitors nor authenticated users can delete resources
--    belonging to other people. Authenticated deletion is strictly restricted to
--    own resources ((auth.uid())::text = contributor_id). Anonymous deletion is
--    disabled at the database level to prevent vandalism.
-- 5. PRESERVATION OF EXISTING DATA:
--    Zero tables dropped. Zero rows truncated. All existing registrations,
--    YouTube links, uploaded files, courses, and 55 segments are preserved.
-- 6. NO UNRELATED CONSTRAINT DROPS:
--    Unrelated check constraints are kept intact. Only legacy domain-enforcing
--    constraints (checking @iiuc.ac.bd) are selectively dropped.
-- 7. PRE-INDEX DUPLICATE VERIFICATION:
--    Checks for existing duplicates before enforcing unique indexes on
--    email and student_id.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SCHEMA ALIGNMENT: public.registered_students
-- --------------------------------------------------------------------

-- Ensure registered_students table exists
CREATE TABLE IF NOT EXISTS public.registered_students (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Idempotently adapt legacy column 'university_email' to 'email' if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'registered_students' 
      AND column_name = 'university_email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'registered_students' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.registered_students RENAME COLUMN university_email TO email;
  END IF;
END $$;

-- Ensure all target columns exist on registered_students
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS student_id text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Ensure user_id column default is gen_random_uuid()
ALTER TABLE public.registered_students ALTER COLUMN user_id SET DEFAULT gen_random_uuid();

-- Drop ONLY legacy foreign key constraints that reference auth.users
-- This disconnects registered_students from Supabase Auth while preserving app data
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'registered_students'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  ) LOOP
    EXECUTE 'ALTER TABLE public.registered_students DROP CONSTRAINT IF EXISTS ' || quote_ident(fk.constraint_name);
  END LOOP;
END $$;

-- Selectively drop ONLY legacy domain check constraints (e.g. enforcing @iiuc.ac.bd)
-- Does NOT drop unrelated check constraints or NOT NULL constraints
DO $$
DECLARE
  ck RECORD;
BEGIN
  FOR ck IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'registered_students'
      AND con.contype = 'c'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%iiuc.ac.bd%'
        OR con.conname ILIKE '%university_email%'
        OR con.conname ILIKE '%iiuc%'
      )
  ) LOOP
    EXECUTE 'ALTER TABLE public.registered_students DROP CONSTRAINT IF EXISTS ' || quote_ident(ck.conname);
  END LOOP;
END $$;

-- Verify duplicate email or student_id values before creating unique indexes
DO $$
DECLARE
  v_dup_emails int;
  v_dup_student_ids int;
BEGIN
  SELECT COUNT(*) INTO v_dup_emails
  FROM (
    SELECT LOWER(TRIM(email))
    FROM public.registered_students
    WHERE email IS NOT NULL AND TRIM(email) <> ''
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) e;

  SELECT COUNT(*) INTO v_dup_student_ids
  FROM (
    SELECT UPPER(TRIM(student_id))
    FROM public.registered_students
    WHERE student_id IS NOT NULL AND TRIM(student_id) <> ''
    GROUP BY UPPER(TRIM(student_id))
    HAVING COUNT(*) > 1
  ) s;

  IF v_dup_emails > 0 OR v_dup_student_ids > 0 THEN
    RAISE NOTICE 'Pre-index validation notice: Found % duplicate email group(s) and % duplicate student ID group(s) in registered_students. If index creation fails, resolve existing duplicate rows before enforcing uniqueness.', v_dup_emails, v_dup_student_ids;
  END IF;
END $$;

-- Drop legacy index on university_email if it exists
DROP INDEX IF EXISTS public.registered_students_university_email_idx;

-- Create unique indexes on email and student_id to prevent duplicates going forward
CREATE UNIQUE INDEX IF NOT EXISTS registered_students_email_idx
  ON public.registered_students (LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS registered_students_student_id_idx
  ON public.registered_students (UPPER(TRIM(student_id)));

-- --------------------------------------------------------------------
-- 2. SCHEMA ALIGNMENT: RESOURCE TABLES & REPORTS
-- (Ensure all required columns exist, preserving all data & relations)
-- --------------------------------------------------------------------

-- youtube_resources
CREATE TABLE IF NOT EXISTS public.youtube_resources (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  segment_id text NOT NULL,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  resource_type text NOT NULL DEFAULT 'video',
  title text NOT NULL,
  topic text NOT NULL,
  description text DEFAULT '',
  contributor_id text NOT NULL DEFAULT 'student',
  contributor_name text NOT NULL DEFAULT 'Student',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS course_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS segment_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS youtube_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS resource_type text DEFAULT 'video';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS contributor_id text DEFAULT 'student';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS contributor_name text DEFAULT 'Student';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- file_resources
CREATE TABLE IF NOT EXISTS public.file_resources (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  segment_id text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text DEFAULT '',
  contributor_id text NOT NULL DEFAULT 'student',
  contributor_name text NOT NULL DEFAULT 'Student',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS id text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS course_id text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS segment_id text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_size bigint DEFAULT 0;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS contributor_id text DEFAULT 'student';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS contributor_name text DEFAULT 'Student';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- reports
CREATE TABLE IF NOT EXISTS public.reports (
  id text PRIMARY KEY,
  resource_kind text NOT NULL,
  resource_id text NOT NULL,
  reporter_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS id text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_kind text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_id text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_id text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Drop legacy foreign keys pointing to auth.users if any exist on resource tables
DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN (
    SELECT tc.constraint_name, tc.table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('youtube_resources', 'file_resources', 'reports')
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
  ) LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(fk.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(fk.constraint_name);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 3. EXPLICIT TABLE & SCHEMA GRANTS
-- --------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public resource sharing grants:
GRANT SELECT, INSERT ON TABLE public.youtube_resources TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.file_resources TO anon, authenticated;
GRANT INSERT ON TABLE public.reports TO anon, authenticated;

-- For registered_students:
-- Grant INSERT so new registrations can be stored.
-- DO NOT grant SELECT, UPDATE, or DELETE to anon or authenticated.
-- This protects student privacy and stops unauthorized row updates.
GRANT INSERT ON TABLE public.registered_students TO anon, authenticated;

-- --------------------------------------------------------------------
-- 4. CLEAN UP ALL PREVIOUS POLICIES ACROSS TARGET TABLES
-- (Inspects pg_policies dynamically to ensure no conflicting or leaked policies remain)
-- --------------------------------------------------------------------

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all existing policies on registered_students
  FOR pol IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'registered_students'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.registered_students', pol.policyname);
  END LOOP;

  -- Drop all existing policies on youtube_resources
  FOR pol IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'youtube_resources'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.youtube_resources', pol.policyname);
  END LOOP;

  -- Drop all existing policies on file_resources
  FOR pol IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'file_resources'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.file_resources', pol.policyname);
  END LOOP;

  -- Drop all existing policies on reports
  FOR pol IN (
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reports'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname);
  END LOOP;
END $$;

-- --------------------------------------------------------------------
-- 5. RLS POLICIES FOR registered_students
-- Privacy-safe: NO SELECT for anon (prevents table scraping).
-- Safe insertion: Allows INSERT for new public registrations.
-- NO UPDATE POLICY: Closes unrestricted updates completely.
-- --------------------------------------------------------------------

ALTER TABLE public.registered_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert registered_students"
  ON public.registered_students FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 6. RLS POLICIES FOR RESOURCES & REPORTS
--
-- Ownership limitation in a no-Supabase-Auth environment:
-- Without cryptographic user sessions (Supabase Auth), anonymous visitors
-- cannot be verified or authenticated by PostgreSQL RLS. Allowing anonymous
-- DELETE would permit any visitor on the internet to delete resources belonging
-- to other students.
--
-- Therefore:
-- - All users (anon and authenticated) can browse (SELECT) and share (INSERT).
-- - Anonymous visitors CANNOT delete resources.
-- - Authenticated users can ONLY delete resources they created ((auth.uid())::text = contributor_id).
-- - Resources cannot be deleted by anyone who does not own them.
-- --------------------------------------------------------------------

-- youtube_resources
ALTER TABLE public.youtube_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read youtube_resources"
  ON public.youtube_resources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert youtube_resources"
  ON public.youtube_resources FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own youtube resources"
  ON public.youtube_resources FOR DELETE
  TO authenticated
  USING ((auth.uid())::text = contributor_id);

-- file_resources
ALTER TABLE public.file_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read file_resources"
  ON public.file_resources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert file_resources"
  ON public.file_resources FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete own file resources"
  ON public.file_resources FOR DELETE
  TO authenticated
  USING ((auth.uid())::text = contributor_id);

-- reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert reports"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 7. CLEAN UP INSECURE FUNCTIONS & DEFINE SAFE RPC ENDPOINTS
-- --------------------------------------------------------------------

-- Drop insecure legacy and UUID-based endpoints that do not verify ownership:
DROP FUNCTION IF EXISTS public.get_student_profile(uuid);
DROP FUNCTION IF EXISTS public.update_student_display_name(uuid, text);
DROP FUNCTION IF EXISTS public.register_iiuc_student(text, text, text);
DROP FUNCTION IF EXISTS public.register_student(text, text, text);

-- Secure count function: returns student count without exposing any rows or PII
CREATE OR REPLACE FUNCTION public.get_registered_student_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.registered_students;
$$;

GRANT EXECUTE ON FUNCTION public.get_registered_student_count() TO anon, authenticated;

-- Secure public registration function:
-- 1. Validates inputs.
-- 2. Checks if email or student ID already exists.
--    If an account already exists with that email or student ID:
--    - It DOES NOT return another student's email, student ID, or profile.
--    - It DOES NOT modify another student's profile.
--    - It raises a unique_violation exception (23505).
-- 3. If new, inserts the registration and returns only the newly registered record.
CREATE OR REPLACE FUNCTION public.register_public_student(
  p_email text,
  p_student_id text,
  p_display_name text,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  student_id text,
  email text,
  display_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_email text := LOWER(TRIM(p_email));
  v_norm_student_id text := UPPER(TRIM(p_student_id));
  v_norm_display_name text := TRIM(p_display_name);
  v_user_id uuid := COALESCE(p_user_id, gen_random_uuid());
  v_conflict_count int;
BEGIN
  -- Input validations
  IF v_norm_email IS NULL OR v_norm_email = '' OR v_norm_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Please provide a valid email address.' USING ERRCODE = '22000';
  END IF;

  IF v_norm_student_id IS NULL OR LENGTH(v_norm_student_id) < 2 OR LENGTH(v_norm_student_id) > 30 THEN
    RAISE EXCEPTION 'Please provide a valid student ID (2-30 characters).' USING ERRCODE = '22000';
  END IF;

  IF v_norm_display_name IS NULL OR LENGTH(v_norm_display_name) < 2 OR LENGTH(v_norm_display_name) > 50 THEN
    RAISE EXCEPTION 'Please provide a valid display name (2-50 characters).' USING ERRCODE = '22000';
  END IF;

  -- 1. Check for duplicate email or student_id
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.registered_students rs
  WHERE LOWER(TRIM(rs.email)) = v_norm_email
     OR UPPER(TRIM(rs.student_id)) = v_norm_student_id;

  IF v_conflict_count > 0 THEN
    -- Prevent leaking existing student profile or modifying existing data
    RAISE EXCEPTION 'This email address or student ID is already registered.' USING ERRCODE = '23505';
  END IF;

  -- 2. Insert and return only the newly registered student
  RETURN QUERY
  INSERT INTO public.registered_students (user_id, student_id, email, display_name, created_at)
  VALUES (v_user_id, v_norm_student_id, v_norm_email, v_norm_display_name, now())
  RETURNING 
    public.registered_students.user_id,
    public.registered_students.student_id,
    public.registered_students.email,
    public.registered_students.display_name,
    public.registered_students.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_public_student(text, text, text, uuid) TO anon, authenticated;

-- --------------------------------------------------------------------
-- 8. STORAGE BUCKET: course-files
-- --------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  true,
  15728640, -- 15MB
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ];

-- Clean up existing storage policies for course-files
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%course-files%' 
        OR policyname ILIKE '%course_files%'
        OR policyname ILIKE '%course file%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Storage policies:
-- Public can view and upload course files.
-- Deletion is restricted to authenticated owners (auth.uid() = owner); anonymous deletion is disabled.
CREATE POLICY "Allow public select course-files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'course-files');

CREATE POLICY "Allow public insert course-files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Authenticated users can delete own course-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-files' AND (auth.uid() = owner::uuid OR (auth.uid())::text = owner));

-- --------------------------------------------------------------------
-- 9. PRESERVE SYLLABUS SEGMENTS TABLE (IF PRESENT IN DB)
-- Ensures public read access to static or live segments without dropping data
-- --------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'segments'
  ) THEN
    ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow public read segments" ON public.segments;
    DROP POLICY IF EXISTS "Public read segments" ON public.segments;
    CREATE POLICY "Allow public read segments"
      ON public.segments FOR SELECT
      TO anon, authenticated
      USING (true);
    GRANT SELECT ON TABLE public.segments TO anon, authenticated;
  END IF;
END $$;

-- ====================================================================
-- MIGRATION SCRIPT END
-- ====================================================================
