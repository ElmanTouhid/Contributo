import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  Clock, 
  Flame, 
  ArrowRight, 
  Bookmark, 
  CheckCircle2, 
  PlayCircle, 
  TrendingUp, 
  Sparkles, 
  ChevronRight, 
  Library,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';
import { ActiveNavTab, AcademicResource } from '../types';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveNavTab) => void;
  onOpenSearch: () => void;
  onSelectCourse: (courseId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  setActiveTab, 
  onOpenSearch, 
  onSelectCourse 
}) => {
  const { currentUser } = useAuth();
  const { 
    courses, 
    history, 
    favorites, 
    openResourceModal, 
    isFavorite, 
    toggleFavorite,
    getResourceById
  } = useResources();

  const [searchQuery, setSearchQuery] = useState('');

  // Calculate metrics
  const totalCourses = courses.length;
  const totalResources = courses.reduce(
    (acc, c) => acc + (c.resources ? c.resources.length : 0), 
    0
  );

  // Continue Learning: Get recently watched resources for this student
  const continueLearningItems = history
    .slice(0, 3)
    .map(h => getResourceById(h.resourceId))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Popular Resources (highest views)
  const allResources: AcademicResource[] = [];
  courses.forEach(c => {
    (c.resources || []).forEach(r => allResources.push(r));
  });

  const popularResources = [...allResources].slice(0, 4);

  // Recently Added Resources
  const recentlyAddedResources = [...allResources].slice(0, 4);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onOpenSearch();
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl border border-slate-800">
        {/* Background Image with contrast scrim */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/src/assets/images/contributo_academic_hero_1791308409974.jpg" 
            alt="University Study Commons" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35 filter brightness-75 contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-900/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-400">
            <span>Contributo Private Academic Hub</span>
            <span aria-hidden="true">·</span>
            <span>Academic Year 2025–2026</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Welcome back, {currentUser?.name}
            </h1>
            <div className="text-base sm:text-lg text-slate-300 flex items-center gap-3">
              <span>University ID:</span>
              <span className="font-mono font-bold text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/30">
                {currentUser?.universityId}
              </span>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="hidden sm:inline text-slate-300 text-sm">
                {currentUser?.department}
              </span>
            </div>
          </div>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            Student-to-student academic resource sharing platform. Discover and share useful YouTube videos and playlists organized by university course blocks.
          </p>

          {/* Quick interactive search input directly inside hero */}
          <form onSubmit={handleSearchSubmit} className="pt-2 max-w-2xl">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code (e.g. CSE-2321, MATH-2307, CHEM-2301)..."
                className="w-full pl-12 pr-28 py-3.5 bg-white/95 text-slate-900 rounded-2xl text-sm sm:text-base placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-md backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={onOpenSearch}
                className="absolute right-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Academic Overview Counters */}
          <div className="pt-4 flex flex-wrap gap-6 text-xs sm:text-sm text-slate-300 border-t border-slate-800/80">
            <div>
              <span className="text-white font-bold text-lg font-mono">{totalCourses}</span>
              <span className="ml-1.5 text-slate-400">Course Blocks</span>
            </div>
            <div>
              <span className="text-white font-bold text-lg font-mono">{new Set(courses.map(c => c.department)).size}</span>
              <span className="ml-1.5 text-slate-400">Departments</span>
            </div>
            <div>
              <span className="text-orange-400 font-bold text-lg font-mono">{totalResources}</span>
              <span className="ml-1.5 text-slate-400">Shared {totalResources === 1 ? 'Resource' : 'Resources'}</span>
            </div>
            <div>
              <span className="text-white font-bold text-lg font-mono">{favorites.length}</span>
              <span className="ml-1.5 text-slate-400">Saved in Bookmarks</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: CONTINUE LEARNING (if student has watched videos) */}
      {continueLearningItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <PlayCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Continue Learning
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
            >
              <span>View full history</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {continueLearningItems.map(({ resource, course }) => (
              <div
                key={resource.id}
                onClick={() => openResourceModal(resource)}
                className="bg-white p-4 rounded-2xl border border-[#EAE4D9] hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-semibold text-slate-800">{course.code}</span>
                    <span className="text-orange-700 font-medium">{resource.topic}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 text-base mb-1.5">
                    {resource.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    {resource.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F2ECE1] flex items-center justify-between text-xs text-slate-500">
                  <span>Shared by {resource.sharedBy}</span>
                  <div className="flex items-center gap-1 text-orange-600 font-semibold group-hover:underline">
                    <span>Resume</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION: QUICK ACCESS TO COURSES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                University Course Blocks
              </h2>
              <p className="text-xs text-slate-500">
                Choose a course block to explore or share YouTube videos and playlists
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('courses')}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            <span>All Courses</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {courses.map((course) => {
            const courseResourcesCount = course.resources ? course.resources.length : 0;
            return (
              <div
                key={course.id}
                onClick={() => onSelectCourse(course.id)}
                className="bg-white p-5 rounded-2xl border border-[#EAE4D9] hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold px-2 py-1 bg-orange-50 text-orange-700 rounded-md border border-orange-200">
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      {course.credits} Credits
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors mb-1.5 leading-snug">
                    {course.name}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {course.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F2ECE1] space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>{course.credits} Credits</span>
                    <span className="font-semibold text-slate-700">
                      {courseResourcesCount} {courseResourcesCount === 1 ? 'Shared Resource' : 'Shared Resources'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-semibold text-orange-600 group-hover:translate-x-1 transition-transform">
                    <span>Enter Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION: STUDENT-SHARED RESOURCES */}
      {allResources.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Recent Student-Shared Resources
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              {allResources.length} shared across all courses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allResources.slice(0, 6).map((res) => {
              const resCourse = courses.find(c => c.id === res.courseId);
              const fav = isFavorite(res.id);
              const isVideo = res.resourceType === 'video';

              return (
                <div
                  key={res.id}
                  className="bg-white p-5 rounded-2xl border border-[#EAE4D9] hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        {resCourse?.code}
                      </span>
                      <span>·</span>
                      <span className="text-slate-700 font-medium bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#EDE8DF]">
                        Topic: {res.topic}
                      </span>
                      <span>·</span>
                      <span className="text-slate-500">
                        {isVideo ? '🎥 Video' : '📺 Playlist'}
                      </span>
                    </div>

                    <h3 
                      onClick={() => openResourceModal(res)}
                      className="text-base font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer"
                    >
                      {res.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {res.description}
                    </p>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <span>Shared by:</span>
                      <strong className="text-slate-800">{res.sharedBy}</strong>
                      {res.dateAdded && (
                        <>
                          <span>·</span>
                          <span>{res.dateAdded}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F2ECE1] flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleFavorite(res.id)}
                      className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                        fav
                          ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-white text-slate-400 border-[#E4DEC3] hover:text-slate-700'
                      }`}
                      title={fav ? 'Remove Bookmark' : 'Add to Favorites'}
                    >
                      <Bookmark className={`w-4 h-4 ${fav ? 'fill-orange-600' : ''}`} />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openResourceModal(res)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E4DEC3] bg-[#FAF8F5] text-slate-700 hover:text-orange-600 transition-colors flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5 text-orange-600" />
                        <span>Theater</span>
                      </button>

                      <a
                        href={res.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span>{isVideo ? 'Watch Video' : 'Open Playlist'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <section className="bg-white p-8 sm:p-10 rounded-3xl border border-[#EAE4D9] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <Library className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Student Resource Platform Ready
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Contributo is driven by university students sharing helpful YouTube videos and playlists for their courses. Click into any course block to share a resource!
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setActiveTab('courses')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <span>Explore Course Blocks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

    </div>
  );
};
