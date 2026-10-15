import React from 'react';
import { ArrowRight, BookOpen, Bookmark, FileText, Film, Sparkles } from 'lucide-react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  totalSharedResources: number;
  segmentCount: number;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onSelectCourse: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  totalSharedResources,
  segmentCount,
  isFavorite,
  onToggleFavorite,
  onSelectCourse,
}) => {
  return (
    <div
      onClick={onSelectCourse}
      className="bg-white border border-stone-200/90 hover:border-orange-500/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <div>
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-orange-100 text-orange-900 font-extrabold text-xs rounded-lg border border-orange-200 tracking-wide font-mono">
              {course.code}
            </span>
            <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
              {course.badge}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isFavorite
                ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                : 'text-stone-300 hover:text-stone-600 hover:bg-stone-50'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Toggle favorite"
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-stone-900 group-hover:text-orange-950 transition-colors mb-1.5 leading-snug">
          {course.title}
        </h3>

        {/* Department */}
        <p className="text-xs text-stone-500 mb-3">
          {course.department}
        </p>

        {/* Description snippet */}
        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-5">
          {course.shortDesc}
        </p>
      </div>

      {/* Bottom row: Live count & Segments */}
      <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Real live count - zero fake numbers */}
          <span
            className={`font-bold px-2.5 py-1 rounded-lg ${
              totalSharedResources > 0
                ? 'bg-orange-50 text-orange-800 border border-orange-200'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {totalSharedResources} {totalSharedResources === 1 ? 'Shared Resource' : 'Shared Resources'}
          </span>
          <span className="text-[11px] text-stone-400">
            ({segmentCount} Segments)
          </span>
        </div>

        <span className="flex items-center gap-1 font-bold text-orange-600 group-hover:text-orange-700 transition-colors">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </div>
  );
};
