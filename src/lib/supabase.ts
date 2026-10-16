import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SYLLABUS_SEGMENTS } from '../data/syllabusSegments';
import { FileResource, Report, Segment, YouTubeResource } from '../types';

// Storage key for user-entered credentials in UI (convenient before redeploying .env)
const RUNTIME_URL_KEY = 'contributo_runtime_supabase_url';
const RUNTIME_KEY_KEY = 'contributo_runtime_supabase_key';

let cachedClient: SupabaseClient | null = null;

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

  const url = (envUrl && envUrl !== 'https://your-project-id.supabase.co' ? envUrl : runtimeUrl).trim();
  const anonKey = (envKey && envKey !== 'your-anon-key' ? envKey : runtimeKey).trim();

  return { url, anonKey };
}

export function saveRuntimeSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(RUNTIME_URL_KEY, url.trim());
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
      'Contributo requires Supabase so Student A and Student B share the exact same resources across devices in real time. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or use the connection setup modal.',
  };
}

export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('http')) return null;

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
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
  // and are strictly read-only for client applications under RLS.
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
}

export async function checkYouTubeDuplicateInSegment(segmentId: string, youtubeId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

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

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return {
      success: false,
      error: 'Authentication required. Please sign in with your IIUC student email.',
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
    contributor_id: user.id,
    contributor_name: resource.contributor_name || 'Student',
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('youtube_resources').insert([row]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteYouTubeResource(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { success: false, error: 'Authentication required to delete resources.' };
  }

  const { error } = await supabase
    .from('youtube_resources')
    .delete()
    .eq('id', id)
    .eq('contributor_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function uploadAndAddFileResource(params: {
  file: File;
  courseId: string;
  segmentId: string;
  title: string;
  description: string;
  contributorName: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to upload files.',
    };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return {
      success: false,
      error: 'Authentication required. Please sign in with your IIUC student email.',
    };
  }

  const { file, courseId, segmentId, title, description, contributorName } = params;

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
  // Required path format: {authenticated-user-uuid}/{courseId}/{segmentId}/{filename}
  const filePath = `${user.id}/${courseId}/${segmentId}/${generatedId}-${cleanFileName}`;

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
    contributor_id: user.id,
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

export async function deleteFileResource(resource: FileResource): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { success: false, error: 'Authentication required to delete files.' };
  }

  if (resource.contributor_id !== user.id) {
    return { success: false, error: 'You can only delete files you uploaded.' };
  }

  // 1. Delete row from DB first to confirm ownership under RLS
  const { error: dbError } = await supabase
    .from('file_resources')
    .delete()
    .eq('id', resource.id)
    .eq('contributor_id', user.id);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  // 2. Only if DB deletion succeeds, clean up storage object
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

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { success: false, error: 'Authentication required. Please sign in with your IIUC email to submit a report.' };
  }

  // Check if reporter already reported this resource
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('resource_id', report.resource_id)
    .eq('reporter_id', user.id)
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
    reporter_id: user.id,
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
// The Contributo production database must be initialized using the verified security-hardened
// SQL migration executed by the project administrator in the Supabase SQL Editor.
// All 55 syllabus segments are pre-seeded and protected by Row Level Security.
export const SUPABASE_SETUP_SQL = `-- CONTRIBUTO SUPABASE CONFIGURATION
-- This project connects to the verified Supabase instance (https://mcfouovfgnjexlmvzefc.supabase.co).
-- 
-- The database schema, registered_students table, security definer RPC functions,
-- RLS policies, and course-files storage bucket configuration must be deployed
-- using the verified security-hardened migration script in your Supabase SQL Editor.
-- 
-- Do not run scripts with permissive "WITH CHECK (true)" policies.
-- Contributo enforces ownership and academic integrity via Postgres RLS.
`;
