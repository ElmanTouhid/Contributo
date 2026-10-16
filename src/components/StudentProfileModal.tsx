import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit2,
  GraduationCap,
  LogIn,
  LogOut,
  Mail,
  Save,
  Send,
  ShieldCheck,
  UserCheck,
  X
} from 'lucide-react';
import {
  doEmailAndIdMatch,
  registerAuthenticatedStudent,
  sendMagicLink,
  signOutStudent,
  updateDisplayName,
  validateIIUCEmail,
  validateStudentID
} from '../lib/auth';
import { RegisteredStudent } from '../types';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RegisteredStudent | null;
  authSessionUser?: { id: string; email: string } | null;
  initialStudentId?: string;
  initialDisplayName?: string;
  onProfileUpdated: (student: RegisteredStudent | null) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  authSessionUser,
  initialStudentId = '',
  initialDisplayName = '',
  onProfileUpdated,
}) => {
  // Guest Magic Link Form State
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean; isMigrationError?: boolean } | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  // Authenticated Completion Form State (Cross-device / missing sessionStorage)
  const [completionStudentId, setCompletionStudentId] = useState('');
  const [completionDisplayName, setCompletionDisplayName] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMsg, setCompletionMsg] = useState<{ text: string; isError: boolean; isMigrationError?: boolean } | null>(null);

  // Edit Display Name State (for registered students)
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  // Sync pre-filled values when opening
  useEffect(() => {
    if (authSessionUser && !currentUser) {
      // Derive suggested student ID from authenticated email prefix (e.g. c253124@ugrad.iiuc.ac.bd -> C253124)
      const prefix = authSessionUser.email.split('@')[0];
      const autoId = initialStudentId || (validateStudentID(prefix) ? prefix.toUpperCase() : '');
      setCompletionStudentId(autoId);
      if (initialDisplayName) {
        setCompletionDisplayName(initialDisplayName);
      }
    }
  }, [authSessionUser, currentUser, initialStudentId, initialDisplayName, isOpen]);

  if (!isOpen) return null;

  // 1. Guest: Request Magic Link
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const normEmail = email.trim().toLowerCase();
    const normId = studentId.trim().toUpperCase();
    const normName = displayName.trim();

    if (!normEmail) {
      setStatusMsg({ text: 'Please enter your IIUC student email.', isError: true });
      return;
    }
    if (!validateIIUCEmail(normEmail)) {
      setStatusMsg({
        text: 'Invalid email format. Format must be cXXXXXX@ugrad.iiuc.ac.bd (e.g. c253124@ugrad.iiuc.ac.bd).',
        isError: true,
      });
      return;
    }

    if (!normId) {
      setStatusMsg({ text: 'Please enter your university Student ID.', isError: true });
      return;
    }
    if (!validateStudentID(normId)) {
      setStatusMsg({
        text: 'Invalid student ID. Format must be CXXXXXX (e.g. C253124).',
        isError: true,
      });
      return;
    }

    if (!doEmailAndIdMatch(normEmail, normId)) {
      setStatusMsg({
        text: 'Student ID does not match the email prefix (e.g. C253124 must match c253124@ugrad.iiuc.ac.bd).',
        isError: true,
      });
      return;
    }

    if (!normName || normName.length < 2 || normName.length > 50) {
      setStatusMsg({
        text: 'Please enter a public display name between 2 and 50 characters.',
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);
    const result = await sendMagicLink({
      email: normEmail,
      studentId: normId,
      displayName: normName,
    });
    setIsSubmitting(false);

    if (result.success) {
      setLinkSent(true);
      setStatusMsg({
        text: `A secure sign-in link has been sent to ${normEmail}. Click the link in your email to sign in without a password.`,
        isError: false,
      });
    } else {
      setStatusMsg({
        text: result.error || 'Failed to send magic link. Please verify your connection.',
        isError: true,
      });
    }
  };

  // 2. Authenticated: Complete Registration Form (Cross-device / sessionStorage missing)
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompletionMsg(null);

    if (!authSessionUser) {
      setCompletionMsg({ text: 'No active session found. Please request a new sign-in link.', isError: true });
      return;
    }

    const normId = completionStudentId.trim().toUpperCase();
    const normName = completionDisplayName.trim();

    if (!validateStudentID(normId)) {
      setCompletionMsg({
        text: 'Invalid student ID format. Format must be CXXXXXX (e.g. C253124).',
        isError: true,
      });
      return;
    }

    if (!doEmailAndIdMatch(authSessionUser.email, normId)) {
      setCompletionMsg({
        text: `Student ID ${normId} does not match your authenticated email (${authSessionUser.email}). The six digits must match.`,
        isError: true,
      });
      return;
    }

    if (normName.length < 2 || normName.length > 50) {
      setCompletionMsg({
        text: 'Public display name must be between 2 and 50 characters.',
        isError: true,
      });
      return;
    }

    setIsCompleting(true);
    const result = await registerAuthenticatedStudent({
      studentId: normId,
      displayName: normName,
    });
    setIsCompleting(false);

    if (result.success && result.profile) {
      onProfileUpdated(result.profile);
      onClose();
    } else {
      setCompletionMsg({
        text: result.error || 'Failed to complete registration.',
        isError: true,
        isMigrationError: result.isMigrationMissing,
      });
    }
  };

  // 3. Edit Display Name
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    const trimmed = newDisplayName.trim();

    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError('Display name must be between 2 and 50 characters.');
      return;
    }

    setIsSavingName(true);
    const result = await updateDisplayName(trimmed);
    setIsSavingName(false);

    if (result.success && currentUser) {
      const updated: RegisteredStudent = {
        ...currentUser,
        displayName: trimmed,
      };
      onProfileUpdated(updated);
      setIsEditingName(false);
    } else {
      setNameError(result.error || 'Failed to update display name.');
    }
  };

  const handleSignOut = async () => {
    await signOutStudent();
    onProfileUpdated(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl p-6 sm:p-7 text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          /* ======================================================== */
          /* 1. REGISTERED STUDENT PROFILE                            */
          /* ======================================================== */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Verified Student Profile</h2>
                <p className="text-xs text-stone-500">Authenticated via IIUC University Email</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-orange-50/80 border border-orange-200 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Display Name
                  </span>
                  {!isEditingName ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-base font-bold text-stone-900">
                        {currentUser.displayName}
                      </span>
                      <button
                        onClick={() => {
                          setNewDisplayName(currentUser.displayName);
                          setIsEditingName(true);
                        }}
                        className="p-1 text-stone-400 hover:text-orange-700 rounded-md hover:bg-orange-100 transition-colors"
                        title="Edit display name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateName} className="mt-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={isSavingName}
                        className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
                        title="Save name"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                  {nameError && <p className="text-[11px] text-red-600 mt-1">{nameError}</p>}
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </span>
              </div>

              <div className="pt-2 border-t border-orange-200/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 block">Student ID</span>
                  <span className="font-mono font-bold text-stone-800">{currentUser.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">University Email</span>
                  <span className="font-mono text-stone-700 truncate block text-[11px]">
                    {currentUser.universityEmail}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 italic pt-1">
                Student ID and university email are immutable for academic accountability.
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 hover:border-red-300 hover:bg-red-50 text-stone-700 hover:text-red-700 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : authSessionUser ? (
          /* ======================================================== */
          /* 2. AUTHENTICATED SESSION — REGISTRATION COMPLETION       */
          /*    (Cross-device / new tab / missing sessionStorage)      */
          /* ======================================================== */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Complete Student Registration</h2>
                <p className="text-xs text-stone-500">Email verified · Confirm your student details</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 mb-4 text-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Inbox Verified via Magic Link</span>
              </div>
              <p className="text-emerald-800 font-mono text-[11px] bg-white/80 px-2 py-1 rounded border border-emerald-200/60 truncate">
                {authSessionUser.email}
              </p>
              <p className="text-stone-600 text-[11px] mt-1.5 leading-relaxed">
                Your email is confirmed. Enter your matching Student ID and Public Display Name to
                finalize your academic profile.
              </p>
            </div>

            <form onSubmit={handleCompleteRegistration} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  University Student ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={completionStudentId}
                    onChange={(e) => {
                      setCompletionStudentId(e.target.value);
                      setCompletionMsg(null);
                    }}
                    placeholder="C253124"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 uppercase placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <GraduationCap className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Must match the student number in your confirmed email ({authSessionUser.email.split('@')[0].toUpperCase()})
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Public Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={completionDisplayName}
                  onChange={(e) => {
                    setCompletionDisplayName(e.target.value);
                    setCompletionMsg(null);
                  }}
                  placeholder="e.g. Md. Elman"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  required
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Displayed as the contributor on resources you share
                </span>
              </div>

              {completionMsg && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
                    completionMsg.isError
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {completionMsg.isMigrationError ? (
                    <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{completionMsg.text}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  type="submit"
                  disabled={isCompleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isCompleting ? 'Saving Registration...' : 'Complete Registration'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ======================================================== */
          /* 3. GUEST / PASSWORDLESS SIGN IN & REGISTRATION           */
          /* ======================================================== */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Student Sign In & Register</h2>
                <p className="text-xs text-stone-500">Passwordless · Magic link to IIUC email</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 mb-5 text-xs text-stone-700 leading-relaxed">
              <p>
                <strong>No password or OTP required.</strong> Enter your official IIUC student email
                and matching student ID. We will email you a secure one-click sign-in link.
              </p>
            </div>

            {linkSent ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="text-base font-bold text-stone-900">Check Your Email Inbox</h3>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  We sent a magic link to <strong>{email.trim().toLowerCase()}</strong>. Click the
                  link in the email to complete verification and access your student account.
                </p>
                <button
                  onClick={() => {
                    setLinkSent(false);
                    setStatusMsg(null);
                  }}
                  className="mt-3 text-xs text-orange-700 font-semibold hover:underline cursor-pointer"
                >
                  Use a different email or resend
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    IIUC University Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setStatusMsg(null);
                      }}
                      placeholder="c253124@ugrad.iiuc.ac.bd"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Format: cXXXXXX@ugrad.iiuc.ac.bd
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setStatusMsg(null);
                      }}
                      placeholder="C253124"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 uppercase placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <GraduationCap className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Must match the student number in your email (e.g. C253124)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Public Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setStatusMsg(null);
                    }}
                    placeholder="e.g. Md. Elman"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Displayed on your shared lectures and study materials
                  </span>
                </div>

                {statusMsg && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
                      statusMsg.isError
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {statusMsg.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending Magic Link...' : 'Send Magic Link'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
