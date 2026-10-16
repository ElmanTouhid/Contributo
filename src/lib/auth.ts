import { getSupabase } from './supabase';
import { RegisteredStudent } from '../types';

const PENDING_REG_KEY = 'contributo_pending_registration';

export interface PendingRegistration {
  email: string;
  studentId: string;
  displayName: string;
  timestamp: number;
}

/**
 * Validates IIUC university student email format:
 * Exactly c followed by 6 digits @ugrad.iiuc.bd (e.g. c253124@ugrad.iiuc.bd)
 */
export function validateIIUCEmail(email: string): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return /^c[0-9]{6}@ugrad\.iiuc\.bd$/.test(normalized);
}

/**
 * Validates IIUC university student ID format:
 * Exactly C followed by 6 digits (e.g. C253124)
 */
export function validateStudentID(studentId: string): boolean {
  if (!studentId) return false;
  const normalized = studentId.trim().toUpperCase();
  return /^C[0-9]{6}$/.test(normalized);
}

/**
 * Validates that the 6 digits in the Student ID match the student number in the email.
 */
export function doEmailAndIdMatch(email: string, studentId: string): boolean {
  if (!validateIIUCEmail(email) || !validateStudentID(studentId)) {
    return false;
  }
  const emailPrefix = email.trim().toLowerCase().split('@')[0];
  const normalizedId = studentId.trim().toLowerCase();
  return emailPrefix === normalizedId;
}

/**
 * Detects whether an RPC or table error indicates the database migration has not been applied yet.
 */
export function isDatabaseMigrationError(errorMessage?: string): boolean {
  if (!errorMessage) return false;
  const msg = errorMessage.toLowerCase();
  return (
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('function') && msg.includes('does not exist')) ||
    msg.includes('could not find the function') ||
    msg.includes('schema cache')
  );
}

/**
 * Stores pending registration details in sessionStorage to survive magic-link redirect on the same device.
 */
export function setPendingRegistration(email: string, studentId: string, displayName: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PendingRegistration = {
      email: email.trim().toLowerCase(),
      studentId: studentId.trim().toUpperCase(),
      displayName: displayName.trim(),
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(PENDING_REG_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save pending registration:', err);
  }
}

/**
 * Retrieves pending registration details from sessionStorage.
 */
export function getPendingRegistration(): PendingRegistration | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_REG_KEY);
    if (!raw) return null;
    const data: PendingRegistration = JSON.parse(raw);
    // Discard if older than 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      clearPendingRegistration();
      return null;
    }
    return data;
  } catch (err) {
    console.error('Failed to parse pending registration:', err);
    return null;
  }
}

/**
 * Clears pending registration details from sessionStorage.
 */
export function clearPendingRegistration(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_REG_KEY);
  } catch (err) {
    console.error('Failed to clear pending registration:', err);
  }
}

/**
 * Initiates the passwordless magic link flow with Supabase Auth.
 */
export async function sendMagicLink(params: {
  email: string;
  studentId: string;
  displayName: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase is not configured. Please provide Supabase URL and Anon Key.',
    };
  }

  const email = params.email.trim().toLowerCase();
  const studentId = params.studentId.trim().toUpperCase();
  const displayName = params.displayName.trim();

  // Strict format validation
  if (!validateIIUCEmail(email)) {
    return {
      success: false,
      error: 'Invalid email. Only official IIUC student emails (cXXXXXX@ugrad.iiuc.bd) are permitted.',
    };
  }

  if (!validateStudentID(studentId)) {
    return {
      success: false,
      error: 'Invalid student ID. ID must follow format CXXXXXX (e.g. C253124).',
    };
  }

  if (!doEmailAndIdMatch(email, studentId)) {
    return {
      success: false,
      error: 'Student ID does not match the university email number (e.g. C253124 must match c253124@ugrad.iiuc.bd).',
    };
  }

  if (displayName.length < 2 || displayName.length > 50) {
    return {
      success: false,
      error: 'Public display name must be between 2 and 50 characters.',
    };
  }

  // Preserve pending registration data in sessionStorage for return on same browser/device
  setPendingRegistration(email, studentId, displayName);

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      clearPendingRegistration();
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    clearPendingRegistration();
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send magic link.',
    };
  }
}

/**
 * Fetches the registered student profile from public.registered_students for the given auth user.
 */
export async function fetchRegisteredStudent(userId: string): Promise<RegisteredStudent | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('registered_students')
      .select('user_id, university_email, student_id, display_name, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // If table does not exist, log once and return null
      console.warn('fetchRegisteredStudent lookup note:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      userId: data.user_id,
      universityEmail: data.university_email,
      studentId: data.student_id,
      displayName: data.display_name,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('Error fetching registered student profile:', err);
    return null;
  }
}

/**
 * Registers an authenticated Supabase user by invoking the register_iiuc_student RPC.
 * Uses the authenticated user's confirmed email as the single source of truth.
 */
export async function registerAuthenticatedStudent(params: {
  studentId: string;
  displayName: string;
}): Promise<{
  success: boolean;
  profile?: RegisteredStudent;
  error?: string;
  isMigrationMissing?: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user || !user.email) {
    return { success: false, error: 'No active authenticated session found. Please sign in.' };
  }

  const authenticatedEmail = user.email.trim().toLowerCase();
  const normalizedId = params.studentId.trim().toUpperCase();
  const trimmedName = params.displayName.trim();

  // Validate format and match against authenticated email
  if (!validateIIUCEmail(authenticatedEmail)) {
    return {
      success: false,
      error: `Your authenticated email (${authenticatedEmail}) is not a valid IIUC student email.`,
    };
  }

  if (!validateStudentID(normalizedId)) {
    return {
      success: false,
      error: 'Invalid student ID format. Format must be CXXXXXX (e.g. C253124).',
    };
  }

  if (!doEmailAndIdMatch(authenticatedEmail, normalizedId)) {
    return {
      success: false,
      error: `Student ID ${normalizedId} does not match your authenticated email (${authenticatedEmail}). The six digits must match.`,
    };
  }

  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return {
      success: false,
      error: 'Public display name must be between 2 and 50 characters.',
    };
  }

  try {
    const { data, error } = await supabase.rpc('register_iiuc_student', {
      p_student_id: normalizedId,
      p_display_name: trimmedName,
    });

    if (error) {
      const isMissing = isDatabaseMigrationError(error.message);
      return {
        success: false,
        isMigrationMissing: isMissing,
        error: isMissing
          ? "Database migration not yet applied: The 'register_iiuc_student' function does not exist in Supabase. Please execute the SQL migration in your Supabase SQL Editor."
          : error.message,
      };
    }

    clearPendingRegistration();

    const profile = await fetchRegisteredStudent(user.id);
    return {
      success: true,
      profile: profile || {
        userId: user.id,
        universityEmail: authenticatedEmail,
        studentId: normalizedId,
        displayName: trimmedName,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed.';
    const isMissing = isDatabaseMigrationError(msg);
    return {
      success: false,
      isMigrationMissing: isMissing,
      error: isMissing
        ? "Database migration not yet applied: The 'register_iiuc_student' function does not exist in Supabase. Please execute the SQL migration in your Supabase SQL Editor."
        : msg,
    };
  }
}

/**
 * Checks for pending registration, protects against cross-user mix-ups on shared devices,
 * and handles cross-device registration completion when sessionStorage is empty.
 */
export async function completePendingRegistration(
  userId: string,
  authenticatedEmail: string
): Promise<{
  success: boolean;
  profile?: RegisteredStudent;
  requiresManualCompletion?: boolean;
  suggestedStudentId?: string;
  suggestedDisplayName?: string;
  error?: string;
  isMigrationMissing?: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase || !userId) {
    return { success: false, error: 'Supabase client or user session unavailable.' };
  }

  // 1. Verify if already registered in registered_students table
  const existing = await fetchRegisteredStudent(userId);
  if (existing) {
    clearPendingRegistration();
    return { success: true, profile: existing };
  }

  const pending = getPendingRegistration();

  // 2. Cross-Device Handling: If sessionStorage is empty (link opened on another device/browser)
  if (!pending) {
    let suggestedStudentId = '';
    if (validateIIUCEmail(authenticatedEmail)) {
      const numPart = authenticatedEmail.split('@')[0];
      suggestedStudentId = numPart.toUpperCase();
    }
    return {
      success: false,
      requiresManualCompletion: true,
      suggestedStudentId,
      error: 'Please enter your Student ID and Display Name to complete registration.',
    };
  }

  // 3. Prevent Cross-User Mix-ups: Verify pending email matches authenticated session
  if (pending.email.toLowerCase() !== authenticatedEmail.toLowerCase()) {
    console.warn(
      'Discarding mismatched pending registration for email:',
      pending.email,
      'vs authenticated session:',
      authenticatedEmail
    );
    clearPendingRegistration();

    let suggestedStudentId = '';
    if (validateIIUCEmail(authenticatedEmail)) {
      const numPart = authenticatedEmail.split('@')[0];
      suggestedStudentId = numPart.toUpperCase();
    }
    return {
      success: false,
      requiresManualCompletion: true,
      suggestedStudentId,
      error: 'Previous pending registration was for a different email. Please complete your registration.',
    };
  }

  // 4. Verify that the pending studentId matches the confirmed session email
  if (!doEmailAndIdMatch(authenticatedEmail, pending.studentId)) {
    clearPendingRegistration();
    return {
      success: false,
      requiresManualCompletion: true,
      error: 'Stored Student ID did not match the authenticated university email.',
    };
  }

  // 5. Pending data is verified against the authenticated session; invoke registration RPC
  return registerAuthenticatedStudent({
    studentId: pending.studentId,
    displayName: pending.displayName,
  });
}

/**
 * Updates the student's public display name via the secure RPC.
 */
export async function updateDisplayName(
  newDisplayName: string
): Promise<{ success: boolean; error?: string; isMigrationMissing?: boolean }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  const trimmed = newDisplayName.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { success: false, error: 'Display name must be between 2 and 50 characters.' };
  }

  try {
    const { error } = await supabase.rpc('update_student_display_name', {
      p_new_display_name: trimmed,
    });

    if (error) {
      const isMissing = isDatabaseMigrationError(error.message);
      return {
        success: false,
        isMigrationMissing: isMissing,
        error: isMissing
          ? "Database migration not yet applied: The 'update_student_display_name' RPC does not exist in Supabase."
          : error.message,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update display name.';
    const isMissing = isDatabaseMigrationError(msg);
    return {
      success: false,
      isMigrationMissing: isMissing,
      error: isMissing
        ? "Database migration not yet applied: The 'update_student_display_name' RPC does not exist in Supabase."
        : msg,
    };
  }
}

/**
 * Signs out the current student from Supabase Auth.
 */
export async function signOutStudent(): Promise<void> {
  const supabase = getSupabase();
  clearPendingRegistration();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
