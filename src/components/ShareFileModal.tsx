import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Sparkles,
  UploadCloud,
  X
} from 'lucide-react';
import { uploadAndAddFileResource } from '../lib/supabase';
import { Segment } from '../types';

interface ShareFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment;
  courseId: string;
  onResourceAdded: () => void;
}

const ALLOWED_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const ShareFileModal: React.FC<ShareFileModalProps> = ({
  isOpen,
  onClose,
  segment,
  courseId,
  onResourceAdded,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const validateAndSetFile = (file: File) => {
    setErrorMsg('');
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMsg(`Invalid file type (.${ext}). Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}.`);
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      setErrorMsg(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) must be between 1 byte and 15 MB.`);
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-suggest title from filename without extension
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(baseName.replace(/[_-]/g, ' '));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please provide a title for this file (e.g. Lecture Slides or Notes).');
      return;
    }

    setIsUploading(true);

    const finalName = contributorName.trim() || 'Anonymous Student';

    const res = await uploadAndAddFileResource({
      file: selectedFile,
      courseId,
      segmentId: segment.id,
      title: title.trim(),
      description: description.trim(),
      contributorName: finalName,
    });

    setIsUploading(false);

    if (res.success) {
      onResourceAdded();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to upload file.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Share Course File</h2>
            <p className="text-xs text-stone-600">
              {courseId} · Segment {segment.segment_number}: {segment.title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1.5">
              Select File <span className="text-red-500">*</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-orange-500 bg-orange-50/70'
                  : selectedFile
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-stone-300 hover:border-amber-400 bg-stone-50/60 hover:bg-stone-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3 text-emerald-800">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold truncate max-w-[260px]">{selectedFile.name}</p>
                    <p className="text-[11px] text-stone-500">{formatFileSize(selectedFile.size)} · Click to change file</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 text-amber-600 mx-auto" />
                  <p className="text-xs font-medium text-stone-800">
                    Click to browse or drag and drop your file here
                  </p>
                  <p className="text-[11px] text-stone-500">
                    PDF, PPT, PPTX, DOC, DOCX, PNG, JPG (Max 15 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              File Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 2: Array Traversals & Binary Search Notes"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Short Description / Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Class lecture slides with step-by-step memory pointer trace diagrams."
              className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
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
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Defaults to <strong className="text-stone-700">Anonymous Student</strong>. No registration required.
            </p>
          </div>

          {/* Contributor preview notice */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 text-[11px] text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Uploaded as: <span className="font-bold underline decoration-amber-400">Shared by {contributorName.trim() || 'Anonymous Student'}</span>
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
              disabled={isUploading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isUploading ? 'Uploading to Supabase...' : '+ Share File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
