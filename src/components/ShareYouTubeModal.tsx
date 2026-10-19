import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Film, ListVideo, Sparkles, Video, X } from 'lucide-react';
import { addYouTubeResource, parseYouTubeUrl } from '../lib/supabase';
import { ResourceType, Segment } from '../types';

interface ShareYouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment;
  courseId: string;
  onResourceAdded: () => void;
}

export const ShareYouTubeModal: React.FC<ShareYouTubeModalProps> = ({
  isOpen,
  onClose,
  segment,
  courseId,
  onResourceAdded,
}) => {
  const [url, setUrl] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('video');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<{ id: string | null; valid: boolean } | null>(null);

  if (!isOpen) return null;

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setErrorMsg('');
    if (!val.trim()) {
      setParsedInfo(null);
      return;
    }

    const res = parseYouTubeUrl(val);
    if (res.valid && res.id) {
      setParsedInfo({ id: res.id, valid: true });
      setResourceType(res.type);
    } else {
      setParsedInfo({ id: null, valid: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!url.trim()) {
      setErrorMsg('Please enter a YouTube video or playlist URL.');
      return;
    }

    const parsed = parseYouTubeUrl(url);
    if (!parsed.valid || !parsed.id) {
      setErrorMsg(parsed.error || 'Invalid YouTube URL. Please provide a valid YouTube link.');
      return;
    }

    const t = title.trim();
    if (t.length < 3 || t.length > 150) {
      setErrorMsg('Title must be between 3 and 150 characters.');
      return;
    }

    const top = topic.trim();
    if (top.length < 2 || top.length > 100) {
      setErrorMsg('Topic must be between 2 and 100 characters.');
      return;
    }

    const desc = description.trim();
    if (desc.length > 500) {
      setErrorMsg('Description must be at most 500 characters.');
      return;
    }

    setIsSubmitting(true);

    const finalName = contributorName.trim() || 'Anonymous Student';

    const result = await addYouTubeResource({
      course_id: courseId,
      segment_id: segment.id,
      youtube_url: parsed.normalizedUrl,
      youtube_id: parsed.id,
      resource_type: resourceType,
      title: t,
      topic: top,
      description: desc,
      contributor_name: finalName,
    });

    setIsSubmitting(false);

    if (result.success) {
      onResourceAdded();
      onClose();
    } else {
      setErrorMsg(result.error || 'Failed to share resource.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl p-6 sm:p-7 my-8 text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Share YouTube Resource</h2>
            <p className="text-xs text-stone-600">
              {courseId} · Segment {segment.segment_number}: {segment.title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* YouTube URL input */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Supports single video links, playlists, and mobile youtu.be links.
            </p>

            {parsedInfo && parsedInfo.valid && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Detected {resourceType === 'playlist' ? 'Playlist ID' : 'Video ID'}: <code className="font-mono font-bold">{parsedInfo.id}</code></span>
              </div>
            )}
          </div>

          {/* Resource Type */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Resource Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResourceType('video')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  resourceType === 'video'
                    ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-xs ring-1 ring-orange-500'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300'
                }`}
              >
                <Film className="w-4 h-4 text-orange-600" />
                <span>Single Video</span>
              </button>
              <button
                type="button"
                onClick={() => setResourceType('playlist')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  resourceType === 'playlist'
                    ? 'border-orange-500 bg-orange-50 text-orange-950 shadow-xs ring-1 ring-orange-500'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-amber-300'
                }`}
              >
                <ListVideo className="w-4 h-4 text-orange-600" />
                <span>Full Playlist</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Resource Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MIT 6.006: Introduction to Binary Search Trees"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Topic */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Syllabus Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. BST Insertion, Deletion & Traversal"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Short Description / Key Takeaways
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clear explanation of how node balance is checked with animated visual proofs."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Contributor Name (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Contributor Name <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              placeholder="e.g. Alex (or leave blank for Anonymous Student)"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Defaults to <strong className="text-stone-700">Anonymous Student</strong>. No registration required.
            </p>
          </div>

          {/* Contributor preview disclaimer */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Will be published as: <span className="font-bold underline decoration-amber-400">Shared by {contributorName.trim() || 'Anonymous Student'}</span>
            </span>
            <span className="text-stone-500 text-[10px]">Open contribution</span>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying & Saving...' : '+ Share Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
