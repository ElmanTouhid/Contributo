import React from 'react';
import { ExternalLink, Film, Flag, ListVideo, Trash2, User } from 'lucide-react';
import { YouTubeResource } from '../types';

interface YouTubeResourceCardProps {
  resource: YouTubeResource;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReport: (resource: YouTubeResource) => void;
}

export const YouTubeResourceCard: React.FC<YouTubeResourceCardProps> = ({
  resource,
  currentUserId,
  onDelete,
  onReport,
}) => {
  const isPlaylist = resource.resource_type === 'playlist';
  const isOwner = resource.contributor_id === currentUserId;

  const formattedDate = new Date(resource.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white border border-stone-200/90 hover:border-amber-400/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                isPlaylist
                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {isPlaylist ? <ListVideo className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
              <span>{isPlaylist ? 'YouTube Playlist' : 'YouTube Video'}</span>
            </span>
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 truncate max-w-[140px] sm:max-w-[200px]">
              {resource.topic}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onReport(resource)}
              className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-50 transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Report this resource"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Report</span>
            </button>

            {isOwner && (
              <button
                onClick={() => onDelete(resource.id)}
                className="text-stone-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete your submission"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-stone-900 group-hover:text-orange-950 transition-colors line-clamp-2 mb-2">
          {resource.title}
        </h3>

        {/* Short Description */}
        {resource.description && (
          <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
            {resource.description}
          </p>
        )}
      </div>

      {/* Footer Info & Watch Action */}
      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            <User className="w-3 h-3" />
          </span>
          <span className="truncate">
            Shared by <strong className="text-stone-700 font-semibold">{resource.contributor_name}</strong>
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] shrink-0 text-stone-400">{formattedDate}</span>
        </div>

        <a
          href={resource.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
            isPlaylist
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isPlaylist ? <ListVideo className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
          <span>{isPlaylist ? 'Open Playlist' : 'Watch Video'}</span>
          <ExternalLink className="w-3 h-3 opacity-80" />
        </a>
      </div>
    </div>
  );
};
