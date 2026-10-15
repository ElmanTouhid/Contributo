import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  Film,
  Filter,
  FolderOpen,
  Info,
  ListVideo,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  UploadCloud,
  Video
} from 'lucide-react';
import {
  deleteFileResource,
  deleteYouTubeResource,
  fetchSegmentResources,
  isSupabaseConfigured
} from '../lib/supabase';
import {
  Course,
  FileResource,
  Segment,
  StudentProfile,
  YouTubeResource
} from '../types';
import { FilePreviewModal } from './FilePreviewModal';
import { FileResourceCard } from './FileResourceCard';
import { ReportModal } from './ReportModal';
import { ShareFileModal } from './ShareFileModal';
import { ShareYouTubeModal } from './ShareYouTubeModal';
import { YouTubeResourceCard } from './YouTubeResourceCard';

interface SegmentDetailProps {
  course: Course;
  segment: Segment;
  currentStudent: StudentProfile;
  onBack: () => void;
  onOpenSupabaseSetup: () => void;
}

export const SegmentDetail: React.FC<SegmentDetailProps> = ({
  course,
  segment,
  currentStudent,
  onBack,
  onOpenSupabaseSetup,
}) => {
  const [activeTab, setActiveTab] = useState<'youtube' | 'files'>('youtube');

  // Resource state
  const [youtubeResources, setYoutubeResources] = useState<YouTubeResource[]>([]);
  const [fileResources, setFileResources] = useState<FileResource[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and search
  const [ytFilter, setYtFilter] = useState<'all' | 'video' | 'playlist'>('all');
  const [ytSearch, setYtSearch] = useState('');
  const [fileSearch, setFileSearch] = useState('');

  // Modals
  const [isShareYtOpen, setIsShareYtOpen] = useState(false);
  const [isShareFileOpen, setIsShareFileOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);

  // Report modal state
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    title: string;
    kind: 'youtube' | 'file';
  } | null>(null);

  const loadResources = async () => {
    setLoading(true);
    const data = await fetchSegmentResources(segment.id);
    setYoutubeResources(data.youtubeResources);
    setFileResources(data.fileResources);
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, [segment.id]);

  const handleDeleteYouTube = async (id: string) => {
    if (confirm('Are you sure you want to delete this shared YouTube resource?')) {
      await deleteYouTubeResource(id, currentStudent.id);
      loadResources();
    }
  };

  const handleDeleteFile = async (resource: FileResource) => {
    if (confirm(`Are you sure you want to delete "${resource.title}"?`)) {
      await deleteFileResource(resource, currentStudent.id);
      loadResources();
    }
  };

  // Filter YouTube
  const filteredYouTube = youtubeResources.filter((res) => {
    if (ytFilter !== 'all' && res.resource_type !== ytFilter) return false;
    if (!ytSearch.trim()) return true;
    const q = ytSearch.toLowerCase();
    return (
      res.title.toLowerCase().includes(q) ||
      res.topic.toLowerCase().includes(q) ||
      (res.description && res.description.toLowerCase().includes(q))
    );
  });

  // Filter Files
  const filteredFiles = fileResources.filter((res) => {
    if (!fileSearch.trim()) return true;
    const q = fileSearch.toLowerCase();
    return (
      res.title.toLowerCase().includes(q) ||
      res.file_name.toLowerCase().includes(q) ||
      (res.description && res.description.toLowerCase().includes(q))
    );
  });

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-stone-500 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {course.code}</span>
        </button>
        <span>/</span>
        <span className="text-stone-400">Segment {segment.segment_number}</span>
      </div>

      {/* Segment Header Banner */}
      <div className="bg-white border border-amber-200/90 rounded-3xl p-6 sm:p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-100/50 to-orange-100/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-orange-100 text-orange-800 font-bold text-xs rounded-full border border-orange-200">
                {course.code}
              </span>
              <span className="px-3 py-1 bg-amber-50 text-amber-900 font-semibold text-xs rounded-full border border-amber-200">
                Segment {segment.segment_number}
              </span>
              <span className="px-3 py-1 bg-stone-100 text-stone-700 font-medium text-xs rounded-full">
                {segment.exam_section}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-3">
              {segment.title}
            </h1>

            {/* Subtopics Box */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 max-w-3xl">
              <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                Official Syllabus Topics:
              </p>
              <p className="text-xs text-stone-600 leading-relaxed font-mono">
                {segment.subtopics}
              </p>
            </div>
          </div>

          {/* Quick Counter Stats */}
          <div className="flex md:flex-col gap-3 shrink-0">
            <div className="bg-red-50/80 border border-red-200 rounded-2xl px-4 py-3 text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1 text-red-600 text-xs font-bold mb-0.5">
                <Film className="w-3.5 h-3.5" />
                <span>YouTube</span>
              </div>
              <span className="text-xl font-extrabold text-red-950">
                {youtubeResources.length}
              </span>
              <span className="block text-[11px] text-red-700">shared</span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3 text-center min-w-[130px]">
              <div className="flex items-center justify-center gap-1 text-amber-700 text-xs font-bold mb-0.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Files</span>
              </div>
              <span className="text-xl font-extrabold text-amber-950">
                {fileResources.length}
              </span>
              <span className="block text-[11px] text-amber-800">shared</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO SEPARATE TABS: YouTube and Files */}
      <div className="border-b border-stone-200 mb-6">
        <div className="flex space-x-6 sm:space-x-8">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`pb-4 px-1 text-sm sm:text-base font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="text-lg">🎥</span>
            <span>YouTube Resources</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'youtube' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-600'
            }`}>
              {youtubeResources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`pb-4 px-1 text-sm sm:text-base font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="text-lg">📁</span>
            <span>Files & Notes</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'files' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-600'
            }`}>
              {fileResources.length}
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🎥 YOUTUBE TAB CONTENT                                        */}
      {/* ============================================================== */}
      {activeTab === 'youtube' && (
        <div className="space-y-6">
          {/* Controls Bar: Filters, Search, Share Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 hidden sm:inline">Type:</span>
              <button
                onClick={() => setYtFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  ytFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({youtubeResources.length})
              </button>
              <button
                onClick={() => setYtFilter('video')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  ytFilter === 'video'
                    ? 'bg-red-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Videos
              </button>
              <button
                onClick={() => setYtFilter('playlist')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  ytFilter === 'playlist'
                    ? 'bg-purple-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Playlists
              </button>
            </div>

            {/* Search Box and Share Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search title, topic..."
                  value={ytSearch}
                  onChange={(e) => setYtSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>

              <button
                onClick={() => {
                  if (!isConfigured) {
                    onOpenSupabaseSetup();
                  } else {
                    setIsShareYtOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Share YouTube Resource</span>
              </button>
            </div>
          </div>

          {/* List of YouTube Resources */}
          {loading ? (
            <div className="py-16 text-center text-stone-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <p className="text-xs">Loading shared YouTube resources...</p>
            </div>
          ) : filteredYouTube.length === 0 ? (
            /* Empty state required by prompt */
            <div className="bg-white border border-stone-200/90 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1">
                Nothing shared yet. Be the first to contribute!
              </h3>
              <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                Found a great YouTube lecture, visual explanation, or syllabus playlist for{' '}
                <strong>{segment.title}</strong>? Share the link with your classmates.
              </p>
              <button
                onClick={() => {
                  if (!isConfigured) {
                    onOpenSupabaseSetup();
                  } else {
                    setIsShareYtOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Share First YouTube Resource</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredYouTube.map((res) => (
                <YouTubeResourceCard
                  key={res.id}
                  resource={res}
                  currentUserId={currentStudent.id}
                  onDelete={handleDeleteYouTube}
                  onReport={(r) =>
                    setReportTarget({ id: r.id, title: r.title, kind: 'youtube' })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 📁 FILES TAB CONTENT                                           */}
      {/* ============================================================== */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          {/* Controls Bar: Search & Share File Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search file name, notes, title..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              onClick={() => {
                if (!isConfigured) {
                  onOpenSupabaseSetup();
                } else {
                  setIsShareFileOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>+ Share File</span>
            </button>
          </div>

          {/* Files List */}
          {loading ? (
            <div className="py-16 text-center text-stone-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-xs">Loading shared course files...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            /* Empty state required by prompt */
            <div className="bg-white border border-stone-200/90 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1">
                Nothing shared yet. Be the first to contribute!
              </h3>
              <p className="text-xs text-stone-600 mb-5 leading-relaxed">
                Have class notes, solved sample questions, presentation slides, or handwritten diagrams for{' '}
                <strong>{segment.title}</strong>? Upload them here to help your peers.
              </p>
              <button
                onClick={() => {
                  if (!isConfigured) {
                    onOpenSupabaseSetup();
                  } else {
                    setIsShareFileOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>+ Share First File</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredFiles.map((res) => (
                <FileResourceCard
                  key={res.id}
                  resource={res}
                  currentUserId={currentStudent.id}
                  onDelete={handleDeleteFile}
                  onPreview={(r) => setPreviewFile(r)}
                  onReport={(r) =>
                    setReportTarget({ id: r.id, title: r.title, kind: 'file' })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ShareYouTubeModal
        isOpen={isShareYtOpen}
        onClose={() => setIsShareYtOpen(false)}
        segment={segment}
        courseId={course.id}
        currentStudent={currentStudent}
        onResourceAdded={() => {
          loadResources();
        }}
      />

      <ShareFileModal
        isOpen={isShareFileOpen}
        onClose={() => setIsShareFileOpen(false)}
        segment={segment}
        courseId={course.id}
        currentStudent={currentStudent}
        onResourceAdded={() => {
          loadResources();
        }}
      />

      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          resourceId={reportTarget.id}
          resourceTitle={reportTarget.title}
          resourceKind={reportTarget.kind}
          currentStudent={currentStudent}
        />
      )}

      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        fileResource={previewFile}
      />
    </div>
  );
};
