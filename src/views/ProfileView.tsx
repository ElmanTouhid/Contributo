import React from 'react';
import { 
  User, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  GraduationCap, 
  BookOpen, 
  Bookmark, 
  CheckCircle2, 
  KeyRound,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';

export const ProfileView: React.FC = () => {
  const { currentUser } = useAuth();
  const { favorites, history, courses } = useResources();

  if (!currentUser) return null;

  const completedCount = history.filter(h => h.completed).length;

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center font-bold text-3xl shrink-0 shadow-inner">
            {currentUser.name.charAt(0)}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                Verified Student
              </span>
              <span className="text-xs text-slate-500 font-medium capitalize">
                Role: {currentUser.role}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {currentUser.name}
            </h1>

            {/* Crucial requirement: Full University ID visible to logged-in student */}
            <div className="flex items-center gap-2 text-base text-slate-700">
              <span>University ID:</span>
              <span className="font-mono font-bold text-lg text-orange-600 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-300">
                {currentUser.universityId}
              </span>
            </div>
          </div>
        </div>

        {/* Security Isolation Notice */}
        <div className="mt-6 pt-5 border-t border-[#F2ECE1] bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-slate-900">Academic Privacy Policy: </span>
            Your University ID (<span className="font-mono font-semibold text-orange-700">{currentUser.universityId}</span>) and academic records are visible only to your session. Contributo prevents peer exposure of University IDs across student interfaces.
          </div>
        </div>
      </div>

      {/* Academic Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#EAE4D9] text-center">
          <div className="text-xs text-slate-500 uppercase font-semibold">Saved</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{favorites.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bookmarks</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE4D9] text-center">
          <div className="text-xs text-slate-500 uppercase font-semibold">Watched</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">{history.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lectures</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE4D9] text-center">
          <div className="text-xs text-slate-500 uppercase font-semibold">Mastered</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{completedCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Completed</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#EAE4D9] text-center">
          <div className="text-xs text-slate-500 uppercase font-semibold">Enrolled</div>
          <div className="text-2xl font-bold font-mono text-orange-600 mt-1">{courses.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Courses</div>
        </div>
      </div>

      {/* Student Details Grid */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 border-b border-[#F2ECE1] pb-3">
          Student Information Record
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Department
            </span>
            <div className="text-slate-900 font-medium">
              {currentUser.department}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Batch / Cohort
            </span>
            <div className="text-slate-900 font-medium">
              {currentUser.batch || '25th Academic Batch'}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Account Created</span>
            </span>
            <div className="text-slate-900 font-medium font-mono text-xs sm:text-sm">
              {new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last Login</span>
            </span>
            <div className="text-slate-900 font-medium font-mono text-xs sm:text-sm">
              {new Date(currentUser.lastLogin).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2 pt-2 border-t border-[#F2ECE1]">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Security Hash Status</span>
            </span>
            <div className="text-xs font-mono text-slate-600 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EDE8DF] flex items-center justify-between">
              <span>SHA-256 Digest Active: Passwords encrypted and salted</span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Protected
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
