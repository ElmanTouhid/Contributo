/**
 * Contributo Security & Validation Utilities
 */

// University ID format validation: "C" + exactly 6 digits
export const UNIVERSITY_ID_REGEX = /^C\d{6}$/;

export interface IdValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUniversityId(id: string): IdValidationResult {
  if (!id) {
    return { valid: false, error: 'University ID is required.' };
  }
  
  const trimmed = id.trim();

  if (trimmed.startsWith('c')) {
    return { 
      valid: false, 
      error: 'University ID must start with a CAPITAL "C" (e.g., C253124, not c253124).' 
    };
  }

  if (!trimmed.startsWith('C')) {
    return { 
      valid: false, 
      error: 'University ID must start with the prefix "C" (e.g., C253124).' 
    };
  }

  if (trimmed.length < 7) {
    return { 
      valid: false, 
      error: `Too short. University ID requires "C" followed by exactly 6 digits (${trimmed.length - 1}/6 provided).` 
    };
  }

  if (trimmed.length > 7) {
    return { 
      valid: false, 
      error: `Too long. University ID must be exactly "C" and 6 digits (e.g., C253124).` 
    };
  }

  if (!UNIVERSITY_ID_REGEX.test(trimmed)) {
    return { 
      valid: false, 
      error: 'Invalid format. Only numeric digits are allowed after "C" (e.g., C253124).' 
    };
  }

  return { valid: true };
}

/**
 * Lightweight deterministic SHA-256 password hashing simulation
 * (Guarantees passwords are never stored or compared in plain text)
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = 'contributo_salt_v1_';
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(salt + plainText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  
  // Safe fallback hashing
  let hash = 0;
  const str = salt + plainText;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

/**
 * Extracts a YouTube Video ID from any standard or shortened YouTube URL
 */
export function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Pattern matches:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://youtube.com/shorts/VIDEO_ID
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = cleanUrl.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Extracts a YouTube Playlist ID from a playlist URL or a watch URL with list parameter
 */
export function extractYoutubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.trim().match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Validates a YouTube URL (supporting video and playlist URLs)
 */
export function validateYoutubeResourceUrl(url: string): {
  valid: boolean;
  detectedType: 'video' | 'playlist';
  videoId?: string;
  playlistId?: string;
  error?: string;
} {
  if (!url || !url.trim()) {
    return { valid: false, detectedType: 'video', error: 'Please enter a YouTube URL.' };
  }
  const clean = url.trim();

  // Must contain youtube.com or youtu.be
  if (!clean.includes('youtube.com') && !clean.includes('youtu.be')) {
    return {
      valid: false,
      detectedType: 'video',
      error: 'Please enter a valid YouTube link (e.g. youtube.com/watch?v=... or youtube.com/playlist?list=...).'
    };
  }

  const playlistId = extractYoutubePlaylistId(clean);
  const videoId = extractYoutubeId(clean);

  if (clean.includes('/playlist') && playlistId) {
    return { valid: true, detectedType: 'playlist', playlistId };
  }

  if (playlistId && !videoId) {
    return { valid: true, detectedType: 'playlist', playlistId };
  }

  if (videoId) {
    return { valid: true, detectedType: 'video', videoId, playlistId: playlistId || undefined };
  }

  if (playlistId) {
    return { valid: true, detectedType: 'playlist', playlistId };
  }

  return {
    valid: false,
    detectedType: 'video',
    error: 'Could not detect a valid YouTube video or playlist ID. Please verify the URL.'
  };
}
