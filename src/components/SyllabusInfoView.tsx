import React, { useState } from 'react';
import { BookOpen, CheckCircle, ChevronDown, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { COURSES } from '../data/courses';
import { SYLLABUS_SEGMENTS } from '../data/syllabusSegments';
import { Course, Segment } from '../types';

interface SyllabusInfoViewProps {
  onSelectCourse: (course: Course) => void;
}

export const SyllabusInfoView: React.FC<SyllabusInfoViewProps> = ({ onSelectCourse }) => {
  const [expandedCourse, setExpandedCourse] = useState<string>(COURSES[0].id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fadeIn">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-xs font-bold mb-3">
          <BookOpen className="w-3.5 h-3.5 text-orange-600" />
          <span>University Curriculum Standard</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2">
          Official Syllabus & Segment Structure
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
          Contributo organizes all 8 academic courses into fixed segments strictly according to the official
          university syllabus. Students build the library together by contributing YouTube lectures and study files
          into these fixed blocks.
        </p>
      </div>

      <div className="space-y-4">
        {COURSES.map((course) => {
          const isExpanded = expandedCourse === course.id;
          const courseSegments = SYLLABUS_SEGMENTS.filter((s) => s.course_id === course.id);

          return (
            <div
              key={course.id}
              className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-2xs transition-all"
            >
              <button
                onClick={() => setExpandedCourse(isExpanded ? '' : course.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-stone-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-orange-100 text-orange-950 font-bold text-xs rounded-lg font-mono">
                    {course.code}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{course.title}</h3>
                    <p className="text-[11px] text-stone-500">{course.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                    {courseSegments.length} Segments
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-stone-100 bg-[#FFFDF9]/60">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-stone-600 italic">
                      Fixed syllabus segments (read-only for students):
                    </p>
                    <button
                      onClick={() => onSelectCourse(course)}
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      View & Share in {course.code}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {courseSegments.map((seg) => (
                      <div
                        key={seg.id}
                        className="p-3.5 bg-white border border-stone-200/90 rounded-xl"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-stone-900">
                            Segment {seg.segment_number}: {seg.title}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                            {seg.exam_section}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-stone-500 leading-relaxed">
                          {seg.subtopics}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
