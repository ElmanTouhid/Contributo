import React, { useEffect, useMemo, useState } from 'react';
import { CourseCard } from './components/CourseCard';
import { CourseDetail } from './components/CourseDetail';
import { DashboardHero } from './components/DashboardHero';
import { Navbar } from './components/Navbar';
import { SegmentDetail } from './components/SegmentDetail';
import { StudentProfileModal } from './components/StudentProfileModal';
import { SupabaseSetupBanner, SupabaseSetupModal } from './components/SupabaseSetupModal';
import { SyllabusInfoView } from './components/SyllabusInfoView';
import { COURSES } from './data/courses';
import { SYLLABUS_SEGMENTS } from './data/syllabusSegments';
import { getCurrentStudent } from './lib/auth';
import {
  fetchAllSegments,
  fetchCourseLiveCounts,
  fetchSegmentLiveCounts,
  isSupabaseConfigured
} from './lib/supabase';
import { Course, Segment, StudentProfile } from './types';

export default function App() {
  // Current Student
  const [currentStudent, setCurrentStudent] = useState<StudentProfile>(getCurrentStudent);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Supabase Setup Modal
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isSupabaseLive, setIsSupabaseLive] = useState(isSupabaseConfigured);

  // Navigation State
  const [activeView, setActiveView] = useState<'courses' | 'favorites' | 'syllabus'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  // Data & Dynamic Counts
  const [segments, setSegments] = useState<Segment[]>(SYLLABUS_SEGMENTS);
  const [courseCounts, setCourseCounts] = useState<Record<string, { total: number; videos: number; files: number }>>({});
  const [segmentCounts, setSegmentCounts] = useState<Record<string, { videos: number; files: number }>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Favorites (Course IDs)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('contributo_favorites');
      return saved ? JSON.parse(saved) : ['CSE-2321', 'MATH-2307'];
    } catch {
      return ['CSE-2321'];
    }
  });

  const toggleFavorite = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId];
      localStorage.setItem('contributo_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Sync data and counts
  const loadDatabaseData = async () => {
    setIsSupabaseLive(isSupabaseConfigured());

    const [allSegments, cCounts, sCounts] = await Promise.all([
      fetchAllSegments(),
      fetchCourseLiveCounts(),
      fetchSegmentLiveCounts(),
    ]);

    if (allSegments && allSegments.length > 0) {
      setSegments(allSegments);
    }
    setCourseCounts(cCounts);
    setSegmentCounts(sCounts);
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  // Compute total live resources across all 8 courses
  const totalLiveResources = useMemo(() => {
    let sum = 0;
    for (const cid in courseCounts) {
      sum += courseCounts[cid]?.total || 0;
    }
    return sum;
  }, [courseCounts]);

  // Filter courses based on search & view
  const displayedCourses = useMemo(() => {
    let list = COURSES;
    if (activeView === 'favorites') {
      list = list.filter((c) => favorites.includes(c.id));
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter((course) => {
      const matchCourse =
        course.code.toLowerCase().includes(q) ||
        course.title.toLowerCase().includes(q) ||
        course.shortDesc.toLowerCase().includes(q) ||
        course.department.toLowerCase().includes(q);

      // Also match segments of this course
      const matchSegment = segments.some(
        (s) =>
          s.course_id === course.id &&
          (s.title.toLowerCase().includes(q) || s.subtopics.toLowerCase().includes(q))
      );

      return matchCourse || matchSegment;
    });
  }, [activeView, favorites, searchQuery, segments]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourse(course);
    setSelectedSegment(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSegment = (segment: Segment) => {
    setSelectedSegment(segment);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSelectedSegment(null);
    loadDatabaseData();
  };

  const handleBackToSegments = () => {
    setSelectedSegment(null);
    loadDatabaseData();
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-stone-900 flex flex-col selection:bg-orange-200 selection:text-orange-950 font-sans">
      {/* Top Warning Banner if Supabase is not connected */}
      <SupabaseSetupBanner onOpenModal={() => setIsSupabaseModalOpen(true)} />

      {/* Main Contributo Header */}
      <Navbar
        currentStudent={currentStudent}
        isSupabaseLive={isSupabaseLive}
        onOpenSupabaseSetup={() => setIsSupabaseModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          setSelectedCourse(null);
          setSelectedSegment(null);
        }}
        favoriteCount={favorites.length}
      />

      {/* Main Body */}
      <main className="flex-1 pb-16">
        {selectedSegment && selectedCourse ? (
          /* ================= Segment Detail View (YouTube & Files) ================= */
          <SegmentDetail
            course={selectedCourse}
            segment={selectedSegment}
            currentStudent={currentStudent}
            onBack={handleBackToSegments}
            onOpenSupabaseSetup={() => setIsSupabaseModalOpen(true)}
          />
        ) : selectedCourse ? (
          /* ================= Course Detail View (Segments List) ================= */
          <CourseDetail
            course={selectedCourse}
            segments={segments}
            segmentCounts={segmentCounts}
            onSelectSegment={handleSelectSegment}
            onBack={handleBackToCourses}
          />
        ) : activeView === 'syllabus' ? (
          /* ================= Syllabus Guide View ================= */
          <SyllabusInfoView
            onSelectCourse={(c) => {
              handleSelectCourse(c);
            }}
          />
        ) : (
          /* ================= Dashboard / Course Blocks View ================= */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            <DashboardHero
              currentStudent={currentStudent}
              totalResources={totalLiveResources}
              totalSegments={segments.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenSupabaseSetup={() => setIsSupabaseModalOpen(true)}
              isSupabaseLive={isSupabaseLive}
            />

            {/* Courses Section Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                  {activeView === 'favorites' ? 'Your Bookmarked Courses' : 'Official Course Blocks'}
                </h2>
                <p className="text-xs sm:text-sm text-stone-500">
                  Select a course to explore its official syllabus segments and shared learning materials
                </p>
              </div>

              <div className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 shrink-0 self-start sm:self-auto">
                {displayedCourses.length} {displayedCourses.length === 1 ? 'Course' : 'Courses'}
              </div>
            </div>

            {/* 8 Course Blocks Grid */}
            {displayedCourses.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-3xl p-12 text-center max-w-md mx-auto shadow-xs">
                <p className="text-sm font-bold text-stone-800 mb-1">No courses found</p>
                <p className="text-xs text-stone-500 mb-4">
                  {activeView === 'favorites'
                    ? "You haven't bookmarked any courses yet. Click the bookmark icon on any course card to add it here."
                    : 'No course or syllabus topic matches your search.'}
                </p>
                {activeView === 'favorites' ? (
                  <button
                    onClick={() => setActiveView('courses')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 cursor-pointer"
                  >
                    Browse All 8 Courses
                  </button>
                ) : (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold hover:bg-stone-200 cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {displayedCourses.map((course) => {
                  const courseCount = courseCounts[course.id]?.total || 0;
                  const segs = segments.filter((s) => s.course_id === course.id);
                  const isFav = favorites.includes(course.id);

                  return (
                    <CourseCard
                      key={course.id}
                      course={course}
                      totalSharedResources={courseCount}
                      segmentCount={segs.length}
                      isFavorite={isFav}
                      onToggleFavorite={(e) => toggleFavorite(course.id, e)}
                      onSelectCourse={() => handleSelectCourse(course)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#FFFDF9] py-8 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-stone-700">
            Contributo — Student Academic Resource Sharing
          </p>
          <p className="text-stone-400">
            Structured course segments based on official university syllabi. Resources contributed by students, for students.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-stone-500">
            <span>8 Active Courses</span>
            <span>•</span>
            <span>Fixed Syllabus Segments</span>
            <span>•</span>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-orange-700 hover:underline font-semibold cursor-pointer"
            >
              Supabase Configuration
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onCredentialsUpdated={() => {
          loadDatabaseData();
        }}
      />

      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentStudent={currentStudent}
        onStudentChanged={(s) => setCurrentStudent(s)}
      />
    </div>
  );
}
