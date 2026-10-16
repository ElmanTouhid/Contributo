import React from 'react';
import {
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileType,
  Flag,
  Image as ImageIcon,
  Trash2,
  User
} from 'lucide-react';
import { getFileDownloadUrl } from '../lib/supabase';
import { FileResource } from '../types';

interface FileResourceCardProps {
  resource: FileResource;
  currentUserId: string;
  onDelete: (resource: FileResource) => void;
  onPreview: (resource: FileResource) => void;
  onReport: (resource: FileResource) => void;
}

export const FileResourceCard: React.FC<FileResourceCardProps> = ({
  resource,
  currentUserId,
  onDelete,
  onPreview,
  onReport,
}) => {
  const isOwner = Boolean(currentUserId && resource.contributor_id === currentUserId);
  const ext = (resource.file_type || '').toLowerCase();

  const isPreviewable = ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext);

  const getFileBadge = () => {
    switch (ext) {
      case 'pdf':
        return {
          icon: <FileText className="w-4 h-4 text-rose-600" />,
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'PDF Document',
        };
      case 'ppt':
      case 'pptx':
        return {
          icon: <FileType className="w-4 h-4 text-orange-600" />,
          color: 'bg-orange-50 text-orange-700 border-orange-200',
          label: 'Presentation',
        };
      case 'doc':
      case 'docx':
        return {
          icon: <FileText className="w-4 h-4 text-blue-600" />,
          color: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Word Document',
        };
      case 'png':
      case 'jpg':
      case 'jpeg':
        return {
          icon: <ImageIcon className="w-4 h-4 text-emerald-600" />,
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Image / Diagram',
        };
      default:
        return {
          icon: <FileCode className="w-4 h-4 text-stone-600" />,
          color: 'bg-stone-50 text-stone-700 border-stone-200',
          label: ext.toUpperCase() || 'File',
        };
    }
  };

  const badge = getFileBadge();

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedDate = new Date(resource.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const downloadUrl = getFileDownloadUrl(resource.file_path);

  return (
    <div className="bg-white border border-stone-200/90 hover:border-amber-400/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}
            >
              {badge.icon}
              <span>{badge.label}</span>
            </span>
            <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              {formatFileSize(resource.file_size)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onReport(resource)}
              className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-50 transition-colors text-xs flex items-center gap-1 cursor-pointer"
              title="Report this file"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">Report</span>
            </button>

            {isOwner && (
              <button
                onClick={() => onDelete(resource)}
                className="text-stone-400 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Delete this file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-950 transition-colors line-clamp-2 mb-1">
          {resource.title}
        </h3>

        {/* File name subtitle */}
        <p className="text-[11px] font-mono text-stone-400 truncate mb-2">
          {resource.file_name}
        </p>

        {/* Description */}
        {resource.description && (
          <p className="text-xs text-stone-600 line-clamp-3 mb-4 leading-relaxed">
            {resource.description}
          </p>
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            <User className="w-3 h-3" />
          </span>
          <span className="truncate">
            Shared by <strong className="text-stone-700 font-semibold">{resource.contributor_name}</strong>
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-[11px] shrink-0 text-stone-400">{formattedDate}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPreviewable && (
            <button
              onClick={() => onPreview(resource)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-stone-600" />
              <span>Preview</span>
            </button>
          )}

          <a
            href={downloadUrl}
            download={resource.file_name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </a>
        </div>
      </div>
    </div>
  );
};
