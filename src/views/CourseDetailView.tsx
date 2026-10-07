import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Video, 
  ListVideo, 
  ExternalLink, 
  Bookmark, 
  CheckCircle2, 
  PlayCircle, 
  ChevronRight, 
  X, 
  User, 
  Calendar,
  Sparkles,
  AlertCircle,
  Check
} from 'lucide-react';
import { useResources } from '../context/ResourceContext';
import { useAuth } from '../context/AuthContext';
import { AcademicResource, ResourceType } from '../types';
import { validateYoutubeResourceUrl } from '../utils/security';

interface CourseDetailViewProps {
  courseId: string;
  onBack: () => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({ courseId, onBack }) => {
  const { 
    courses, 
    addResource, 
    openResourceModal, 
    isFavorite, 
    toggleFavorite, 
    history, 
    markCompleted 
  } = useResources();
  const { currentUser } = useAuth();

  const course = courses.find(c => c.id === courseId);

  // Search & Filter State inside Course Page
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'playlist'>('all');

  // Share Resource Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [typeInput, setTypeInput] = useState<ResourceType>('video');
  const [titleInput, setTitleInput] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!course) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-[#EAE4D9]">
        <h2 className="text-xl font-bold text-slate-800">Course Not Found</h2>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold"
        >
          Return to Courses
        </button>
      </div>
    );
  }

  const courseResources: AcademicResource[] = course.resources || [];

  // Filtered resources
  const filteredResources = useMemo(() => {
    return courseResources.filter(res => {
      const matchesType = filterType === 'all' || res.resourceType === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        res.title.toLowerCase().includes(q) ||
        res.topic.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        (res.sharedBy && res.sharedBy.toLowerCase().includes(q))
      );
      return matchesType && matchesSearch;
    });
  }, [courseResources, filterType, searchQuery]);

  // Video and Playlist counts
  const videoCount = courseResources.filter(r => r.resourceType === 'video').length;
  const playlistCount = courseResources.filter(r => r.resourceType === 'playlist').length;

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    setFormError(null);
    if (val.trim()) {
      const validation = validateYoutubeResourceUrl(val);
      if (validation.valid && validation.detectedType) {
        setTypeInput(validation.detectedType);
      }
    }
  };

  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!urlInput.trim()) {
      setFormError('Please enter a YouTube link.');
      return;
    }

    const validation = validateYoutubeResourceUrl(urlInput);
    if (!validation.valid) {
      setFormError(validation.error || 'Please enter a valid YouTube video or playlist link.');
      return;
    }

    if (!titleInput.trim()) {
      setFormError('Please provide a resource title.');
      return;
    }

    if (!topicInput.trim()) {
      setFormError('Please provide a topic (e.g. Searching, Binary Search, Trees).');
      return;
    }

    if (!descInput.trim()) {
      setFormError('Please provide a short description.');
      return;
    }

    // Submit resource associated with the logged-in student
    addResource({
      courseId: course.id,
      resourceType: typeInput,
      title: titleInput.trim(),
      topic: topicInput.trim(),
      description: descInput.trim(),
      youtubeUrl: urlInput.trim(),
      sharedBy: currentUser?.name || 'Contributo Student',
      studentId: currentUser?.universityId
    });

    // Reset form
    setUrlInput('');
    setTitleInput('');
    setTopicInput('');
    setDescInput('');
    setTypeInput('video');
    setFormSuccess('Resource shared successfully! Thank you for contributing.');
    
    setTimeout(() => {
      setFormSuccess(null);
      setIsShareModalOpen(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Hierarchy Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 overflow-x-auto pb-1">
        <button 
          onClick={onBack}
          className="hover:text-slate-900 transition-colors flex items-center gap-1 font-medium text-slate-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Courses</span>
        </button>
        <span aria-hidden="true">/</span>
        <span className="font-semibold text-slate-800">{course.code}</span>
        <span aria-hidden="true">/</span>
        <span className="text-orange-600 font-medium truncate">
          Shared Resources
        </span>
      </div>

      {/* Course Banner Card */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[#F2ECE1]">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg border border-orange-200">
                {course.code}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {course.department}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-medium">
                {course.credits} Credits
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {course.name}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Dynamic Resource Counter & Share Action */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 shrink-0">
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] min-w-[200px] text-left md:text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Student Contributions
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {courseResources.length} <span className="text-sm font-normal text-slate-500">Shared {courseResources.length === 1 ? 'Resource' : 'Resources'}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center md:justify-end gap-2">
                <span>🎥 {videoCount} {videoCount === 1 ? 'video' : 'videos'}</span>
                <span>·</span>
                <span>📺 {playlistCount} {playlistCount === 1 ? 'playlist' : 'playlists'}</span>
              </div>
            </div>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Share YouTube Resource</span>
            </button>
          </div>
        </div>

        {/* Platform Purpose Indicator */}
        <div className="pt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Course Resource Page:</span>
          <span className="text-slate-600">Students share and discover useful YouTube videos and playlists for {course.code}.</span>
        </div>
      </div>

      {/* Course Search and Filter Bar */}
      <div className="bg-white rounded-2xl border border-[#EAE4D9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${course.code} resources by title, topic, or description...`}
            className="w-full pl-10 pr-3 py-2 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs: [ All ] [ Videos ] [ Playlists ] */}
        <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#EDE8DF] shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({courseResources.length})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              filterType === 'video'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Videos ({videoCount})</span>
          </button>
          <button
            onClick={() => setFilterType('playlist')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              filterType === 'playlist'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListVideo className="w-3.5 h-3.5" />
            <span>Playlists ({playlistCount})</span>
          </button>
        </div>
      </div>

      {/* Resource Cards Display */}
      {filteredResources.length > 0 ? (
        <div className="space-y-4">
          {filteredResources.map((res) => {
            const isVideo = res.resourceType === 'video';
            const fav = isFavorite(res.id);
            const historyItem = history.find(h => h.resourceId === res.id);
            const isDone = historyItem?.completed ?? false;

            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-[#EAE4D9] hover:border-orange-300 hover:shadow-md transition-all p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 group"
              >
                <div className="flex-1 space-y-2">
                  {/* Metadata Header */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {/* Resource Type Badge */}
                    <span className={`inline-flex items-center gap-1 font-semibold px-2.5 py-0.5 rounded-lg border ${
                      isVideo 
                        ? 'bg-orange-50 text-orange-700 border-orange-200' 
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {isVideo ? <Video className="w-3.5 h-3.5" /> : <ListVideo className="w-3.5 h-3.5" />}
                      <span>Type: {isVideo ? 'YouTube Video' : 'YouTube Playlist'}</span>
                    </span>

                    <span aria-hidden="true" className="text-slate-300">·</span>

                    {/* Topic Badge */}
                    <span className="text-slate-700 font-semibold bg-[#FAF8F5] border border-[#EDE8DF] px-2 py-0.5 rounded-md">
                      Topic: {res.topic}
                    </span>

                    <span aria-hidden="true" className="text-slate-300">·</span>

                    {/* Contributor / Shared by */}
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Shared by: <strong className="text-slate-800">{res.sharedBy}</strong></span>
                    </span>

                    {res.dateAdded && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{res.dateAdded}</span>
                        </span>
                      </>
                    )}

                    {isDone && (
                      <>
                        <span aria-hidden="true" className="text-slate-300">·</span>
                        <span className="text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Completed
                        </span>
                      </>
                    )}
                  </div>

                  {/* Resource Title */}
                  <h3 
                    onClick={() => openResourceModal(res)}
                    className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer leading-snug flex items-center gap-2"
                  >
                    <span>{isVideo ? '🎥' : '📺'}</span>
                    <span>{res.title}</span>
                  </h3>

                  {/* Short Description */}
                  <div className="text-sm text-slate-600 leading-relaxed max-w-3xl">
                    <span className="text-xs font-semibold text-slate-400 block mb-0.5">Short description:</span>
                    <p>{res.description}</p>
                  </div>

                  {/* Stored YouTube URL */}
                  <div className="text-xs text-slate-400 font-mono truncate max-w-xl pt-1">
                    {res.youtubeUrl}
                  </div>
                </div>

                {/* Actions: Watch Video / Open Playlist */}
                <div className="flex flex-wrap md:flex-col items-center md:items-end justify-between md:justify-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <a
                    href={res.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      // Also record in history
                      openResourceModal(res);
                    }}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-all shadow-sm shadow-orange-500/20 whitespace-nowrap"
                  >
                    <span>{isVideo ? 'Watch Video' : 'Open Playlist'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="flex items-center gap-1.5 w-full md:w-auto justify-end">
                    <button
                      onClick={() => openResourceModal(res)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[#E4DEC3] bg-[#FAF8F5] text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-colors flex items-center gap-1"
                      title="Preview in Contributo Theater"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-orange-600" />
                      <span>Theater Mode</span>
                    </button>

                    <button
                      onClick={() => toggleFavorite(res.id)}
                      className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                        fav
                          ? 'bg-orange-50 text-orange-600 border-orange-200'
                          : 'bg-white text-slate-500 border-[#E4DEC3] hover:text-slate-800'
                      }`}
                      title={fav ? 'Bookmarked' : 'Add to Favorites'}
                    >
                      <Bookmark className={`w-4 h-4 ${fav ? 'fill-orange-600' : ''}`} />
                    </button>

                    <button
                      onClick={() => markCompleted(res.id, !isDone)}
                      className={`p-2 rounded-xl text-xs font-medium border transition-colors ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-white text-slate-500 border-[#E4DEC3] hover:text-slate-800'
                      }`}
                      title={isDone ? 'Mark as Incomplete' : 'Mark as Completed'}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-600' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-[#EAE4D9] p-8 sm:p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
            <Video className="w-7 h-7" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <div className="font-mono text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md inline-block border border-orange-200 mb-1">
              0 Shared Resources
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              No Resources Shared Yet for {course.code}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Found a helpful YouTube lecture or playlist for <strong>{course.name}</strong>? Be the first to share it with your fellow university students!
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Share YouTube Resource</span>
            </button>
          </div>
        </div>
      )}

      {/* SHARE YOUTUBE RESOURCE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div 
            className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-[#EAE4D9] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE4D9] bg-[#FAF8F5]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200">
                    {course.code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{course.name}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Share YouTube Resource
                </h2>
              </div>

              <button
                onClick={() => {
                  setIsShareModalOpen(false);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleShareSubmit} className="p-6 space-y-4">
              
              {/* Alert Message */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* 1. YouTube URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. YouTube URL <span className="text-orange-500">*</span>
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={handleUrlChange}
                  placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/playlist?list=..."
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports standard YouTube video URLs, shortened links (youtu.be), or complete playlist links.
                </p>
              </div>

              {/* 2. Resource Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Resource Type <span className="text-orange-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTypeInput('video')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      typeInput === 'video'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-[#FAF8F5] text-slate-700 border-[#E4DEC3] hover:border-slate-400'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>🎥 YouTube Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTypeInput('playlist')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      typeInput === 'playlist'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'bg-[#FAF8F5] text-slate-700 border-[#E4DEC3] hover:border-slate-400'
                    }`}
                  >
                    <ListVideo className="w-4 h-4" />
                    <span>📺 YouTube Playlist</span>
                  </button>
                </div>
              </div>

              {/* 3. Resource Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Resource Title <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  placeholder="e.g. Binary Search Explained or Complete Data Structures Playlist"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 4. Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Topic <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  placeholder="e.g. Searching, Recursion, Trees, Graphs, Atomic Theory"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* 5. Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  5. Short Description <span className="text-orange-500">*</span>
                </label>
                <textarea
                  value={descInput}
                  onChange={e => setDescInput(e.target.value)}
                  placeholder="A short note explaining why this video or playlist is useful..."
                  required
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#E4DEC3] rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Contributor Association Notice */}
              <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE8DF] text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" />
                  <span>Sharing as: <strong className="text-slate-800">{currentUser?.name}</strong></span>
                </div>
                <span className="font-mono text-slate-500">{currentUser?.universityId}</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E4DEC3] text-slate-600 hover:text-slate-900 font-semibold text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Share Resource</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
