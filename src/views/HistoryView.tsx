import React, { useState } from 'react';
import { 
  History as HistoryIcon, 
  Trash2, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useResources } from '../context/ResourceContext';

interface HistoryViewProps {
  onBrowseCourses: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onBrowseCourses }) => {
  const { currentUser } = useAuth();
  const { 
    history, 
    clearHistory, 
    openResourceModal, 
    getResourceById,
    markCompleted
  } = useResources();

  const [confirmClear, setConfirmClear] = useState(false);

  // Hydrate history items
  const historyList = history
    .map(item => {
      const data = getResourceById(item.resourceId);
      return data ? { ...data, watchedAt: item.watchedAt, completed: item.completed, historyId: item.id } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const formatTimeAgo = (dateString: string) => {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const diffMins = Math.floor((now - then) / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
              <HistoryIcon className="w-4 h-4" />
              <span>Personal Study Activity</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Learning History
            </h1>

            <p className="text-sm text-slate-600">
              Lectures watched by <span className="font-semibold text-slate-900">{currentUser?.name}</span> (ID: <span className="font-mono text-orange-600 font-bold">{currentUser?.universityId}</span>).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {historyList.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearHistory();
                      setConfirmClear(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
                  >
                    Confirm Clear
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )
            )}

            <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EDE8DF] text-center sm:text-right shrink-0">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Sessions
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {historyList.length}
              </div>
            </div>
          </div>
        </div>

        {/* Privacy verification message */}
        <div className="mt-4 pt-4 border-t border-[#F2ECE1] text-xs text-slate-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Private and Student-Isolated: No other student can see your study history or watched lectures.</span>
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {historyList.map(({ resource, course, watchedAt, completed }) => (
          <div
            key={resource.id}
            className="bg-white rounded-2xl border border-[#EAE4D9] hover:border-orange-300 hover:shadow-sm transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
          >
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-mono font-bold text-slate-800">{course.code}</span>
                <span>·</span>
                <span className="text-slate-700 font-medium">Topic: {resource.topic}</span>
                <span>·</span>
                <span>{resource.resourceType === 'playlist' ? '📺 Playlist' : '🎥 Video'}</span>
                <span>·</span>
                <span>Shared by: <strong className="text-slate-700">{resource.sharedBy}</strong></span>
                <span>·</span>
                <span className="text-orange-700 font-medium">{formatTimeAgo(watchedAt)}</span>
              </div>

              <h3 
                onClick={() => openResourceModal(resource)}
                className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors cursor-pointer"
              >
                {resource.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-1">
                {resource.description}
              </p>

              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                <button
                  onClick={() => markCompleted(resource.id, !completed)}
                  className={`flex items-center gap-1 font-medium transition-colors ${
                    completed ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{completed ? 'Completed' : 'Mark as Completed'}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <button
                onClick={() => openResourceModal(resource)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-orange-500/20 flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Replay</span>
              </button>

              <a
                href={resource.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-500 border border-[#E4DEC3] hover:text-slate-900 hover:border-slate-400 transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}

        {historyList.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EAE4D9] p-8 space-y-3">
            <HistoryIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Your History is Clean</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Whenever you open or study any academic lecture, it will be automatically recorded here so you can easily pick up where you left off.
            </p>
            <button
              onClick={onBrowseCourses}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <span>Start Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
};
