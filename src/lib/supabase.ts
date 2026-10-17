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

    return {
      youtubeResources: (ytRes.data || []) as YouTubeResource[],
      fileResources: (fileRes.data || []) as FileResource[],
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
    id: generatedId,
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

  // File type validation
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const allowedExts = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
  if (!allowedExts.includes(ext)) {
    return {
      success: false,
      error: `Invalid file type .${ext}. Allowed formats are: PDF, PPT/PPTX, DOC/DOCX, PNG, JPG/JPEG.`,
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
  const row: FileResource = {
    id: generatedId,
    course_id: courseId,
    segment_id: segmentId,
    file_path: filePath,
    file_name: file.name,
    file_type: ext,
    file_size: file.size,
    title: title.trim(),
    description: description.trim(),
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

  // Check if reporter already reported this resource
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('resource_id', report.resource_id)
    .eq('reporter_id', reporterId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, alreadyReported: true, error: 'You have already reported this resource.' };
  }

  const generatedId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const row = {
    id: generatedId,
    resource_kind: report.resource_kind,
    resource_id: report.resource_id,
    reporter_id: reporterId,
    reason: report.reason,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('reports').insert([row]);
  if (error) {
    return { success: false, error: error.message };
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
      error: 'Invalid URL format.',
    };
  }
}

// Notice regarding Supabase Schema & Verification
export const SUPABASE_SETUP_SQL = `-- ====================================================================
-- CONTRIBUTO: CORRECTED IDEMPOTENT SUPABASE PUBLIC MIGRATION
-- Compatible with existing table schema:
--   public.registered_students (user_id uuid, student_id text, email text, display_name text, created_at timestamptz)
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Paste and run this script in the SQL Editor.
-- ====================================================================

-- 1. Adapt public.registered_students to existing schema
CREATE TABLE IF NOT EXISTS public.registered_students (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

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

ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS student_id text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.registered_students ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

DO $$
BEGIN
  ALTER TABLE public.registered_students ALTER COLUMN user_id SET DEFAULT gen_random_uuid();
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop ONLY legacy foreign key constraints that reference auth.users (Supabase Auth)
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

-- Drop old check constraints requiring specific university domains or regexes
DO $$
DECLARE
    ck RECORD;
BEGIN
    FOR ck IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'registered_students'
          AND constraint_type = 'CHECK'
          AND constraint_name NOT LIKE '%_not_null'
    ) LOOP
        EXECUTE 'ALTER TABLE public.registered_students DROP CONSTRAINT IF EXISTS ' || quote_ident(ck.constraint_name);
    END LOOP;
END $$;

DROP INDEX IF EXISTS public.registered_students_email_idx;
DROP INDEX IF EXISTS public.registered_students_university_email_idx;

CREATE UNIQUE INDEX IF NOT EXISTS registered_students_email_idx
  ON public.registered_students (LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS registered_students_student_id_idx
  ON public.registered_students (UPPER(TRIM(student_id)));

-- 2. Privacy-safe RLS policies for registered_students
ALTER TABLE public.registered_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read registered_students" ON public.registered_students;
DROP POLICY IF EXISTS "Students can view profiles" ON public.registered_students;
DROP POLICY IF EXISTS "Allow public select registered_students" ON public.registered_students;

DROP POLICY IF EXISTS "Allow public insert registered_students" ON public.registered_students;
DROP POLICY IF EXISTS "Students can insert their own profile" ON public.registered_students;
DROP POLICY IF EXISTS "Allow public update registered_students" ON public.registered_students;
DROP POLICY IF EXISTS "Students can update their own display name" ON public.registered_students;
DROP POLICY IF EXISTS "Allow update registered_students" ON public.registered_students;

CREATE POLICY "Allow public insert registered_students"
  ON public.registered_students FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update registered_students"
  ON public.registered_students FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Secure functions for counting, profiles, and registration
CREATE OR REPLACE FUNCTION public.get_registered_student_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.registered_students;
$$;

GRANT EXECUTE ON FUNCTION public.get_registered_student_count() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_student_profile(p_user_id uuid)
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
BEGIN
  RETURN QUERY
  SELECT rs.user_id, rs.student_id, rs.email, rs.display_name, rs.created_at
  FROM public.registered_students rs
  WHERE rs.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_profile(uuid) TO anon, authenticated;

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
  created_at timestamptz,
  is_existing boolean
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
  v_existing public.registered_students%ROWTYPE;
BEGIN
  SELECT * INTO v_existing
  FROM public.registered_students rs
  WHERE LOWER(TRIM(rs.email)) = v_norm_email
     OR UPPER(TRIM(rs.student_id)) = v_norm_student_id
  LIMIT 1;

  IF FOUND THEN
    IF v_norm_display_name IS NOT NULL AND v_norm_display_name <> '' AND v_norm_display_name <> v_existing.display_name THEN
      UPDATE public.registered_students
      SET display_name = v_norm_display_name
      WHERE public.registered_students.user_id = v_existing.user_id;
      v_existing.display_name := v_norm_display_name;
    END IF;

    RETURN QUERY
    SELECT v_existing.user_id, v_existing.student_id, v_existing.email, v_existing.display_name, v_existing.created_at, true;
    RETURN;
  END IF;

  INSERT INTO public.registered_students (user_id, student_id, email, display_name, created_at)
  VALUES (v_user_id, v_norm_student_id, v_norm_email, v_norm_display_name, now())
  RETURNING * INTO v_existing;

  RETURN QUERY
  SELECT v_existing.user_id, v_existing.student_id, v_existing.email, v_existing.display_name, v_existing.created_at, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_public_student(text, text, text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_student_display_name(p_user_id uuid, p_display_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.registered_students
  SET display_name = TRIM(p_display_name)
  WHERE user_id = p_user_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_student_display_name(uuid, text) TO anon, authenticated;

-- 4. Resource Tables (Preserve existing data)
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
  contributor_id text NOT NULL,
  contributor_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.file_resources (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  segment_id text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  contributor_id text NOT NULL,
  contributor_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id text PRIMARY KEY,
  resource_kind text NOT NULL,
  resource_id text NOT NULL,
  reporter_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT reports_resource_reporter_unique UNIQUE (resource_kind, resource_id, reporter_id)
);

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

-- 5. RLS for Resources (Browse & submit allowed for public; delete disabled for anon)
ALTER TABLE public.youtube_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read youtube_resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Public read youtube resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Allow public insert youtube_resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Authenticated users can insert youtube resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Allow public delete youtube_resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Users can delete own youtube resources" ON public.youtube_resources;
DROP POLICY IF EXISTS "Authenticated users can delete youtube resources" ON public.youtube_resources;

CREATE POLICY "Allow public read youtube_resources"
  ON public.youtube_resources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert youtube_resources"
  ON public.youtube_resources FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete youtube resources"
  ON public.youtube_resources FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE public.file_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read file_resources" ON public.file_resources;
DROP POLICY IF EXISTS "Public read file resources" ON public.file_resources;
DROP POLICY IF EXISTS "Allow public insert file_resources" ON public.file_resources;
DROP POLICY IF EXISTS "Authenticated users can insert file resources" ON public.file_resources;
DROP POLICY IF EXISTS "Allow public delete file_resources" ON public.file_resources;
DROP POLICY IF EXISTS "Users can delete own file resources" ON public.file_resources;
DROP POLICY IF EXISTS "Authenticated users can delete file resources" ON public.file_resources;

CREATE POLICY "Allow public read file_resources"
  ON public.file_resources FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert file_resources"
  ON public.file_resources FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete file resources"
  ON public.file_resources FOR DELETE
  TO authenticated
  USING (true);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated insert reports" ON public.reports;

CREATE POLICY "Allow public insert reports"
  ON public.reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. Storage bucket configuration for 'course-files'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-files',
  'course-files',
  true,
  15728640,
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

DROP POLICY IF EXISTS "Allow public select course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public insert course-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete course-files" ON storage.objects;
DROP POLICY IF EXISTS "Public access to course-files" ON storage.objects;
DROP POLICY IF EXISTS "Public insert to course-files" ON storage.objects;
DROP POLICY IF EXISTS "Public delete from course-files" ON storage.objects;

CREATE POLICY "Allow public select course-files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'course-files');

CREATE POLICY "Allow public insert course-files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Authenticated delete course-files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'course-files');
`;
