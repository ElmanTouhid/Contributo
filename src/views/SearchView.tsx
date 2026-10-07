import React, { useState, useMemo } from 'react';
import { 
  Search as SearchIcon, 
  X, 
  BookOpen, 
  Layers, 
  PlayCircle, 
  ChevronRight, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';
import { AcademicResource, Course, Chapter } from '../types';

interface SearchViewProps {
  onSelectCourse: (courseId: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onSelectCourse }) => {
  const { searchAcademic, openResourceModal } = useResources();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'course' | 'resource'>('all');

  const rawResults = useMemo(() => {
    return searchAcademic(query);
  }, [query, searchAcademic]);

  const filteredResults = useMemo(() => {
    if (filterType === 'all') return rawResults;
    return rawResults.filter(r => r.type === filterType);
  }, [rawResults, filterType]);

  const sampleSearches = [
    'CSE-2321',
    'Data Structures',
    'CHEM-2301',
    'MATH-2307',
    'Digital Logic Design',
    'STAT-2311',
    'CSE-2340',
    'Software Development 1'
  ];

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      
      {/* Search Header & Input */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Global Academic Search
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Search across course codes, titles, topics, and student-shared YouTube videos and playlists.
          </p>
        </div>

        {/* Input box */}
        <div className="relative">
          <SearchIcon className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search e.g. 'CSE-2321', 'Chemistry', 'MATH-2307'..."
            autoFocus
            className="w-full pl-12 pr-10 py-3.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-2xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans shadow-inner"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Suggested keywords */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
          <span className="text-slate-400 font-medium">Quick suggestions:</span>
          {sampleSearches.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="text-slate-600 bg-[#FAF8F5] hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 border border-[#EAE4D9] px-2.5 py-1 rounded-lg transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs if results exist */}
      {query && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-[#EAE4D9]">
            {(['all', 'course', 'resource'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  filterType === type
                    ? 'bg-orange-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'all' ? `All (${rawResults.length})` : `${type}s`}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            Found <span className="font-mono font-bold text-slate-800">{filteredResults.length}</span> matches for "{query}"
          </div>
        </div>
      )}

      {/* Results List */}
      {query && (
        <div className="space-y-3">
          {filteredResults.map((result, idx) => {
            if (result.type === 'course') {
              return (
                <div
                  key={`res-course-${result.course.id}-${idx}`}
                  onClick={() => onSelectCourse(result.course.id)}
                  className="bg-white p-5 rounded-2xl border border-[#EAE4D9] hover:border-orange-400 hover:shadow-sm transition-all cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                        Course
                      </span>
                      <span>{result.course.department}</span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {result.course.code} — {result.course.name}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-1">
                      {result.course.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:translate-x-1 transition-transform shrink-0 mt-2">
                    <span>Open Course</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            }

            if (result.type === 'resource' && result.resource) {
              return (
                <div
                  key={`res-vid-${result.resource.id}-${idx}`}
                  onClick={() => openResourceModal(result.resource!)}
                  className="bg-white p-5 rounded-2xl border border-[#EAE4D9] hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    {/* Hierarchy format: Course Code → Topic → Creator */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                      <span className="font-mono font-bold text-slate-800">{result.course.code}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700 font-medium">Topic: {result.resource.topic}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-orange-600 font-semibold">{result.resource.sharedBy}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {result.resource.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {result.resource.description}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                      <span>{result.resource.resourceType === 'playlist' ? '📺 YouTube Playlist' : '🎥 YouTube Video'}</span>
                      <span>·</span>
                      <span>{result.resource.youtubeUrl}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold group-hover:bg-orange-600 transition-colors shrink-0 mt-2">
                    <span>Watch</span>
                    <PlayCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            }

            return null;
          })}

          {filteredResults.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-[#EAE4D9] p-8">
              <SearchIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800">No matches found for "{query}"</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try searching by course code (e.g., CSE-2321), concept (e.g., Sorting), or instructor name.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state when query is empty */}
      {!query && (
        <div className="bg-white rounded-3xl border border-[#EAE4D9] p-8 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-orange-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Search Contributo's Academic Platform</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Everything is organized by University Course blocks and student-shared YouTube videos and playlists. Type any course or topic above to start.
          </p>
        </div>
      )}

    </div>
  );
};
