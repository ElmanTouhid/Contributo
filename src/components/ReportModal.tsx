import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Flag, X } from 'lucide-react';
import { submitResourceReport } from '../lib/supabase';
import { ReportReason } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  resourceTitle: string;
  resourceKind: 'youtube' | 'file';
}

const REASONS: { label: ReportReason; desc: string }[] = [
  { label: 'Spam', desc: 'Promotional, repetitive, or unacademic content' },
  { label: 'Wrong course/segment', desc: 'Resource does not belong to this course or syllabus topic' },
  { label: 'Broken link or file', desc: 'Video is unavailable, deleted, or file fails to load/corrupt' },
  { label: 'Inappropriate', desc: 'Offensive, vulgar, or non-educational material' },
  { label: 'Other', desc: 'Other syllabus mismatch or quality issue' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceTitle,
  resourceKind,
}) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason>('Wrong course/segment');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage('');

    const res = await submitResourceReport({
      resource_id: resourceId,
      resource_kind: resourceKind,
      reason: selectedReason,
    });

    if (res.success) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 1800);
    } else {
      setStatus('error');
      setErrorMessage(res.error || 'Failed to submit report.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#FFFDF9] border border-amber-200 rounded-2xl shadow-2xl p-6 text-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <Flag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">Report Resource</h2>
            <p className="text-xs text-stone-500 truncate max-w-[260px]">{resourceTitle}</p>
          </div>
        </div>

        {status === 'success' ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-stone-900">Thanks for reporting</h3>
            <p className="text-xs text-stone-600">
              Our academic moderators have received your feedback. Contributo stays clean thanks to student reports.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-stone-600">
              Why should this {resourceKind === 'youtube' ? 'YouTube link' : 'file'} be reviewed?
            </p>

            <div className="space-y-2">
              {REASONS.map(({ label, desc }) => (
                <label
                  key={label}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === label
                      ? 'border-orange-500 bg-orange-50/70 font-semibold text-stone-900'
                      : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={label}
                    checked={selectedReason === label}
                    onChange={() => setSelectedReason(label)}
                    className="mt-0.5 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="block font-medium text-stone-900">{label}</span>
                    <span className="block text-[11px] text-stone-500 font-normal">{desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
