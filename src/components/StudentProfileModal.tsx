import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  GraduationCap,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X
} from 'lucide-react';
import {
  registerPublicStudent,
  signOutStudent,
  updateDisplayName,
  validateEmail,
  validateStudentID
} from '../lib/auth';
import { RegisteredStudent } from '../types';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RegisteredStudent | null;
  onProfileUpdated: (student: RegisteredStudent | null) => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}) => {
  // Public Registration Form State
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Edit Display Name State (for registered students)
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  if (!isOpen) return null;

  // Handle Public Registration Form
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const normEmail = email.trim().toLowerCase();
    const normId = studentId.trim().toUpperCase();
    const normName = displayName.trim();

    if (!normEmail) {
      setStatusMsg({ text: 'Please enter your email address.', isError: true });
      return;
    }
    if (!validateEmail(normEmail)) {
      setStatusMsg({
        text: 'Please enter a valid email address (e.g. student@example.com).',
        isError: true,
      });
      return;
    }

    if (!normId) {
      setStatusMsg({ text: 'Please enter your Student ID.', isError: true });
      return;
    }
    if (!validateStudentID(normId)) {
      setStatusMsg({
        text: 'Please enter a valid Student ID (2–30 characters).',
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
    const result = await registerPublicStudent({
      email: normEmail,
      studentId: normId,
      displayName: normName,
    });
    setIsSubmitting(false);

    if (result.success && result.profile) {
      onProfileUpdated(result.profile);
      onClose();
    } else {
      setStatusMsg({
        text: result.error || 'Failed to register. Please check your connection.',
        isError: true,
      });
    }
  };

  // Edit Display Name
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    const trimmed = newDisplayName.trim();

    if (trimmed.length < 2 || trimmed.length > 50) {
      setNameError('Display name must be between 2 and 50 characters.');
      return;
    }

    setIsSavingName(true);
    const result = await updateDisplayName(trimmed, currentUser?.userId);
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
                <h2 className="text-lg font-bold text-stone-900">Student Profile</h2>
                <p className="text-xs text-stone-500">Registered Contributo Member</p>
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
                        className="p-1 text-stone-400 hover:text-orange-700 rounded-md hover:bg-orange-100 transition-colors cursor-pointer"
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
                        className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        title="Save name"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="p-1.5 text-stone-500 hover:bg-stone-200 rounded-lg text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  )}
                  {nameError && <p className="text-[11px] text-red-600 mt-1">{nameError}</p>}
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Active
                </span>
              </div>

              <div className="pt-2 border-t border-orange-200/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 block">Student ID</span>
                  <span className="font-mono font-bold text-stone-800">{currentUser.studentId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 block">Registered Email</span>
                  <span className="font-mono text-stone-700 truncate block text-[11px]">
                    {currentUser.email || currentUser.universityEmail}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 italic pt-1">
                Your display name is shown on study resources you share with fellow students.
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 hover:border-red-300 hover:bg-red-50 text-stone-700 hover:text-red-700 text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Student / Change ID</span>
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* 2. SIMPLE PUBLIC REGISTRATION FORM                       */
          /*    (No passwords, magic links, or Supabase Auth)         */
          /* ======================================================== */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Student Registration</h2>
                <p className="text-xs text-stone-500">Join Contributo to share & contribute resources</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 mb-5 text-xs text-stone-700 leading-relaxed">
              <p>
                <strong>Open to students worldwide.</strong> No password, verification link, or OTP required. Simply register your email and Student ID to start sharing learning materials.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setStatusMsg(null);
                    }}
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Any valid email address is accepted
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
                    placeholder="e.g. C253124 or S102938"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 uppercase placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                    required
                  />
                  <GraduationCap className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Your university or college student identification number
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
                  placeholder="e.g. Alex Rahman"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  required
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Displayed on your shared lectures, notes, and study materials
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
                <UserCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Complete Registration'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
