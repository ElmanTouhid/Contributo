import React from 'react';
import {
  Bookmark,
  GraduationCap
} from 'lucide-react';

interface NavbarProps {
  isSupabaseLive: boolean;
  onOpenSupabaseSetup: () => void;
  activeView: 'courses' | 'favorites' | 'syllabus';
  onSelectView: (view: 'courses' | 'favorites' | 'syllabus') => void;
  favoriteCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isSupabaseLive,
  onOpenSupabaseSetup,
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

          {/* Right Header: Supabase Status */}
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
          </div>
        </div>
      </div>
    </header>
  );
};
