import React from 'react';
import {
  Bookmark,
  GraduationCap,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { RegisteredStudent } from '../types';

interface NavbarProps {
  currentUser: RegisteredStudent | null;
  authSessionUser?: { id: string; email: string } | null;
  isSupabaseLive: boolean;
  onOpenSupabaseSetup: () => void;
  onOpenProfile: () => void;
  activeView: 'courses' | 'favorites' | 'syllabus';
  onSelectView: (view: 'courses' | 'favorites' | 'syllabus') => void;
  favoriteCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isSupabaseLive,
  onOpenSupabaseSetup,
  onOpenProfile,
  activeView,
  onSelectView,
  favoriteCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-amber-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => onSelectView('courses')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 group-hover:text-orange-950 transition-colors">
                  Contributo
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                  Academic
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                Course & Syllabus Resource Sharing
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onSelectView('courses')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'courses'
                  ? 'bg-orange-100/80 text-orange-950'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
              }`}
            >
              8 Courses
            </button>

            <button
              onClick={() => onSelectView('favorites')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'favorites'
                  ? 'bg-orange-100/80 text-orange-950'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-orange-600" />
              <span>Favorites</span>
              {favoriteCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-orange-600 text-white text-[10px] font-extrabold">
                  {favoriteCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('syllabus')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeView === 'syllabus'
                  ? 'bg-orange-100/80 text-orange-950'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/60'
              }`}
            >
              Official Syllabus Guide
            </button>
          </nav>

          {/* Right Header: Supabase Status & Student Auth / Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase status pill */}
            <button
              onClick={onOpenSupabaseSetup}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isSupabaseLive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to view Supabase shared backend configuration"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline">
                {isSupabaseLive ? 'Supabase Connected' : 'Setup Supabase'}
              </span>
              <span className="sm:hidden font-mono text-[11px]">DB</span>
            </button>

            {/* Student Profile / Register Button */}
            {currentUser ? (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50/50 transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-2xs bg-orange-600">
                  {currentUser.displayName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(-2)
                    .join('')}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs font-bold text-stone-900 leading-tight truncate max-w-[120px]">
                      {currentUser.displayName}
                    </span>
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="block text-[10px] text-stone-500 leading-tight font-mono">
                    {currentUser.studentId}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-orange-300 bg-orange-50/80 hover:bg-orange-100 text-orange-950 transition-all cursor-pointer shadow-2xs text-xs font-bold"
              >
                <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                <span>Register Student ID</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
