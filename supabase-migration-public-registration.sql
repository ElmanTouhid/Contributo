-- ============================================================================
-- CONTRIBUTO: COMPLETE IDEMPOTENT SUPABASE MIGRATION
-- Schema: Public Worldwide Registration & Academic Resource Sharing (No Supabase Auth)
-- Target Platform: Supabase PostgreSQL + Vercel SPA
--
-- ARCHITECTURE & OWNERSHIP LIMITATION NOTICE:
-- Contributo operates without user authentication (no passwords, OTPs, magic links,
-- or Supabase Auth). Consequently, contributor_name, contributor_id, reporter_id,
-- and voter tokens are unverified client inputs.
-- Because unauthenticated client identifiers cannot cryptographically prove ownership,
-- this architecture intentionally prohibits public visitors from editing or deleting
-- existing resources. Public visitors may browse active resources, submit new resources
-- and reports, and mark resources helpful. Resource modification or removal is reserved
-- exclusively for verified database administrators.
--
-- TRANSACTIONAL BEHAVIOR & ROLLBACK:
-- Enclosed entirely within BEGIN ... COMMIT. In PostgreSQL, DDL and DML operations
-- (table creation, column alterations, trigger definitions, function installations,
-- RLS policies, and GRANT/REVOKE commands) are fully transactional. If any pre-flight
-- invariant check or schema reconciliation fails, the entire transaction rolls back
-- atomically, leaving live tables, storage, and data unaltered.
--
-- DEPLOYMENT PREREQUISITES & NON-TRANSACTIONAL CONSIDERATIONS:
-- 1. Installing "pgcrypto" requires database owner / superuser privileges.
-- 2. DDL acquires ACCESS EXCLUSIVE locks on target relations; ensure no long-running
--    uncommitted client transactions are active when running migration.
-- 3. Storage bucket operations require appropriate privileges on the "storage" schema.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: EXTENSIONS & BASE TABLES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: public.registered_students
-- Private table for worldwide usage counting. Direct access denied to all public roles.
CREATE TABLE IF NOT EXISTS public.registered_students (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. Table: public.youtube_resources
CREATE TABLE IF NOT EXISTS public.youtube_resources (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  segment_id text NOT NULL,
  title text NOT NULL,
  youtube_url text,
  url text,
  youtube_id text,
  topic text,
  description text,
  resource_type text NOT NULL DEFAULT 'video',
  contributor_name text NOT NULL DEFAULT 'Student',
  contributor_id text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'active',
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Table: public.file_resources
CREATE TABLE IF NOT EXISTS public.file_resources (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  segment_id text NOT NULL,
  title text NOT NULL,
  file_path text,
  file_url text,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint,
  description text,
  contributor_name text NOT NULL DEFAULT 'Student',
  contributor_id text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'active',
  helpful_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Table: public.reports
CREATE TABLE IF NOT EXISTS public.reports (
  id text PRIMARY KEY,
  resource_id text NOT NULL,
  resource_kind text,
  resource_type text,
  reason text NOT NULL,
  description text,
  reporter_id text NOT NULL DEFAULT 'anonymous',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Table: public.resource_helpful_votes
-- Rate-latching table accessed exclusively by increment_resource_helpful() RPC.
-- Composite primary key (resource_kind, resource_id, voter_hash) acts as the final concurrency latch.
CREATE TABLE IF NOT EXISTS public.resource_helpful_votes (
  resource_kind text NOT NULL,
  resource_id text NOT NULL,
  voter_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_kind, resource_id, voter_hash)
);

-- ============================================================================
-- SECTION 2: READ-ONLY PRE-FLIGHT INVARIANT & ANOMALY CHECKS
-- Validates table columns, data types, bucket settings, and existing records before changes occur.
-- Halts migration immediately if existing schema has incompatible data types,
-- duplicate student registrations, conflicting legacy rows, ambiguous votes, or broad storage policies.
-- Does NOT delete, truncate, or alter any records automatically.
-- ============================================================================

DO $$
DECLARE
  v_dup_email_count integer := 0;
  v_dup_student_id_count integer := 0;
  v_dup_email_sample text := '';
  v_dup_id_sample text := '';
  v_col_type text;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. Validate public.registered_students
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registered_students') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'user_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students exists but is missing column "user_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'student_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students exists but is missing column "student_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'email') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students exists but is missing column "email".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'display_name') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students exists but is missing column "display_name".';
    END IF;

    -- Validate user_id column type (must be uuid)
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'user_id';

    IF v_col_type != 'uuid' THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students column "user_id" must be type "uuid", found "%".', v_col_type;
    END IF;

    -- Validate email and student_id column types (must be string/character for lower/upper/trim)
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'email';
    IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students column "email" must be string/text type, found "%".', v_col_type;
    END IF;

    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'student_id';
    IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students column "student_id" must be string/text type, found "%".', v_col_type;
    END IF;

    -- Validate created_at column type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'created_at';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students column "created_at" exists with incompatible data type "%" (expected timestamp).', v_col_type;
    END IF;

    -- Duplicate email check (Read-Only)
    SELECT COUNT(*), string_agg(lower_email, ', ' ORDER BY lower_email)
    INTO v_dup_email_count, v_dup_email_sample
    FROM (
      SELECT lower(trim(email)) AS lower_email
      FROM public.registered_students
      WHERE email IS NOT NULL AND trim(email) != ''
      GROUP BY lower(trim(email))
      HAVING count(*) > 1
      LIMIT 5
    ) t;

    IF v_dup_email_count > 0 THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % duplicate email address group(s) in public.registered_students (samples: %). Resolve duplicate records before applying unique indexes.', v_dup_email_count, v_dup_email_sample;
    END IF;

    -- Duplicate student ID check (Read-Only)
    SELECT COUNT(*), string_agg(upper_id, ', ' ORDER BY upper_id)
    INTO v_dup_student_id_count, v_dup_id_sample
    FROM (
      SELECT upper(trim(student_id)) AS upper_id
      FROM public.registered_students
      WHERE student_id IS NOT NULL AND trim(student_id) != ''
      GROUP BY upper(trim(student_id))
      HAVING count(*) > 1
      LIMIT 5
    ) t;

    IF v_dup_student_id_count > 0 THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % duplicate student_id group(s) in public.registered_students (samples: %). Resolve duplicate records before applying unique indexes.', v_dup_student_id_count, v_dup_id_sample;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. Validate public.youtube_resources
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'youtube_resources') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources exists but is missing column "id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'course_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources exists but is missing column "course_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'segment_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources exists but is missing column "segment_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'title') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources exists but is missing column "title".';
    END IF;

    -- Validate helpful_count data type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'helpful_count';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('integer', 'smallint', 'bigint', 'numeric') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources column "helpful_count" exists with incompatible data type "%" (expected integer/numeric).', v_col_type;
    END IF;

    -- Validate created_at data type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'created_at';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources column "created_at" exists with incompatible data type "%" (expected timestamp).', v_col_type;
    END IF;

    -- Check for conflicting non-empty youtube_url vs url values if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'youtube_url')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'url') THEN
      DECLARE
        v_conflicting_url_count integer := 0;
        v_conflicting_url_sample text := '';
      BEGIN
        EXECUTE 'SELECT count(*), string_agg(id, '', '') FROM ('
             || '  SELECT id FROM public.youtube_resources '
             || '  WHERE youtube_url IS NOT NULL AND trim(youtube_url) != '''' '
             || '    AND url IS NOT NULL AND trim(url) != '''' '
             || '    AND trim(youtube_url) != trim(url) '
             || '  LIMIT 5) t'
        INTO v_conflicting_url_count, v_conflicting_url_sample;

        IF v_conflicting_url_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % youtube_resource record(s) with conflicting youtube_url and url values (sample IDs: %). Resolve conflicting values before migration.', v_conflicting_url_count, v_conflicting_url_sample;
        END IF;
      END;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. Validate public.file_resources
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'file_resources') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources exists but is missing column "id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'course_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources exists but is missing column "course_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'segment_id') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources exists but is missing column "segment_id".';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'title') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources exists but is missing column "title".';
    END IF;

    -- Validate file_size data type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_size';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('bigint', 'integer', 'smallint', 'numeric') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources column "file_size" exists with incompatible data type "%" (expected bigint/integer).', v_col_type;
    END IF;

    -- Validate helpful_count data type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'helpful_count';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('integer', 'smallint', 'bigint', 'numeric') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources column "helpful_count" exists with incompatible data type "%" (expected integer/numeric).', v_col_type;
    END IF;

    -- Validate created_at data type if present
    SELECT data_type INTO v_col_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'created_at';
    IF v_col_type IS NOT NULL AND v_col_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources column "created_at" exists with incompatible data type "%" (expected timestamp).', v_col_type;
    END IF;

    -- Check for conflicting non-empty file_path vs file_url values if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_path')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_url') THEN
      DECLARE
        v_conflicting_path_count integer := 0;
        v_conflicting_path_sample text := '';
      BEGIN
        EXECUTE 'SELECT count(*), string_agg(id, '', '') FROM ('
             || '  SELECT id FROM public.file_resources '
             || '  WHERE file_path IS NOT NULL AND trim(file_path) != '''' '
             || '    AND file_url IS NOT NULL AND trim(file_url) != '''' '
             || '    AND trim(file_path) != trim(file_url) '
             || '  LIMIT 5) t'
        INTO v_conflicting_path_count, v_conflicting_path_sample;

        IF v_conflicting_path_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % file_resource record(s) with conflicting file_path and file_url values (sample IDs: %). Resolve conflicting values before migration.', v_conflicting_path_count, v_conflicting_path_sample;
        END IF;
      END;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 4. Validate public.reports
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reports') THEN
    DECLARE
      v_invalid_report_count integer := 0;
      v_invalid_report_sample text := '';
      v_conflicting_report_count integer := 0;
      v_conflicting_report_sample text := '';
      v_has_kind boolean := false;
      v_has_type boolean := false;
      v_query text;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_kind'
      ) INTO v_has_kind;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_type'
      ) INTO v_has_type;

      -- Neither column exists
      IF NOT v_has_kind AND NOT v_has_type THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.reports exists but has neither "resource_kind" nor "resource_type" column.';
      END IF;

      -- Validate created_at data type if present
      SELECT data_type INTO v_col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'created_at';
      IF v_col_type IS NOT NULL AND v_col_type NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.reports column "created_at" exists with incompatible data type "%" (expected timestamp).', v_col_type;
      END IF;

      -- Case A: Both columns exist
      IF v_has_kind AND v_has_type THEN
        -- Check for conflicting non-empty values
        v_query := 'SELECT count(*), string_agg(id || '' (kind='' || coalesce(resource_kind, ''null'') || '', type='' || coalesce(resource_type, ''null'') || '')'', '', '') '
                || 'FROM ('
                || '  SELECT id, resource_kind, resource_type FROM public.reports '
                || '  WHERE resource_kind IS NOT NULL AND trim(resource_kind) != '''' '
                || '    AND resource_type IS NOT NULL AND trim(resource_type) != '''' '
                || '    AND lower(trim(resource_kind)) != lower(trim(resource_type)) '
                || '  LIMIT 5'
                || ') t';
        EXECUTE v_query INTO v_conflicting_report_count, v_conflicting_report_sample;

        IF v_conflicting_report_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % report record(s) with conflicting resource_kind and resource_type (samples: %). Resolve conflicting rows before applying strict validation.', v_conflicting_report_count, v_conflicting_report_sample;
        END IF;

        -- Check for invalid or missing resource types across both columns
        v_query := 'SELECT count(*), string_agg(id, '', '') '
                || 'FROM ('
                || '  SELECT id FROM public.reports '
                || '  WHERE ('
                || '    (resource_kind IS NULL OR trim(resource_kind) = '''') AND '
                || '    (resource_type IS NULL OR trim(resource_type) = '''')'
                || '  ) OR ('
                || '    resource_kind IS NOT NULL AND trim(resource_kind) != '''' AND '
                || '    lower(trim(resource_kind)) NOT IN (''youtube'', ''file'')'
                || '  ) OR ('
                || '    resource_type IS NOT NULL AND trim(resource_type) != '''' AND '
                || '    lower(trim(resource_type)) NOT IN (''youtube'', ''file'')'
                || '  ) '
                || '  LIMIT 5'
                || ') t';
        EXECUTE v_query INTO v_invalid_report_count, v_invalid_report_sample;

      -- Case B: Only resource_type exists
      ELSIF v_has_type AND NOT v_has_kind THEN
        v_query := 'SELECT count(*), string_agg(id, '', '') '
                || 'FROM ('
                || '  SELECT id FROM public.reports '
                || '  WHERE resource_type IS NULL OR trim(resource_type) = '''' '
                || '     OR lower(trim(resource_type)) NOT IN (''youtube'', ''file'') '
                || '  LIMIT 5'
                || ') t';
        EXECUTE v_query INTO v_invalid_report_count, v_invalid_report_sample;

      -- Case C: Only resource_kind exists
      ELSIF v_has_kind AND NOT v_has_type THEN
        v_query := 'SELECT count(*), string_agg(id, '', '') '
                || 'FROM ('
                || '  SELECT id FROM public.reports '
                || '  WHERE resource_kind IS NULL OR trim(resource_kind) = '''' '
                || '     OR lower(trim(resource_kind)) NOT IN (''youtube'', ''file'') '
                || '  LIMIT 5'
                || ') t';
        EXECUTE v_query INTO v_invalid_report_count, v_invalid_report_sample;
      END IF;

      IF v_invalid_report_count > 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % report record(s) with invalid or missing resource type (must be "youtube" or "file") (sample IDs: %). Resolve invalid records before applying strict validation.', v_invalid_report_count, v_invalid_report_sample;
      END IF;
    END;
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. Validate public.resource_helpful_votes (Schema-Aware & Data Integrity)
  -- --------------------------------------------------------------------------
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes') THEN
    DECLARE
      v_invalid_count integer := 0;
      v_sample text := '';
      v_has_kind_col boolean := false;
      v_has_hash_col boolean := false;
      v_has_token_col boolean := false;
    BEGIN
      -- A. Verify resource_id column exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'resource_id'
      ) THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.resource_helpful_votes exists but is missing column "resource_id".';
      END IF;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'resource_kind'
      ) INTO v_has_kind_col;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'voter_hash'
      ) INTO v_has_hash_col;

      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'voter_token'
      ) INTO v_has_token_col;

      IF NOT v_has_hash_col AND NOT v_has_token_col THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.resource_helpful_votes exists but has neither "voter_hash" nor "voter_token" column.';
      END IF;

      -- B. Check for NULL or blank voter_hash if column exists
      IF v_has_hash_col THEN
        SELECT count(*), string_agg(resource_id, ', ')
        INTO v_invalid_count, v_sample
        FROM (
          SELECT resource_id
          FROM public.resource_helpful_votes
          WHERE voter_hash IS NULL OR trim(voter_hash) = ''
          LIMIT 5
        ) t;

        IF v_invalid_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % vote record(s) with NULL or blank voter_hash (sample resource IDs: %). Never silently discard or fabricate vote data. Resolve invalid records before migration.', v_invalid_count, v_sample;
        END IF;
      END IF;

      -- C. Check for NULL or blank voter_token in legacy rows if voter_hash is missing
      IF v_has_token_col AND NOT v_has_hash_col THEN
        SELECT count(*), string_agg(resource_id, ', ')
        INTO v_invalid_count, v_sample
        FROM (
          SELECT resource_id
          FROM public.resource_helpful_votes
          WHERE voter_token IS NULL OR trim(voter_token) = ''
          LIMIT 5
        ) t;

        IF v_invalid_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % legacy vote record(s) with NULL or empty voter_token (sample resource IDs: %). Cannot safely derive voter_hash without manual review. Resolve invalid records before migration.', v_invalid_count, v_sample;
        END IF;
      END IF;

      -- D. Orphaned & ambiguous vote check (never delete or silently guess legacy vote data)
      IF NOT v_has_kind_col THEN
        -- Ambiguous collision: matches BOTH YouTube and File
        SELECT count(*), string_agg(resource_id, ', ')
        INTO v_invalid_count, v_sample
        FROM (
          SELECT v.resource_id
          FROM public.resource_helpful_votes v
          WHERE EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id)
            AND EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id)
          LIMIT 5
        ) t;

        IF v_invalid_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % legacy vote record(s) matching BOTH YouTube and File resources (ambiguous collision, sample IDs: %). Cannot safely determine resource_kind without manual review.', v_invalid_count, v_sample;
        END IF;

        -- Orphaned votes: matches NEITHER YouTube nor File
        SELECT count(*), string_agg(resource_id, ', ')
        INTO v_invalid_count, v_sample
        FROM (
          SELECT v.resource_id
          FROM public.resource_helpful_votes v
          WHERE NOT EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id)
            AND NOT EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id)
          LIMIT 5
        ) t;

        IF v_invalid_count > 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % orphaned legacy helpful vote record(s) matching neither YouTube nor File resources (sample IDs: %). Never silently delete or guess legacy vote data. Resolve orphaned records before migrating.', v_invalid_count, v_sample;
        END IF;
      END IF;

      -- E. Check for duplicate vote hashes before primary key rebuild
      SELECT count(*), string_agg(res_id, ', ')
      INTO v_invalid_count, v_sample
      FROM (
        SELECT resource_id AS res_id
        FROM public.resource_helpful_votes
        GROUP BY resource_id, coalesce(voter_hash, md5('contributo_helpful_salt:' || trim(voter_token)))
        HAVING count(*) > 1
        LIMIT 5
      ) t;

      IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % duplicate vote hash group(s) on same resource (sample IDs: %). Resolve duplicate votes before applying composite primary key.', v_invalid_count, v_sample;
      END IF;
    END;
  END IF;

  -- --------------------------------------------------------------------------
  -- 6. Storage Bucket Configuration Validation (course-files)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    DECLARE
      b RECORD;
      v_has_pdf boolean := false;
    BEGIN
      SELECT id, name, public, file_size_limit, allowed_mime_types
      INTO b
      FROM storage.buckets
      WHERE id = 'course-files';

      IF b.id IS NOT NULL THEN
        IF NOT b.public THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" has public = false. Academic resource sharing requires public = true for document access. Resolve bucket configuration manually before migrating.';
        END IF;

        IF b.file_size_limit IS NULL THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" has file_size_limit = NULL (unrestricted upload size). Contributo enforces a 15MB limit (15728640 bytes). Update bucket size limit manually before migration.';
        ELSIF b.file_size_limit > 15728640 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" has file_size_limit = % (exceeds maximum allowed 15MB / 15728640 bytes). Update bucket size limit manually before migration.', b.file_size_limit;
        ELSIF b.file_size_limit < 1048576 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" has file_size_limit = % (less than 1MB minimum for course documents). Review bucket size limit manually before migration.', b.file_size_limit;
        END IF;

        IF b.allowed_mime_types IS NULL OR array_length(b.allowed_mime_types, 1) = 0 THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" has unrestricted or empty allowed_mime_types. Academic file sharing requires explicit MIME filtering. Update bucket MIME types manually before migration.';
        ELSE
          SELECT ('application/pdf' = ANY(b.allowed_mime_types)) INTO v_has_pdf;
          IF NOT v_has_pdf THEN
            RAISE EXCEPTION 'PRE-FLIGHT FAILED: Existing storage bucket "course-files" allowed_mime_types does not include "application/pdf". Course resources require PDF support. Update bucket MIME types manually before migration.';
          END IF;
        END IF;
      END IF;
    END;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7. Storage Policy Pre-flight Audit on storage.objects
  -- Evaluates commands using their relevant expressions:
  --   - SELECT: evaluated using qual (with_check is not applicable to SELECT)
  --   - DELETE: evaluated using qual (public visitors must NEVER have DELETE)
  --   - INSERT: evaluated using with_check (qual is not applicable to INSERT)
  --   - UPDATE: evaluated using both qual AND with_check (public visitors must NEVER have UPDATE)
  --   - ALL: evaluated across both qual AND with_check (grants UPDATE/DELETE to public)
  -- Accounts for policy roles:
  --   - 'anon', 'authenticated', 'public', or empty/null roles (applies to all users).
  -- Fails safely when a broad policy cannot be confidently assessed.
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'objects'
  ) THEN
    DECLARE
      p RECORD;
      v_is_public_role boolean;
      v_is_broad boolean;
      v_reason text;
      v_clean_qual text;
      v_clean_check text;
    BEGIN
      FOR p IN (
        SELECT policyname, cmd, roles, qual, with_check, permissive
        FROM pg_catalog.pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects'
          AND permissive = 'PERMISSIVE'
      ) LOOP
        v_is_public_role := (
          p.roles IS NULL OR
          p.roles = '{}' OR
          'public' = ANY(p.roles) OR
          'anon' = ANY(p.roles) OR
          'authenticated' = ANY(p.roles)
        );

        IF v_is_public_role THEN
          v_is_broad := false;
          v_reason := '';
          v_clean_qual := trim(coalesce(p.qual, ''));
          v_clean_check := trim(coalesce(p.with_check, ''));

          IF p.cmd = 'SELECT' THEN
            IF v_clean_qual = '' OR v_clean_qual = 'true' THEN
              v_is_broad := true;
              v_reason := 'SELECT policy qual is unrestricted (null or true)';
            ELSIF v_clean_qual !~* 'bucket_id\s*=\s*(''course-files''|''course-files''::text)' THEN
              v_is_broad := true;
              v_reason := 'SELECT policy qual does not strictly restrict bucket_id to ''course-files''';
            END IF;

          ELSIF p.cmd = 'DELETE' THEN
            v_is_broad := true;
            IF v_clean_qual = '' OR v_clean_qual = 'true' THEN
              v_reason := 'Public role granted unrestricted DELETE on storage.objects';
            ELSE
              v_reason := 'Public role granted DELETE on storage.objects (public visitors must not delete storage files)';
            END IF;

          ELSIF p.cmd = 'INSERT' THEN
            IF v_clean_check = '' OR v_clean_check = 'true' THEN
              v_is_broad := true;
              v_reason := 'INSERT policy with_check is unrestricted (null or true)';
            ELSIF v_clean_check !~* 'bucket_id\s*=\s*(''course-files''|''course-files''::text)' THEN
              v_is_broad := true;
              v_reason := 'INSERT policy with_check does not strictly restrict bucket_id to ''course-files''';
            END IF;

          ELSIF p.cmd = 'UPDATE' THEN
            v_is_broad := true;
            v_reason := 'Public role granted UPDATE on storage.objects (public visitors must not edit storage files)';

          ELSIF p.cmd = 'ALL' THEN
            v_is_broad := true;
            IF v_clean_qual = '' OR v_clean_qual = 'true' OR v_clean_check = '' OR v_clean_check = 'true' THEN
              v_reason := 'ALL policy grants unrestricted commands with broad expressions to public on storage.objects';
            ELSE
              v_reason := 'ALL policy grants UPDATE and DELETE commands to public on storage.objects';
            END IF;

          ELSE
            v_is_broad := true;
            v_reason := format('Unrecognized storage policy command "%s"', p.cmd);
          END IF;

          IF v_is_broad AND p.policyname NOT IN (
            'Public Access for course-files',
            'Public Upload for course-files',
            'Allow select course-files',
            'Allow insert course-files',
            'Public can view course-files',
            'Public can upload course-files'
          ) THEN
            RAISE EXCEPTION 'PRE-FLIGHT FAILED: Unsafe or unverified permissive storage policy "%" detected on storage.objects (cmd=%, roles=%, reason: %). Permissive policies combine with OR logic in PostgreSQL and cannot be overridden by adding restrictive policies. Manually inspect and restrict or drop this policy before running migration.',
              p.policyname, p.cmd, p.roles, v_reason;
          END IF;
        END IF;
      END LOOP;
    END;
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: COLUMN RECONCILIATION & DATA-PRESERVING SYNCHRONIZATION
-- Reconciles missing created_at, file_size, and path columns through reviewed,
-- schema-aware, data-preserving changes.
-- Does not blindly add constraints or drop columns.
-- ============================================================================

-- 1. Reconcile registered_students
DO $$
DECLARE
  v_col_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registered_students') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.registered_students ADD COLUMN created_at timestamp with time zone DEFAULT now();
    ELSE
      SELECT data_type INTO v_col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'created_at';

      IF v_col_type = 'timestamp without time zone' THEN
        ALTER TABLE public.registered_students ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
      END IF;
    END IF;

    UPDATE public.registered_students SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE public.registered_students ALTER COLUMN created_at SET DEFAULT now();
  END IF;
END $$;

-- 2. Reconcile youtube_resources
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS course_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS segment_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS youtube_id text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS resource_type text DEFAULT 'video';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS contributor_id text DEFAULT 'student';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS contributor_name text DEFAULT 'Student';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0;
ALTER TABLE public.youtube_resources ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

DO $$
DECLARE
  v_col_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.youtube_resources ALTER COLUMN url DROP NOT NULL;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'created_at';

  IF v_col_type = 'timestamp without time zone' THEN
    ALTER TABLE public.youtube_resources ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

UPDATE public.youtube_resources SET status = 'active' WHERE status IS NULL OR trim(status) = '';
UPDATE public.youtube_resources SET helpful_count = 0 WHERE helpful_count IS NULL;
UPDATE public.youtube_resources SET created_at = now() WHERE created_at IS NULL;

UPDATE public.youtube_resources
SET youtube_url = url
WHERE (youtube_url IS NULL OR trim(youtube_url) = '') AND url IS NOT NULL AND trim(url) != '';

UPDATE public.youtube_resources
SET url = youtube_url
WHERE (url IS NULL OR trim(url) = '') AND youtube_url IS NOT NULL AND trim(youtube_url) != '';

CREATE OR REPLACE FUNCTION public.sync_youtube_resource_urls()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_yt text;
  v_u text;
BEGIN
  v_yt := trim(coalesce(NEW.youtube_url, ''));
  v_u := trim(coalesce(NEW.url, ''));

  IF v_yt != '' AND v_u != '' AND v_yt != v_u THEN
    RAISE EXCEPTION 'Conflicting values supplied for youtube_url ("%") and url ("%")', NEW.youtube_url, NEW.url
      USING ERRCODE = '22000';
  END IF;

  IF v_yt = '' AND v_u != '' THEN
    NEW.youtube_url := NEW.url;
  ELSIF v_u = '' AND v_yt != '' THEN
    NEW.url := NEW.youtube_url;
  END IF;

  IF NEW.status IS NULL OR trim(NEW.status) = '' THEN
    NEW.status := 'active';
  END IF;
  IF NEW.helpful_count IS NULL THEN
    NEW.helpful_count := 0;
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_youtube_resource_urls ON public.youtube_resources;
CREATE TRIGGER trg_sync_youtube_resource_urls
BEFORE INSERT OR UPDATE ON public.youtube_resources
FOR EACH ROW EXECUTE FUNCTION public.sync_youtube_resource_urls();

-- 3. Reconcile file_resources
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS course_id text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS segment_id text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_path text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_type text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS contributor_id text DEFAULT 'student';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS contributor_name text DEFAULT 'Student';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0;
ALTER TABLE public.file_resources ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

DO $$
DECLARE
  v_col_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_url' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.file_resources ALTER COLUMN file_url DROP NOT NULL;
  END IF;

  -- Widen file_size from integer/smallint to bigint if needed
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_size';

  IF v_col_type IN ('integer', 'smallint') THEN
    ALTER TABLE public.file_resources ALTER COLUMN file_size TYPE bigint;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'created_at';

  IF v_col_type = 'timestamp without time zone' THEN
    ALTER TABLE public.file_resources ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

UPDATE public.file_resources SET status = 'active' WHERE status IS NULL OR trim(status) = '';
UPDATE public.file_resources SET helpful_count = 0 WHERE helpful_count IS NULL;
UPDATE public.file_resources SET created_at = now() WHERE created_at IS NULL;

UPDATE public.file_resources
SET file_path = file_url
WHERE (file_path IS NULL OR trim(file_path) = '') AND file_url IS NOT NULL AND trim(file_url) != '';

UPDATE public.file_resources
SET file_url = file_path
WHERE (file_url IS NULL OR trim(file_url) = '') AND file_path IS NOT NULL AND trim(file_path) != '';

CREATE OR REPLACE FUNCTION public.sync_file_resource_paths()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_fp text;
  v_fu text;
BEGIN
  v_fp := trim(coalesce(NEW.file_path, ''));
  v_fu := trim(coalesce(NEW.file_url, ''));

  IF v_fp != '' AND v_fu != '' AND v_fp != v_fu THEN
    RAISE EXCEPTION 'Conflicting values supplied for file_path ("%") and file_url ("%")', NEW.file_path, NEW.file_url
      USING ERRCODE = '22000';
  END IF;

  IF v_fp = '' AND v_fu != '' THEN
    NEW.file_path := NEW.file_url;
  ELSIF v_fu = '' AND v_fp != '' THEN
    NEW.file_url := NEW.file_path;
  END IF;

  IF NEW.status IS NULL OR trim(NEW.status) = '' THEN
    NEW.status := 'active';
  END IF;
  IF NEW.helpful_count IS NULL THEN
    NEW.helpful_count := 0;
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_file_resource_paths ON public.file_resources;
CREATE TRIGGER trg_sync_file_resource_paths
BEFORE INSERT OR UPDATE ON public.file_resources
FOR EACH ROW EXECUTE FUNCTION public.sync_file_resource_paths();

-- 4. Reconcile reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_id text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_kind text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_type text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_id text DEFAULT 'anonymous';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

DO $$
DECLARE
  v_col_type text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_type' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reports ALTER COLUMN resource_type DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_kind' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.reports ALTER COLUMN resource_kind DROP NOT NULL;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'created_at';

  IF v_col_type = 'timestamp without time zone' THEN
    ALTER TABLE public.reports ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
  END IF;
END $$;

UPDATE public.reports
SET resource_kind = lower(trim(resource_type))
WHERE (resource_kind IS NULL OR trim(resource_kind) = '')
  AND resource_type IS NOT NULL
  AND lower(trim(resource_type)) IN ('youtube', 'file');

UPDATE public.reports
SET resource_type = lower(trim(resource_kind))
WHERE (resource_type IS NULL OR trim(resource_type) = '')
  AND resource_kind IS NOT NULL
  AND lower(trim(resource_kind)) IN ('youtube', 'file');

UPDATE public.reports SET status = 'pending' WHERE status IS NULL OR trim(status) = '';
UPDATE public.reports SET created_at = now() WHERE created_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_report_resource_types()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_kind text;
  v_type text;
  v_resolved text;
BEGIN
  v_kind := lower(trim(coalesce(NEW.resource_kind, '')));
  v_type := lower(trim(coalesce(NEW.resource_type, '')));

  IF v_kind = '' AND v_type = '' THEN
    RAISE EXCEPTION 'Report requires resource_kind or resource_type to be specified ("youtube" or "file")'
      USING ERRCODE = '22000';
  END IF;

  IF v_kind != '' AND v_kind NOT IN ('youtube', 'file') THEN
    RAISE EXCEPTION 'Invalid resource_kind "%". Allowed values are "youtube" or "file"'
      USING ERRCODE = '22000';
  END IF;

  IF v_type != '' AND v_type NOT IN ('youtube', 'file') THEN
    RAISE EXCEPTION 'Invalid resource_type "%". Allowed values are "youtube" or "file"'
      USING ERRCODE = '22000';
  END IF;

  IF v_kind != '' AND v_type != '' AND v_kind != v_type THEN
    RAISE EXCEPTION 'Conflicting values supplied for resource_kind ("%") and resource_type ("%")', NEW.resource_kind, NEW.resource_type
      USING ERRCODE = '22000';
  END IF;

  v_resolved := CASE WHEN v_kind != '' THEN v_kind ELSE v_type END;

  NEW.resource_kind := v_resolved;
  NEW.resource_type := v_resolved;

  IF NEW.status IS NULL OR trim(NEW.status) = '' THEN
    NEW.status := 'pending';
  END IF;
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_report_resource_types ON public.reports;
CREATE TRIGGER trg_sync_report_resource_types
BEFORE INSERT OR UPDATE ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.sync_report_resource_types();

-- 5. Reconcile resource_helpful_votes
-- Dynamically discovers actual primary key constraint name and column list.
-- Migrates legacy voter_token to voter_hash via server-side salt, then drops voter_token.
DO $$
DECLARE
  v_pk_conname text;
  v_pk_col_count integer;
  v_col_type text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes') THEN
    -- A. Migrate voter_token to voter_hash if voter_hash is absent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'voter_hash'
    ) THEN
      ALTER TABLE public.resource_helpful_votes ADD COLUMN voter_hash text;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'voter_token'
      ) THEN
        UPDATE public.resource_helpful_votes
        SET voter_hash = md5('contributo_helpful_salt:' || trim(voter_token))
        WHERE voter_hash IS NULL AND voter_token IS NOT NULL AND trim(voter_token) != '';
      END IF;

      ALTER TABLE public.resource_helpful_votes ALTER COLUMN voter_hash SET NOT NULL;
    END IF;

    -- Drop legacy raw voter_token column if present to ensure raw client tokens are never stored
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'voter_token'
    ) THEN
      ALTER TABLE public.resource_helpful_votes DROP COLUMN voter_token;
    END IF;

    -- B. Add resource_kind column if absent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'resource_kind'
    ) THEN
      ALTER TABLE public.resource_helpful_votes ADD COLUMN resource_kind text;

      UPDATE public.resource_helpful_votes v
      SET resource_kind = 'youtube'
      WHERE EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id);

      UPDATE public.resource_helpful_votes v
      SET resource_kind = 'file'
      WHERE EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id);

      ALTER TABLE public.resource_helpful_votes ALTER COLUMN resource_kind SET NOT NULL;
    END IF;

    -- C. Reconcile created_at column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE public.resource_helpful_votes ADD COLUMN created_at timestamp with time zone DEFAULT now();
    ELSE
      SELECT data_type INTO v_col_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'resource_helpful_votes' AND column_name = 'created_at';

      IF v_col_type = 'timestamp without time zone' THEN
        ALTER TABLE public.resource_helpful_votes ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
      END IF;
    END IF;

    UPDATE public.resource_helpful_votes SET created_at = now() WHERE created_at IS NULL;
    ALTER TABLE public.resource_helpful_votes ALTER COLUMN created_at SET DEFAULT now();

    -- D. Inspect actual primary key constraint name and column count from pg_constraint
    SELECT con.conname, array_length(con.conkey, 1)
    INTO v_pk_conname, v_pk_col_count
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'resource_helpful_votes' AND con.contype = 'p';

    -- Rebuild composite primary key (resource_kind, resource_id, voter_hash) if not already 3 columns
    IF v_pk_conname IS NOT NULL AND v_pk_col_count != 3 THEN
      EXECUTE format('ALTER TABLE public.resource_helpful_votes DROP CONSTRAINT %I', v_pk_conname);
      ALTER TABLE public.resource_helpful_votes ADD PRIMARY KEY (resource_kind, resource_id, voter_hash);
    ELSIF v_pk_conname IS NULL THEN
      ALTER TABLE public.resource_helpful_votes ADD PRIMARY KEY (resource_kind, resource_id, voter_hash);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: UNIQUE & PERFORMANCE INDEXES
-- Audits existing indexes by definition, not just by name.
-- Applied only after pre-flight duplicate checks have succeeded.
-- ============================================================================

DO $$
DECLARE
  v_has_exact_email_idx boolean := false;
  v_has_exact_id_idx boolean := false;
  v_existing_idx_def text;
BEGIN
  -- 1. Check if unique index on lower(trim(email)) already exists with correct definition
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'registered_students'
      AND indexdef ILIKE '%UNIQUE INDEX%'
      AND (
        indexdef ILIKE '%lower(btrim(email))%' OR
        indexdef ILIKE '%lower(trim(email))%' OR
        indexdef ILIKE '%lower(trim(both from email))%'
      )
  ) INTO v_has_exact_email_idx;

  IF NOT v_has_exact_email_idx THEN
    SELECT indexdef INTO v_existing_idx_def
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'registered_students'
      AND indexname = 'registered_students_email_lower_uidx';

    IF v_existing_idx_def IS NOT NULL THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Index "registered_students_email_lower_uidx" exists with incompatible definition: "%". Drop or rename it before proceeding.', v_existing_idx_def;
    ELSE
      CREATE UNIQUE INDEX registered_students_email_lower_uidx
        ON public.registered_students (lower(trim(email)));
    END IF;
  END IF;

  -- 2. Check if unique index on upper(trim(student_id)) already exists with correct definition
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'registered_students'
      AND indexdef ILIKE '%UNIQUE INDEX%'
      AND (
        indexdef ILIKE '%upper(btrim(student_id))%' OR
        indexdef ILIKE '%upper(trim(student_id))%' OR
        indexdef ILIKE '%upper(trim(both from student_id))%'
      )
  ) INTO v_has_exact_id_idx;

  IF NOT v_has_exact_id_idx THEN
    SELECT indexdef INTO v_existing_idx_def
    FROM pg_catalog.pg_indexes
    WHERE schemaname = 'public' AND tablename = 'registered_students'
      AND indexname = 'registered_students_student_id_upper_uidx';

    IF v_existing_idx_def IS NOT NULL THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Index "registered_students_student_id_upper_uidx" exists with incompatible definition: "%". Drop or rename it before proceeding.', v_existing_idx_def;
    ELSE
      CREATE UNIQUE INDEX registered_students_student_id_upper_uidx
        ON public.registered_students (upper(trim(student_id)));
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_youtube_resources_segment_created
  ON public.youtube_resources (segment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_resources_course
  ON public.youtube_resources (course_id);

CREATE INDEX IF NOT EXISTS idx_youtube_resources_segment_ytid
  ON public.youtube_resources (segment_id, youtube_id);

CREATE INDEX IF NOT EXISTS idx_file_resources_segment_created
  ON public.file_resources (segment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_resources_course
  ON public.file_resources (course_id);

CREATE INDEX IF NOT EXISTS idx_reports_resource_created
  ON public.reports (resource_id, created_at DESC);

-- ============================================================================
-- SECTION 5: ROLE PERMISSIONS & COLUMN-LEVEL ACCESS CONTROL
-- Explicitly revokes table-level AND column-level privileges to deny unauthorized access.
-- Public visitors cannot directly edit or delete resources or inspect registration/report records.
--
-- POSTGRESQL PRIVILEGE RULES & RIGOROUS COLUMN REVOCATION:
-- Column-level REVOKE permits ONLY valid column privileges: SELECT, INSERT, UPDATE, REFERENCES.
-- Table-level privileges (DELETE, TRUNCATE, TRIGGER, etc.) are revoked separately at table level.
-- Iterates over ALL user columns (attnum > 0 AND NOT attisdropped) to ensure no residual
-- or inherited column-level UPDATE or REFERENCES privileges remain.
-- ============================================================================

-- 1. registered_students:
-- Table-level and column-level privileges revoked. Registration is RPC-only.
REVOKE ALL ON TABLE public.registered_students FROM anon, authenticated, public;

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN (
    SELECT attname
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.registered_students'::regclass
      AND attnum > 0 AND NOT attisdropped
  ) LOOP
    EXECUTE format('REVOKE SELECT, INSERT, UPDATE, REFERENCES (%I) ON TABLE public.registered_students FROM anon, authenticated, public', col.attname);
  END LOOP;
END $$;

-- 2. youtube_resources:
-- Public visitors can browse (SELECT) and contribute (INSERT).
-- Table-level DELETE, TRUNCATE, TRIGGER, REFERENCES are revoked separately.
-- Column-level UPDATE and REFERENCES are explicitly revoked on all columns.
GRANT SELECT, INSERT ON TABLE public.youtube_resources TO anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.youtube_resources FROM anon, authenticated, public;

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN (
    SELECT attname
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.youtube_resources'::regclass
      AND attnum > 0 AND NOT attisdropped
  ) LOOP
    EXECUTE format('REVOKE UPDATE, REFERENCES (%I) ON TABLE public.youtube_resources FROM anon, authenticated, public', col.attname);
  END LOOP;
END $$;

-- 3. file_resources:
-- Public visitors can browse (SELECT) and contribute (INSERT).
-- Table-level DELETE, TRUNCATE, TRIGGER, REFERENCES are revoked separately.
-- Column-level UPDATE and REFERENCES are explicitly revoked on all columns.
GRANT SELECT, INSERT ON TABLE public.file_resources TO anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.file_resources FROM anon, authenticated, public;

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN (
    SELECT attname
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.file_resources'::regclass
      AND attnum > 0 AND NOT attisdropped
  ) LOOP
    EXECUTE format('REVOKE UPDATE, REFERENCES (%I) ON TABLE public.file_resources FROM anon, authenticated, public', col.attname);
  END LOOP;
END $$;

-- 4. reports:
-- Public visitors can submit reports (INSERT).
-- Table-level SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES are revoked.
-- Column-level SELECT, UPDATE, REFERENCES are revoked separately on all columns.
GRANT INSERT ON TABLE public.reports TO anon, authenticated;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON TABLE public.reports FROM anon, authenticated, public;

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN (
    SELECT attname
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.reports'::regclass
      AND attnum > 0 AND NOT attisdropped
  ) LOOP
    EXECUTE format('REVOKE SELECT, UPDATE, REFERENCES (%I) ON TABLE public.reports FROM anon, authenticated, public', col.attname);
  END LOOP;
END $$;

-- 5. resource_helpful_votes:
-- Internal rate-latching table accessed exclusively by increment_resource_helpful() RPC.
REVOKE ALL ON TABLE public.resource_helpful_votes FROM anon, authenticated, public;

DO $$
DECLARE
  col RECORD;
BEGIN
  FOR col IN (
    SELECT attname
    FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.resource_helpful_votes'::regclass
      AND attnum > 0 AND NOT attisdropped
  ) LOOP
    EXECUTE format('REVOKE SELECT, INSERT, UPDATE, REFERENCES (%I) ON TABLE public.resource_helpful_votes FROM anon, authenticated, public', col.attname);
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 6: HARDENED RPC DATABASE FUNCTIONS
-- All functions set a fixed search_path (pg_catalog, pg_temp) with fully schema-qualified references.
-- Ownership and execution permissions are explicitly revoked and granted.
-- Registration conflicts return a generic error message to prevent enumeration attacks.
-- ============================================================================

-- Primary canonical registration function:
-- Generates user_id uuid internally; performs format & duplicate validation.
-- Minimizes public exposure: returns only the newly created record for the caller's session.
-- Registration conflicts return a uniform generic message to avoid leaking whether an email or student ID is registered.
CREATE OR REPLACE FUNCTION public.register_public_student(
  p_email text,
  p_student_id text,
  p_display_name text
)
RETURNS TABLE (
  user_id uuid,
  email text,
  student_id text,
  display_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_clean_email text;
  v_clean_student_id text;
  v_clean_display_name text;
  v_user_id uuid;
  v_created_at timestamp with time zone;
  v_has_conflict boolean := false;
BEGIN
  -- 1. Input hygiene
  v_clean_email := trim(coalesce(p_email, ''));
  v_clean_student_id := trim(coalesce(p_student_id, ''));
  v_clean_display_name := trim(coalesce(p_display_name, ''));

  -- 2. Format validation
  IF length(v_clean_display_name) < 2 OR length(v_clean_display_name) > 80 THEN
    RAISE EXCEPTION 'Display name must be between 2 and 80 characters' USING ERRCODE = '22000';
  END IF;

  IF length(v_clean_student_id) < 2 OR length(v_clean_student_id) > 50 THEN
    RAISE EXCEPTION 'Student ID must be between 2 and 50 characters' USING ERRCODE = '22000';
  END IF;

  IF v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22000';
  END IF;

  -- 3. Duplicate checks returning a uniform generic error to prevent identity enumeration
  SELECT (
    EXISTS (
      SELECT 1 FROM public.registered_students
      WHERE lower(trim(registered_students.email)) = lower(v_clean_email)
    ) OR EXISTS (
      SELECT 1 FROM public.registered_students
      WHERE upper(trim(registered_students.student_id)) = upper(v_clean_student_id)
    )
  ) INTO v_has_conflict;

  IF v_has_conflict THEN
    RAISE EXCEPTION 'Registration could not be completed with the provided details. A registration already exists with this email address or student ID.' USING ERRCODE = '23505';
  END IF;

  -- 4. Secure internal ID generation & insertion
  v_user_id := gen_random_uuid();
  v_created_at := now();

  BEGIN
    INSERT INTO public.registered_students (
      user_id,
      student_id,
      email,
      display_name,
      created_at
    ) VALUES (
      v_user_id,
      v_clean_student_id,
      v_clean_email,
      v_clean_display_name,
      v_created_at
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Registration could not be completed with the provided details. A registration already exists with this email address or student ID.' USING ERRCODE = '23505';
  END;

  RETURN QUERY SELECT
    v_user_id,
    v_clean_email,
    v_clean_student_id,
    v_clean_display_name,
    v_created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_student(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_student(text, text, text) TO anon, authenticated;

-- Function: get_registered_student_count
-- Securely returns aggregate registered student count without exposing personal records.
CREATE OR REPLACE FUNCTION public.get_registered_student_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT count(*)::integer FROM public.registered_students;
$$;

REVOKE ALL ON FUNCTION public.get_registered_student_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registered_student_count() TO anon, authenticated;

-- Function: increment_resource_helpful
-- Atomic increment function with composite key (resource_kind, resource_id, voter_hash).
-- Concurrency-safe: uses ON CONFLICT DO NOTHING on the composite primary key as the final latch.
-- Under concurrent identical requests, exactly one request inserts the latch row and increments;
-- all others encounter 0 rows inserted and return the current count without double-incrementing.
CREATE OR REPLACE FUNCTION public.increment_resource_helpful(
  p_resource_id text,
  p_resource_kind text,
  p_voter_token text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_new_count integer := 0;
  v_current_count integer := 0;
  v_clean_id text;
  v_clean_kind text;
  v_clean_token text;
  v_token_hash text;
  v_rows_inserted integer := 0;
BEGIN
  v_clean_id := trim(coalesce(p_resource_id, ''));
  v_clean_kind := lower(trim(coalesce(p_resource_kind, '')));
  v_clean_token := trim(coalesce(p_voter_token, ''));

  -- 1. Validate resource ID
  IF v_clean_id = '' THEN
    RAISE EXCEPTION 'Resource ID cannot be empty' USING ERRCODE = '22000';
  END IF;

  -- 2. Validate resource kind
  IF v_clean_kind NOT IN ('youtube', 'file') THEN
    RAISE EXCEPTION 'Invalid resource kind "%". Must be "youtube" or "file"', v_clean_kind USING ERRCODE = '22000';
  END IF;

  -- 3. Reject missing or oversized tokens (never increment when token is absent)
  IF v_clean_token = '' THEN
    RAISE EXCEPTION 'A voter token is required to mark a resource as helpful' USING ERRCODE = '22000';
  END IF;

  IF length(v_clean_token) < 8 OR length(v_clean_token) > 256 THEN
    RAISE EXCEPTION 'Voter token length must be between 8 and 256 characters' USING ERRCODE = '22000';
  END IF;

  -- 4. Lock and verify active status of target resource row
  IF v_clean_kind = 'youtube' THEN
    SELECT helpful_count INTO v_current_count
    FROM public.youtube_resources
    WHERE id = v_clean_id AND status = 'active'
    FOR UPDATE;
  ELSIF v_clean_kind = 'file' THEN
    SELECT helpful_count INTO v_current_count
    FROM public.file_resources
    WHERE id = v_clean_id AND status = 'active'
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active % resource with ID "%" does not exist or is not active', v_clean_kind, v_clean_id USING ERRCODE = 'P0002';
  END IF;

  -- 5. Compute server-side cryptographic hash of voter token (never store raw client token)
  v_token_hash := md5('contributo_helpful_salt:' || v_clean_token);

  -- 6. Concurrency-safe atomic latch: insert into resource_helpful_votes using composite primary key.
  -- ON CONFLICT DO NOTHING acts as the final concurrency safeguard.
  INSERT INTO public.resource_helpful_votes (resource_kind, resource_id, voter_hash)
  VALUES (v_clean_kind, v_clean_id, v_token_hash)
  ON CONFLICT (resource_kind, resource_id, voter_hash) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- If 0 rows were inserted, this token has already voted (previously or in a concurrent request).
  -- Return the current counter without incrementing.
  IF v_rows_inserted = 0 THEN
    RETURN coalesce(v_current_count, 0);
  END IF;

  -- 7. Only increment helpful_count if the latch row was newly inserted
  IF v_clean_kind = 'youtube' THEN
    UPDATE public.youtube_resources
    SET helpful_count = helpful_count + 1
    WHERE id = v_clean_id AND status = 'active'
    RETURNING helpful_count INTO v_new_count;
  ELSIF v_clean_kind = 'file' THEN
    UPDATE public.file_resources
    SET helpful_count = helpful_count + 1
    WHERE id = v_clean_id AND status = 'active'
    RETURNING helpful_count INTO v_new_count;
  END IF;

  IF v_new_count IS NULL THEN
    RAISE EXCEPTION 'Failed to increment helpful counter for % resource "%"', v_clean_kind, v_clean_id;
  END IF;

  RETURN v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_resource_helpful(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_resource_helpful(text, text, text) TO anon, authenticated;

-- Dynamic Legacy Function Revocation:
-- Discovers exact function signatures through PostgreSQL catalogs and revokes execution
-- using valid argument signatures (via p.oid::regprocedure).
-- Student records are private; unauthenticated profile editing or listing is strictly denied.
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Safely discover and revoke execution on any overload of get_student_profile
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_student_profile'
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func_sig);
  END LOOP;

  -- 2. Safely discover and revoke execution on any overload of update_student_display_name
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_student_display_name'
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func_sig);
  END LOOP;

  -- 3. Safely discover and revoke execution on any registration-listing functions
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('list_registered_students', 'get_all_registered_students', 'get_registered_students')
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func_sig);
  END LOOP;

  -- 4. Revoke direct public execution on internal trigger functions
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('sync_youtube_resource_urls', 'sync_file_resource_paths', 'sync_report_resource_types')
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func_sig);
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- Audits all existing policies on resources, drops conflicting/permissive ones,
-- and establishes canonical policies with status = 'active' visibility.
-- Contributor IDs are unverified client inputs and do not imply ownership.
-- ============================================================================

-- 1. registered_students:
-- Table RLS enabled and forced with NO permissive policies for anon or authenticated.
-- Direct table access denied; registration proceeds exclusively via SECURITY DEFINER RPC.
ALTER TABLE public.registered_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registered_students FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'registered_students'
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.registered_students', r.policyname);
  END LOOP;
END $$;

-- 2. youtube_resources
ALTER TABLE public.youtube_resources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Audit and drop ALL permissive UPDATE, DELETE, or ALL policies on youtube_resources
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'youtube_resources'
      AND cmd IN ('UPDATE', 'DELETE', 'ALL')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.youtube_resources', r.policyname);
  END LOOP;

  -- Drop existing SELECT and INSERT policies before recreating canonical ones
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'youtube_resources'
      AND cmd IN ('SELECT', 'INSERT')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.youtube_resources', r.policyname);
  END LOOP;
END $$;

-- Canonical SELECT policy: exposes ONLY intended visible active resources (status = 'active')
CREATE POLICY "Public can view active youtube resources"
  ON public.youtube_resources FOR SELECT
  USING (status = 'active');

-- Canonical INSERT policy: public submission with title, course, segment, and url validation
-- Rejects inappropriate status values and non-zero helpful_count on insert
CREATE POLICY "Public can insert youtube resources"
  ON public.youtube_resources FOR INSERT
  WITH CHECK (
    length(trim(title)) >= 1 AND
    length(trim(title)) <= 200 AND
    length(trim(course_id)) >= 1 AND
    length(trim(segment_id)) >= 1 AND
    (status IS NULL OR status = 'active') AND
    (helpful_count IS NULL OR helpful_count = 0) AND
    (length(trim(coalesce(youtube_url, ''))) >= 5 OR length(trim(coalesce(url, ''))) >= 5)
  );

-- 3. file_resources
ALTER TABLE public.file_resources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Audit and drop ALL permissive UPDATE, DELETE, or ALL policies on file_resources
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_resources'
      AND cmd IN ('UPDATE', 'DELETE', 'ALL')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.file_resources', r.policyname);
  END LOOP;

  -- Drop existing SELECT and INSERT policies before recreating canonical ones
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_resources'
      AND cmd IN ('SELECT', 'INSERT')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.file_resources', r.policyname);
  END LOOP;
END $$;

-- Canonical SELECT policy: exposes ONLY intended visible active resources (status = 'active')
CREATE POLICY "Public can view active file resources"
  ON public.file_resources FOR SELECT
  USING (status = 'active');

-- Canonical INSERT policy: public submission with title, file_name, and path verification
-- Rejects inappropriate status values and non-zero helpful_count on insert
CREATE POLICY "Public can insert file resources"
  ON public.file_resources FOR INSERT
  WITH CHECK (
    length(trim(title)) >= 1 AND
    length(trim(title)) <= 200 AND
    length(trim(course_id)) >= 1 AND
    length(trim(segment_id)) >= 1 AND
    length(trim(file_name)) >= 1 AND
    (status IS NULL OR status = 'active') AND
    (helpful_count IS NULL OR helpful_count = 0) AND
    (length(trim(coalesce(file_path, ''))) >= 1 OR length(trim(coalesce(file_url, ''))) >= 1)
  );

-- 4. reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop ALL SELECT, UPDATE, DELETE, and ALL policies on reports.
  -- Visitors must NEVER be able to read or tamper with submitted reports.
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
      AND cmd IN ('SELECT', 'UPDATE', 'DELETE', 'ALL')
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', r.policyname);
  END LOOP;

  -- Drop any prior INSERT policies before creating canonical INSERT policy
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
      AND cmd = 'INSERT'
      AND ('anon' = ANY(roles) OR 'authenticated' = ANY(roles) OR 'public' = ANY(roles) OR roles = '{}' OR roles IS NULL)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', r.policyname);
  END LOOP;
END $$;

-- Canonical INSERT policy: Public visitors can report inappropriate or broken material
CREATE POLICY "Public can insert reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    length(trim(reason)) >= 2 AND
    length(trim(resource_id)) >= 1 AND
    (
      lower(trim(coalesce(resource_kind, ''))) IN ('youtube', 'file') OR
      lower(trim(coalesce(resource_type, ''))) IN ('youtube', 'file')
    )
  );

-- 5. resource_helpful_votes
ALTER TABLE public.resource_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_helpful_votes FORCE ROW LEVEL SECURITY;
-- No policies granted to public: votes table accessed exclusively via SECURITY DEFINER function

-- ============================================================================
-- SECTION 8: STORAGE CONFIGURATION & BUCKET POLICIES (course-files)
-- Validates existing bucket settings and uploaded objects without weakening or overwriting.
-- Audits all existing policies affecting course-files SELECT and INSERT access.
-- Preserves unrelated storage policies and establishes strictly scoped canonical rules.
-- Does NOT assume ON CONFLICT DO NOTHING ensures restrictions.
-- ============================================================================

DO $$
DECLARE
  b RECORD;
  v_has_pdf boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    SELECT id, name, public, file_size_limit, allowed_mime_types
    INTO b
    FROM storage.buckets
    WHERE id = 'course-files';

    IF b.id IS NULL THEN
      -- Create bucket with canonical safe academic sharing settings
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'course-files',
        'course-files',
        true,
        15728640,
        ARRAY[
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/zip',
          'application/x-zip-compressed',
          'text/plain',
          'image/png',
          'image/jpeg'
        ]
      );
    ELSE
      -- Validate existing bucket settings; do not silently weaken or overwrite
      IF NOT b.public THEN
        RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" has public = false. Academic sharing requires public = true for document access.';
      END IF;

      IF b.file_size_limit IS NULL THEN
        RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" has file_size_limit = NULL (unrestricted upload size). Contributo enforces a 15MB limit (15728640 bytes). Update bucket size limit manually before migration.';
      ELSIF b.file_size_limit > 15728640 THEN
        RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" has file_size_limit = % (exceeds max 15MB / 15728640 bytes). Update bucket size limit manually before migration.', b.file_size_limit;
      ELSIF b.file_size_limit < 1048576 THEN
        RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" has file_size_limit = % (under 1MB minimum for course materials). Review bucket configuration.', b.file_size_limit;
      END IF;

      IF b.allowed_mime_types IS NULL OR array_length(b.allowed_mime_types, 1) = 0 THEN
        RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" has unrestricted or empty allowed_mime_types. Explicit document MIME filtering is required.';
      ELSE
        SELECT ('application/pdf' = ANY(b.allowed_mime_types)) INTO v_has_pdf;
        IF NOT v_has_pdf THEN
          RAISE EXCEPTION 'STORAGE AUDIT FAILED: Existing bucket "course-files" allowed_mime_types does not include "application/pdf". Course materials require PDF support.';
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- Scoped storage object policy audit for course-files only
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Identify and drop any DELETE, UPDATE, or ALL policies specifically affecting 'course-files'
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd IN ('DELETE', 'UPDATE', 'ALL')
      AND (
        qual ILIKE '%course-files%' OR
        with_check ILIKE '%course-files%' OR
        policyname ILIKE '%course-files%'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;

  -- 2. Audit and drop prior SELECT policies on course-files before recreating canonical one
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        policyname IN ('Public Access for course-files', 'Allow select course-files', 'Public can view course-files') OR
        (qual ILIKE '%bucket_id%course-files%' AND policyname ILIKE '%course-files%')
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;

  -- 3. Audit and drop prior INSERT policies on course-files before recreating canonical one
  FOR r IN (
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'INSERT'
      AND (
        policyname IN ('Public Upload for course-files', 'Allow insert course-files', 'Public can upload course-files') OR
        (with_check ILIKE '%bucket_id%course-files%' AND policyname ILIKE '%course-files%')
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
  END LOOP;

  -- 4. Create Canonical Read access: Publicly readable for course files
  CREATE POLICY "Public Access for course-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'course-files');

  -- 5. Create Canonical Upload access: Publicly uploadable to course-files
  CREATE POLICY "Public Upload for course-files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'course-files');
END $$;

COMMIT;
