import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Film,
  FolderOpen,
  GraduationCap,
  Layers,
  Search,
  Sparkles
} from 'lucide-react';
import { Course, ExamSection, Segment } from '../types';

interface CourseDetailProps {
  course: Course;
  segments: Segment[];
  segmentCounts: Record<string, { videos: number; files: number }>;
  onSelectSegment: (segment: Segment) => void;
  onBack: () => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  segments,
  segmentCounts,
  onSelectSegment,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter segments for this course
  const courseSegments = useMemo(() => {
    return segments
      .filter((s) => s.course_id === course.id)
      .sort((a, b) => a.segment_number - b.segment_number);
  }, [segments, course.id]);

  // Search filtering across title & subtopics
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return courseSegments;
    const q = searchQuery.toLowerCase();
    return courseSegments.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.subtopics.toLowerCase().includes(q) ||
        `segment ${s.segment_number}`.includes(q) ||
        s.exam_section.toLowerCase().includes(q)
    );
  }, [courseSegments, searchQuery]);

  // Group by Exam Section
  const groupedSections: { section: ExamSection; label: string; icon: string; segments: Segment[] }[] = [
    {
      section: 'Mid-Term',
      label: 'Mid-Term Examination Syllabus',
      icon: '📌',
      segments: filteredSegments.filter((s) => s.exam_section === 'Mid-Term'),
    },
    {
      section: 'Final Group-A',
      label: 'Final Examination (Group-A)',
      icon: '🎯',
      segments: filteredSegments.filter((s) => s.exam_section === 'Final Group-A'),
    },
    {
      section: 'Final Group-B',
      label: 'Final Examination (Group-B)',
      icon: '🎯',
      segments: filteredSegments.filter((s) => s.exam_section === 'Final Group-B'),
    },
  ];

  // Calculate course total resources
  const courseTotals = useMemo(() => {
    let videos = 0;
    let files = 0;
    for (const seg of courseSegments) {
      const counts = segmentCounts[seg.id] || { videos: 0, files: 0 };
      videos += counts.videos;
      files += counts.files;
    }
    return { videos, files, total: videos + files };
  }, [courseSegments, segmentCounts]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-950 font-semibold mb-6 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Courses</span>
      </button>

      {/* Course Banner */}
      <div className="bg-white border border-amber-200/90 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-100/50 to-orange-100/40 rounded-full blur-3xl pointer-events-none -mr-28 -mt-28"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-orange-600 text-white font-extrabold text-xs rounded-full shadow-xs">
                {course.code}
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-900 font-semibold text-xs rounded-full border border-amber-200">
                {course.badge}
              </span>
              <span className="px-3 py-1 bg-stone-100 text-stone-700 font-medium text-xs rounded-full">
                {courseSegments.length} Syllabus Segments
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 mb-2">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mb-3">
              {course.department}
            </p>
            <p className="text-xs text-stone-500 leading-relaxed max-w-2xl">
              {course.shortDesc}
            </p>
          </div>

          {/* Live shared resources badge */}
          <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-orange-200 rounded-2xl p-5 text-center shrink-0 min-w-[200px] shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-800 block mb-1">
              Live Total Shared
            </span>
            <div className="text-3xl font-black text-orange-950 mb-1">
              {courseTotals.total}
            </div>
            <p className="text-xs text-orange-900 font-semibold mb-2">
              Shared Resources
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-orange-800 pt-2 border-t border-orange-200/80">
              <span className="flex items-center gap-1 font-medium">
                <Film className="w-3 h-3 text-red-600" /> {courseTotals.videos} Videos
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium">
                <FileText className="w-3 h-3 text-amber-700" /> {courseTotals.files} Files
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Search Box */}
      <div className="relative mb-8 max-w-xl">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${course.code} segments, subtopics, exam terms...`}
          className="w-full pl-11 pr-4 py-3 bg-white border border-stone-200 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Segments Grouped by Exam Section */}
      <div className="space-y-10">
        {groupedSections.map(
          (group) =>
            group.segments.length > 0 && (
              <div key={group.section} className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-200">
                  <span className="text-lg">{group.icon}</span>
                  <h2 className="text-lg font-bold text-stone-900">{group.label}</h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {group.segments.length} {group.segments.length === 1 ? 'segment' : 'segments'}
                  </span>
                </div>

                {/* Grid of Segments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.segments.map((seg) => {
                    const counts = segmentCounts[seg.id] || { videos: 0, files: 0 };
                    return (
                      <div
                        key={seg.id}
                        onClick={() => onSelectSegment(seg)}
                        className="bg-white border border-stone-200/90 hover:border-orange-500/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          {/* Segment Number & Count Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                              Segment {seg.segment_number}
                            </span>

                            {/* Live Resource Count */}
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-stone-700 group-hover:border-orange-300 group-hover:bg-orange-50 transition-colors">
                              {counts.videos} Videos · {counts.files} Files
                            </span>
                          </div>

                          {/* Segment Title */}
                          <h3 className="text-base font-bold text-stone-900 group-hover:text-orange-950 transition-colors mb-2">
                            {seg.title}
                          </h3>

                          {/* Subtopics snippet */}
                          <p className="text-xs text-stone-500 font-mono line-clamp-2 leading-relaxed mb-4">
                            {seg.subtopics}
                          </p>
                        </div>

                        {/* Card bottom action */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-orange-600 group-hover:text-orange-700">
                          <span className="flex items-center gap-1.5 text-stone-600 group-hover:text-orange-900">
                            <FolderOpen className="w-3.5 h-3.5" />
                            Open Segment Resources
                          </span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
        )}

        {filteredSegments.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-3xl p-10 text-center text-stone-500 max-w-md mx-auto">
            <Search className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-800">No segments match your search</p>
            <p className="text-xs text-stone-500 mt-1">Try another keyword or clear the search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};
