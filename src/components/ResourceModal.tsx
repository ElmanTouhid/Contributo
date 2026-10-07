import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Bookmark, 
  CheckCircle2, 
  Share2, 
  Clock, 
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { AcademicResource } from '../types';
import { useResources } from '../context/ResourceContext';

interface ResourceModalProps {
  resource: AcademicResource;
  onClose: () => void;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({ resource, onClose }) => {
  const { 
    isFavorite, 
    toggleFavorite, 
    history, 
    markCompleted, 
    courses, 
    openResourceModal 
  } = useResources();

  const [copied, setCopied] = useState(false);

  // Find course information
  const course = courses.find(c => c.id === resource.courseId);

  // Check if resource is completed in user history
  const historyEntry = history.find(h => h.resourceId === resource.id);
  const isCompleted = historyEntry?.completed ?? false;
  const isBookmarked = isFavorite(resource.id);

  // Other resources in this course
  const otherResourcesInCourse = (course?.resources || []).filter(r => r.id !== resource.id);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(resource.youtubeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-[#EAE4D9] flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EAE4D9] bg-[#FAF8F5]">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 truncate mr-3">
            <span className="font-semibold text-slate-900">{course?.code}</span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="truncate text-orange-700 font-medium">{resource.topic || 'Curated Resource'}</span>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          
          {/* YouTube Embedded Video Player / Playlist Player */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-slate-200">
            {resource.resourceType === 'playlist' && resource.playlistId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/videoseries?list=${resource.playlistId}&autoplay=1`}
                title={resource.title}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : resource.youtubeVideoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${resource.youtubeVideoId}?autoplay=1&rel=0`}
                title={resource.title}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900 space-y-3">
                <p className="text-sm">Direct YouTube Link</p>
                <a
                  href={resource.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggleFavorite(resource.id)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                  isBookmarked
                    ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-[#E4DEC3] hover:border-orange-300 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-orange-600 text-orange-600' : 'text-slate-400'}`} />
                <span>{isBookmarked ? 'Bookmarked' : 'Add to Favorites'}</span>
              </button>

              <button
                onClick={() => markCompleted(resource.id, !isCompleted)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-[#E4DEC3] hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{isCompleted ? 'Completed' : 'Mark as Completed'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-white text-slate-700 border border-[#E4DEC3] hover:border-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                title="Copy YouTube Link"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>{copied ? 'Copied Link!' : 'Share'}</span>
              </button>

              <a
                href={resource.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
              >
                <span>{resource.resourceType === 'playlist' ? 'Open Playlist' : 'Watch on YouTube'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Details & Metadata */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {resource.title}
            </h2>

            {/* Clean unboxed metadata with typographic separators */}
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <span className="text-orange-700 font-semibold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                Topic: {resource.topic}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-800">
                Type: {resource.resourceType === 'playlist' ? '📺 YouTube Playlist' : '🎥 YouTube Video'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Shared by: <strong className="text-slate-800">{resource.sharedBy}</strong></span>
              {resource.dateAdded && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{resource.dateAdded}</span>
                </>
              )}
            </div>

            <p className="text-base text-slate-700 leading-relaxed bg-[#FAF8F5] p-4 rounded-xl border border-[#EDE8DF]">
              {resource.description}
            </p>
          </div>

          {/* More in this course */}
          {otherResourcesInCourse.length > 0 && (
            <div className="pt-4 border-t border-[#EAE4D9]">
              <div className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-orange-600" />
                <span>More shared resources in {course?.code}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {otherResourcesInCourse.map(r => (
                  <button
                    key={r.id}
                    onClick={() => openResourceModal(r)}
                    className="p-3 text-left rounded-xl bg-white border border-[#EAE4D9] hover:border-orange-300 hover:shadow-sm transition-all group flex items-start justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 line-clamp-1 transition-colors">
                        {r.resourceType === 'playlist' ? '📺' : '🎥'} {r.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>Topic: {r.topic}</span>
                        <span>·</span>
                        <span>by {r.sharedBy}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Academic Honor Code note */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Contributo Academic Resource Hub:</span> All video materials are curated by department faculty and students under fair academic reference guidelines. No unauthorized mirroring or commercial use permitted.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
