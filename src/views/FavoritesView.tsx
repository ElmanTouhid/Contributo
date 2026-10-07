import React, { useState } from 'react';
import { 
  Bookmark, 
  Trash2, 
  PlayCircle, 
  Clock, 
  ExternalLink, 
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';

interface FavoritesViewProps {
  onSelectCourse: (courseId: string) => void;
  onBrowseCourses: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ onSelectCourse, onBrowseCourses }) => {
  const { currentUser } = useAuth();
  const { 
    favorites, 
    removeFromFavorites, 
    openResourceModal, 
    getResourceById,
    courses 
  } = useResources();

  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Hydrate favorite resources
  const bookmarkedResources = favorites
    .map(f => {
      const data = getResourceById(f.resourceId);
      return data ? { ...data, addedAt: f.addedAt } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Filter by course
  const filteredBookmarks = courseFilter === 'all'
    ? bookmarkedResources
    : bookmarkedResources.filter(item => item.course.id === courseFilter);

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
              <Bookmark className="w-4 h-4" />
              <span>Personal Bookmarks</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Saved Academic Resources
            </h1>

            <p className="text-sm text-slate-600">
              Curated lectures and tutorials saved by <span className="font-semibold text-slate-900">{currentUser?.name}</span> (ID: <span className="font-mono text-orange-600 font-bold">{currentUser?.universityId}</span>).
            </p>
          </div>

          <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EDE8DF] text-center sm:text-right shrink-0">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Total Saved
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {favorites.length}
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 pt-4 border-t border-[#F2ECE1] text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Strict Privacy: Only you can view your personal saved resources list.</span>
        </div>
      </div>

      {/* Filter by course if bookmarks exist */}
      {bookmarkedResources.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
          <span className="text-slate-500 font-medium whitespace-nowrap">Filter by course:</span>
          <button
            onClick={() => setCourseFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors border ${
              courseFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-[#E4DEC3] hover:border-slate-400'
            }`}
          >
            All Courses ({bookmarkedResources.length})
          </button>
          {courses.map(course => {
            const countInCourse = bookmarkedResources.filter(b => b.course.id === course.id).length;
            if (countInCourse === 0) return null;
            return (
              <button
                key={course.id}
                onClick={() => setCourseFilter(course.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors border whitespace-nowrap ${
                  courseFilter === course.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-[#E4DEC3] hover:border-slate-400'
                }`}
              >
                {course.code} ({countInCourse})
              </button>
            );
          })}
        </div>
      )}

      {/* Bookmarks List */}
      <div className="space-y-3">
        {filteredBookmarks.map(({ resource, course, addedAt }) => (
          <div
            key={resource.id}
            className="bg-white rounded-2xl border border-[#EAE4D9] hover:border-orange-300 hover:shadow-sm transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {course.code}
                </span>
                <span>·</span>
                <span className="text-slate-700 font-medium">Topic: {resource.topic}</span>
                <span>·</span>
                <span>{resource.resourceType === 'playlist' ? '📺 Playlist' : '🎥 Video'}</span>
                <span>·</span>
                <span>Shared by: <strong className="text-slate-700">{resource.sharedBy}</strong></span>
              </div>

              <h3 
                onClick={() => openResourceModal(resource)}
                className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer"
              >
                {resource.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-1">
                {resource.description}
              </p>

              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                <span>Saved on {new Date(addedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <button
                onClick={() => openResourceModal(resource)}
                className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Watch</span>
              </button>

              <a
                href={resource.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-500 border border-[#E4DEC3] hover:text-slate-900 hover:border-slate-400 transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => removeFromFavorites(resource.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                title="Remove from favorites"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {bookmarkedResources.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D9] p-8 space-y-3">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">No Saved Resources Yet</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              When browsing course chapters, click the bookmark icon on any YouTube video to save it here for fast revision.
            </p>
            <button
              onClick={onBrowseCourses}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <span>Explore Courses</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
