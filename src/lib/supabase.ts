import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SYLLABUS_SEGMENTS } from '../data/syllabusSegments';
import { FileResource, Report, Segment, YouTubeResource } from '../types';

// Storage key for user-entered credentials in UI (convenient before redeploying .env)
const RUNTIME_URL_KEY = 'contributo_runtime_supabase_url';
const RUNTIME_KEY_KEY = 'contributo_runtime_supabase_key';

let cachedClient: SupabaseClient | null = null;

/**
 * Sanitizes the Supabase project URL by removing trailing slashes or subpaths like /rest/v1.
 */
function cleanSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/rest(\/v1)?$/i, '');
  return url;
}

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Also check runtime user input if env is not provided
  let runtimeUrl = '';
  let runtimeKey = '';
  if (typeof window !== 'undefined') {
    runtimeUrl = window.localStorage.getItem(RUNTIME_URL_KEY) || '';
    runtimeKey = window.localStorage.getItem(RUNTIME_KEY_KEY) || '';
  }

  const rawUrl = (envUrl && envUrl !== 'https://your-project-id.supabase.co' ? envUrl : runtimeUrl).trim();
  const anonKey = (envKey && envKey !== 'your-anon-key' ? envKey : runtimeKey).trim();
  const url = cleanSupabaseUrl(rawUrl);

  return { url, anonKey };
}

export function saveRuntimeSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RUNTIME_URL_KEY, cleanSupabaseUrl(url));
    window.localStorage.setItem(RUNTIME_KEY_KEY, anonKey.trim());
  }
  cachedClient = null;
}

export function clearRuntimeSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(RUNTIME_URL_KEY);
    window.localStorage.removeItem(RUNTIME_KEY_KEY);
  }
  cachedClient = null;
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function getMissingEnvDetails(): { isMissing: boolean; missingVars: string[]; instructions: string } {
  const { url, anonKey } = getSupabaseCredentials();
  const missingVars: string[] = [];
  if (!url || !url.startsWith('http')) missingVars.push('VITE_SUPABASE_URL');
  if (!anonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

  return {
    isMissing: missingVars.length > 0,
    missingVars,
    instructions:
      'Contributo requires Supabase so all students share the exact same resources across devices in real time. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or use the connection setup modal.',
  };
}

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) return null;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// ==========================================
// SEEDING SEGMENTS IN SUPABASE (One-time sync)
// ==========================================
export async function ensureSegmentsSeeded(): Promise<void> {
  // Segments are pre-seeded via PostgreSQL migration/SQL in Supabase SQL editor
  // and are strictly read-only for client applications.
  return;
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

export async function fetchAllSegments(): Promise<Segment[]> {
  const supabase = getSupabase();
  if (!supabase) {
    // Fallback to static syllabus segments for reading structure
    return SYLLABUS_SEGMENTS;
  }

  try {
    const { data, error } = await supabase
      .from('segments')
      .select('*')
      .order('segment_number', { ascending: true });

    if (error || !data || data.length === 0) {
      // If table is empty or error, fall back to predefined syllabus
      return SYLLABUS_SEGMENTS;
    }

    return data as Segment[];
  } catch (err) {
    console.error('fetchSegments error:', err);
    return SYLLABUS_SEGMENTS;
  }
}

export async function fetchCourseLiveCounts(): Promise<Record<string, { total: number; videos: number; files: number }>> {
  const counts: Record<string, { total: number; videos: number; files: number }> = {};
  const supabase = getSupabase();

  if (!supabase) {
    return counts;
  }

  try {
    const [ytRes, fileRes] = await Promise.all([
      supabase.from('youtube_resources').select('course_id'),
      supabase.from('file_resources').select('course_id'),
    ]);

    if (ytRes.data) {
      for (const item of ytRes.data) {
        const cid = item.course_id;
        if (!counts[cid]) counts[cid] = { total: 0, videos: 0, files: 0 };
        counts[cid].videos += 1;
        counts[cid].total += 1;
      }
    }

    if (fileRes.data) {
      for (const item of fileRes.data) {
        const cid = item.course_id;
        if (!counts[cid]) counts[cid] = { total: 0, videos: 0, files: 0 };
        counts[cid].files += 1;
        counts[cid].total += 1;
      }
    }
  } catch (err) {
    console.error('fetchCourseLiveCounts error:', err);
  }

  return counts;
}

export async function fetchSegmentLiveCounts(): Promise<Record<string, { videos: number; files: number }>> {
  const counts: Record<string, { videos: number; files: number }> = {};
  const supabase = getSupabase();
  if (!supabase) return counts;

  try {
    const [ytRes, fileRes] = await Promise.all([
      supabase.from('youtube_resources').select('segment_id'),
      supabase.from('file_resources').select('segment_id'),
    ]);

    if (ytRes.data) {
      for (const item of ytRes.data) {
        const sid = item.segment_id;
        if (!counts[sid]) counts[sid] = { videos: 0, files: 0 };
        counts[sid].videos += 1;
      }
    }

    if (fileRes.data) {
      for (const item of fileRes.data) {
        const sid = item.segment_id;
        if (!counts[sid]) counts[sid] = { videos: 0, files: 0 };
        counts[sid].files += 1;
      }
    }
  } catch (err) {
    console.error('fetchSegmentLiveCounts error:', err);
  }

  return counts;
}

export async function fetchSegmentResources(segmentId: string): Promise<{
  youtubeResources: YouTubeResource[];
  fileResources: FileResource[];
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { youtubeResources: [], fileResources: [] };
  }

  try {
    const [ytRes, fileRes] = await Promise.all([
      supabase
        .from('youtube_resources')
        .select('*')
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: false }),
      supabase
        .from('file_resources')
        .select('*')
        .eq('segment_id', segmentId)
        .order('created_at', { ascending: false }),
    ]);

    const youtubeResources = ((ytRes.data || []) as Record<string, unknown>[]).map((item) => ({
      ...item,
      youtube_url: (item.youtube_url as string) || (item.url as string) || '',
      youtube_id: (item.youtube_id as string) || '',
    })) as YouTubeResource[];

    const fileResources = ((fileRes.data || []) as Record<string, unknown>[]).map((item) => ({
      ...item,
      file_path: (item.file_path as string) || (item.file_url as string) || '',
    })) as FileResource[];

    return {
      youtubeResources,
      fileResources,
    };
  } catch (err) {
    console.error('fetchSegmentResources error:', err);
    return { youtubeResources: [], fileResources: [] };
  }
}

export async function checkYouTubeDuplicateInSegment(segmentId: string, youtubeId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { data, error } = await supabase
      .from('youtube_resources')
      .select('id')
      .eq('segment_id', segmentId)
      .eq('youtube_id', youtubeId)
      .limit(1);

    if (error) {
      console.error('Duplicate check error:', error);
      return false;
    }

    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

export async function addYouTubeResource(
  resource: Omit<YouTubeResource, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to share resources.',
    };
  }

  // Duplicate check
  const isDuplicate = await checkYouTubeDuplicateInSegment(resource.segment_id, resource.youtube_id);
  if (isDuplicate) {
    return {
      success: false,
      error: 'This YouTube video or playlist has already been shared in this segment.',
    };
  }

  const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `yt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const row = {
    ...resource,
    url: resource.youtube_url, // Backwards compatibility if table has 'url' column
    id: generatedId,
    status: 'active',
    contributor_id: resource.contributor_id || 'student',
    contributor_name: resource.contributor_name || 'Student',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('youtube_resources').insert([row]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteYouTubeResource(id: string, contributorId?: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  let query = supabase.from('youtube_resources').delete().eq('id', id);
  if (contributorId) {
    query = query.eq('contributor_id', contributorId);
  }

  const { error } = await query;
  if (error) {
    if (error.code === '42501' || error.message?.toLowerCase().includes('policy')) {
      return {
        success: false,
        error: 'Resource deletion is disabled for anonymous sessions to protect shared study materials.',
      };
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function uploadAndAddFileResource(params: {
  file: File;
  courseId: string;
  segmentId: string;
  title: string;
  description: string;
  contributorId?: string;
  contributorName: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to upload files.',
    };
  }

  const { file, courseId, segmentId, title, description, contributorId, contributorName } = params;

  // File size validation (15 MB)
  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    return { success: false, error: 'File size exceeds maximum allowed limit of 15 MB.' };
  }

  // File type validation (PDF only)
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext !== 'pdf') {
    return {
      success: false,
      error: `Invalid file type .${ext}. Only PDF documents (.pdf) are allowed.`,
    };
  }

  const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ownerFolder = contributorId || 'student';
  const filePath = `${ownerFolder}/${courseId}/${segmentId}/${generatedId}-${cleanFileName}`;

  // 1. Upload to Supabase Storage bucket 'course-files'
  const { error: uploadError } = await supabase.storage
    .from('course-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    if (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.message?.includes('404')) {
      return {
        success: false,
        error: 'Supabase Storage bucket "course-files" was not found. Please ensure the "course-files" bucket exists in your Supabase dashboard.',
      };
    }
    return { success: false, error: uploadError.message };
  }

  // 2. Insert metadata row into 'file_resources' table
  const row = {
    id: generatedId,
    course_id: courseId,
    segment_id: segmentId,
    file_path: filePath,
    file_url: filePath, // Backwards compatibility if table has 'file_url' column
    file_name: file.name,
    file_type: ext,
    file_size: file.size,
    title: title.trim(),
    description: description.trim(),
    status: 'active',
    contributor_id: ownerFolder,
    contributor_name: contributorName || 'Student',
    created_at: new Date().toISOString(),
  };

  const { error: dbError } = await supabase.from('file_resources').insert([row]);
  if (dbError) {
    // Rollback uploaded file from storage
    await supabase.storage.from('course-files').remove([filePath]);
    return { success: false, error: dbError.message };
  }

  return { success: true };
}

export function getFileDownloadUrl(filePath: string): string {
  const supabase = getSupabase();
  if (!supabase) return '#';

  const { data } = supabase.storage.from('course-files').getPublicUrl(filePath);
  return data?.publicUrl || '#';
}

export async function deleteFileResource(resource: FileResource, currentUserId?: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  let query = supabase.from('file_resources').delete().eq('id', resource.id);
  if (currentUserId) {
    query = query.eq('contributor_id', currentUserId);
  }

  const { error: dbError } = await query;
  if (dbError) {
    if (dbError.code === '42501' || dbError.message?.toLowerCase().includes('policy')) {
      return {
        success: false,
        error: 'Resource deletion is disabled for anonymous sessions to protect shared study materials.',
      };
    }
    return { success: false, error: dbError.message };
  }

  // Only if DB deletion succeeds, clean up storage object
  if (resource.file_path) {
    const { error: storageError } = await supabase.storage
      .from('course-files')
      .remove([resource.file_path]);

    if (storageError) {
      console.warn('Storage file cleanup warning:', storageError.message);
    }
  }

  return { success: true };
}

export async function submitResourceReport(report: Report): Promise<{ success: boolean; error?: string; alreadyReported?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const reporterId = report.reporter_id || 'anonymous';
  const sessionKey = `contributo_rep_${report.resource_id}_${reporterId}`;

  // Session-based check prevents duplicate reports without needing SELECT access on the reports table
  if (typeof window !== 'undefined') {
    try {
      if (window.sessionStorage?.getItem(sessionKey)) {
        return { success: false, alreadyReported: true, error: 'You have already reported this resource.' };
      }
    } catch {
      // ignore storage access error
    }
  }

  const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Populate both resource_kind and legacy resource_type for schema compatibility
  const row = {
    id: generatedId,
    resource_kind: report.resource_kind,
    resource_type: report.resource_kind,
    resource_id: report.resource_id,
    reporter_id: reporterId,
    reason: report.reason,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('reports').insert([row]);
  if (error) {
    return { success: false, error: error.message };
  }

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.setItem(sessionKey, '1');
    } catch {
      // ignore storage quota error
    }
  }

  return { success: true };
}

// ==========================================
// YOUTUBE URL PARSER & VALIDATOR
// ==========================================
export function parseYouTubeUrl(rawUrl: string): {
  valid: boolean;
  id: string | null;
  type: 'video' | 'playlist';
  normalizedUrl: string;
  error?: string;
} {
  const url = rawUrl.trim();
  if (!url) {
    return { valid: false, id: null, type: 'video', normalizedUrl: '', error: 'URL cannot be empty.' };
  }

  // Must match youtube.com or youtu.be
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return {
      valid: false,
      id: null,
      type: 'video',
      normalizedUrl: '',
      error: 'Please enter a valid YouTube URL (e.g. youtube.com/watch?v=... or youtu.be/...)',
    };
  }

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);

    // Playlist check
    const listParam = parsed.searchParams.get('list');
    if (parsed.pathname.includes('/playlist') && listParam) {
      return {
        valid: true,
        id: listParam,
        type: 'playlist',
        normalizedUrl: `https://www.youtube.com/playlist?list=${listParam}`,
      };
    }

    // Direct video with playlist parameter (if explicitly playlist)
    if (listParam && !parsed.searchParams.get('v')) {
      return {
        valid: true,
        id: listParam,
        type: 'playlist',
        normalizedUrl: `https://www.youtube.com/playlist?list=${listParam}`,
      };
    }

    // Standard watch?v=...
    const vParam = parsed.searchParams.get('v');
    if (vParam && vParam.length >= 8) {
      return {
        valid: true,
        id: vParam,
        type: 'video',
        normalizedUrl: `https://www.youtube.com/watch?v=${vParam}`,
      };
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) {
      const vid = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (vid && vid.length >= 8) {
        return {
          valid: true,
          id: vid,
          type: 'video',
          normalizedUrl: `https://www.youtube.com/watch?v=${vid}`,
        };
      }
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/shorts/VIDEO_ID
    if (parsed.pathname.includes('/embed/') || parsed.pathname.includes('/shorts/')) {
      const parts = parsed.pathname.split('/');
      const vid = parts[parts.length - 1];
      if (vid && vid.length >= 8) {
        return {
          valid: true,
          id: vid,
          type: 'video',
          normalizedUrl: `https://www.youtube.com/watch?v=${vid}`,
        };
      }
    }

    return {
      valid: false,
      id: null,
      type: 'video',
      normalizedUrl: '',
      error: 'Could not detect a valid YouTube Video ID or Playlist ID. Please verify the URL.',
    };
  } catch {
    return {
      valid: false,
      id: null,
      type: 'video',
      normalizedUrl: '',
    };
  }
}

/**
 * Increment helpful count for a resource via hardened database RPC.
 */
export async function incrementResourceHelpful(
  resourceId: string,
  resourceKind: 'youtube' | 'file'
): Promise<{ success: boolean; newCount?: number; error?: string }> {
  const client = getSupabase();
  if (!client) {
    return { success: true };
  }

  let voterToken = '';
  if (typeof window !== 'undefined') {
    try {
      voterToken = window.localStorage.getItem('contributo_voter_token') || '';
      if (!voterToken) {
        voterToken = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `voter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        window.localStorage.setItem('contributo_voter_token', voterToken);
      }
    } catch {
      // ignore storage access issues
    }
  }

  try {
    const { data, error } = await client.rpc('increment_resource_helpful', {
      p_resource_id: resourceId,
      p_resource_kind: resourceKind,
      p_voter_token: voterToken || null,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, newCount: Number(data) };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

// Notice regarding Supabase Schema & Verification
export const SUPABASE_SETUP_SQL = `-- ============================================================================
-- CONTRIBUTO: COMPLETE IDEMPOTENT SUPABASE MIGRATION (PRODUCTION READY)
-- Target: Live Supabase PostgreSQL Database (No Supabase Auth)
--
-- VERIFIED PRODUCTION FACTS:
-- 1. public.resource_helpful_votes does NOT exist yet. Created in its final shape:
--    (resource_kind text, resource_id uuid, voter_hash text, created_at timestamptz,
--     PRIMARY KEY (resource_kind, resource_id, voter_hash)).
-- 2. public.registered_students.user_id is currently NOT NULL. Public registration
--    allows visitors without an auth account, so user_id is made nullable
--    (ALTER COLUMN user_id DROP NOT NULL). Migration halts cleanly if user_id
--    is part of the PRIMARY KEY.
-- 3. Pre-flight invariant checks inspect existing tables (registered_students,
--    youtube_resources, file_resources, reports) and data types before any mutation.
--
-- ATOMIC SAFETY & PRIVILEGES:
-- - Entire migration runs in one BEGIN ... COMMIT transaction.
-- - Pre-flight halts with RAISE EXCEPTION on any incompatibility, rolling back cleanly.
-- - REVOKE ALL table-level and column-level privileges from anon, authenticated, public.
-- - Explicitly granted:
--     * youtube_resources, file_resources: SELECT + INSERT (insert forces helpful_count = 0).
--     * reports: INSERT only.
--     * registered_students, resource_helpful_votes: No direct access (RLS enabled, 0 policies).
-- - SECURITY DEFINER functions set search_path = public, pg_temp.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- (pgcrypto not required; gen_random_uuid() is built in)

-- ============================================================================
-- SECTION 2: READ-ONLY PRE-FLIGHT CHECKS
-- Runs first in the transaction. Verifies table existence, primary keys,
-- column compatibility, duplicate anomalies, and storage bucket settings.
-- Halts with clear diagnostic error on any problem before any schema change occurs.
-- ============================================================================

DO $$
DECLARE
  v_user_id_in_pk boolean := false;
  v_col_type text;
  v_dup_count integer := 0;
  v_dup_sample text := '';
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. Validate public.registered_students
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'registered_students'
  ) THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Required table public.registered_students does not exist.';
  END IF;

  -- Required columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'student_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students is missing column "student_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'email') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students is missing column "email".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'display_name') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students is missing column "display_name".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.registered_students is missing column "user_id".';
  END IF;

  -- Check if user_id is part of the Primary Key
  -- PostgreSQL disallows NULL in primary key columns.
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(con.conkey)
    WHERE n.nspname = 'public'
      AND c.relname = 'registered_students'
      AND con.contype = 'p'
      AND a.attname = 'user_id'
  ) INTO v_user_id_in_pk;

  IF v_user_id_in_pk THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column "user_id" in public.registered_students is part of the PRIMARY KEY and cannot be made nullable. Please reconfigure the table primary key (e.g. use student_id or an independent surrogate id) before making user_id nullable.';
  END IF;

  -- Check column data types for registered_students
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'email';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.registered_students.email must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'student_id';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.registered_students.student_id must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'display_name';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.registered_students.display_name must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'user_id';
  IF v_col_type NOT IN ('uuid', 'text', 'character varying') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.registered_students.user_id must be uuid or string, found "%".', v_col_type;
  END IF;

  -- Check for existing duplicate emails before applying unique index
  SELECT count(*), string_agg(lower_email, ', ')
  INTO v_dup_count, v_dup_sample
  FROM (
    SELECT lower(trim(email)) AS lower_email
    FROM public.registered_students
    WHERE email IS NOT NULL AND trim(email) != ''
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
    LIMIT 5
  ) t;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % duplicate email address group(s) in public.registered_students (samples: %). Resolve duplicate registrations before applying unique indexes.', v_dup_count, v_dup_sample;
  END IF;

  -- Check for existing duplicate student IDs before applying unique index
  SELECT count(*), string_agg(upper_id, ', ')
  INTO v_dup_count, v_dup_sample
  FROM (
    SELECT upper(trim(student_id)) AS upper_id
    FROM public.registered_students
    WHERE student_id IS NOT NULL AND trim(student_id) != ''
    GROUP BY upper(trim(student_id))
    HAVING count(*) > 1
    LIMIT 5
  ) t;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % duplicate student_id group(s) in public.registered_students (samples: %). Resolve duplicate registrations before applying unique indexes.', v_dup_count, v_dup_sample;
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. Validate public.youtube_resources
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'youtube_resources'
  ) THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Required table public.youtube_resources does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources is missing column "id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'course_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources is missing column "course_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'segment_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources is missing column "segment_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'title') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.youtube_resources is missing column "title".';
  END IF;

  -- Check column data types for youtube_resources
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'id';
  IF v_col_type NOT IN ('uuid', 'text', 'character varying') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.youtube_resources.id must be uuid or string, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'course_id';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.youtube_resources.course_id must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'segment_id';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.youtube_resources.segment_id must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'title';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.youtube_resources.title must be string/text type, found "%".', v_col_type;
  END IF;

  -- Check for conflicting non-empty youtube_url vs url values if both columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'youtube_url')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'youtube_resources' AND column_name = 'url') THEN
    EXECUTE 'SELECT count(*), string_agg(id::text, '', '') FROM ('
         || '  SELECT id FROM public.youtube_resources '
         || '  WHERE youtube_url IS NOT NULL AND trim(youtube_url) != '''' '
         || '    AND url IS NOT NULL AND trim(url) != '''' '
         || '    AND trim(youtube_url) != trim(url) '
         || '  LIMIT 5) t'
    INTO v_dup_count, v_dup_sample;

    IF v_dup_count > 0 THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % youtube_resource record(s) with conflicting youtube_url and url values (sample IDs: %). Resolve conflicting values before migration.', v_dup_count, v_dup_sample;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. Validate public.file_resources
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'file_resources'
  ) THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Required table public.file_resources does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources is missing column "id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'course_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources is missing column "course_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'segment_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources is missing column "segment_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'title') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.file_resources is missing column "title".';
  END IF;

  -- Check column data types for file_resources
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'id';
  IF v_col_type NOT IN ('uuid', 'text', 'character varying') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.file_resources.id must be uuid or string, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'course_id';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.file_resources.course_id must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'segment_id';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.file_resources.segment_id must be string/text type, found "%".', v_col_type;
  END IF;

  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'title';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.file_resources.title must be string/text type, found "%".', v_col_type;
  END IF;

  -- Check for conflicting non-empty file_path vs file_url values if both exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_path')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'file_resources' AND column_name = 'file_url') THEN
    EXECUTE 'SELECT count(*), string_agg(id::text, '', '') FROM ('
         || '  SELECT id FROM public.file_resources '
         || '  WHERE file_path IS NOT NULL AND trim(file_path) != '''' '
         || '    AND file_url IS NOT NULL AND trim(file_url) != '''' '
         || '    AND trim(file_path) != trim(file_url) '
         || '  LIMIT 5) t'
    INTO v_dup_count, v_dup_sample;

    IF v_dup_count > 0 THEN
      RAISE EXCEPTION 'PRE-FLIGHT FAILED: Found % file_resource record(s) with conflicting file_path and file_url values (sample IDs: %). Resolve conflicting values before migration.', v_dup_count, v_dup_sample;
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- 4. Validate public.reports
  -- --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'reports'
  ) THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Required table public.reports does not exist.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_id') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.reports is missing column "resource_id".';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'reason') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.reports is missing column "reason".';
  END IF;

  -- Check column data types for reports
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'reason';
  IF v_col_type NOT IN ('text', 'character varying', 'character') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Column public.reports.reason must be string/text type, found "%".', v_col_type;
  END IF;

  -- Ensure at least one classification column exists or can be established
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_kind')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'resource_type') THEN
    RAISE EXCEPTION 'PRE-FLIGHT FAILED: Table public.reports has neither "resource_kind" nor "resource_type" column.';
  END IF;

  -- --------------------------------------------------------------------------
  -- 5. Storage Bucket Validation (course-files)
  -- --------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    DECLARE
      b RECORD;
    BEGIN
      SELECT id, name, public, file_size_limit, allowed_mime_types
      INTO b
      FROM storage.buckets
      WHERE id = 'course-files';

      IF b.id IS NOT NULL THEN
        IF NOT (
          b.public = true AND
          coalesce(b.file_size_limit, 0) BETWEEN 1048576 AND 15728640 AND
          b.allowed_mime_types IS NOT NULL AND
          (b.allowed_mime_types = ARRAY['application/pdf'] OR (cardinality(b.allowed_mime_types) = 1 AND 'application/pdf' = ANY(b.allowed_mime_types)))
        ) THEN
          RAISE EXCEPTION 'PRE-FLIGHT FAILED: Storage bucket "course-files" exists with incompatible settings (public=%, file_size_limit=%, allowed_mime_types=%). Required: public=true, file_size_limit between 1048576 and 15728640 (1MB-15MB), and allowed_mime_types containing only application/pdf.',
            b.public, b.file_size_limit, b.allowed_mime_types;
        END IF;
      END IF;
    END;
  END IF;

  -- --------------------------------------------------------------------------
  -- 6. Storage Policy Pre-flight Audit on storage.objects
  -- Evaluates commands using their relevant expressions:
  --   - SELECT: evaluated using qual (with_check is not applicable to SELECT)
  --   - DELETE: evaluated using qual (public visitors must NEVER have DELETE)
  --   - INSERT: evaluated using with_check (qual is not applicable to INSERT)
  --   - UPDATE: evaluated using both qual AND with_check (public visitors must NEVER have UPDATE)
  --   - ALL: evaluated across both qual AND with_check (grants UPDATE/DELETE to public)
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
      v_targets_course_files boolean;
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
          v_clean_qual := trim(coalesce(p.qual, ''));
          v_clean_check := trim(coalesce(p.with_check, ''));

          -- Policy targets course-files if it explicitly mentions course-files OR has no bucket check (global)
          v_targets_course_files := (
            v_clean_qual ILIKE '%course-files%' OR
            v_clean_check ILIKE '%course-files%' OR
            (v_clean_qual !~* 'bucket_id\\s*=' AND v_clean_check !~* 'bucket_id\\s*=')
          );

          IF v_targets_course_files THEN
            v_is_broad := false;
            v_reason := '';

            IF p.cmd = 'DELETE' THEN
              v_is_broad := true;
              v_reason := 'Public role granted DELETE on storage objects (public visitors must not delete storage files)';
            ELSIF p.cmd = 'UPDATE' THEN
              v_is_broad := true;
              v_reason := 'Public role granted UPDATE on storage objects (public visitors must not edit storage files)';
            ELSIF p.cmd = 'ALL' THEN
              v_is_broad := true;
              v_reason := 'ALL policy grants UPDATE/DELETE to public on storage objects';
            ELSIF p.cmd = 'INSERT' THEN
              IF v_clean_check = '' OR v_clean_check = 'true' THEN
                v_is_broad := true;
                v_reason := 'INSERT policy with_check is unrestricted (null or true)';
              END IF;
            ELSIF p.cmd = 'SELECT' THEN
              IF v_clean_qual = '' OR v_clean_qual = 'true' THEN
                v_is_broad := true;
                v_reason := 'SELECT policy qual is unrestricted (null or true)';
              END IF;
            END IF;

            IF v_is_broad AND p.policyname NOT IN (
              'Public Access for course-files',
              'Public Upload for course-files'
            ) THEN
              RAISE EXCEPTION 'PRE-FLIGHT FAILED: Unsafe or unverified permissive storage policy "%" detected on storage.objects (cmd=%, roles=%, reason: %). Permissive policies combine with OR logic in PostgreSQL. Manually inspect and restrict or drop this policy before running migration.',
                p.policyname, p.cmd, p.roles, v_reason;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END;
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: SCHEMA RECONCILIATION & TABLE SETUP
-- All operations preserve existing data without loss or destructive dropping.
-- ============================================================================

-- 1. Reconcile registered_students: Make user_id nullable for public registration
ALTER TABLE public.registered_students ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

-- Ensure created_at is timestamp with time zone
DO $$
DECLARE
  v_col_type text;
BEGIN
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'registered_students' AND column_name = 'created_at';

  IF v_col_type = 'timestamp without time zone' THEN
    ALTER TABLE public.registered_students ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
  END IF;

  UPDATE public.registered_students SET created_at = now() WHERE created_at IS NULL;
  ALTER TABLE public.registered_students ALTER COLUMN created_at SET DEFAULT now();

  -- If surrogate id exists without default, set default gen_random_uuid()
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'registered_students'
      AND column_name = 'id' AND column_default IS NULL
  ) THEN
    ALTER TABLE public.registered_students ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Ensure unique indexes exist on registered_students
CREATE UNIQUE INDEX IF NOT EXISTS registered_students_email_lower_uidx
  ON public.registered_students (lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS registered_students_student_id_upper_uidx
  ON public.registered_students (upper(trim(student_id)));

-- 2. Reconcile youtube_resources
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

-- Drop NOT NULL on legacy url if present so inserts supplying youtube_url succeed
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
ALTER TABLE public.youtube_resources ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.youtube_resources ALTER COLUMN helpful_count SET DEFAULT 0;
ALTER TABLE public.youtube_resources ALTER COLUMN created_at SET DEFAULT now();

-- Synchronize missing URL values non-destructively
UPDATE public.youtube_resources
SET youtube_url = url
WHERE (youtube_url IS NULL OR trim(youtube_url) = '') AND url IS NOT NULL AND trim(url) != '';

UPDATE public.youtube_resources
SET url = youtube_url
WHERE (url IS NULL OR trim(url) = '') AND youtube_url IS NOT NULL AND trim(youtube_url) != '';

-- Trigger: keep youtube_url and url in sync
CREATE OR REPLACE FUNCTION public.sync_youtube_resource_urls()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
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
ALTER TABLE public.file_resources ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.file_resources ALTER COLUMN helpful_count SET DEFAULT 0;
ALTER TABLE public.file_resources ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.file_resources
SET file_path = file_url
WHERE (file_path IS NULL OR trim(file_path) = '') AND file_url IS NOT NULL AND trim(file_url) != '';

UPDATE public.file_resources
SET file_url = file_path
WHERE (file_url IS NULL OR trim(file_url) = '') AND file_path IS NOT NULL AND trim(file_path) != '';

-- Trigger: keep file_path and file_url in sync
CREATE OR REPLACE FUNCTION public.sync_file_resource_paths()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
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
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_kind text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resource_type text;
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
ALTER TABLE public.reports ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.reports ALTER COLUMN created_at SET DEFAULT now();

-- Trigger: keep report classification synced
CREATE OR REPLACE FUNCTION public.sync_report_resource_types()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
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
    RAISE EXCEPTION 'Invalid resource_kind "%". Allowed values are "youtube" or "file"', NEW.resource_kind USING ERRCODE = '22000';
  END IF;

  IF v_type != '' AND v_type NOT IN ('youtube', 'file') THEN
    RAISE EXCEPTION 'Invalid resource_type "%". Allowed values are "youtube" or "file"', NEW.resource_type USING ERRCODE = '22000';
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

-- 5. Table: public.resource_helpful_votes (Final shape as verified)
-- Verified production shape: (resource_kind text, resource_id uuid, voter_hash text, created_at timestamptz)
CREATE TABLE IF NOT EXISTS public.resource_helpful_votes (
  resource_kind text NOT NULL,
  resource_id uuid NOT NULL,
  voter_hash text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_kind, resource_id, voter_hash)
);

-- ============================================================================
-- SECTION 4: PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_youtube_resources_segment_created
  ON public.youtube_resources (segment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_youtube_resources_course
  ON public.youtube_resources (course_id);

CREATE INDEX IF NOT EXISTS idx_file_resources_segment_created
  ON public.file_resources (segment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_resources_course
  ON public.file_resources (course_id);

CREATE INDEX IF NOT EXISTS idx_reports_resource_created
  ON public.reports (resource_id, created_at DESC);

-- ============================================================================
-- SECTION 5: PRIVILEGES & ACCESS CONTROL
-- Revoke all privileges on all five tables from anon, authenticated, public.
-- Explicitly grant only the strictly required privileges.
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 1. Revoke ALL table-level privileges from anon, authenticated, public
REVOKE ALL ON TABLE public.registered_students FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.youtube_resources FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.file_resources FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.reports FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.resource_helpful_votes FROM anon, authenticated, public;

-- Explicitly revoke any leftover column-level privileges across all five tables
DO $$
DECLARE
  t text;
  col text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['registered_students', 'youtube_resources', 'file_resources', 'reports', 'resource_helpful_votes']) LOOP
    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    ) THEN
      FOR col IN (
        SELECT a.attname
        FROM pg_catalog.pg_attribute a
        JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = t AND a.attnum > 0 AND NOT a.attisdropped
      ) LOOP
        EXECUTE format('REVOKE SELECT (%1$I), INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE public.%2$I FROM anon, authenticated, public', col, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 2. Grant strictly needed privileges:
-- youtube_resources & file_resources: SELECT + INSERT for anon & authenticated. (NO UPDATE, NO DELETE)
GRANT SELECT, INSERT ON TABLE public.youtube_resources TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.file_resources TO anon, authenticated;

-- reports: INSERT only for anon & authenticated. (Public cannot read or modify reports)
GRANT INSERT ON TABLE public.reports TO anon, authenticated;

-- registered_students & resource_helpful_votes: NO DIRECT ACCESS (RPC only).

-- ============================================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS) POLICIES
-- Drop all old policies first, enable RLS, establish canonical rules.
-- Note: ENABLE ROW LEVEL SECURITY is used without FORCE to allow SECURITY DEFINER
-- functions running as table owner to execute without RLS policy interference.
-- ============================================================================

-- 1. registered_students: RLS enabled, NO policies (Direct access blocked)
ALTER TABLE public.registered_students ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'registered_students'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.registered_students', r.policyname);
  END LOOP;
END $$;

-- 2. resource_helpful_votes: RLS enabled, NO policies (RPC only)
ALTER TABLE public.resource_helpful_votes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'resource_helpful_votes'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.resource_helpful_votes', r.policyname);
  END LOOP;
END $$;

-- 3. youtube_resources: RLS enabled, Drop old policies, Canonical SELECT & INSERT
ALTER TABLE public.youtube_resources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'youtube_resources'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.youtube_resources', r.policyname);
  END LOOP;
END $$;

-- Public can view active resources
CREATE POLICY "Public can view active youtube resources"
  ON public.youtube_resources FOR SELECT
  USING (status = 'active');

-- Public can insert resources: forces helpful_count = 0 and valid status
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

-- 4. file_resources: RLS enabled, Drop old policies, Canonical SELECT & INSERT
ALTER TABLE public.file_resources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'file_resources'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.file_resources', r.policyname);
  END LOOP;
END $$;

-- Public can view active file resources
CREATE POLICY "Public can view active file resources"
  ON public.file_resources FOR SELECT
  USING (status = 'active');

-- Public can insert file resources: forces helpful_count = 0 and valid status
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

-- 5. reports: RLS enabled, Drop old policies, INSERT only
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'reports'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can insert reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    length(trim(reason)) >= 2 AND
    length(trim(resource_id::text)) >= 1 AND
    (
      lower(trim(coalesce(resource_kind, ''))) IN ('youtube', 'file') OR
      lower(trim(coalesce(resource_type, ''))) IN ('youtube', 'file')
    )
  );

-- ============================================================================
-- SECTION 7: SECURITY DEFINER RPC DATABASE FUNCTIONS
-- search_path = public, pg_temp.
-- EXECUTE revoked from public and granted strictly to anon, authenticated.
-- ============================================================================

-- Drop old signatures to ensure clean, unambiguous overload matching
DROP FUNCTION IF EXISTS public.register_public_student(text, text, text, uuid);
DROP FUNCTION IF EXISTS public.register_public_student(text, text, text);

-- Primary 4-argument implementation (Internal: visitors must not choose their own user_id)
CREATE OR REPLACE FUNCTION public.register_public_student(
  p_email text,
  p_student_id text,
  p_display_name text,
  p_user_id uuid
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_clean_email text;
  v_clean_student_id text;
  v_clean_display_name text;
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

  IF v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'A valid email address is required' USING ERRCODE = '22000';
  END IF;

  -- 3. Duplicate check with uniform error message
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

  -- 4. Insert with nullable user_id (p_user_id is NULL for unauthenticated public visitors)
  v_created_at := now();

  BEGIN
    INSERT INTO public.registered_students (
      student_id,
      email,
      display_name,
      user_id,
      created_at
    ) VALUES (
      v_clean_student_id,
      v_clean_email,
      v_clean_display_name,
      p_user_id,
      v_created_at
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Registration could not be completed with the provided details. A registration already exists with this email address or student ID.' USING ERRCODE = '23505';
  END;

  RETURN QUERY SELECT
    p_user_id,
    v_clean_email,
    v_clean_student_id,
    v_clean_display_name,
    v_created_at;
END;
$$;

-- Visitors must not be able to choose their own user_id; revoked from public, anon, and authenticated
REVOKE ALL ON FUNCTION public.register_public_student(text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- Compatibility overload for 3-argument callers (frontend public visitors)
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.register_public_student(p_email, p_student_id, p_display_name, NULL::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.register_public_student(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_student(text, text, text) TO anon, authenticated;

-- Function: get_registered_student_count
CREATE OR REPLACE FUNCTION public.get_registered_student_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer FROM public.registered_students;
$$;

REVOKE ALL ON FUNCTION public.get_registered_student_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registered_student_count() TO anon, authenticated;

-- Function: increment_resource_helpful
-- Concurrency-safe: inserts into public.resource_helpful_votes (resource_kind, resource_id uuid, voter_hash)
-- with ON CONFLICT (resource_kind, resource_id, voter_hash) DO NOTHING as the atomic latch.
CREATE OR REPLACE FUNCTION public.increment_resource_helpful(
  p_resource_id text,
  p_resource_kind text,
  p_voter_token text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_count integer := 0;
  v_current_count integer := 0;
  v_clean_id text;
  v_clean_kind text;
  v_clean_token text;
  v_token_hash text;
  v_resource_uuid uuid;
  v_rows_inserted integer := 0;
BEGIN
  v_clean_id := trim(coalesce(p_resource_id, ''));
  v_clean_kind := lower(trim(coalesce(p_resource_kind, '')));
  v_clean_token := trim(coalesce(p_voter_token, ''));

  -- 1. Validate resource ID and convert to UUID
  IF v_clean_id = '' THEN
    RAISE EXCEPTION 'Resource ID cannot be empty' USING ERRCODE = '22000';
  END IF;

  BEGIN
    v_resource_uuid := v_clean_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Resource ID "%" must be a valid UUID', v_clean_id USING ERRCODE = '22P02';
  END;

  -- 2. Validate resource kind
  IF v_clean_kind NOT IN ('youtube', 'file') THEN
    RAISE EXCEPTION 'Invalid resource kind "%". Must be "youtube" or "file"', v_clean_kind USING ERRCODE = '22000';
  END IF;

  -- 3. Validate token
  IF v_clean_token = '' THEN
    RAISE EXCEPTION 'A voter token is required to mark a resource as helpful' USING ERRCODE = '22000';
  END IF;

  IF length(v_clean_token) < 8 OR length(v_clean_token) > 256 THEN
    RAISE EXCEPTION 'Voter token length must be between 8 and 256 characters' USING ERRCODE = '22000';
  END IF;

  -- 4. Lock target resource row to read current count
  IF v_clean_kind = 'youtube' THEN
    SELECT helpful_count INTO v_current_count
    FROM public.youtube_resources
    WHERE id::text = v_clean_id AND status = 'active'
    FOR UPDATE;
  ELSIF v_clean_kind = 'file' THEN
    SELECT helpful_count INTO v_current_count
    FROM public.file_resources
    WHERE id::text = v_clean_id AND status = 'active'
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active % resource with ID "%" does not exist or is not active', v_clean_kind, v_clean_id USING ERRCODE = 'P0002';
  END IF;

  -- 5. Compute server-side cryptographic hash with salt
  v_token_hash := md5('contributo_helpful_salt:' || v_clean_token);

  -- 6. Concurrency-safe atomic insert into resource_helpful_votes
  INSERT INTO public.resource_helpful_votes (resource_kind, resource_id, voter_hash)
  VALUES (v_clean_kind, v_resource_uuid, v_token_hash)
  ON CONFLICT (resource_kind, resource_id, voter_hash) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- If 0 rows were inserted, this token already voted; return current counter without incrementing
  IF v_rows_inserted = 0 THEN
    RETURN coalesce(v_current_count, 0);
  END IF;

  -- 7. Only increment helpful_count if a new vote was recorded
  IF v_clean_kind = 'youtube' THEN
    UPDATE public.youtube_resources
    SET helpful_count = coalesce(helpful_count, 0) + 1
    WHERE id::text = v_clean_id AND status = 'active'
    RETURNING helpful_count INTO v_new_count;
  ELSIF v_clean_kind = 'file' THEN
    UPDATE public.file_resources
    SET helpful_count = coalesce(helpful_count, 0) + 1
    WHERE id::text = v_clean_id AND status = 'active'
    RETURNING helpful_count INTO v_new_count;
  END IF;

  RETURN coalesce(v_new_count, v_current_count + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_resource_helpful(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_resource_helpful(text, text, text) TO anon, authenticated;

-- Dynamic Legacy Function Revocation: revoke execute on any legacy student listing/profile functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_student_profile',
        'update_student_display_name',
        'list_registered_students',
        'get_all_registered_students',
        'get_registered_students',
        'sync_youtube_resource_urls',
        'sync_file_resource_paths',
        'sync_report_resource_types'
      )
  ) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.func_sig);
  END LOOP;
END $$;

-- ============================================================================
-- SECTION 8: STORAGE CONFIGURATION (course-files)
-- ============================================================================

DO $$
DECLARE
  b RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage' AND c.relname = 'buckets'
  ) THEN
    -- Check if course-files bucket already exists and validate settings
    SELECT id, name, public, file_size_limit, allowed_mime_types
    INTO b
    FROM storage.buckets
    WHERE id = 'course-files';

    IF b.id IS NOT NULL THEN
      IF NOT (
        b.public = true AND
        coalesce(b.file_size_limit, 0) BETWEEN 1048576 AND 15728640 AND
        b.allowed_mime_types IS NOT NULL AND
        (b.allowed_mime_types = ARRAY['application/pdf'] OR (cardinality(b.allowed_mime_types) = 1 AND 'application/pdf' = ANY(b.allowed_mime_types)))
      ) THEN
        RAISE EXCEPTION 'Storage bucket "course-files" already exists with incompatible settings (public=%, file_size_limit=%, allowed_mime_types=%). Required: public=true, file_size_limit between 1048576 and 15728640, and allowed_mime_types containing only application/pdf. Do not silently overwrite settings.',
          b.public, b.file_size_limit, b.allowed_mime_types;
      END IF;
    END IF;

    -- Ensure course-files bucket exists with exact specifications (PDF only, 15MB, public)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'course-files',
      'course-files',
      true,
      15728640,
      ARRAY['application/pdf']
    )
    ON CONFLICT (id) DO NOTHING;

    -- Scoped storage object policies strictly for course-files (PDF only uploads)
    EXECUTE '
      DROP POLICY IF EXISTS "Public Access for course-files" ON storage.objects;
      DROP POLICY IF EXISTS "Public Upload for course-files" ON storage.objects;

      CREATE POLICY "Public Access for course-files"
        ON storage.objects FOR SELECT
        USING (bucket_id = ''course-files'');

      CREATE POLICY "Public Upload for course-files"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = ''course-files'' AND lower(name) ~ ''\\.pdf$'');
    ';
  END IF;
END $$;

COMMIT;
`;
