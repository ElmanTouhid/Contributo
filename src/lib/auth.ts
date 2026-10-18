import { getSupabase } from './supabase';
import { RegisteredStudent } from '../types';

const LOCAL_STUDENT_KEY = 'contributo_registered_student';

/**
 * Validates any standard email format worldwide.
 * Does not require a university email domain.
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

/**
 * Backward compatibility alias.
 */
export function validateIIUCEmail(email: string): boolean {
  return validateEmail(email);
}

/**
 * Validates student ID format:
 * Accepts any non-empty student ID (e.g. C253124, 21-45678-1, S102938, etc.)
 */
export function validateStudentID(studentId: string): boolean {
  if (!studentId) return false;
  const normalized = studentId.trim();
  return normalized.length >= 2 && normalized.length <= 30;
}

/**
 * Checks whether email and ID match (kept for backward compatibility, returns true if valid).
 */
export function doEmailAndIdMatch(email: string, studentId: string): boolean {
  return validateEmail(email) && validateStudentID(studentId);
}

/**
 * Generates a valid RFC4122 v4 UUID string matching PostgreSQL's uuid column type.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates if a string is a valid UUID.
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Retrieves the currently registered student from localStorage.
 * Auto-migrates any non-UUID legacy identifier to a valid UUID.
 */
export function getLocalStudent(): RegisteredStudent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STUDENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisteredStudent>;
    if (!parsed || !parsed.studentId) return null;

    // Ensure email and universityEmail are synced
    const emailVal = parsed.email || parsed.universityEmail || '';
    let userId = parsed.userId || '';

    // Auto-migrate legacy non-UUID IDs to a valid UUID
    if (!isValidUUID(userId)) {
      userId = generateUUID();
    }

    const student: RegisteredStudent = {
      userId,
      email: emailVal,
      universityEmail: emailVal,
      studentId: parsed.studentId,
      displayName: parsed.displayName || 'Student',
      createdAt: parsed.createdAt || new Date().toISOString(),
    };

    // If userId was migrated or email synced, re-save
    if (student.userId !== parsed.userId || student.email !== parsed.email) {
      saveLocalStudent(student);
    }

    return student;
  } catch (err) {
    console.error('Failed to parse local registered student:', err);
    return null;
  }
}

/**
 * Saves registered student profile to localStorage.
 */
export function saveLocalStudent(student: RegisteredStudent): void {
  if (typeof window === 'undefined') return;
  try {
    const emailVal = student.email || student.universityEmail || '';
    const toSave: RegisteredStudent = {
      ...student,
      email: emailVal,
      universityEmail: emailVal,
    };
    window.localStorage.setItem(LOCAL_STUDENT_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('Failed to save local student:', err);
  }
}

/**
 * Clears registered student profile from localStorage.
 */
export function clearLocalStudent(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LOCAL_STUDENT_KEY);
  } catch (err) {
    console.error('Failed to clear local student:', err);
  }
}

/**
 * Fetches the active registered student.
 * In a public system without Supabase Auth, client-supplied UUIDs do not prove ownership,
 * and registered_students rows are not publicly queryable to protect student privacy.
 */
export async function fetchRegisteredStudent(userId: string): Promise<RegisteredStudent | null> {
  if (!userId) return null;
  const local = getLocalStudent();
  if (local && local.userId === userId) {
    return local;
  }
  return null;
}

/**
 * Safely fetches the total count of registered students without reading private rows.
 */
export async function fetchRegisteredStudentCount(): Promise<number | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    // Secure RPC function: counts rows server-side without transferring any student details
    const { data, error } = await supabase.rpc('get_registered_student_count');
    if (!error && data !== null && data !== undefined) {
      return Number(data);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Public Registration:
 * Registers a student directly in Supabase without passwords, magic links, OTPs, or Supabase Auth.
 * 
 * Works with actual schema:
 *   user_id uuid
 *   student_id text
 *   email text
 *   display_name text
 *   created_at timestamptz
 * 
 * Enforces duplicate checks for email and student ID so users are not repeatedly counted.
 * Does NOT return or modify any existing student's data if an email or student ID already exists.
 */
export async function registerPublicStudent(params: {
  email: string;
  studentId: string;
  displayName: string;
}): Promise<{
  success: boolean;
  profile?: RegisteredStudent;
  error?: string;
}> {
  const normEmail = params.email.trim().toLowerCase();
  const normId = params.studentId.trim().toUpperCase();
  const normName = params.displayName.trim();

  if (!normEmail) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!validateEmail(normEmail)) {
    return { success: false, error: 'Please enter a valid email address (e.g. student@example.com).' };
  }

  if (!normId) {
    return { success: false, error: 'Please enter your Student ID.' };
  }
  if (!validateStudentID(normId)) {
    return { success: false, error: 'Student ID must be between 2 and 30 characters.' };
  }

  if (!normName || normName.length < 2 || normName.length > 50) {
    return { success: false, error: 'Display name must be between 2 and 50 characters.' };
  }

  const candidateUserId = generateUUID();
  const supabase = getSupabase();

  // If Supabase is not configured yet, save locally so preview/browsing works immediately
  if (!supabase) {
    const localProfile: RegisteredStudent = {
      userId: candidateUserId,
      email: normEmail,
      universityEmail: normEmail,
      studentId: normId,
      displayName: normName,
      createdAt: new Date().toISOString(),
    };
    saveLocalStudent(localProfile);
    return { success: true, profile: localProfile };
  }

  try {
    // 1. Try atomic public registration RPC function
    const { data: rpcRows, error: rpcError } = await supabase.rpc('register_public_student', {
      p_email: normEmail,
      p_student_id: normId,
      p_display_name: normName,
    });

    if (rpcError) {
      if (
        rpcError.code === '23505' ||
        rpcError.message?.toLowerCase().includes('already registered') ||
        rpcError.message?.toLowerCase().includes('unique') ||
        rpcError.message?.toLowerCase().includes('duplicate')
      ) {
        return {
          success: false,
          error: 'This email address or student ID is already registered.',
        };
      }
      return { success: false, error: rpcError.message || 'Registration failed.' };
    }

    if (Array.isArray(rpcRows) && rpcRows.length > 0) {
      const row = rpcRows[0] as unknown as {
        user_id: string;
        email: string;
        student_id: string;
        display_name: string;
        created_at: string;
      };
      const profile: RegisteredStudent = {
        userId: row.user_id,
        email: row.email,
        universityEmail: row.email,
        studentId: row.student_id,
        displayName: row.display_name,
        createdAt: row.created_at,
      };
      saveLocalStudent(profile);
      return { success: true, profile };
    }

    return {
      success: false,
      error: 'Registration was submitted but no record was returned. Please try again.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    console.error('Registration exception:', err);
    return { success: false, error: msg };
  }
}

/**
 * Updates student's display name.
 * Stored locally on the user's active client session.
 * Does not perform unauthenticated database mutations because client UUIDs do not prove ownership.
 */
export async function updateDisplayName(
  newDisplayName: string,
  _userId?: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = newDisplayName.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { success: false, error: 'Display name must be between 2 and 50 characters.' };
  }

  const local = getLocalStudent();
  if (local) {
    saveLocalStudent({
      ...local,
      displayName: trimmed,
    });
  }

  return { success: true };
}

/**
 * Signs out / switches student by clearing local storage.
 */
export async function signOutStudent(): Promise<void> {
  clearLocalStudent();
}

/**
 * Backward compatibility stubs
 */
export async function completePendingRegistration() {
  return { success: true };
}

export async function sendMagicLink() {
  return { success: true };
}

export async function registerAuthenticatedStudent() {
  return { success: true };
}
