import React from 'react';
import { BookOpen, Database, FolderPlus, Layers, Search, Sparkles, Users } from 'lucide-react';
import { StudentProfile } from '../types';

interface DashboardHeroProps {
  currentStudent: StudentProfile;
  totalResources: number;
  totalSegments: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSupabaseSetup: () => void;
  isSupabaseLive: boolean;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  currentStudent,
  totalResources,
  totalSegments,
  searchQuery,
  onSearchChange,
  onOpenSupabaseSetup,
  isSupabaseLive,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFF7ED] via-[#FFFDF9] to-[#FAF5EE] border border-amber-200/90 p-6 sm:p-10 mb-10 shadow-xs">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-64 h-64 bg-amber-100/50 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl">
        {/* Contributo Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-900 border border-orange-200 text-xs font-bold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Student-to-Student University Knowledge Sharing</span>
        </div>

        {/* Greeting & Subtitle */}
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight mb-3">
          Welcome back, {currentStudent.displayName} 👋
        </h1>

        <p className="text-sm sm:text-base text-stone-700 font-medium mb-1 leading-relaxed">
          Student-shared YouTube videos and files, organized by course and syllabus topic.
        </p>
        <p className="text-xs sm:text-sm text-stone-500 mb-8 leading-relaxed">
          Discover and share useful learning resources with your university peers.
        </p>

        {/* Search Bar */}
        <div className="relative max-w-2xl mb-8">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search across 8 courses, syllabus segments, topics (e.g. BST, Matrix, Kinetics)..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 shadow-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 bg-stone-100 px-2 py-1 rounded-md cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/90 backdrop-blur-xs border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-center shadow-2xs">
            <span className="block text-xl sm:text-2xl font-black text-orange-950">
              8
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-stone-600">
              Active Courses
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur-xs border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-center shadow-2xs">
            <span className="block text-xl sm:text-2xl font-black text-amber-950">
              {totalSegments}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-stone-600">
              Syllabus Segments
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur-xs border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-center shadow-2xs">
            <span className="block text-xl sm:text-2xl font-black text-emerald-900">
              {totalResources}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-stone-600">
              Shared Resources
            </span>
          </div>

          <div
            onClick={onOpenSupabaseSetup}
            className={`cursor-pointer border rounded-2xl p-3.5 sm:p-4 text-center shadow-2xs transition-all ${
              isSupabaseLive
                ? 'bg-emerald-50/90 border-emerald-300 hover:bg-emerald-100/90'
                : 'bg-amber-100/80 border-amber-300 hover:bg-amber-200/80'
            }`}
          >
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseLive ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse'
                }`}
              />
              <span className="text-xs sm:text-sm font-black text-stone-900">
                {isSupabaseLive ? 'Supabase Live' : 'Setup DB'}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-600 block">
              {isSupabaseLive ? 'Shared Backend' : 'Click to Configure'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
