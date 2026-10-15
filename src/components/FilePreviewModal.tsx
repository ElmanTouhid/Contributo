import React from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { getFileDownloadUrl } from '../lib/supabase';
import { FileResource } from '../types';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileResource: FileResource | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileResource,
}) => {
  if (!isOpen || !fileResource) return null;

  const url = getFileDownloadUrl(fileResource.file_path);
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(fileResource.file_type.toLowerCase());
  const isPdf = fileResource.file_type.toLowerCase() === 'pdf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/80 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl h-[85vh] bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-stone-50/80">
          <div>
            <h3 className="text-sm font-bold text-stone-900 truncate max-w-md">
              {fileResource.title}
            </h3>
            <p className="text-[11px] text-stone-500">
              {fileResource.file_name} · Shared by {fileResource.contributor_name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={fileResource.file_name}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-lg transition-colors ml-1"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 bg-stone-100 flex items-center justify-center overflow-auto p-4">
          {isImage ? (
            <img
              src={url}
              alt={fileResource.title}
              className="max-h-full max-w-full object-contain rounded-lg shadow-md"
            />
          ) : isPdf ? (
            <iframe
              src={`${url}#toolbar=1`}
              className="w-full h-full rounded-lg border border-stone-300 bg-white"
              title={fileResource.title}
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-stone-200 max-w-sm">
              <p className="text-sm font-semibold text-stone-800 mb-2">Direct Preview Not Available</p>
              <p className="text-xs text-stone-500 mb-4">
                This {fileResource.file_type.toUpperCase()} file can be downloaded and opened with your desktop application.
              </p>
              <a
                href={url}
                download={fileResource.file_name}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download {fileResource.file_name}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
