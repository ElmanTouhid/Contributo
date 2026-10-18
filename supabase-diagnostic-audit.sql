-- ============================================================================
-- CONTRIBUTO: READ-ONLY SUPABASE SCHEMA & DATA DIAGNOSTIC SCRIPT
-- Purpose: Inspect live database schema, indexes, constraints, RLS policies,
--          triggers, function privileges, storage buckets, and data anomalies.
--
-- STRICT READ-ONLY COMPLIANCE:
-- - Pure SELECT statements and catalog inspection queries ONLY.
-- - ZERO modifying statements (no CREATE, ALTER, DROP, INSERT, UPDATE,
--   DELETE, TRUNCATE, GRANT, REVOKE, or procedural DO blocks).
-- - ZERO dynamic SQL, ZERO query_to_xml(), and ZERO XPath evaluation.
--
-- SCRIPT EXECUTION STRUCTURE & SAFETY RULES:
-- 1. BATCH 1: CORE SCHEMA & CATALOG INSPECTION (Sections 0 through 7B, 8A, 9A)
--    - Intended for standard PostgreSQL / Supabase environments, subject to
--      caller permissions and catalog version compatibility.
--    - Queries PostgreSQL system catalogs (pg_catalog, information_schema)
--      without querying optional application tables directly.
--    - Avoids relation-not-found errors for application tables when they do not exist.
--
-- 2. SECTION 8B: STORAGE BUCKET CONFIGURATION (course-files)
--    - Direct query against storage.buckets.
--    - EXECUTE ONLY IF Section 8A reports existence_status = 'PRESENT'.
--    - DO NOT include in automated single-file execution if storage.buckets may be absent.
--
-- 3. SECTIONS 9B–9G: SEPARATE DATA AUDIT QUERIES
--    - Direct queries against public application tables.
--    - Section 9A provides prerequisite readiness status; it is NOT an audit result.
--    - EXECUTE EACH QUERY INDIVIDUALLY ONLY IF Section 9A reports 'PREREQUISITES_MET'.
--    - NEVER execute a query against an absent table or missing/incompatible column.
-- ============================================================================

-- ============================================================================
-- SECTION 0: SUPABASE SYSTEM ROLES INVENTORY
-- Explicitly verifies the presence of standard Supabase roles before
-- privilege queries are evaluated.
-- ============================================================================
SELECT
  expected.rolname AS expected_role,
  CASE
    WHEN r.rolname IS NOT NULL THEN 'PRESENT'
    ELSE 'ABSENT'
  END AS role_status,
  r.rolcanlogin AS can_login,
  r.rolsuper AS is_superuser
FROM (
  VALUES
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('postgres'),
    ('supabase_admin')
) AS expected(rolname)
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = expected.rolname
ORDER BY expected.rolname;

-- ============================================================================
-- SECTION 1: RELATION INVENTORY, SIZE & ROW ESTIMATES
-- Uses schema-qualified OID joins on pg_class and pg_namespace to prevent
-- cross-schema Cartesian duplicates.
-- ============================================================================
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  CASE c.relkind
    WHEN 'r' THEN 'BASE TABLE'
    WHEN 'p' THEN 'PARTITIONED TABLE'
    WHEN 'v' THEN 'VIEW'
    WHEN 'm' THEN 'MATERIALIZED VIEW'
    WHEN 'f' THEN 'FOREIGN TABLE'
    ELSE c.relkind::text
  END AS relation_type,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid)) AS table_data_size,
  pg_size_pretty(pg_indexes_size(c.oid)) AS total_indexes_size,
  c.reltuples::bigint AS approximate_row_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'registered_students',
    'youtube_resources',
    'file_resources',
    'reports',
    'resource_helpful_votes'
  )
  AND c.relkind IN ('r', 'p', 'v')
ORDER BY c.relname;

-- ============================================================================
-- SECTION 2: COLUMN SPECIFICATIONS, DATA TYPES & NULLABILITY
-- ============================================================================
SELECT
  c.table_name,
  c.ordinal_position AS pos,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length AS max_len,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    'registered_students',
    'youtube_resources',
    'file_resources',
    'reports',
    'resource_helpful_votes'
  )
ORDER BY c.table_name, c.ordinal_position;

-- ============================================================================
-- SECTION 3: CONSTRAINTS & ACCURATE DDL DEFINITIONS
-- Uses pg_get_constraintdef(con.oid, true) by constraint OID to avoid
-- duplicate rows from multi-column join errors in information_schema.
-- ============================================================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    WHEN 't' THEN 'TRIGGER'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS constraint_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'registered_students',
    'youtube_resources',
    'file_resources',
    'reports',
    'resource_helpful_votes'
  )
ORDER BY c.relname, con.contype, con.conname;

-- ============================================================================
-- SECTION 4: ALL INDEXES & COMPLETE DDL DEFINITIONS
-- Inspects actual functional definitions (e.g. lower(trim(email))).
-- ============================================================================
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'registered_students',
    'youtube_resources',
    'file_resources',
    'reports',
    'resource_helpful_votes'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) STATUS & DETAILED POLICIES
-- Includes application tables AND storage.objects.
-- ============================================================================

-- 5A. Table RLS Activation Status
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relname IN ('registered_students', 'youtube_resources', 'file_resources', 'reports', 'resource_helpful_votes'))
   OR (n.nspname = 'storage' AND c.relname = 'objects')
ORDER BY n.nspname, c.relname;

-- 5B. Complete Policy Definitions, Roles, Commands & Expressions
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE (schemaname = 'public' AND tablename IN ('registered_students', 'youtube_resources', 'file_resources', 'reports', 'resource_helpful_votes'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY schemaname, tablename, policyname;

-- ============================================================================
-- SECTION 6: TRIGGERS & ASSOCIATED FUNCTION BINDINGS
-- ============================================================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition,
  t.tgenabled AS is_enabled
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND c.relname IN ('registered_students', 'youtube_resources', 'file_resources', 'reports', 'resource_helpful_votes')
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- SECTION 7: PUBLIC FUNCTIONS: SECURITY DEFINER, SEARCH_PATH & PRIVILEGES
-- ============================================================================

-- 7A. Function Definitions and Configuration
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.oid::regprocedure AS exact_signature,
  p.prosecdef AS is_security_definer,
  p.provolatile AS volatility,
  p.proconfig AS search_path_configuration,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_function_arguments(p.oid) AS arguments,
  p.proacl AS access_control_list
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'register_public_student',
    'get_student_profile',
    'update_student_display_name',
    'get_registered_student_count',
    'increment_resource_helpful',
    'sync_youtube_resource_urls',
    'sync_file_resource_paths',
    'sync_report_resource_types',
    'list_registered_students',
    'get_all_registered_students',
    'get_registered_students'
  )
ORDER BY p.proname, exact_signature;

-- 7B. Execution Permissions Matrix by Role & Explicit Public ACL Inspection
-- Distinguishes effective privileges for concrete roles (anon, authenticated)
-- from explicit entries in the function's ACL (proacl).
-- Accurately identifies when proacl is NULL (governed by default ACL).
SELECT
  p.oid::regprocedure AS exact_signature,
  p.prosecdef AS is_security_definer,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
      'ROLE_NOT_FOUND'
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN
      'EFFECTIVE_GRANT (anon role has execute privilege)'
    ELSE
      'EFFECTIVE_DENIAL (anon role does not have execute privilege)'
  END AS anon_effective_execute,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
      'ROLE_NOT_FOUND'
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN
      'EFFECTIVE_GRANT (authenticated role has execute privilege)'
    ELSE
      'EFFECTIVE_DENIAL (authenticated role does not have execute privilege)'
  END AS authenticated_effective_execute,
  CASE
    WHEN p.proacl IS NULL THEN
      'NO_EXPLICIT_ACL (proacl is NULL; no function-level GRANT or REVOKE has been executed; governed by database/schema default privileges)'
    WHEN EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(p.proacl) a
      WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ) THEN
      'EXPLICIT_PUBLIC_GRANT (proacl explicitly contains an EXECUTE entry for PUBLIC / grantee=0)'
    ELSE
      'NO_PUBLIC_ENTRY_IN_ACL (proacl explicitly defined with entries, but contains no EXECUTE entry for PUBLIC / grantee=0)'
  END AS explicit_public_acl_status,
  p.proacl::text AS raw_proacl
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'register_public_student',
    'get_student_profile',
    'update_student_display_name',
    'get_registered_student_count',
    'increment_resource_helpful',
    'sync_youtube_resource_urls',
    'sync_file_resource_paths',
    'sync_report_resource_types',
    'list_registered_students',
    'get_all_registered_students',
    'get_registered_students'
  )
ORDER BY p.proname, exact_signature;

-- ============================================================================
-- SECTION 8: STORAGE BUCKET CONFIGURATION (course-files)
-- ============================================================================

-- 8A. Storage Infrastructure Existence Check (Catalog Query - Always Safe)
SELECT
  'storage.buckets' AS target_relation,
  CASE
    WHEN to_regclass('storage.buckets') IS NOT NULL THEN 'PRESENT'
    ELSE 'ABSENT (Supabase storage extension or storage.buckets table not installed)'
  END AS existence_status,
  CASE
    WHEN to_regclass('storage.buckets') IS NOT NULL THEN 'Safe to execute Section 8B below'
    ELSE 'DO NOT EXECUTE Section 8B (Relation does not exist)'
  END AS execution_instruction;

-- 8B. Storage Bucket Settings for course-files (Direct Query)
-- PREREQUISITE: Execute ONLY if Section 8A reported existence_status = 'PRESENT'.
-- DO NOT EXECUTE if Section 8A reported ABSENT.
SELECT
  b.id,
  b.name,
  b.owner,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types,
  b.created_at,
  b.updated_at
FROM storage.buckets b
WHERE b.id = 'course-files' OR b.name = 'course-files';

-- ============================================================================
-- SECTION 9: DATA AUDIT PREFLIGHT & SEPARATE AUDIT QUERIES
-- ============================================================================

-- 9A. Data Audit Prerequisite Readiness Matrix (Catalog & Type Compatibility Inspection)
-- Checks whether target tables exist, required columns exist, AND whether
-- columns have string/text data types compatible with the audit expressions (lower, upper, trim).
-- Clearly reports PREREQUISITES_MET vs PREREQUISITES_NOT_MET.
-- Explicitly indicates audit_execution_state = 'NOT RUN (Prerequisite check only)'.
-- NEVER implies that a ready audit has passed or found no issues.
SELECT
  audit_id,
  target_table,
  required_columns,
  audit_purpose,
  CASE
    WHEN to_regclass('public.' || target_table) IS NULL THEN
      'PREREQUISITES_NOT_MET: TABLE_NOT_FOUND (public.' || target_table || ' does not exist)'
    WHEN NOT has_columns THEN
      'PREREQUISITES_NOT_MET: COLUMNS_NOT_FOUND (Required columns not found in public.' || target_table || ')'
    WHEN NOT types_compatible THEN
      'PREREQUISITES_NOT_MET: INCOMPATIBLE_DATA_TYPE (Required columns must be text/varchar/char for string audit expressions)'
    ELSE
      'PREREQUISITES_MET (Target table, columns, and string data types verified; safe to execute query)'
  END AS prerequisite_status,
  'NOT RUN (Prerequisite check only; audit results require executing separate query)' AS audit_execution_state,
  'COLUMN_EXISTENCE_AND_TEXT_TYPE_COMPATIBILITY' AS validation_scope,
  CASE
    WHEN to_regclass('public.' || target_table) IS NOT NULL AND has_columns AND types_compatible THEN
      'READY: Execute query ' || audit_id || ' below to inspect data'
    ELSE
      'SKIP: Do NOT execute query ' || audit_id || ' (Prerequisites missing or incompatible)'
  END AS execution_instruction
FROM (
  SELECT
    '9B' AS audit_id,
    'registered_students' AS target_table,
    'email' AS required_columns,
    'Duplicate normalized student emails' AS audit_purpose,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.registered_students')
        AND attname = 'email' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.registered_students')
        AND a.attname = 'email' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AS types_compatible
  UNION ALL
  SELECT
    '9C',
    'registered_students',
    'student_id',
    'Duplicate normalized student IDs',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.registered_students')
        AND attname = 'student_id' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.registered_students')
        AND a.attname = 'student_id' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AS types_compatible
  UNION ALL
  SELECT
    '9D',
    'youtube_resources',
    'youtube_url AND url (both required for conflict comparison)',
    'Conflicting YouTube URL values between youtube_url and url',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.youtube_resources')
        AND attname = 'youtube_url' AND attnum > 0 AND NOT attisdropped
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.youtube_resources')
        AND attname = 'url' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.youtube_resources')
        AND a.attname = 'youtube_url' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.youtube_resources')
        AND a.attname = 'url' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AS types_compatible
  UNION ALL
  SELECT
    '9E',
    'file_resources',
    'file_path AND file_url (both required for conflict comparison)',
    'Conflicting file storage paths between file_path and file_url',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.file_resources')
        AND attname = 'file_path' AND attnum > 0 AND NOT attisdropped
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.file_resources')
        AND attname = 'file_url' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.file_resources')
        AND a.attname = 'file_path' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.file_resources')
        AND a.attname = 'file_url' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AS types_compatible
  UNION ALL
  SELECT
    '9F',
    'reports',
    'resource_kind AND resource_type (both required for conflict comparison)',
    'Conflicting report classifications between resource_kind and resource_type',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.reports')
        AND attname = 'resource_kind' AND attnum > 0 AND NOT attisdropped
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.reports')
        AND attname = 'resource_type' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.reports')
        AND a.attname = 'resource_kind' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = to_regclass('public.reports')
        AND a.attname = 'resource_type' AND a.attnum > 0 AND NOT a.attisdropped
        AND format_type(a.atttypid, NULL) IN ('text', 'character varying', 'character', 'bpchar')
    ) AS types_compatible
  UNION ALL
  SELECT
    '9G',
    'reports',
    'resource_kind OR resource_type (at least one classification column required)',
    'Invalid or unclassified reports (classification not "youtube" or "file")',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.reports')
        AND attname IN ('resource_kind', 'resource_type') AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    -- Query 9G accesses fields via to_jsonb(), which is universal across all column types
    TRUE AS types_compatible
  UNION ALL
  SELECT
    '9H',
    'resource_helpful_votes',
    'resource_id (checks ambiguous YouTube vs File ownership)',
    'Ambiguous or orphaned legacy helpful votes matching both or neither resource table',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.resource_helpful_votes')
        AND attname = 'resource_id' AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    TRUE AS types_compatible
  UNION ALL
  SELECT
    '9I',
    'resource_helpful_votes',
    'voter_hash OR voter_token (checks for NULL or blank voter credentials)',
    'Helpful votes with NULL or blank voter_hash / voter_token',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.resource_helpful_votes')
        AND attname IN ('voter_hash', 'voter_token') AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    TRUE AS types_compatible
  UNION ALL
  SELECT
    '9J',
    'resource_helpful_votes',
    'resource_id AND (voter_hash OR voter_token)',
    'Duplicate voter hashes on same resource before composite primary key rebuild',
    EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.resource_helpful_votes')
        AND attname = 'resource_id' AND attnum > 0 AND NOT attisdropped
    ) AND EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute
      WHERE attrelid = to_regclass('public.resource_helpful_votes')
        AND attname IN ('voter_hash', 'voter_token') AND attnum > 0 AND NOT attisdropped
    ) AS has_columns,
    TRUE AS types_compatible
) audits
ORDER BY audit_id;

-- ============================================================================
-- SECTIONS 9B–9J: DIRECT DATA AUDIT QUERIES
-- NOTE: Execute each query individually ONLY when Section 9A reports PREREQUISITES_MET.
-- Returning 0 rows indicates no duplicates, conflicts, or invalid values.
-- Returning 1+ rows lists the specific records requiring resolution.
-- ============================================================================

-- 9B. Duplicate Normalized Emails in registered_students (Data Audit Query)
-- PREREQUISITE: public.registered_students exists AND column 'email' exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9B.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (table, email column, or compatible type missing).
SELECT
  lower(trim(email)) AS normalized_email,
  count(*) AS occurrence_count
FROM public.registered_students
WHERE email IS NOT NULL AND trim(email) != ''
GROUP BY lower(trim(email))
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 10;

-- 9C. Duplicate Normalized Student IDs in registered_students (Data Audit Query)
-- PREREQUISITE: public.registered_students exists AND column 'student_id' exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9C.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (table, student_id column, or compatible type missing).
SELECT
  upper(trim(student_id)) AS normalized_student_id,
  count(*) AS occurrence_count
FROM public.registered_students
WHERE student_id IS NOT NULL AND trim(student_id) != ''
GROUP BY upper(trim(student_id))
HAVING count(*) > 1
ORDER BY count(*) DESC
LIMIT 10;

-- 9D. Conflicting YouTube URLs (Data Audit Query)
-- PREREQUISITE: public.youtube_resources exists AND BOTH 'youtube_url' AND 'url' exist.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9D.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (e.g. legacy 'url' column is absent).
SELECT
  id AS resource_id,
  youtube_url,
  url AS legacy_url
FROM public.youtube_resources
WHERE youtube_url IS NOT NULL
  AND trim(youtube_url) != ''
  AND url IS NOT NULL
  AND trim(url) != ''
  AND trim(youtube_url) != trim(url)
LIMIT 10;

-- 9E. Conflicting File Paths (Data Audit Query)
-- PREREQUISITE: public.file_resources exists AND BOTH 'file_path' AND 'file_url' exist.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9E.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (e.g. legacy 'file_url' column is absent).
SELECT
  id AS resource_id,
  file_path,
  file_url AS legacy_file_url
FROM public.file_resources
WHERE file_path IS NOT NULL
  AND trim(file_path) != ''
  AND file_url IS NOT NULL
  AND trim(file_url) != ''
  AND trim(file_path) != trim(file_url)
LIMIT 10;

-- 9F. Conflicting Report Classifications (Data Audit Query)
-- PREREQUISITE: public.reports exists AND BOTH 'resource_kind' AND 'resource_type' exist.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9F.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (e.g. legacy 'resource_type' column is absent).
SELECT
  id AS report_id,
  resource_kind,
  resource_type AS legacy_resource_type
FROM public.reports
WHERE resource_kind IS NOT NULL
  AND trim(resource_kind) != ''
  AND resource_type IS NOT NULL
  AND trim(resource_type) != ''
  AND lower(trim(resource_kind)) != lower(trim(resource_type))
LIMIT 10;

-- 9G. Invalid or Unclassified Reports (Data Audit Query)
-- PREREQUISITE: public.reports exists AND AT LEAST ONE classification column exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9G.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (public.reports or classification columns missing).
SELECT
  to_jsonb(r)->>'id' AS report_id,
  to_jsonb(r)->>'resource_kind' AS resource_kind,
  to_jsonb(r)->>'resource_type' AS legacy_resource_type,
  to_jsonb(r)->>'reason' AS reason
FROM public.reports r
WHERE
  (coalesce(trim(to_jsonb(r)->>'resource_kind'), '') = ''
   AND coalesce(trim(to_jsonb(r)->>'resource_type'), '') = '')
  OR (to_jsonb(r) ? 'resource_kind'
      AND coalesce(trim(to_jsonb(r)->>'resource_kind'), '') != ''
      AND lower(trim(to_jsonb(r)->>'resource_kind')) NOT IN ('youtube', 'file'))
  OR (to_jsonb(r) ? 'resource_type'
      AND coalesce(trim(to_jsonb(r)->>'resource_type'), '') != ''
      AND lower(trim(to_jsonb(r)->>'resource_type')) NOT IN ('youtube', 'file'))
LIMIT 10;

-- 9H. Ambiguous or Orphaned Legacy Helpful Votes (Data Audit Query)
-- PREREQUISITE: public.resource_helpful_votes exists AND column 'resource_id' exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9H.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET (e.g. table is absent).
SELECT
  v.resource_id,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id)
     AND EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id)
    THEN 'AMBIGUOUS_COLLISION (matches both YouTube and File)'
    ELSE 'ORPHANED_VOTE (matches neither YouTube nor File)'
  END AS anomaly_type,
  count(*) AS vote_count
FROM public.resource_helpful_votes v
WHERE
  (
    EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id)
    AND EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id)
  )
  OR
  (
    NOT EXISTS (SELECT 1 FROM public.youtube_resources y WHERE y.id = v.resource_id)
    AND NOT EXISTS (SELECT 1 FROM public.file_resources f WHERE f.id = v.resource_id)
  )
GROUP BY v.resource_id
LIMIT 10;

-- 9I. Helpful Votes with NULL or Blank Voter Credentials (Data Audit Query)
-- PREREQUISITE: public.resource_helpful_votes exists AND 'voter_hash' or 'voter_token' exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9I.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET.
SELECT
  to_jsonb(v)->>'resource_id' AS resource_id,
  to_jsonb(v)->>'resource_kind' AS resource_kind,
  to_jsonb(v)->>'voter_hash' AS voter_hash,
  to_jsonb(v)->>'voter_token' AS voter_token
FROM public.resource_helpful_votes v
WHERE
  (to_jsonb(v) ? 'voter_hash' AND coalesce(trim(to_jsonb(v)->>'voter_hash'), '') = '')
  OR
  (to_jsonb(v) ? 'voter_token' AND coalesce(trim(to_jsonb(v)->>'voter_token'), '') = '')
LIMIT 10;

-- 9J. Duplicate Voter Hashes for Same Resource (Data Audit Query)
-- PREREQUISITE: public.resource_helpful_votes exists AND 'resource_id' exists.
-- EXECUTION: Run ONLY if Section 9A reports PREREQUISITES_MET for Audit 9J.
-- SKIP IF: Section 9A reports PREREQUISITES_NOT_MET.
SELECT
  to_jsonb(v)->>'resource_id' AS resource_id,
  coalesce(to_jsonb(v)->>'voter_hash', md5('contributo_helpful_salt:' || trim(to_jsonb(v)->>'voter_token'))) AS derived_hash,
  count(*) AS duplicate_count
FROM public.resource_helpful_votes v
GROUP BY 1, 2
HAVING count(*) > 1
LIMIT 10;

