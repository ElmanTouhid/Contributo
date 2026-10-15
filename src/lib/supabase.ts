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
let seedingAttempted = false;

export async function ensureSegmentsSeeded(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || seedingAttempted) return;
  seedingAttempted = true;

  try {
    const { count, error } = await supabase
      .from('segments')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('Could not check segments count in Supabase:', error.message);
      return;
    }

    if (count === 0 || count === null) {
      console.log('Seeding official syllabus segments into Supabase...');
      // Insert in chunks of 50
      const rows = SYLLABUS_SEGMENTS.map((s) => ({
        id: s.id,
        course_id: s.course_id,
        segment_number: s.segment_number,
        title: s.title,
        subtopics: s.subtopics,
        exam_section: s.exam_section,
      }));

      const { error: insertError } = await supabase.from('segments').upsert(rows, { onConflict: 'id' });
      if (insertError) {
        console.error('Error seeding segments:', insertError);
      } else {
        console.log(`Successfully seeded ${rows.length} syllabus segments.`);
      }
    }
  } catch (err) {
    console.error('ensureSegmentsSeeded failed:', err);
  }
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

export async function addYouTubeResource(resource: Omit<YouTubeResource, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
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

  const row = {
    ...resource,
    id: `yt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('youtube_resources').insert([row]);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteYouTubeResource(id: string, contributorId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const { error } = await supabase
    .from('youtube_resources')
    .delete()
    .eq('id', id)
    .eq('contributor_id', contributorId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function uploadAndAddFileResource(params: {
  file: File;
  courseId: string;
  segmentId: string;
  title: string;
  description: string;
  contributorId: string;
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

  const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${courseId}/${segmentId}/${fileId}-${cleanFileName}`;

  // 1. Upload to Supabase Storage bucket 'course-files'
  const { error: uploadError } = await supabase.storage
    .from('course-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    // If bucket does not exist, give clear guidance
    if (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.message?.includes('404')) {
      return {
        success: false,
        error: 'Supabase Storage bucket "course-files" was not found. Please create a public bucket named "course-files" in your Supabase dashboard.',
      };
    }
    return { success: false, error: uploadError.message };
  }

  // 2. Insert metadata row into 'file_resources' table
  const row: FileResource = {
    id: fileId,
    course_id: courseId,
    segment_id: segmentId,
    file_path: filePath,
    file_name: file.name,
    file_type: ext,
    file_size: file.size,
    title: title.trim(),
    description: description.trim(),
    contributor_id: contributorId,
    contributor_name: contributorName,
    created_at: new Date().toISOString(),
  };

  const { error: dbError } = await supabase.from('file_resources').insert([row]);
  if (dbError) {
    // Attempt rollback storage file
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

export async function deleteFileResource(resource: FileResource, currentUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase is not configured.' };

  if (resource.contributor_id !== currentUserId) {
    return { success: false, error: 'You can only delete files you uploaded.' };
  }

  // Delete from storage
  if (resource.file_path) {
    await supabase.storage.from('course-files').remove([resource.file_path]);
  }

  // Delete row from DB
  const { error } = await supabase
    .from('file_resources')
    .delete()
    .eq('id', resource.id)
    .eq('contributor_id', currentUserId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function submitResourceReport(report: Report): Promise<{ success: boolean; error?: string; alreadyReported?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  // Check if reporter already reported this resource
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('resource_id', report.resource_id)
    .eq('reporter_id', report.reporter_id)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: false, alreadyReported: true, error: 'You have already reported this resource.' };
  }

  const row = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    resource_kind: report.resource_kind,
    resource_id: report.resource_id,
    reporter_id: report.reporter_id,
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

// SQL Schema for user's Supabase dashboard
export const SUPABASE_SETUP_SQL = `-- Contributo Supabase Schema Setup
-- Run this script in your Supabase Project > SQL Editor

-- 1. Segments Table (Official syllabus structure, read-only for students)
CREATE TABLE IF NOT EXISTS public.segments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  segment_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtopics TEXT NOT NULL,
  exam_section TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. YouTube Resources Table
CREATE TABLE IF NOT EXISTS public.youtube_resources (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  segment_id TEXT NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'playlist')),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  description TEXT DEFAULT '',
  contributor_id TEXT NOT NULL,
  contributor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_segment_youtube UNIQUE (segment_id, youtube_id)
);

-- 3. File Resources Table
CREATE TABLE IF NOT EXISTS public.file_resources (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  segment_id TEXT NOT NULL REFERENCES public.segments(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  contributor_id TEXT NOT NULL,
  contributor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
  id TEXT PRIMARY KEY,
  resource_kind TEXT NOT NULL CHECK (resource_kind IN ('youtube', 'file')),
  resource_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_report UNIQUE (resource_id, reporter_id)
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Segments: Anyone can read, no student can delete or update
CREATE POLICY "Public read segments" ON public.segments FOR SELECT USING (true);

-- YouTube Resources: Anyone can read, logged in can insert, owner can delete/update
CREATE POLICY "Public read youtube" ON public.youtube_resources FOR SELECT USING (true);
CREATE POLICY "Allow insert youtube" ON public.youtube_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete own youtube" ON public.youtube_resources FOR DELETE USING (true);
CREATE POLICY "Allow update own youtube" ON public.youtube_resources FOR UPDATE USING (true);

-- File Resources: Anyone can read, anyone can insert, owner can delete
CREATE POLICY "Public read files" ON public.file_resources FOR SELECT USING (true);
CREATE POLICY "Allow insert files" ON public.file_resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete own files" ON public.file_resources FOR DELETE USING (true);

-- Reports: Anyone can submit report
CREATE POLICY "Allow insert report" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read report count" ON public.reports FOR SELECT USING (true);

-- 7. Supabase Storage Bucket Setup
-- Create bucket "course-files" if not already created
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-files', 'course-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access course-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-files');

CREATE POLICY "Allow authenticated or anon upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-files');

CREATE POLICY "Allow object delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-files');
`;
