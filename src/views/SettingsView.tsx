import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Volume2, 
  Monitor, 
  Check, 
  UserCheck, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { currentUser, switchUserQuick } = useAuth();
  
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [preferredSpeed, setPreferredSpeed] = useState('1.0x');
  const [highContrast, setHighContrast] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      
      {/* Settings Header */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1">
          <SettingsIcon className="w-4 h-4" />
          <span>Preferences & Config</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Study Environment Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure video playback options, study view preferences, and developer environment states.
        </p>
      </div>

      {/* Video & Playback Preferences */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 space-y-5">
        <h2 className="text-lg font-bold text-slate-900 border-b border-[#F2ECE1] pb-3">
          Curated Video Playback
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">Auto-suggest Next Video in Chapter</div>
              <div className="text-xs text-slate-500">Show consecutive syllabus resources when a video finishes</div>
            </div>
            <button
              onClick={() => {
                setAutoplayNext(!autoplayNext);
                handleSave();
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                autoplayNext ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                autoplayNext ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Default Playback Velocity</div>
              <div className="text-xs text-slate-500">Preferred lecture speed</div>
            </div>
            <div className="flex items-center gap-1.5">
              {['1.0x', '1.25x', '1.5x'].map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setPreferredSpeed(speed);
                    handleSave();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                    preferredSpeed === speed
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-[#FAF8F5] text-slate-700 border-[#EAE4D9]'
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>
        </div>

        {savedNotice && (
          <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Preferences saved to local session.</span>
          </div>
        )}
      </div>

      {/* Supabase & Architecture Readiness (Section 15) */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
          <Database className="w-4 h-4" />
          <span>Architecture & Future Supabase Integration</span>
        </div>

        <h2 className="text-lg font-bold text-slate-900">
          Supabase & Vercel Deployment Blueprint
        </h2>

        <p className="text-sm text-slate-600 leading-relaxed">
          Contributo has been structured with clear entity decoupling:
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            students
          </code>, 
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            courses
          </code>, 
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            chapters
          </code>, 
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            resources
          </code>, 
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            favorites
          </code>, and 
          <code className="text-xs font-mono bg-[#FAF8F5] px-2 py-0.5 rounded text-orange-800 ml-1 border border-[#EDE8DF]">
            history
          </code>.
          When backend connection is activated, the state hooks in <code className="text-xs font-mono">ResourceContext</code> and <code className="text-xs font-mono">AuthContext</code> will seamlessly target PostgreSQL/Supabase tables without altering the UI tree.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF] text-xs">
            <span className="font-bold text-slate-900 block mb-1">Authentication Flow</span>
            University ID key matching without email friction; Row-Level Security (RLS) policies scoped strictly by student ID.
          </div>
          <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF] text-xs">
            <span className="font-bold text-slate-900 block mb-1">Vercel Build Target</span>
            Vite SPA with zero SSR runtime bottlenecks; instantaneous edge CDN asset delivery.
          </div>
        </div>
      </div>

      {/* Switch Demo Identity */}
      <div className="bg-white rounded-3xl border border-[#EAE4D9] p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Fast Identity Switcher (Evaluation Preview)
        </h2>
        <p className="text-xs text-slate-500">
          Switch between students or administrative faculty to test permission scopes:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => switchUserQuick('C253124')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
              currentUser?.universityId === 'C253124'
                ? 'border-orange-500 bg-orange-50/50'
                : 'border-[#EAE4D9] bg-white hover:border-slate-400'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-slate-900">Md. Elman (Student)</div>
              <div className="text-xs font-mono text-orange-600 font-semibold">ID: C253124</div>
            </div>
            {currentUser?.universityId === 'C253124' && (
              <span className="text-xs bg-orange-500 text-white font-medium px-2 py-0.5 rounded">Active</span>
            )}
          </button>

          <button
            onClick={() => switchUserQuick('C250001')}
            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-colors ${
              currentUser?.universityId === 'C250001'
                ? 'border-orange-500 bg-orange-50/50'
                : 'border-[#EAE4D9] bg-white hover:border-slate-400'
            }`}
          >
            <div>
              <div className="text-sm font-bold text-slate-900">Prof. K. Rahman (Admin)</div>
              <div className="text-xs font-mono text-orange-600 font-semibold">ID: C250001</div>
            </div>
            {currentUser?.universityId === 'C250001' && (
              <span className="text-xs bg-orange-500 text-white font-medium px-2 py-0.5 rounded">Active</span>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
