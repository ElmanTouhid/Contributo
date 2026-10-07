import React, { useState } from 'react';
import { 
  GraduationCap, 
  Search, 
  BookOpen, 
  ArrowRight, 
  Clock, 
  Layers,
  Sparkles
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';

interface CoursesViewProps {
  onSelectCourse: (courseId: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ onSelectCourse }) => {
  const { courses } = useResources();
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique departments
  const departments = ['all', ...Array.from(new Set(courses.map(c => c.department)))];

  const filteredCourses = courses.filter(course => {
    const matchesDept = filterDept === 'all' || course.department === filterDept;
    const matchesSearch = 
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      
      {/* Page Header */}
      <div className="border-b border-[#EAE4D9] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1">
            Student Academic Exchange
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Course Resource Blocks
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 max-w-2xl">
            Choose a course to explore and share helpful YouTube videos and playlists contributed by university students.
          </p>
        </div>

        {/* Search within courses */}
        <div className="w-full md:w-72">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter courses..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#E4DEC3] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Department Filter Tabs (Segmented control) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-sm no-scrollbar">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setFilterDept(dept)}
            className={`px-3.5 py-1.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-colors border ${
              filterDept === dept
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 border-[#E4DEC3] hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            {dept === 'all' ? 'All Departments' : dept}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredCourses.map((course) => {
          const totalResources = course.resources ? course.resources.length : 0;

          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className="bg-white rounded-2xl border border-[#EAE4D9] hover:border-orange-400 hover:shadow-lg transition-all cursor-pointer group p-6 flex flex-col justify-between"
            >
              <div>
                {/* Course Header Bar */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-sm font-bold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200 inline-block mb-1">
                      {course.code}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {course.name}
                    </h2>
                  </div>

                  <div className="text-right text-xs text-slate-500 shrink-0">
                    <span className="font-semibold text-slate-700">{course.credits} Credits</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">{course.term}</div>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-5">
                  {course.description}
                </p>

                {/* Resource Preview */}
                <div className="bg-[#FAF8F5] rounded-xl p-3.5 border border-[#EDE8DF] mb-5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <span>Student-Shared Resources</span>
                    <span className="text-orange-600 font-mono font-medium">
                      {totalResources} {totalResources === 1 ? 'Resource' : 'Resources'}
                    </span>
                  </div>
                  {totalResources > 0 ? (
                    <div className="space-y-1.5">
                      {course.resources.slice(0, 2).map((res) => (
                        <div key={res.id} className="text-xs text-slate-700 flex items-center justify-between gap-2">
                          <span className="truncate">
                            <span className="font-semibold text-slate-900">
                              {res.resourceType === 'playlist' ? '📺' : '🎥'} {res.topic}:
                            </span>{' '}
                            {res.title}
                          </span>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            by {res.sharedBy}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>0 Shared Resources</span>
                      <span className="text-orange-600 font-medium">+ Share Resource</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="pt-4 border-t border-[#F2ECE1] flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>
                    {totalResources} {totalResources === 1 ? 'shared resource' : 'shared resources'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 group-hover:translate-x-1 transition-transform">
                  <span>Enter Course</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#EAE4D9] p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No courses match your filter</h3>
          <p className="text-sm text-slate-500 mt-1">
            Try adjusting your search query or department filter.
          </p>
        </div>
      )}

    </div>
  );
};
